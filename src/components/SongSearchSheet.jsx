import { useState, useEffect, useRef } from 'react'
import BottomSheet from './BottomSheet'
import { useAppStore } from '../store/useAppStore'
import { tgHaptic } from '../lib/telegram'

const LASTFM_KEY = import.meta.env.VITE_LASTFM_API_KEY

// Last.fm — поиск (надёжно работает в любом окружении)
async function searchTracks(query) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(query)}&api_key=${LASTFM_KEY}&format=json&limit=12`
  const res = await fetch(url)
  const json = await res.json()
  const tracks = json?.results?.trackmatches?.track
  if (!Array.isArray(tracks)) return []
  return tracks.map((t) => ({
    name: t.name,
    artist: t.artist,
    cover: null, // обложка подтягивается отдельно через iTunes
  }))
}

// iTunes — обложка для одного трека (вызывается лениво в TrackRow)
async function fetchCover(name, artist) {
  try {
    const q = encodeURIComponent(`${name} ${artist}`)
    const r = await fetch(
      `https://itunes.apple.com/search?term=${q}&media=music&entity=song&limit=1`,
      { signal: AbortSignal.timeout(4000) }
    )
    const j = await r.json()
    const art = j.results?.[0]?.artworkUrl100
    return art ? art.replace('100x100bb', '300x300bb') : null
  } catch {
    return null
  }
}

// Генерирует стабильный цвет-заглушку по имени артиста
function artistColor(artist = '') {
  const COLORS = ['#D98B52','#7A6B8A','#6B8F71','#A05E2C','#8A7A6A','#5B7FA6']
  let h = 0
  for (let i = 0; i < artist.length; i++) h = (h * 31 + artist.charCodeAt(i)) & 0xffff
  return COLORS[h % COLORS.length]
}

function TrackRow({ track, onAdd }) {
  const [cover, setCover] = useState(track.cover)
  const [imgError, setImgError] = useState(false)

  // Ленивая загрузка обложки из iTunes
  useEffect(() => {
    if (cover) return
    let cancelled = false
    fetchCover(track.name, track.artist).then((url) => {
      if (!cancelled && url) setCover(url)
    })
    return () => { cancelled = true }
  }, [track.name, track.artist]) // eslint-disable-line react-hooks/exhaustive-deps

  const showImg = cover && !imgError

  return (
    <div className="flex items-center gap-3 px-5 py-3 active:opacity-60 transition-opacity">
      {showImg ? (
        <img
          src={cover}
          alt={track.name}
          onError={() => setImgError(true)}
          style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <div
          style={{
            width: 40, height: 40, borderRadius: 8, flexShrink: 0,
            backgroundColor: artistColor(track.artist),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}
        >
          🎵
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p
          className="font-sans"
          style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {track.name}
        </p>
        <p className="font-sans" style={{ fontSize: 11, color: 'var(--mid)' }}>
          {track.artist}
        </p>
      </div>
      <button
        onClick={() => onAdd({ ...track, cover: cover ?? null })}
        className="font-sans font-medium transition-opacity active:opacity-60 flex-shrink-0"
        style={{
          backgroundColor: 'var(--surface)',
          color: 'var(--accent)',
          border: 'none',
          borderRadius: 9999,
          padding: '5px 12px',
          fontSize: 12,
        }}
      >
        + добавить
      </button>
    </div>
  )
}

export default function SongSearchSheet({ onClose, onSelect }) {
  const recentSongs = useAppStore((s) => s.recentSongs)
  const addRecentSong = useAppStore((s) => s.addRecentSong)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setSearched(false)
      return
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const tracks = await searchTracks(query.trim())
        setResults(tracks)
        setSearched(true)
      } catch {
        setResults([])
        setSearched(true)
      } finally {
        setLoading(false)
      }
    }, 500)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  function handleAdd(track) {
    tgHaptic('light')
    addRecentSong(track)
    onSelect(track)
    onClose()
  }

  const showRecent = !query.trim() && recentSongs.length > 0
  const showResults = query.trim().length > 0
  const noResults = searched && results.length === 0

  return (
    <BottomSheet onClose={onClose} title="Трек момента">
      {/* Search input */}
      <div className="px-5 pb-3">
        <div
          className="flex items-center gap-2"
          style={{
            backgroundColor: 'var(--surface)',
            borderRadius: 10,
            padding: '9px 12px',
          }}
        >
          <span style={{ fontSize: 15, color: 'var(--soft)' }}>🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Название или артист..."
            autoFocus
            className="flex-1 font-sans outline-none bg-transparent"
            style={{ fontSize: 14, color: 'var(--text)', border: 'none' }}
          />
          {query.length > 0 && (
            <button
              onClick={() => setQuery('')}
              style={{ color: 'var(--soft)', background: 'none', border: 'none', fontSize: 16, lineHeight: 1 }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div style={{ minHeight: 200 }}>
        {/* Loading */}
        {loading && (
          <p className="font-sans text-center py-8" style={{ fontSize: 13, color: 'var(--soft)' }}>
            Поиск...
          </p>
        )}

        {/* Recent songs */}
        {!loading && showRecent && (
          <>
            <p
              className="font-sans uppercase tracking-widest px-5 pb-2"
              style={{ fontSize: 10, color: 'var(--soft)' }}
            >
              Недавние
            </p>
            {recentSongs.map((t, i) => (
              <TrackRow key={i} track={t} onAdd={handleAdd} />
            ))}
          </>
        )}

        {/* Search results */}
        {!loading && showResults && !noResults && (
          results.map((t, i) => <TrackRow key={i} track={t} onAdd={handleAdd} />)
        )}

        {/* No results */}
        {!loading && noResults && (
          <p className="font-sans text-center py-8" style={{ fontSize: 13, color: 'var(--mid)' }}>
            Ничего не найдено
          </p>
        )}

        {/* Empty hint */}
        {!loading && !showRecent && !showResults && (
          <p className="font-sans text-center py-8" style={{ fontSize: 13, color: 'var(--soft)' }}>
            Введи название трека
          </p>
        )}
      </div>
    </BottomSheet>
  )
}

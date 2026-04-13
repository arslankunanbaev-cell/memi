import { useState, useEffect, useRef } from 'react'
import BottomSheet from './BottomSheet'
import { useAppStore } from '../store/useAppStore'
import { tgHaptic } from '../lib/telegram'

const LASTFM_KEY = import.meta.env.VITE_LASTFM_API_KEY

async function searchTracks(query) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(query)}&api_key=${LASTFM_KEY}&format=json&limit=10`
  const res = await fetch(url)
  const json = await res.json()
  const tracks = json?.results?.trackmatches?.track
  if (!Array.isArray(tracks)) return []
  return tracks.map((t) => ({
    name: t.name,
    artist: t.artist,
    cover: Array.isArray(t.image) ? t.image[t.image.length - 1]['#text'] || null : null,
  }))
}

function TrackRow({ track, onAdd }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 active:opacity-60 transition-opacity">
      {track.cover ? (
        <img
          src={track.cover}
          alt={track.name}
          style={{ width: 34, height: 34, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <div
          style={{
            width: 34, height: 34, borderRadius: 6, flexShrink: 0,
            backgroundColor: 'var(--surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
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
        onClick={() => onAdd(track)}
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

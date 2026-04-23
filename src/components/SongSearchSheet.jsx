import { useState, useEffect, useRef } from 'react'
import BottomSheet from './BottomSheet'
import { proxifyCoverUrl } from '../lib/imageProxy'
import { useAppStore } from '../store/useAppStore'
import { tgHaptic } from '../lib/telegram'
import { enrichWithCover, enrichTracksWithCovers, artistColor } from '../lib/musicCovers'

const LASTFM_KEY = import.meta.env.VITE_LASTFM_API_KEY

// ── Last.fm search ────────────────────────────────────────────────────────────
async function searchTracks(query) {
  const url =
    `https://ws.audioscrobbler.com/2.0/?method=track.search` +
    `&track=${encodeURIComponent(query)}&api_key=${LASTFM_KEY}&format=json&limit=12`
  const res  = await fetch(url, { signal: AbortSignal.timeout(8000) })
  const json = await res.json()
  const tracks = json?.results?.trackmatches?.track
  if (!Array.isArray(tracks)) return []
  return tracks.map((t) => ({ name: t.name, artist: t.artist, cover: null, coverSource: null }))
}

// ── TrackRow ──────────────────────────────────────────────────────────────────
function TrackRow({ track, onAdd }) {
  // cover can arrive from cache immediately (synchronous) or after fetch
  const [cover, setCover]       = useState(track.cover ?? null)
  const [coverLoading, setLoading] = useState(!track.cover)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    setImgError(false)

    if (track.cover) {
      setCover(track.cover)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    enrichWithCover(track.name, track.artist).then(({ url }) => {
      if (cancelled) return
      setCover(url)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [track.name, track.artist, track.cover])

  const showImg = cover && !imgError
  const safeCover = proxifyCoverUrl(cover)

  return (
    <button
      onClick={() => onAdd({ ...track, cover: cover ?? null })}
      className="w-full flex items-center gap-3 px-4 py-3 transition-opacity active:opacity-60"
      style={{ background: 'none', border: 'none', textAlign: 'left' }}
    >
      {/* Cover / shimmer / placeholder */}
      {coverLoading ? (
        // Shimmer skeleton while fetching
        <div
          style={{
            width: 40, height: 40, borderRadius: 8, flexShrink: 0,
            backgroundColor: 'var(--surface)',
            animation: 'pulse 1.4s ease-in-out infinite',
          }}
        />
      ) : showImg ? (
        <img
          src={safeCover}
          alt={track.name}
          onError={() => setImgError(true)}
          style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        // Colored placeholder with note icon
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

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className="font-sans type-support"
          style={{ color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {track.name}
        </p>
        <p className="font-sans type-meta" style={{ color: 'var(--mid)' }}>
          {track.artist}
        </p>
      </div>

      {/* Add button */}
      <span
        className="font-sans type-meta flex-shrink-0"
        style={{
          backgroundColor: 'var(--surface)',
          color: 'var(--accent)',
          borderRadius: 9999,
          padding: '5px 12px',
        }}
      >
        + добавить
      </span>
    </button>
  )
}

// ── SongSearchSheet ───────────────────────────────────────────────────────────
export default function SongSearchSheet({ onClose, onSelect }) {
  const recentSongs   = useAppStore((s) => s.recentSongs)
  const addRecentSong = useAppStore((s) => s.addRecentSong)

  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState([])
  const [loading,  setLoading]  = useState(false)
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
        // 1) Get tracks from Last.fm immediately (renders the list fast)
        const tracks = await searchTracks(query.trim())
        setResults(tracks)
        setSearched(true)
        setLoading(false)

        // 2) Enrich covers in background — each TrackRow handles its own cover
        //    via enrichWithCover (which reads from cache if already populated)
        enrichTracksWithCovers(tracks) // pre-warms the cache; no await needed
      } catch {
        setResults([])
        setSearched(true)
        setLoading(false)
      }
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  function handleAdd(track) {
    tgHaptic('light')
    addRecentSong(track)
    onSelect(track)
    onClose()
  }

  const showRecent  = !query.trim() && recentSongs.length > 0
  const showResults = query.trim().length > 0
  const noResults   = searched && results.length === 0

  return (
    <BottomSheet onClose={onClose} title="Трек момента">
      {/* Search input */}
      <div className="px-4 pb-3">
        <div
          className="flex items-center gap-2"
          style={{ backgroundColor: 'var(--surface)', borderRadius: 10, padding: '9px 12px' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--soft)" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Название или артист..."
            autoFocus
            className="flex-1 font-sans type-topbar-meta outline-none bg-transparent"
            style={{ color: 'var(--text)', border: 'none' }}
          />
          {query.length > 0 && (
            <button
              onClick={() => setQuery('')}
              style={{ color: 'var(--soft)', background: 'none', border: 'none', fontSize: 18, lineHeight: 1, padding: 0 }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div style={{ minHeight: 220, overflowY: 'auto', maxHeight: '60dvh' }}>
        {/* Searching spinner */}
        {loading && (
          <p className="font-sans type-support text-center py-8" style={{ color: 'var(--soft)' }}>
            Поиск...
          </p>
        )}

        {/* Recent tracks */}
        {!loading && showRecent && (
          <>
            <p className="section-label px-4 pb-2 pt-1" style={{ color: 'var(--soft)' }}>
              Недавние
            </p>
            {recentSongs.map((t, i) => (
              <TrackRow key={`recent-${i}`} track={t} onAdd={handleAdd} />
            ))}
          </>
        )}

        {/* Search results */}
        {!loading && showResults && !noResults &&
          results.map((t, i) => <TrackRow key={`res-${i}-${t.name}`} track={t} onAdd={handleAdd} />)
        }

        {/* No results */}
        {!loading && noResults && (
          <p className="font-sans type-support text-center py-8" style={{ color: 'var(--mid)' }}>
            Ничего не найдено
          </p>
        )}

        {/* Empty hint */}
        {!loading && !showRecent && !showResults && (
          <p className="font-sans type-support text-center py-8" style={{ color: 'var(--soft)' }}>
            Введи название трека
          </p>
        )}
      </div>
    </BottomSheet>
  )
}

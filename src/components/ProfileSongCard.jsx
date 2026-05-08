import { useEffect, useRef, useState } from 'react'
import { proxifyCoverUrl } from '../lib/imageProxy'
import { enrichWithAudioPreview } from '../lib/musicCovers'
import { tgHaptic } from '../lib/telegram'

function PlayIcon({ playing }) {
  if (playing) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8 6.5v11M16 6.5v11" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8.75 6.7v10.6c0 .76.85 1.22 1.48.8l7.88-5.3a.95.95 0 0 0 0-1.6L10.23 5.9a.95.95 0 0 0-1.48.8Z" fill="currentColor" />
    </svg>
  )
}

function PlayingBars({ playing }) {
  return (
    <span className={`profile-song-bars${playing ? ' is-playing' : ''}`} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  )
}

export default function ProfileSongCard({ title, artist, cover, previewUrl }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [resolvedPreviewUrl, setResolvedPreviewUrl] = useState(previewUrl ?? null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [previewUnavailable, setPreviewUnavailable] = useState(false)

  useEffect(() => {
    setResolvedPreviewUrl(previewUrl ?? null)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlaying(false)
    setPreviewUnavailable(false)
  }, [previewUrl, title, artist])

  useEffect(() => {
    if (previewUrl || !title || !artist) return undefined

    let cancelled = false
    setLoadingPreview(true)

    enrichWithAudioPreview(title, artist)
      .then((preview) => {
        if (!cancelled) {
          setResolvedPreviewUrl(preview.previewUrl ?? null)
          setPreviewUnavailable(!preview.previewUrl)
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn('[ProfileSongCard] preview lookup failed:', error?.message)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingPreview(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [previewUrl, title, artist])

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  async function resolvePreview() {
    if (resolvedPreviewUrl) return resolvedPreviewUrl
    if (!title || !artist || loadingPreview) return null

    setLoadingPreview(true)
    try {
      const preview = await enrichWithAudioPreview(title, artist)
      setResolvedPreviewUrl(preview.previewUrl ?? null)
      setPreviewUnavailable(!preview.previewUrl)
      return preview.previewUrl ?? null
    } finally {
      setLoadingPreview(false)
    }
  }

  async function togglePlayback() {
    tgHaptic('light')

    const nextPreviewUrl = resolvedPreviewUrl ?? await resolvePreview()
    if (!nextPreviewUrl) {
      setPreviewUnavailable(true)
      return
    }

    if (!audioRef.current) {
      audioRef.current = new Audio(nextPreviewUrl)
      audioRef.current.addEventListener('ended', () => setPlaying(false))
      audioRef.current.addEventListener('pause', () => setPlaying(false))
      audioRef.current.addEventListener('play', () => setPlaying(true))
    }

    if (playing) {
      audioRef.current.pause()
      return
    }

    try {
      await audioRef.current.play()
    } catch (error) {
      console.warn('[ProfileSongCard] audio preview failed:', error?.message)
      setPreviewUnavailable(true)
      setPlaying(false)
    }
  }

  if (!title) return null

  return (
    <button
      type="button"
      onClick={togglePlayback}
      aria-label={playing ? 'Остановить любимую песню' : 'Включить любимую песню'}
      className={`profile-song-card w-full text-left transition-transform duration-150 ease-out active:scale-[0.99]${playing ? ' is-playing' : ''}`}
      style={{ borderStyle: 'solid' }}
    >
      {cover && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${proxifyCoverUrl(cover)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(22px)',
            opacity: playing ? 0.18 : 0.12,
            transform: playing ? 'scale(1.24)' : 'scale(1.2)',
            transition: 'opacity 220ms ease, transform 600ms ease',
          }}
        />
      )}
      <div className="flex items-center gap-3" style={{ position: 'relative' }}>
        <div className="profile-song-card-cover">
          {cover && (
            <img
              src={proxifyCoverUrl(cover)}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-sans truncate profile-song-card-title">
            {title}
          </p>
          {artist && (
          <p className="font-sans truncate profile-song-card-artist">
              {previewUnavailable ? 'Превью недоступно' : artist}
            </p>
          )}
        </div>
        <div className="profile-song-action" aria-hidden="true">
          <PlayingBars playing={playing} />
          <span className={`profile-song-play-button${loadingPreview ? ' is-loading' : ''}`}>
            <PlayIcon playing={playing} />
          </span>
        </div>
      </div>
    </button>
  )
}

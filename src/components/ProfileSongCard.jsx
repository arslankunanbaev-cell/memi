import { useEffect, useRef, useState } from 'react'
import { proxifyCoverUrl } from '../lib/imageProxy'
import { enrichWithAudioPreview } from '../lib/musicCovers'
import { tgHaptic } from '../lib/telegram'

function PlayIcon({ playing }) {
  if (playing) {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8 6v12M16 6v12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 6.8v10.4c0 .7.78 1.12 1.36.74l7.72-5.2a.88.88 0 0 0 0-1.48l-7.72-5.2A.88.88 0 0 0 9 6.8Z" fill="currentColor" />
    </svg>
  )
}

export default function ProfileSongCard({ title, artist, cover, previewUrl }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [resolvedPreviewUrl, setResolvedPreviewUrl] = useState(previewUrl ?? null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  useEffect(() => {
    setResolvedPreviewUrl(previewUrl ?? null)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlaying(false)
  }, [previewUrl, title, artist])

  useEffect(() => {
    if (previewUrl || !title || !artist) return undefined

    let cancelled = false
    setLoadingPreview(true)

    enrichWithAudioPreview(title, artist)
      .then((preview) => {
        if (!cancelled) {
          setResolvedPreviewUrl(preview.previewUrl ?? null)
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
      return preview.previewUrl ?? null
    } finally {
      setLoadingPreview(false)
    }
  }

  async function togglePlayback() {
    tgHaptic('light')

    const nextPreviewUrl = resolvedPreviewUrl ?? await resolvePreview()
    if (!nextPreviewUrl) return

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
      setPlaying(false)
    }
  }

  if (!title) return null

  return (
    <button
      type="button"
      onClick={togglePlayback}
      aria-label={playing ? 'Остановить любимую песню' : 'Включить любимую песню'}
      className="profile-song-card w-full text-left transition-transform duration-150 ease-out active:scale-[0.99]"
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
            transform: 'scale(1.2)',
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
              {artist}
            </p>
          )}
        </div>
        <span
          className="flex items-center justify-center"
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            flexShrink: 0,
            backgroundColor: playing ? 'var(--accent)' : 'rgba(217,139,82,0.14)',
            color: playing ? '#fff' : 'var(--accent)',
            boxShadow: playing ? '0 8px 18px rgba(217,139,82,0.24)' : 'none',
            opacity: loadingPreview ? 0.55 : 1,
          }}
        >
          <PlayIcon playing={playing} />
        </span>
      </div>
    </button>
  )
}

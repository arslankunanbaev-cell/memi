import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { tgHaptic } from '../lib/telegram'

// ── Canvas renderer ────────────────────────────────────────────────────────────

async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload  = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

async function drawCard(canvas, moment) {
  const W = 1080
  const H = 1920
  canvas.width  = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // ── Background ──────────────────────────────────────────────────────────────
  if (moment.photo_url) {
    try {
      const img = await loadImage(moment.photo_url)
      // cover-fit
      const scale = Math.max(W / img.width, H / img.height)
      const sw = img.width * scale
      const sh = img.height * scale
      ctx.drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh)
    } catch {
      drawGradientBg(ctx, W, H)
    }
  } else {
    drawGradientBg(ctx, W, H)
  }

  // ── Dark overlay (bottom 60%) ───────────────────────────────────────────────
  const grad = ctx.createLinearGradient(0, H * 0.3, 0, H)
  grad.addColorStop(0, 'rgba(23,20,14,0)')
  grad.addColorStop(0.5, 'rgba(23,20,14,0.55)')
  grad.addColorStop(1,   'rgba(23,20,14,0.88)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // ── Logo top-left ──────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.font = '300 52px Georgia, serif'
  ctx.letterSpacing = '6px'
  ctx.fillText('memi', 72, 110)

  // ── Mood emoji ────────────────────────────────────────────────────────────
  if (moment.mood) {
    ctx.font = '80px serif'
    ctx.fillText(moment.mood, W - 120, 110)
  }

  // ── Song bar (if any) ─────────────────────────────────────────────────────
  let songBarH = 0
  const songY = H - 260
  if (moment.song_title) {
    const barH = 80
    songBarH = barH + 24
    // pill bg
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    roundRect(ctx, 60, songY - barH, W - 120, barH, 16)
    ctx.fill()

    // song cover
    if (moment.song_cover) {
      try {
        const cover = await loadImage(moment.song_cover)
        const s = barH - 16
        roundRectClip(ctx, 68, songY - barH + 8, s, s, 8)
        ctx.drawImage(cover, 68, songY - barH + 8, s, s)
        ctx.restore()
      } catch {}
    }

    // song text
    ctx.fillStyle = '#fff'
    ctx.font = '500 32px Inter, sans-serif'
    ctx.fillText(clip(moment.song_title, 32), 68 + 60, songY - barH + 36)
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.font      = '300 26px Inter, sans-serif'
    ctx.fillText(clip(moment.song_artist ?? '', 36), 68 + 60, songY - barH + 64)
  }

  // ── Date ──────────────────────────────────────────────────────────────────
  const d = new Date(moment.created_at)
  const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.font      = '300 30px Inter, sans-serif'
  ctx.fillText(dateStr, 60, H - 260 - songBarH - 24)

  // ── Title ─────────────────────────────────────────────────────────────────
  ctx.fillStyle = '#fff'
  ctx.font      = '400 96px Georgia, serif'
  const lines = wrapText(ctx, moment.title.toUpperCase(), W - 120, 96)
  let ty = H - 220 - songBarH - (lines.length - 1) * 112
  for (const line of lines) {
    ctx.fillText(line, 60, ty)
    ty += 112
  }

  // ── Location pill ─────────────────────────────────────────────────────────
  if (moment.location) {
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    const locText = `📍 ${moment.location}`
    ctx.font = '400 28px Inter, sans-serif'
    const tw = ctx.measureText(locText).width
    roundRect(ctx, 60, H - 120, tw + 40, 52, 26)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.fillText(locText, 80, H - 84)
  }
}

function drawGradientBg(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, '#C8A478')
  g.addColorStop(1, '#8C5830')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function roundRectClip(ctx, x, y, w, h, r) {
  ctx.save()
  roundRect(ctx, x, y, w, h, r)
  ctx.clip()
}

function clip(str, max) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

function wrapText(ctx, text, maxW, fontSize) {
  const words = text.split(' ')
  const lines = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
    if (lines.length >= 3) break
  }
  if (line) lines.push(line)
  return lines.slice(0, 3)
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function StoryPreview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const moments = useAppStore((s) => s.moments)
  const moment  = moments.find((m) => m.id === id)

  const canvasRef = useRef(null)
  const [rendering, setRendering] = useState(true)
  const [error, setError]         = useState(null)

  useEffect(() => {
    if (!moment || !canvasRef.current) return
    setRendering(true)
    drawCard(canvasRef.current, moment)
      .then(() => setRendering(false))
      .catch((e) => { console.error(e); setError('Ошибка генерации'); setRendering(false) })
  }, [moment])

  function handleDownload() {
    if (!canvasRef.current) return
    tgHaptic('medium')
    const link = document.createElement('a')
    link.download = `memi-${id.slice(0, 8)}.jpg`
    link.href = canvasRef.current.toDataURL('image/jpeg', 0.92)
    link.click()
  }

  async function handleShare() {
    if (!canvasRef.current) return
    tgHaptic('light')
    canvasRef.current.toBlob(async (blob) => {
      const file = new File([blob], 'memi-moment.jpg', { type: 'image/jpeg' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: moment?.title ?? 'Мой момент' })
      } else {
        handleDownload()
      }
    }, 'image/jpeg', 0.92)
  }

  if (!moment) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4" style={{ backgroundColor: '#17140E' }}>
        <p className="font-sans" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Момент не найден</p>
        <button onClick={() => navigate(-1)} style={{ color: '#D98B52', background: 'none', border: 'none', fontSize: 14 }}>← Назад</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#17140E' }}>
      {/* Topbar */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center transition-opacity active:opacity-60"
          style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', border: 'none' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <span className="font-sans font-medium" style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>Карточка момента</span>
        <div style={{ width: 36 }} />
      </div>

      {/* Canvas preview */}
      <div className="flex-1 flex items-center justify-center px-4 overflow-hidden">
        <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: 'auto',
              borderRadius: 20,
              display: 'block',
              aspectRatio: '9/16',
              objectFit: 'cover',
            }}
          />
          {rendering && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ borderRadius: 20, backgroundColor: 'rgba(23,20,14,0.7)' }}
            >
              <p className="font-sans" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Генерация...</p>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ borderRadius: 20 }}>
              <p className="font-sans" style={{ color: '#E05252', fontSize: 13 }}>{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-3 px-5 pt-4"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={handleDownload}
          disabled={rendering}
          className="flex-1 font-sans font-medium transition-opacity active:opacity-70"
          style={{
            backgroundColor: rendering ? 'rgba(217,139,82,0.4)' : '#D98B52',
            color: '#fff', borderRadius: 9999,
            padding: '14px 0', fontSize: 15, border: 'none',
          }}
        >
          Скачать
        </button>
        <button
          onClick={handleShare}
          disabled={rendering}
          className="flex items-center justify-center transition-opacity active:opacity-60"
          style={{ width: 52, height: 52, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', flexShrink: 0 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

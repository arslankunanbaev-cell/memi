import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { tgHaptic } from '../lib/telegram'
import { supabase } from '../lib/supabase'

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload  = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
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

function wrapText(ctx, text, maxW) {
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

async function drawPhoto(ctx, moment, x, y, w, h) {
  if (moment.photo_url) {
    try {
      const img = await loadImage(moment.photo_url)
      const scale = Math.max(w / img.width, h / img.height)
      const sw = img.width * scale
      const sh = img.height * scale
      ctx.drawImage(img, x + (w - sw) / 2, y + (h - sh) / 2, sw, sh)
      return
    } catch {}
  }
  const g = ctx.createLinearGradient(x, y, x + w, y + h)
  g.addColorStop(0, '#E8D5C0')
  g.addColorStop(1, '#C8A880')
  ctx.fillStyle = g
  ctx.fillRect(x, y, w, h)
}

// ── Templates ─────────────────────────────────────────────────────────────────

async function drawPolaroid(canvas, moment) {
  const W = 1080, H = 1920
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')
  const PAD = 80

  // Background
  ctx.fillStyle = '#F7F4F0'
  ctx.fillRect(0, 0, W, H)

  // Header: memi + date
  ctx.fillStyle = '#17140E'
  ctx.font = '300 54px Georgia, serif'
  ctx.letterSpacing = '8px'
  ctx.fillText('memi', PAD, 136)
  ctx.letterSpacing = '0px'

  const d = new Date(moment.created_at)
  const weekday = d.toLocaleDateString('ru-RU', { weekday: 'short' })
  const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  const label = `${weekday} · ${dateStr}`
  ctx.font = '400 30px sans-serif'
  ctx.fillStyle = 'rgba(23,20,14,0.4)'
  const labelW = ctx.measureText(label).width
  ctx.fillText(label, W - PAD - labelW, 136)

  // Polaroid frame (rotated -1.5°)
  const frameX = PAD
  const frameY = 176
  const frameW = W - PAD * 2
  const photoH = 640
  const bottomPad = 160
  const frameH = photoH + bottomPad

  ctx.save()
  ctx.translate(W / 2, frameY + frameH / 2)
  ctx.rotate(-0.026)

  // Shadow
  ctx.shadowColor = 'rgba(23,20,14,0.18)'
  ctx.shadowBlur = 48
  ctx.shadowOffsetY = 16
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(-frameW / 2, -frameH / 2, frameW, frameH)
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0

  // Photo inside frame
  const inset = 28
  roundRectClip(ctx, -frameW / 2 + inset, -frameH / 2 + inset, frameW - inset * 2, photoH - inset, 4)
  await drawPhoto(ctx, moment, -frameW / 2 + inset, -frameH / 2 + inset, frameW - inset * 2, photoH - inset)
  ctx.restore() // pop roundRectClip's save
  ctx.restore() // pop rotation/translation save

  // Mood emoji top-right of frame
  if (moment.mood) {
    ctx.font = '72px serif'
    ctx.fillText(moment.mood, W - PAD - 80, frameY + 80)
  }

  // Content below polaroid
  let y = frameY + frameH + 60

  // Title
  ctx.fillStyle = '#17140E'
  ctx.font = '400 88px Georgia, serif'
  const titleLines = wrapText(ctx, moment.title, W - PAD * 2)
  for (const line of titleLines) {
    ctx.fillText(line, PAD, y)
    y += 108
  }
  y += 16

  // Description
  if (moment.description) {
    ctx.fillStyle = 'rgba(23,20,14,0.55)'
    ctx.font = '400 36px sans-serif'
    const descLines = wrapText(ctx, moment.description, W - PAD * 2)
    for (const line of descLines.slice(0, 3)) {
      ctx.fillText(line, PAD, y)
      y += 52
    }
    y += 16
  }

  // Divider
  ctx.strokeStyle = 'rgba(23,20,14,0.1)'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke()
  y += 44

  // Song
  if (moment.song_title) {
    const artSize = 84
    if (moment.song_cover) {
      try {
        const cover = await loadImage(moment.song_cover)
        roundRectClip(ctx, PAD, y, artSize, artSize, 12)
        ctx.drawImage(cover, PAD, y, artSize, artSize)
        ctx.restore()
      } catch {
        ctx.fillStyle = '#D98B52'; roundRect(ctx, PAD, y, artSize, artSize, 12); ctx.fill()
      }
    } else {
      ctx.fillStyle = '#D98B52'; roundRect(ctx, PAD, y, artSize, artSize, 12); ctx.fill()
    }
    ctx.fillStyle = '#17140E'
    ctx.font = '500 36px sans-serif'
    ctx.fillText(clip(moment.song_title, 30), PAD + artSize + 24, y + 32)
    ctx.fillStyle = 'rgba(23,20,14,0.5)'
    ctx.font = '400 28px sans-serif'
    ctx.fillText(clip(moment.song_artist ?? '', 34), PAD + artSize + 24, y + 70)
    y += artSize + 44
  }

  // Footer: people + location
  const hasPeople = moment.people?.length > 0
  if (hasPeople || moment.location) {
    if (hasPeople) {
      const names = moment.people.map(p => p.name).join(', ')
      ctx.fillStyle = '#17140E'
      ctx.font = '400 30px sans-serif'
      ctx.fillText(clip(names, 40), PAD, y + 30)
      y += 52
    }
    if (moment.location) {
      ctx.fillStyle = 'rgba(23,20,14,0.4)'
      ctx.font = '400 28px sans-serif'
      ctx.fillText(`📍 ${moment.location}`, PAD, y + 30)
    }
  }
}

async function drawMinimal(canvas, moment) {
  const W = 1080, H = 1920
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')
  const PAD = 80

  // Background
  ctx.fillStyle = '#F7F4F0'
  ctx.fillRect(0, 0, W, H)

  // Header
  ctx.fillStyle = '#17140E'
  ctx.font = '300 54px Georgia, serif'
  ctx.letterSpacing = '8px'
  ctx.fillText('memi', PAD, 136)
  ctx.letterSpacing = '0px'

  const d = new Date(moment.created_at)
  const weekday = d.toLocaleDateString('ru-RU', { weekday: 'short' })
  const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  const label = `${weekday} · ${dateStr}`
  ctx.font = '400 30px sans-serif'
  ctx.fillStyle = 'rgba(23,20,14,0.4)'
  ctx.fillText(label, W - PAD - ctx.measureText(label).width, 136)

  // Photo block (flat, no frame)
  const photoY = 176
  const photoH = 740
  const photoW = W - PAD * 2
  roundRectClip(ctx, PAD, photoY, photoW, photoH, 20)
  await drawPhoto(ctx, moment, PAD, photoY, photoW, photoH)
  ctx.restore()

  // Mood on photo
  if (moment.mood) {
    ctx.font = '80px serif'
    ctx.fillText(moment.mood, W - PAD - 90, photoY + 88)
  }

  // Content
  let y = photoY + photoH + 56

  // Title
  ctx.fillStyle = '#17140E'
  ctx.font = '400 88px Georgia, serif'
  const titleLines = wrapText(ctx, moment.title, W - PAD * 2)
  for (const line of titleLines) {
    ctx.fillText(line, PAD, y)
    y += 108
  }
  y += 16

  // Description
  if (moment.description) {
    ctx.fillStyle = 'rgba(23,20,14,0.55)'
    ctx.font = '400 36px sans-serif'
    const descLines = wrapText(ctx, moment.description, W - PAD * 2)
    for (const line of descLines.slice(0, 3)) {
      ctx.fillText(line, PAD, y)
      y += 52
    }
    y += 16
  }

  // Divider
  ctx.strokeStyle = 'rgba(23,20,14,0.1)'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke()
  y += 44

  // Song
  if (moment.song_title) {
    const artSize = 84
    if (moment.song_cover) {
      try {
        const cover = await loadImage(moment.song_cover)
        roundRectClip(ctx, PAD, y, artSize, artSize, 12)
        ctx.drawImage(cover, PAD, y, artSize, artSize)
        ctx.restore()
      } catch {
        ctx.fillStyle = '#D98B52'; roundRect(ctx, PAD, y, artSize, artSize, 12); ctx.fill()
      }
    } else {
      ctx.fillStyle = '#D98B52'; roundRect(ctx, PAD, y, artSize, artSize, 12); ctx.fill()
    }
    ctx.fillStyle = '#17140E'
    ctx.font = '500 36px sans-serif'
    ctx.fillText(clip(moment.song_title, 30), PAD + artSize + 24, y + 32)
    ctx.fillStyle = 'rgba(23,20,14,0.5)'
    ctx.font = '400 28px sans-serif'
    ctx.fillText(clip(moment.song_artist ?? '', 34), PAD + artSize + 24, y + 70)
    y += artSize + 44
  }

  // Footer
  const hasPeople = moment.people?.length > 0
  if (hasPeople || moment.location) {
    if (hasPeople) {
      ctx.fillStyle = '#17140E'
      ctx.font = '400 30px sans-serif'
      ctx.fillText(clip(moment.people.map(p => p.name).join(', '), 40), PAD, y + 30)
      y += 52
    }
    if (moment.location) {
      ctx.fillStyle = 'rgba(23,20,14,0.4)'
      ctx.font = '400 28px sans-serif'
      ctx.fillText(`📍 ${moment.location}`, PAD, y + 30)
    }
  }
}

async function drawDark(canvas, moment) {
  const W = 1080, H = 1920
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')

  // Background photo or gradient
  if (moment.photo_url) {
    try {
      const img = await loadImage(moment.photo_url)
      const scale = Math.max(W / img.width, H / img.height)
      const sw = img.width * scale; const sh = img.height * scale
      ctx.drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh)
    } catch {
      const g = ctx.createLinearGradient(0, 0, W, H)
      g.addColorStop(0, '#C8A478'); g.addColorStop(1, '#8C5830')
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
    }
  } else {
    const g = ctx.createLinearGradient(0, 0, W, H)
    g.addColorStop(0, '#C8A478'); g.addColorStop(1, '#8C5830')
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  }

  // Dark overlay
  const grad = ctx.createLinearGradient(0, H * 0.3, 0, H)
  grad.addColorStop(0, 'rgba(23,20,14,0)')
  grad.addColorStop(0.5, 'rgba(23,20,14,0.55)')
  grad.addColorStop(1, 'rgba(23,20,14,0.88)')
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.font = '300 52px Georgia, serif'
  ctx.letterSpacing = '6px'
  ctx.fillText('memi', 72, 110)
  ctx.letterSpacing = '0px'

  if (moment.mood) { ctx.font = '80px serif'; ctx.fillText(moment.mood, W - 120, 110) }

  let songBarH = 0
  const songY = H - 260
  if (moment.song_title) {
    const barH = 80; songBarH = barH + 24
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    roundRect(ctx, 60, songY - barH, W - 120, barH, 16); ctx.fill()
    if (moment.song_cover) {
      try {
        const cover = await loadImage(moment.song_cover)
        const s = barH - 16
        roundRectClip(ctx, 68, songY - barH + 8, s, s, 8)
        ctx.drawImage(cover, 68, songY - barH + 8, s, s); ctx.restore()
      } catch {}
    }
    ctx.fillStyle = '#fff'; ctx.font = '500 32px sans-serif'
    ctx.fillText(clip(moment.song_title, 32), 68 + 60, songY - barH + 36)
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '300 26px sans-serif'
    ctx.fillText(clip(moment.song_artist ?? '', 36), 68 + 60, songY - barH + 64)
  }

  const d = new Date(moment.created_at)
  const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '300 30px sans-serif'
  ctx.fillText(dateStr, 60, H - 260 - songBarH - 24)

  ctx.fillStyle = '#fff'; ctx.font = '400 96px Georgia, serif'
  const lines = wrapText(ctx, moment.title.toUpperCase(), W - 120)
  let ty = H - 220 - songBarH - (lines.length - 1) * 112
  for (const line of lines) { ctx.fillText(line, 60, ty); ty += 112 }

  if (moment.location) {
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    const locText = `📍 ${moment.location}`
    ctx.font = '400 28px sans-serif'
    const tw = ctx.measureText(locText).width
    roundRect(ctx, 60, H - 120, tw + 40, 52, 26); ctx.fill()
    ctx.fillStyle = '#fff'; ctx.fillText(locText, 80, H - 84)
  }
}

async function drawCard(canvas, moment, template) {
  if (template === 'minimal') return drawMinimal(canvas, moment)
  if (template === 'dark')    return drawDark(canvas, moment)
  return drawPolaroid(canvas, moment)
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function StoryPreview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const moments = useAppStore((s) => s.moments)
  const moment  = moments.find((m) => m.id === id)

  const canvasRef = useRef(null)
  const [rendering, setRendering]   = useState(true)
  const [error, setError]           = useState(null)
  const [sending, setSending]       = useState(false)
  const [sent, setSent]             = useState(false)
  const [sendError, setSendError]   = useState(null)
  const [template, setTemplate]     = useState('polaroid')

  useEffect(() => {
    if (!moment || !canvasRef.current) return
    setRendering(true)
    setError(null)
    drawCard(canvasRef.current, moment, template)
      .then(() => setRendering(false))
      .catch((e) => { console.error(e); setError('Ошибка генерации'); setRendering(false) })
  }, [moment, template])

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

  async function handleSendToTelegram() {
    if (!canvasRef.current || sending || sent) return
    setSendError(null)
    const chatId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id
    if (!chatId) {
      setSendError('Нет доступа к Telegram ID. Открой через бота.')
      return
    }
    tgHaptic('medium')
    setSending(true)
    try {
      const imageBase64 = canvasRef.current.toDataURL('image/jpeg', 0.80)
      const caption = moment?.title ? `✨ ${moment.title}` : 'Мой момент'
      console.log('[sendToTelegram] chatId:', chatId, 'size:', Math.round(imageBase64.length / 1024), 'KB')
      const { data, error: fnError } = await supabase.functions.invoke('send-card', {
        body: { imageBase64, chatId, caption },
      })
      console.log('[sendToTelegram] data:', data, 'fnError:', fnError)
      if (fnError) throw new Error(fnError.message ?? JSON.stringify(fnError))
      if (data?.error) throw new Error(data.error)
      setSent(true)
      tgHaptic('light')
      setTimeout(() => setSent(false), 3000)
    } catch (e) {
      console.error('[sendToTelegram] FAIL:', e)
      setSendError(e.message)
    } finally {
      setSending(false)
    }
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

      {/* Template switcher */}
      <div className="flex justify-center gap-2 px-5 pb-2">
        {[
          { id: 'polaroid', label: 'Поляроид' },
          { id: 'minimal',  label: 'Минимал' },
          { id: 'dark',     label: 'Тёмный' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => { setTemplate(t.id); tgHaptic('light') }}
            className="font-sans transition-all active:opacity-70"
            style={{
              fontSize: 13,
              padding: '6px 16px',
              borderRadius: 9999,
              border: 'none',
              backgroundColor: template === t.id ? '#D98B52' : 'rgba(255,255,255,0.1)',
              color: template === t.id ? '#fff' : 'rgba(255,255,255,0.5)',
              fontWeight: template === t.id ? 600 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Send error */}
      {sendError && (
        <div className="px-5 pb-2">
          <p className="font-sans text-center" style={{ fontSize: 12, color: '#E05252', backgroundColor: 'rgba(224,82,82,0.1)', borderRadius: 10, padding: '8px 12px' }}>
            ❌ {sendError}
          </p>
        </div>
      )}

      {/* Actions */}
      <div
        className="flex flex-col gap-2 px-5 pt-4"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        {/* Send to Telegram */}
        <button
          onClick={handleSendToTelegram}
          disabled={rendering || sending}
          className="w-full font-sans font-medium transition-opacity active:opacity-70"
          style={{
            backgroundColor: sent ? '#4CAF82' : rendering || sending ? 'rgba(217,139,82,0.4)' : '#D98B52',
            color: '#fff', borderRadius: 9999,
            padding: '14px 0', fontSize: 15, border: 'none',
            transition: 'background-color 0.2s',
          }}
        >
          {sent ? '✓ Отправлено в Telegram' : sending ? 'Отправка...' : 'Получить в Telegram'}
        </button>

        {/* Download + Share row */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownload}
            disabled={rendering}
            className="flex-1 font-sans font-medium transition-opacity active:opacity-70"
            style={{
              backgroundColor: 'rgba(255,255,255,0.08)',
              color: rendering ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.8)',
              borderRadius: 9999, padding: '12px 0', fontSize: 14, border: 'none',
            }}
          >
            Скачать
          </button>
          <button
            onClick={handleShare}
            disabled={rendering}
            className="flex items-center justify-center transition-opacity active:opacity-60"
            style={{ width: 46, height: 46, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.08)', border: 'none', flexShrink: 0 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={rendering ? 'rgba(255,255,255,0.3)' : '#fff'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

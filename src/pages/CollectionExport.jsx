import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { canShareFiles, createCanvasFile, shouldUseShareFallback, triggerBrowserDownload } from '../lib/cardExport'
import { getMomentDisplayAt } from '../lib/momentTime'
import { plural } from '../lib/ruPlural'
import { getPremiumStatus, openStarsPayment } from '../lib/api'
import { supabase } from '../lib/supabase'
import { tgHaptic } from '../lib/telegram'
import { useAppStore } from '../store/useAppStore'
import { useSwipeBack } from '../hooks/useSwipeBack'

// ─── Canvas constants ────────────────────────────────────────────────────────

const W = 1080
const H = 1920
const POSTER_X = 58
const POSTER_Y = 468
const POSTER_W = W - POSTER_X * 2
const POSTER_BOTTOM = 1708

const MONTH_NOM = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь']
const MONTH_NOM_CAP = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

// ─── Canvas utilities ─────────────────────────────────────────────────────────

function roundRect(ctx, x, y, w, h, r) {
  const safe = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + safe, y)
  ctx.lineTo(x + w - safe, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + safe)
  ctx.lineTo(x + w, y + h - safe)
  ctx.quadraticCurveTo(x + w, y + h, x + w - safe, y + h)
  ctx.lineTo(x + safe, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - safe)
  ctx.lineTo(x, y + safe)
  ctx.quadraticCurveTo(x, y, x + safe, y)
  ctx.closePath()
}

function fillRoundRect(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color
  roundRect(ctx, x, y, w, h, r)
  ctx.fill()
}

function clipRoundRect(ctx, x, y, w, h, r) {
  ctx.save()
  roundRect(ctx, x, y, w, h, r)
  ctx.clip()
}

function drawSoftGlow(ctx, x, y, radius, color, alpha = 1) {
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius)
  glow.addColorStop(0, color)
  glow.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = glow
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
  ctx.restore()
}

function drawPremiumPill(ctx, text, x, y, dark = false, align = 'center') {
  ctx.save()
  ctx.font = '800 20px Inter, sans-serif'
  const padX = 24
  const width = Math.ceil(ctx.measureText(text).width + padX * 2)
  const height = 40
  const left = align === 'center' ? x - width / 2 : x

  const g = ctx.createLinearGradient(left, y, left + width, y + height)
  if (dark) {
    g.addColorStop(0, 'rgba(217,139,82,0.24)')
    g.addColorStop(1, 'rgba(255,244,231,0.08)')
  } else {
    g.addColorStop(0, 'rgba(255,255,255,0.92)')
    g.addColorStop(1, 'rgba(245,235,221,0.72)')
  }

  fillRoundRect(ctx, left, y, width, height, 20, g)
  ctx.strokeStyle = dark ? 'rgba(255,244,231,0.12)' : 'rgba(217,139,82,0.2)'
  ctx.lineWidth = 1.5
  roundRect(ctx, left, y, width, height, 20)
  ctx.stroke()

  ctx.fillStyle = dark ? 'rgba(255,244,231,0.88)' : '#A05E2C'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, left + width / 2, y + height / 2 + 1)
  ctx.restore()
}

function drawKicker(ctx, text, x, y, dark = false, align = 'center') {
  ctx.save()
  ctx.font = '800 19px Inter, sans-serif'
  const label = text.toUpperCase()
  const padX = 20
  const width = Math.ceil(ctx.measureText(label).width + padX * 2)
  const height = 34
  const left = align === 'center' ? x - width / 2 : x
  const g = ctx.createLinearGradient(left, y, left + width, y + height)
  if (dark) {
    g.addColorStop(0, 'rgba(217,139,82,0.26)')
    g.addColorStop(1, 'rgba(255,244,231,0.08)')
  } else {
    g.addColorStop(0, 'rgba(255,255,255,0.9)')
    g.addColorStop(1, 'rgba(245,235,221,0.72)')
  }
  fillRoundRect(ctx, left, y, width, height, 17, g)
  ctx.strokeStyle = dark ? 'rgba(255,244,231,0.13)' : 'rgba(160,94,44,0.16)'
  ctx.lineWidth = 1.4
  roundRect(ctx, left, y, width, height, 17)
  ctx.stroke()
  ctx.fillStyle = dark ? 'rgba(255,244,231,0.78)' : '#A05E2C'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, left + width / 2, y + height / 2 + 1)
  ctx.restore()
}

function formatMomentDay(moment) {
  if (!moment) return ''
  try {
    const d = new Date(getMomentDisplayAt(moment))
    if (Number.isNaN(d.getTime())) return ''
    return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
      .format(d)
      .replace('.', '')
  } catch {
    return ''
  }
}

function trimToWidth(ctx, text, maxWidth) {
  if (!text) return ''
  if (ctx.measureText(text).width <= maxWidth) return text
  let s = text.trim()
  while (s.length > 0 && ctx.measureText(`${s}…`).width > maxWidth) s = s.slice(0, -1)
  return s ? `${s}…` : ''
}

async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

async function drawPhotoCell(ctx, moment, x, y, w, h, r, dark = false, options = {}) {
  ctx.save()
  ctx.shadowColor = dark ? 'rgba(0,0,0,0.5)' : 'rgba(80,50,30,0.26)'
  ctx.shadowBlur = options.featured ? 34 : 20
  ctx.shadowOffsetY = options.featured ? 18 : 11
  fillRoundRect(ctx, x, y, w, h, r, dark ? '#261B15' : '#FFFDF8')
  ctx.restore()

  clipRoundRect(ctx, x, y, w, h, r)

  if (moment?.photo_url) {
    try {
      const img = await loadImage(moment.photo_url)
      const scale = Math.max(w / img.width, h / img.height)
      const dw = img.width * scale
      const dh = img.height * scale
      ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
      ctx.restore()
    } catch {
      ctx.restore()
      drawPlaceholder(ctx, x, y, w, h, r, dark)
      return
    }
  } else {
    ctx.restore()
    drawPlaceholder(ctx, x, y, w, h, r, dark)
    return
  }

  // Overlay gradient + title
  ctx.save()
  roundRect(ctx, x, y, w, h, r)
  ctx.clip()
  const overlay = ctx.createLinearGradient(x, y + h * 0.4, x, y + h)
  overlay.addColorStop(0, 'rgba(0,0,0,0)')
  overlay.addColorStop(0.62, 'rgba(0,0,0,0.2)')
  overlay.addColorStop(1, 'rgba(0,0,0,0.76)')
  ctx.fillStyle = overlay
  ctx.fillRect(x, y, w, h)

  const dayLabel = formatMomentDay(moment)
  if (dayLabel) {
    ctx.font = `800 ${Math.min(20, Math.max(14, Math.round(w * 0.045)))}px Inter, sans-serif`
    const dayPadX = Math.max(12, Math.round(w * 0.035))
    const dayH = Math.max(26, Math.round(w * 0.07))
    const dayW = Math.ceil(ctx.measureText(dayLabel).width + dayPadX * 2)
    const dayX = x + Math.max(12, Math.round(w * 0.04))
    const dayY = y + Math.max(12, Math.round(w * 0.04))
    fillRoundRect(ctx, dayX, dayY, dayW, dayH, dayH / 2, 'rgba(255,250,242,0.88)')
    ctx.fillStyle = '#A05E2C'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(dayLabel, dayX + dayW / 2, dayY + dayH / 2 + 1)
  }

  if (options.badge) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.font = `700 ${Math.round(w * 0.055)}px Inter, sans-serif`
    ctx.textAlign = 'right'
    ctx.textBaseline = 'top'
    ctx.fillText(options.badge, x + w - 18, y + 16)
  }

  if (moment?.title) {
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.font = `800 ${Math.min(30, Math.max(18, Math.round(w * 0.064)))}px Inter, sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    ctx.shadowColor = 'rgba(0,0,0,0.38)'
    ctx.shadowBlur = 10
    ctx.fillText(trimToWidth(ctx, moment.title, w - 38), x + 19, y + h - 18)
  }

  ctx.shadowBlur = 0
  ctx.strokeStyle = 'rgba(255,255,255,0.46)'
  ctx.lineWidth = 2
  roundRect(ctx, x + 1, y + 1, w - 2, h - 2, Math.max(0, r - 1))
  ctx.stroke()

  ctx.restore()
}

function drawPlaceholder(ctx, x, y, w, h, r, dark) {
  clipRoundRect(ctx, x, y, w, h, r)
  const g = ctx.createLinearGradient(x, y, x, y + h)
  if (dark) {
    g.addColorStop(0, '#2A1F18')
    g.addColorStop(1, '#1A1210')
  } else {
    g.addColorStop(0, '#EDE6DC')
    g.addColorStop(1, '#D9CFBF')
  }
  ctx.fillStyle = g
  ctx.fillRect(x, y, w, h)
  ctx.restore()

  // Plus icon hint
  const cx = x + w / 2
  const cy = y + h / 2
  const sz = Math.round(w * 0.11)
  ctx.save()
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.12)' : 'rgba(160,94,44,0.18)'
  ctx.lineWidth = Math.round(w * 0.025)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(cx - sz, cy)
  ctx.lineTo(cx + sz, cy)
  ctx.moveTo(cx, cy - sz)
  ctx.lineTo(cx, cy + sz)
  ctx.stroke()
  ctx.restore()
}

function collageSlots() {
  return [
    { x: POSTER_X + 24, y: POSTER_Y + 32, w: 488, h: 520, r: 34, featured: true },
    { x: 598, y: POSTER_Y + 32, w: 390, h: 246, r: 28 },
    { x: 598, y: POSTER_Y + 306, w: 184, h: 246, r: 26 },
    { x: 804, y: POSTER_Y + 306, w: 184, h: 246, r: 26 },
    { x: POSTER_X + 24, y: 1142, w: 296, h: 286, r: 28 },
    { x: 354, y: 1142, w: 298, h: 286, r: 28 },
    { x: 686, y: 1142, w: 302, h: 286, r: 28 },
    { x: POSTER_X + 24, y: 1456, w: 464, h: 252, r: 30 },
    { x: 520, y: 1456, w: 468, h: 252, r: 30 },
  ]
}

async function drawPremiumCollage(ctx, moments, dark) {
  const frameX = POSTER_X - 8
  const frameY = POSTER_Y - 8
  const frameW = POSTER_W + 16
  const frameH = POSTER_BOTTOM - POSTER_Y + 32
  const frameG = ctx.createLinearGradient(frameX, frameY, frameX + frameW, frameY + frameH)
  if (dark) {
    frameG.addColorStop(0, 'rgba(255,244,231,0.12)')
    frameG.addColorStop(0.52, 'rgba(39,28,21,0.72)')
    frameG.addColorStop(1, 'rgba(217,139,82,0.08)')
  } else {
    frameG.addColorStop(0, 'rgba(255,255,255,0.92)')
    frameG.addColorStop(0.52, 'rgba(250,246,239,0.78)')
    frameG.addColorStop(1, 'rgba(234,220,203,0.66)')
  }

  ctx.save()
  ctx.shadowColor = dark ? 'rgba(0,0,0,0.42)' : 'rgba(80,50,30,0.18)'
  ctx.shadowBlur = 58
  ctx.shadowOffsetY = 28
  fillRoundRect(ctx, frameX, frameY, frameW, frameH, 52, frameG)
  ctx.restore()

  ctx.save()
  ctx.strokeStyle = dark ? 'rgba(255,244,231,0.1)' : 'rgba(160,94,44,0.13)'
  ctx.lineWidth = 2
  roundRect(ctx, frameX, frameY, frameW, frameH, 52)
  ctx.stroke()
  ctx.strokeStyle = dark ? 'rgba(217,139,82,0.2)' : 'rgba(217,139,82,0.22)'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(frameX + 78, frameY + 34)
  ctx.lineTo(frameX + frameW - 78, frameY + 34)
  ctx.stroke()
  ctx.restore()

  const slots = collageSlots()
  const sorted = moments.slice(0, slots.length)
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]
    const more = i === slots.length - 1 && moments.length > slots.length
      ? `+${moments.length - slots.length}`
      : null
    await drawPhotoCell(ctx, sorted[i] ?? null, slot.x, slot.y, slot.w, slot.h, slot.r, dark, {
      featured: slot.featured,
      badge: more,
    })
  }
}

async function drawPersonAvatar(ctx, person, cx, cy, size) {
  const r = size / 2

  // Shadow
  ctx.save()
  ctx.shadowColor = 'rgba(80,50,30,0.22)'
  ctx.shadowBlur = 32
  ctx.shadowOffsetY = 12
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = '#D98B52'
  ctx.fill()
  ctx.restore()

  // Avatar image or initial
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()

  if (person.photo_url) {
    try {
      const img = await loadImage(person.photo_url)
      const side = size
      const scale = Math.max(side / img.width, side / img.height)
      const dw = img.width * scale
      const dh = img.height * scale
      ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh)
      ctx.restore()
    } catch {
      ctx.restore()
      drawAvatarInitial(ctx, person, cx, cy, r)
    }
  } else {
    ctx.restore()
    drawAvatarInitial(ctx, person, cx, cy, r)
  }

  // White ring
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.arc(cx, cy, r + 3, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function drawAvatarInitial(ctx, person, cx, cy, r) {
  // Gradient fill
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()
  const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
  g.addColorStop(0, person.avatar_color ?? '#A05E2C')
  g.addColorStop(1, '#D98B52')
  ctx.fillStyle = g
  ctx.fill()
  ctx.restore()

  // Initial letter
  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.font = `600 ${Math.round(r * 0.9)}px "Cormorant Garamond", Georgia, serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(person.name?.[0]?.toUpperCase() ?? '?', cx, cy + 4)
  ctx.restore()
}

// ─── Canvas draw functions ────────────────────────────────────────────────────

async function drawWarm(canvas, data) {
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#FDF9F3')
  bg.addColorStop(0.5, '#F7F2EA')
  bg.addColorStop(1, '#F0E7DA')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  drawSoftGlow(ctx, W * 0.72, H * 0.12, W * 0.38, 'rgba(255,255,255,0.9)', 1)
  drawSoftGlow(ctx, W * 0.26, H * 0.36, W * 0.3, 'rgba(233,210,188,0.7)', 0.8)
  drawSoftGlow(ctx, W * 0.86, H * 0.78, W * 0.28, 'rgba(217,139,82,0.16)', 0.7)

  await drawHeader(ctx, data, false)
  await drawPremiumCollage(ctx, data.moments, false)
  drawFooter(ctx, data, false)
}

async function drawDark(canvas, data) {
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#261B15')
  bg.addColorStop(0.45, '#1D1510')
  bg.addColorStop(1, '#17140E')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  drawSoftGlow(ctx, W * 0.78, H * 0.12, W * 0.32, 'rgba(217,139,82,0.18)', 1)
  drawSoftGlow(ctx, W * 0.28, H * 0.3, W * 0.26, 'rgba(133,79,44,0.16)', 0.7)
  drawSoftGlow(ctx, W * 0.84, H * 0.78, W * 0.28, 'rgba(217,139,82,0.1)', 0.9)

  await drawHeader(ctx, data, true)
  await drawPremiumCollage(ctx, data.moments, true)
  drawFooter(ctx, data, true)
}

async function drawHeader(ctx, data, dark) {
  const textColor = dark ? 'rgba(255,244,230,0.95)' : '#17140E'
  const midColor = dark ? 'rgba(245,235,221,0.55)' : '#8A7A6A'
  const accentColor = '#D98B52'
  const cx = W / 2

  // memi wordmark
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillStyle = accentColor
  ctx.font = '700 40px "Cormorant Garamond", Georgia, serif'
  ctx.fillText('memi', cx, 48)
  drawKicker(ctx, 'premium memory card', cx, 104, dark)

  if (data.type === 'person') {
    const avatarY = 166
    if (data.person) await drawPersonAvatar(ctx, data.person, cx, avatarY + 58, 116)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle = textColor
    ctx.font = `600 72px "Cormorant Garamond", Georgia, serif`
    ctx.fillText('Наши моменты', cx, 300)

    ctx.fillStyle = accentColor
    ctx.font = '700 34px Inter, sans-serif'
    ctx.fillText(`с ${data.person?.name ?? '…'}`, cx, 380)

    ctx.fillStyle = midColor
    ctx.font = '500 26px Inter, sans-serif'
    ctx.fillText(data.statsLine, cx, 426)

  } else if (data.type === 'month') {
    const [year, month] = data.key.split('-')
    const monthName = MONTH_NOM[Number(month) - 1] ?? ''
    const monthNumber = String(Number(month)).padStart(2, '0')

    ctx.save()
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillStyle = dark ? 'rgba(217,139,82,0.2)' : 'rgba(217,139,82,0.18)'
    ctx.font = '800 188px Inter, sans-serif'
    ctx.fillText(monthNumber, 724, 150)
    ctx.restore()

    ctx.save()
    ctx.strokeStyle = dark ? 'rgba(255,244,231,0.14)' : 'rgba(160,94,44,0.14)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(118, 408)
    ctx.lineTo(W - 118, 408)
    ctx.stroke()
    ctx.restore()

    ctx.fillStyle = textColor
    ctx.font = `700 132px "Cormorant Garamond", Georgia, serif`
    ctx.fillText(`Мой ${monthName}`, cx, 162)

    ctx.fillStyle = midColor
    ctx.font = '700 34px Inter, sans-serif'
    ctx.fillText(`${MONTH_NOM_CAP[Number(month) - 1]} ${year}`, cx, 312)

    drawPremiumPill(ctx, data.statsLine, cx, 356, dark)

  } else if (data.type === 'year') {
    ctx.fillStyle = accentColor
    ctx.font = `700 138px "Cormorant Garamond", Georgia, serif`
    ctx.fillText(data.key, cx, 150)

    ctx.fillStyle = textColor
    ctx.font = `600 62px "Cormorant Garamond", Georgia, serif`
    ctx.fillText('Мой год', cx, 306)

    ctx.fillStyle = midColor
    ctx.font = '600 28px Inter, sans-serif'
    ctx.fillText('год в воспоминаниях', cx, 382)

    drawPremiumPill(ctx, data.statsLine, cx, 434, dark)
  }
}

function drawFooter(ctx, data, dark) {
  const cx = W / 2

  // Separator
  const sepY = POSTER_BOTTOM + 52
  ctx.save()
  ctx.strokeStyle = dark ? 'rgba(255,244,230,0.1)' : 'rgba(160,94,44,0.12)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(POSTER_X + 40, sepY)
  ctx.lineTo(W - POSTER_X - 40, sepY)
  ctx.stroke()
  ctx.restore()

  // Bottom memi branding
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillStyle = dark ? 'rgba(245,235,221,0.28)' : 'rgba(138,122,106,0.5)'
  ctx.font = '500 26px "Cormorant Garamond", Georgia, serif'
  ctx.fillText('memi — ваши воспоминания', cx, H - 72)
}

// ─── Data hook ────────────────────────────────────────────────────────────────

function useCollectionData(type, key) {
  const moments = useAppStore((s) => s.moments)
  const people = useAppStore((s) => s.people)

  return useMemo(() => {
    if (type === 'month') {
      const filtered = moments
        .filter((m) => {
          const d = new Date(getMomentDisplayAt(m))
          const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          return mk === key
        })
        .sort((a, b) => new Date(getMomentDisplayAt(a)) - new Date(getMomentDisplayAt(b)))

      const uniquePeople = new Set(filtered.flatMap((m) => (m.people ?? []).map((p) => p.id))).size

      return {
        type,
        key,
        moments: filtered,
        person: null,
        statsLine: `${filtered.length} ${plural.момент(filtered.length)} · ${uniquePeople} ${plural.человек(uniquePeople)}`,
      }
    }

    if (type === 'person') {
      const person = people.find((p) => p.id === key)
      const filtered = moments
        .filter((m) => (m.people ?? []).some((p) => p.id === key))
        .sort((a, b) => new Date(getMomentDisplayAt(a)) - new Date(getMomentDisplayAt(b)))

      return {
        type,
        key,
        moments: filtered,
        person: person ?? null,
        statsLine: `${filtered.length} ${plural.момент(filtered.length)} вместе`,
      }
    }

    if (type === 'year') {
      const filtered = moments
        .filter((m) => new Date(getMomentDisplayAt(m)).getFullYear() === Number(key))
        .sort((a, b) => new Date(getMomentDisplayAt(a)) - new Date(getMomentDisplayAt(b)))

      const uniquePeople = new Set(filtered.flatMap((m) => (m.people ?? []).map((p) => p.id))).size

      return {
        type,
        key,
        moments: filtered,
        person: null,
        statsLine: `${filtered.length} ${plural.момент(filtered.length)} · ${uniquePeople} ${plural.человек(uniquePeople)}`,
      }
    }

    return { type, key, moments: [], person: null, statsLine: '' }
  }, [type, key, moments, people])
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function collectionTitle(type, key, personName) {
  if (type === 'person') return `Наши моменты с ${personName ?? '…'}`
  if (type === 'month') {
    const [year, month] = key.split('-')
    return `${MONTH_NOM_CAP[Number(month) - 1]} ${year}`
  }
  if (type === 'year') return `Мой ${key}`
  return 'Коллекция'
}

function collectionFilename(type, key) {
  if (type === 'person') return `memi-people-${key.slice(0, 8)}.jpg`
  if (type === 'month') return `memi-month-${key}.jpg`
  if (type === 'year') return `memi-year-${key}.jpg`
  return 'memi-collection.jpg'
}

const TEMPLATES = [
  { id: 'warm', label: 'Тёплый', draw: drawWarm },
  { id: 'dark', label: 'Ночь', draw: drawDark },
]

const PREMIUM_PERKS = [
  { icon: '🖼', text: 'Альбом месяца — красивый коллаж' },
  { icon: '👥', text: 'Наши моменты с человеком' },
  { icon: '📅', text: 'Мой год в воспоминаниях' },
  { icon: '⭐', text: 'Бейдж Premium на профиле' },
]

// ─── Premium paywall sheet ────────────────────────────────────────────────────

function PremiumSheet({ onClose, onUnlocked }) {
  const currentUser = useAppStore((s) => s.currentUser)
  const setIsPremium = useAppStore((s) => s.setIsPremium)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleBuy() {
    const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id
    if (loading) return
    if (!telegramId) {
      setError('Открой приложение через Telegram — оплата недоступна в браузере')
      return
    }

    setLoading(true)
    setError(null)
    let activatedByPoll = false

    try {
      const status = await openStarsPayment('premium', telegramId, {
        pollActivated: async () => {
          const s = await getPremiumStatus(currentUser.id)
          if (s.isPremium) {
            activatedByPoll = true
            setIsPremium(true, s.premiumExpiresAt)
            return true
          }
          return false
        },
      })

      if (status === 'paid' || activatedByPoll) {
        if (!activatedByPoll) setIsPremium(true, null)
        tgHaptic('medium')
        onUnlocked()
        onClose()
        return
      }

      if (status === 'timeout') {
        setError('Время ожидания истекло. Если звёзды списались — перезапусти приложение.')
      } else if (status !== 'cancelled') {
        setError('Оплата не завершена. Если звёзды списались — попробуй перезапустить.')
      }
    } catch (err) {
      setError(err?.message || 'Не удалось открыть оплату. Попробуй ещё раз.')
      console.error('[PremiumSheet]', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ backgroundColor: 'rgba(23,20,14,0.62)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="px-4 pt-6 rounded-t-[32px]"
        style={{ backgroundColor: 'var(--base)', paddingBottom: 'max(28px, env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="mx-auto mb-5" style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(160,94,44,0.18)' }} />

        {/* Header */}
        <div className="flex flex-col items-center" style={{ marginBottom: 24 }}>
          <div
            className="flex items-center justify-center"
            style={{
              width: 64, height: 64, borderRadius: 20,
              background: 'linear-gradient(135deg, #D98B52 0%, #A05E2C 100%)',
              boxShadow: '0 12px 28px rgba(190,109,52,0.3)',
              marginBottom: 14,
              fontSize: 30,
            }}
          >
            ⭐
          </div>
          <p className="font-sans" style={{ color: 'var(--text)', fontSize: 20, fontWeight: 700, margin: 0 }}>
            Memi Premium
          </p>
          <p className="font-sans text-center" style={{ color: 'var(--mid)', fontSize: 13, marginTop: 6, maxWidth: 260 }}>
            Открой все функции работы с воспоминаниями
          </p>
        </div>

        {/* Perks */}
        <div
          style={{
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(160,94,44,0.08)',
            padding: '4px 0',
            marginBottom: 16,
          }}
        >
          {PREMIUM_PERKS.map((perk, i) => (
            <div
              key={perk.text}
              className="flex items-center gap-3"
              style={{
                padding: '12px 16px',
                borderTop: i === 0 ? 'none' : '1px solid rgba(160,94,44,0.07)',
              }}
            >
              <span style={{ fontSize: 20, width: 28, flexShrink: 0, textAlign: 'center' }}>{perk.icon}</span>
              <span className="font-sans" style={{ color: 'var(--text)', fontSize: 14, fontWeight: 500 }}>{perk.text}</span>
            </div>
          ))}
        </div>

        {/* Price note */}
        <div
          className="font-sans text-center"
          style={{
            backgroundColor: 'rgba(217,139,82,0.08)',
            borderRadius: 14,
            color: 'var(--mid)',
            fontSize: 13,
            padding: '10px 16px',
            marginBottom: 16,
          }}
        >
          99 ⭐ · 30 дней · отменяется в любой момент
        </div>

        {error && (
          <p className="font-sans text-center" style={{ color: '#E05252', fontSize: 13, marginBottom: 10 }}>{error}</p>
        )}

        <button
          type="button"
          onClick={handleBuy}
          disabled={loading}
          className="w-full font-sans font-bold transition-opacity active:opacity-70 disabled:opacity-60"
          style={{
            border: 'none',
            borderRadius: 20,
            minHeight: 56,
            background: loading ? 'var(--surface)' : 'linear-gradient(135deg, #D98B52 0%, #A05E2C 100%)',
            color: loading ? 'var(--soft)' : '#fff',
            fontSize: 17,
            boxShadow: loading ? 'none' : '0 12px 28px rgba(190,109,52,0.32)',
            marginBottom: 10,
          }}
        >
          {loading ? 'Открываю оплату...' : 'Оформить · 99 ⭐'}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-full font-sans transition-opacity active:opacity-60"
          style={{ background: 'none', border: 'none', color: 'var(--mid)', fontSize: 14, paddingBottom: 4 }}
        >
          Не сейчас
        </button>
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CollectionExport() {
  const { type, key } = useParams()
  const canvasRef = useRef(null)

  const data = useCollectionData(type, key)
  const isPremium = useAppStore((s) => s.isPremium)

  const [template, setTemplate] = useState('warm')
  const [showPaywall, setShowPaywall] = useState(false)
  const [rendering, setRendering] = useState(false)
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState(null)
  const { goBack, swipeBackHandlers } = useSwipeBack({
    enabled: !showPaywall && !sending,
    fallbackPath: '/archive',
  })

  // Show paywall immediately if not premium
  useEffect(() => {
    if (!isPremium) setShowPaywall(true)
  }, [isPremium])

  const dark = template === 'dark'
  const activeTemplate = TEMPLATES.find((t) => t.id === template) ?? TEMPLATES[0]

  useEffect(() => {
    if (!canvasRef.current) return

    let cancelled = false
    setRendering(true)
    setError(null)

    async function render() {
      try {
        await document.fonts?.ready
        if (cancelled) return
        await activeTemplate.draw(canvasRef.current, data)
        if (!cancelled) setRendering(false)
      } catch (err) {
        if (!cancelled) {
          console.error('[CollectionExport] render error:', err)
          setError('Не удалось собрать карточку')
          setRendering(false)
        }
      }
    }

    render()
    return () => { cancelled = true }
  }, [activeTemplate, data])

  async function getFile() {
    if (!canvasRef.current) return null
    return createCanvasFile(canvasRef.current, collectionFilename(type, key), 0.88)
  }

  async function handleDownload() {
    tgHaptic('light')
    const file = await getFile()
    if (file) triggerBrowserDownload(file)
  }

  async function shareCardFile(file) {
    await navigator.share({ files: [file] })
  }

  async function handleShare() {
    tgHaptic('light')
    try {
      const file = await getFile()
      if (file && canShareFiles([file])) {
        await shareCardFile(file)
        return
      }
    } catch (err) {
      if (err?.name === 'AbortError') return
    }
    handleDownload()
  }

  async function handleSendToTelegram() {
    if (!canvasRef.current || sending || sent) return

    const chatId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id
    if (!chatId) {
      setSendError('Открой через Telegram-бота, чтобы отправить туда')
      return
    }

    tgHaptic('medium')
    setSending(true)
    setSendError(null)

    try {
      const imageBase64 = canvasRef.current.toDataURL('image/jpeg', 0.84)
      const caption = collectionTitle(type, key, data.person?.name)

      const { data: resp, error: invokeError } = await supabase.functions.invoke('send-card', {
        body: { imageBase64, chatId, caption: `✨ ${caption}` },
      })

      if (invokeError) throw new Error(invokeError.message ?? 'Ошибка отправки')
      if (resp?.error) throw new Error(resp.error)

      setSent(true)
      tgHaptic('light')
      setTimeout(() => setSent(false), 3000)
    } catch (err) {
      console.error('[CollectionExport] send-card error:', err)
      setSendError(err.message || 'Не удалось отправить карточку')
    } finally {
      setSending(false)
    }
  }

  const useFallback = shouldUseShareFallback()

  return (
  <>
    <div
      className="flex h-full flex-col animate-route-enter"
      {...swipeBackHandlers}
      style={{ backgroundColor: dark ? '#17140E' : 'var(--base)', ...swipeBackHandlers.style }}
    >
      {/* Topbar */}
      <div
        className="px-4 pt-topbar"
        style={{
          paddingBottom: 16,
          backgroundColor: dark ? '#17140E' : 'var(--base)',
        }}
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-2 transition-opacity active:opacity-60"
            style={{ background: 'none', border: 'none', padding: '8px 0', color: dark ? 'rgba(245,235,221,0.6)' : 'var(--mid)', fontSize: 15, fontWeight: 500 }}
          >
            <svg width="9" height="15" viewBox="0 0 9 15" fill="none">
              <path d="M7.5 1.5L1.5 7.5l6 6" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Назад
          </button>

          <span className="font-sans" style={{ fontSize: 17, fontWeight: 600, color: dark ? 'rgba(255,244,230,0.9)' : 'var(--text)' }}>
            Коллекция
          </span>

          <div style={{ width: 60 }} />
        </div>
      </div>

      <div className="hide-scrollbar flex-1 overflow-y-auto">
        {/* Canvas preview */}
        <div className="px-4 pt-2 pb-4">
          <div
            className="mx-auto w-full"
            style={{ maxWidth: 'min(340px, calc((100vh - 280px) * 9 / 16))' }}
          >
            <div
              className="relative overflow-hidden rounded-[34px] p-[10px]"
              style={{
                background: dark
                  ? 'linear-gradient(180deg, rgba(255,244,231,0.07) 0%, rgba(255,244,231,0.02) 100%)'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(247,240,232,0.68) 100%)',
                border: dark ? '1px solid rgba(255,244,231,0.08)' : '1px solid rgba(160,94,44,0.08)',
                boxShadow: dark ? '0 28px 56px rgba(0,0,0,0.28)' : '0 24px 52px rgba(80,50,30,0.14)',
              }}
            >
              <div className="relative overflow-hidden rounded-[28px]" style={{ border: dark ? '1px solid rgba(255,244,231,0.07)' : '1px solid rgba(160,94,44,0.07)' }}>
                <canvas
                  ref={canvasRef}
                  style={{
                    width: '100%',
                    aspectRatio: '9 / 16',
                    display: 'block',
                    borderRadius: 28,
                    backgroundColor: dark ? '#1F1712' : '#FBF7F0',
                  }}
                />

                {rendering && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-[28px]" style={{ backgroundColor: dark ? 'rgba(23,20,14,0.48)' : 'rgba(247,244,240,0.56)' }}>
                    <span className="font-sans" style={{ color: dark ? 'rgba(245,235,221,0.7)' : 'var(--mid)', fontSize: 13, fontWeight: 600 }}>
                      Собираем...
                    </span>
                  </div>
                )}

                {error && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-[28px]">
                    <span className="font-sans" style={{ color: '#D94040', fontSize: 13, fontWeight: 600 }}>{error}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Template picker */}
        <div className="px-4" style={{ paddingBottom: 8 }}>
          <div className="flex gap-3">
            {TEMPLATES.map((t) => {
              const active = t.id === template
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { tgHaptic('light'); setTemplate(t.id) }}
                  className="font-sans transition-opacity active:opacity-70"
                  style={{
                    border: 'none',
                    borderRadius: 20,
                    backgroundColor: active
                      ? (dark ? 'rgba(217,139,82,0.22)' : 'rgba(217,139,82,0.12)')
                      : (dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)'),
                    boxShadow: active
                      ? `0 0 0 1.5px #D98B52`
                      : 'none',
                    color: active ? '#D98B52' : (dark ? 'rgba(245,235,221,0.5)' : 'var(--mid)'),
                    fontSize: 14,
                    fontWeight: active ? 700 : 500,
                    padding: '9px 20px',
                  }}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Stats label */}
        <div className="px-4" style={{ paddingBottom: 16, paddingTop: 8 }}>
          <p
            className="font-sans text-center"
            style={{
              margin: 0,
              color: dark ? 'rgba(245,235,221,0.45)' : 'var(--soft)',
              fontSize: 13,
              fontWeight: 500,
              minHeight: 20,
            }}
          >
            {data.statsLine}
          </p>
        </div>

        {/* Action buttons */}
        <div className="px-4" style={{ paddingBottom: 32 }}>
          {sendError && (
            <p
              className="font-sans text-center"
              style={{
                marginBottom: 12,
                borderRadius: 16,
                backgroundColor: 'rgba(217,64,64,0.08)',
                color: '#D94040',
                fontSize: 13,
                fontWeight: 500,
                padding: '10px 14px',
              }}
            >
              {sendError}
            </p>
          )}

          <button
            type="button"
            onClick={handleSendToTelegram}
            disabled={rendering || sending}
            className="w-full font-sans transition-opacity active:opacity-70"
            style={{
              border: 'none',
              borderRadius: 20,
              minHeight: 56,
              backgroundColor: sent ? '#4CAF82' : (rendering || sending ? 'rgba(217,139,82,0.45)' : 'var(--accent)'),
              color: '#fff',
              fontSize: 17,
              fontWeight: 700,
              boxShadow: sent || rendering || sending ? 'none' : 'var(--shadow-accent)',
            }}
          >
            {sent ? '✓ Отправлено в Telegram' : sending ? 'Отправляем...' : 'Получить в Telegram'}
          </button>

          <div className="mt-3 grid grid-cols-[1fr_56px] gap-3">
            <button
              type="button"
              onClick={useFallback ? handleDownload : handleShare}
              disabled={rendering}
              className="font-sans font-semibold transition-opacity active:opacity-70 disabled:opacity-50"
              style={{
                border: 'none',
                borderRadius: 20,
                minHeight: 52,
                backgroundColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)',
                boxShadow: dark ? 'none' : '0 2px 12px rgba(80,50,30,0.1)',
                color: dark ? 'rgba(245,235,221,0.8)' : 'var(--text)',
                fontSize: 16,
              }}
            >
              {useFallback ? 'Скачать' : 'Поделиться'}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={rendering}
              aria-label="Скачать"
              className="flex items-center justify-center transition-opacity active:opacity-70 disabled:opacity-50"
              style={{
                border: 'none',
                borderRadius: 20,
                minHeight: 52,
                backgroundColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)',
                boxShadow: dark ? 'none' : '0 2px 12px rgba(80,50,30,0.1)',
                color: dark ? 'rgba(245,235,221,0.6)' : 'var(--mid)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 3v13M7 11l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    {showPaywall && (
      <PremiumSheet
        onClose={() => {
          tgHaptic('light')
          setShowPaywall(false)
          if (!isPremium) goBack()
        }}
        onUnlocked={() => setShowPaywall(false)}
      />
    )}
  </>
  )
}

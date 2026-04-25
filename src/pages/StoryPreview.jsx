import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { canShareFiles, createCanvasFile, getCardFilename, shouldUseShareFallback, triggerBrowserDownload } from '../lib/cardExport'
import { proxifyCoverUrl } from '../lib/imageProxy'
import { getMomentDisplayAt } from '../lib/momentTime'
import { openStarsPayment } from '../lib/api'
import { supabase } from '../lib/supabase'
import { tgHaptic } from '../lib/telegram'
import { useAppStore } from '../store/useAppStore'

const TEMPLATES = [
  { id: 'polaroid', label: 'Полароид', hint: 'Тёплая бумага, мягкие тени и эффект личной заметки' },
  { id: 'minimal', label: 'Минимал', hint: 'Галерейная подача с воздухом и аккуратной типографикой' },
  { id: 'dark', label: 'Ночь', hint: 'Кинематографичный контраст с глубиной и мягким свечением' },
  { id: 'summer', label: '🌅 Лето', hint: 'Солнечные оттенки и тёплое лето в каждой карточке', paid: true, themeKey: 'summer' },
  { id: 'cinema', label: '🎬 Кино', hint: 'Плёночная эстетика и кинематографичный формат', paid: true, themeKey: 'cinema' },
]

const COLOR = {
  base: '#F7F4F0',
  card: '#FBF7F0',
  cardAlt: '#F3ECE3',
  paper: '#FFFDF9',
  paperWarm: '#F8F0E6',
  accent: '#D98B52',
  accentStrong: '#BE6D34',
  accentLight: '#E9D2BC',
  accentMist: 'rgba(217, 139, 82, 0.16)',
  text: '#17140E',
  mid: '#8A7A6A',
  soft: '#B8A898',
  line: 'rgba(160, 94, 44, 0.14)',
  darkBg: '#17140E',
  darkCard: '#221A14',
  darkCardAlt: '#34271E',
  darkLine: 'rgba(255,244,230,0.12)',
  darkTextSoft: 'rgba(245,235,221,0.7)',
}

function formatStoryDate(iso) {
  if (!iso) return ''

  const date = new Date(iso)
  const weekday = date.toLocaleDateString('ru-RU', { weekday: 'short' }).replace('.', '')
  const dayMonth = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  return `${weekday} · ${dayMonth}`
}

function trimToWidth(ctx, text, maxWidth) {
  if (!text) return ''
  if (ctx.measureText(text).width <= maxWidth) return text

  let value = text.trim()
  while (value.length > 0 && ctx.measureText(`${value}...`).width > maxWidth) {
    value = value.slice(0, -1)
  }

  return value ? `${value}...` : ''
}

function forceEllipsis(ctx, text, maxWidth) {
  let value = text.trim()
  while (value.length > 0 && ctx.measureText(`${value}...`).width > maxWidth) {
    value = value.slice(0, -1)
  }

  return value ? `${value}...` : '...'
}

function wrapText(ctx, text, maxWidth, maxLines = 3) {
  if (!text) return []

  const words = text.trim().split(/\s+/)
  const lines = []
  let current = ''
  let truncated = false

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word

    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate
      continue
    }

    if (!current) {
      lines.push(trimToWidth(ctx, word, maxWidth))
    } else {
      lines.push(current)
      current = ctx.measureText(word).width <= maxWidth ? word : trimToWidth(ctx, word, maxWidth)
    }

    if (lines.length === maxLines) {
      truncated = true
      current = ''
      break
    }
  }

  if (current) {
    lines.push(current)
  }

  if (truncated && lines.length > 0) {
    lines[lines.length - 1] = forceEllipsis(ctx, lines[lines.length - 1], maxWidth)
  }

  return lines.slice(0, maxLines)
}

function roundRect(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2)

  ctx.beginPath()
  ctx.moveTo(x + safeRadius, y)
  ctx.lineTo(x + width - safeRadius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius)
  ctx.lineTo(x + width, y + height - safeRadius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height)
  ctx.lineTo(x + safeRadius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius)
  ctx.lineTo(x, y + safeRadius)
  ctx.quadraticCurveTo(x, y, x + safeRadius, y)
  ctx.closePath()
}

function fillRoundRect(ctx, x, y, width, height, radius, color) {
  ctx.fillStyle = color
  roundRect(ctx, x, y, width, height, radius)
  ctx.fill()
}

function strokeRoundRect(ctx, x, y, width, height, radius, color, lineWidth = 1) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  roundRect(ctx, x, y, width, height, radius)
  ctx.stroke()
  ctx.restore()
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

function drawHairline(ctx, x, y, width, color, lineWidth = 1) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + width, y)
  ctx.stroke()
  ctx.restore()
}

function clipRoundRect(ctx, x, y, width, height, radius) {
  ctx.save()
  roundRect(ctx, x, y, width, height, radius)
  ctx.clip()
}

function clipTopRoundRect(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height)

  ctx.save()
  ctx.beginPath()
  ctx.moveTo(x, y + height)
  ctx.lineTo(x, y + safeRadius)
  ctx.quadraticCurveTo(x, y, x + safeRadius, y)
  ctx.lineTo(x + width - safeRadius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius)
  ctx.lineTo(x + width, y + height)
  ctx.closePath()
  ctx.clip()
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

async function drawPhoto(ctx, moment, x, y, width, height, radius, dark = false, topOnly = false) {
  if (topOnly) {
    clipTopRoundRect(ctx, x, y, width, height, radius)
  } else {
    clipRoundRect(ctx, x, y, width, height, radius)
  }

  if (moment.photo_url) {
    try {
      const image = await loadImage(moment.photo_url)
      const scale = Math.max(width / image.width, height / image.height)
      const drawWidth = image.width * scale
      const drawHeight = image.height * scale
      const drawX = x + (width - drawWidth) / 2
      const drawY = y + (height - drawHeight) / 2
      ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight)
      ctx.restore()
      return
    } catch {
      // Gradient fallback below.
    }
  }

  const gradient = ctx.createLinearGradient(x, y, x, y + height)
  if (dark) {
    gradient.addColorStop(0, '#6C3D77')
    gradient.addColorStop(0.35, '#C55A1D')
    gradient.addColorStop(1, '#F3CF78')
  } else {
    gradient.addColorStop(0, '#6D3B83')
    gradient.addColorStop(0.38, '#D86821')
    gradient.addColorStop(1, '#F4D06E')
  }

  ctx.fillStyle = gradient
  ctx.fillRect(x, y, width, height)
  ctx.restore()
}

function drawBackground(ctx, template, width, height) {
  if (template === 'dark') {
    const darkGradient = ctx.createLinearGradient(0, 0, 0, height)
    darkGradient.addColorStop(0, '#261B15')
    darkGradient.addColorStop(0.45, '#1D1510')
    darkGradient.addColorStop(1, COLOR.darkBg)
    ctx.fillStyle = darkGradient
    ctx.fillRect(0, 0, width, height)

    drawSoftGlow(ctx, width * 0.78, height * 0.14, width * 0.34, 'rgba(217,139,82,0.2)', 1)
    drawSoftGlow(ctx, width * 0.26, height * 0.42, width * 0.28, 'rgba(133,79,44,0.18)', 0.72)
    return
  }

  const baseGradient = ctx.createLinearGradient(0, 0, 0, height)
  if (template === 'minimal') {
    baseGradient.addColorStop(0, '#FFFCF7')
    baseGradient.addColorStop(0.55, '#F7F2EB')
    baseGradient.addColorStop(1, '#F1EBE2')
  } else {
    baseGradient.addColorStop(0, '#FDF9F3')
    baseGradient.addColorStop(0.52, '#F7F2EA')
    baseGradient.addColorStop(1, '#F1E8DE')
  }

  ctx.fillStyle = baseGradient
  ctx.fillRect(0, 0, width, height)

  if (template === 'polaroid') {
    drawSoftGlow(ctx, width * 0.68, height * 0.18, width * 0.34, 'rgba(255,255,255,0.94)', 1)
    drawSoftGlow(ctx, width * 0.34, height * 0.7, width * 0.3, 'rgba(233,210,188,0.72)', 0.85)
    drawSoftGlow(ctx, width * 0.78, height * 0.9, width * 0.22, 'rgba(217,139,82,0.14)', 0.75)
    return
  }

  drawSoftGlow(ctx, width * 0.82, height * 0.16, width * 0.24, 'rgba(255,255,255,0.96)', 1)
  drawSoftGlow(ctx, width * 0.28, height * 0.24, width * 0.26, 'rgba(233,210,188,0.5)', 0.72)
}

async function drawSongChip(ctx, x, y, width, moment, theme) {
  if (!moment.song_title) return 0

  const chipHeight = theme.height ?? 144
  const padding = theme.padding ?? 20
  const coverSize = theme.coverSize ?? 88
  const coverX = x + padding
  const coverY = y + (chipHeight - coverSize) / 2
  const textX = coverX + coverSize + 20
  const textWidth = width - (textX - x) - padding

  if (theme.shadowColor) {
    ctx.save()
    ctx.shadowColor = theme.shadowColor
    ctx.shadowBlur = theme.shadowBlur ?? 26
    ctx.shadowOffsetY = theme.shadowOffsetY ?? 14
    fillRoundRect(ctx, x, y, width, chipHeight, theme.radius ?? 32, theme.songBg)
    ctx.restore()
  } else {
    fillRoundRect(ctx, x, y, width, chipHeight, theme.radius ?? 32, theme.songBg)
  }

  if (theme.songBorder) {
    strokeRoundRect(ctx, x, y, width, chipHeight, theme.radius ?? 32, theme.songBorder, theme.songBorderWidth ?? 1)
  }

  const songCover = proxifyCoverUrl(moment.song_cover)

  if (songCover) {
    try {
      await drawPhoto(ctx, { photo_url: songCover }, coverX, coverY, coverSize, coverSize, theme.coverRadius ?? 24, theme.dark)
    } catch {
      fillRoundRect(ctx, coverX, coverY, coverSize, coverSize, theme.coverRadius ?? 24, theme.songIconBg)
    }
  } else {
    fillRoundRect(ctx, coverX, coverY, coverSize, coverSize, theme.coverRadius ?? 24, theme.songIconBg)
    ctx.save()
    ctx.strokeStyle = theme.songIconStroke
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(coverX + 40, coverY + 22)
    ctx.lineTo(coverX + 40, coverY + 62)
    ctx.lineTo(coverX + 62, coverY + 55)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(coverX + 31, coverY + 62, 7.4, 0, Math.PI * 2)
    ctx.arc(coverX + 62, coverY + 55, 7.4, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  ctx.textBaseline = 'top'

  if (theme.eyebrow) {
    ctx.fillStyle = theme.eyebrowColor ?? theme.songSubtitle
    ctx.font = theme.eyebrowFont ?? '700 18px Inter, sans-serif'
    ctx.fillText(theme.eyebrow.toUpperCase(), textX, y + 22)
  }

  ctx.fillStyle = theme.songTitle
  ctx.font = theme.titleFont ?? '700 36px Inter, sans-serif'
  ctx.fillText(trimToWidth(ctx, moment.song_title, textWidth), textX, y + (theme.eyebrow ? 46 : 32))

  if (moment.song_artist) {
    ctx.fillStyle = theme.songSubtitle
    ctx.font = theme.subtitleFont ?? '500 29px Inter, sans-serif'
    ctx.fillText(trimToWidth(ctx, moment.song_artist, textWidth), textX, y + (theme.eyebrow ? 88 : 76))
  }

  return chipHeight
}

function drawTextBlock(ctx, lines, x, y, lineHeight) {
  let currentY = y

  for (const line of lines) {
    ctx.fillText(line, x, currentY)
    currentY += lineHeight
  }

  return currentY
}

function drawTopBadge(ctx, text, x, y, theme) {
  ctx.font = theme.font ?? '700 24px Inter, sans-serif'
  const paddingX = theme.paddingX ?? 18
  const height = theme.height ?? 44
  const width = ctx.measureText(text).width + paddingX * 2
  fillRoundRect(ctx, x - width, y, width, height, height / 2, theme.badgeBg)
  if (theme.border) {
    strokeRoundRect(ctx, x - width, y, width, height, height / 2, theme.border, theme.borderWidth ?? 1)
  }
  ctx.fillStyle = theme.badgeText
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x - width + paddingX, y + height / 2)
}

function drawCanvasHeader(ctx, { logoX, logoY, dateX, dateY, dateText, dark = false }) {
  ctx.textBaseline = 'top'
  ctx.fillStyle = dark ? '#FFF3E4' : COLOR.text
  ctx.font = '600 48px "Cormorant Garamond", Georgia, serif'
  ctx.fillText('memi', logoX, logoY)

  ctx.fillStyle = dark ? 'rgba(245, 235, 221, 0.68)' : COLOR.mid
  ctx.font = '600 24px Inter, sans-serif'
  ctx.fillText(dateText, dateX - ctx.measureText(dateText).width, dateY)
}

function getMomentPeopleNames(moment) {
  return [...new Set([
    ...(moment.people ?? []).map((person) => person?.name?.trim()),
    ...(moment.taggedFriends ?? []).map((friend) => friend?.name?.trim()),
  ].filter(Boolean))]
}

function getWrappedTextMetrics(ctx, text, font, maxWidth, maxLines, lineHeight) {
  if (!text) return { lines: [], height: 0 }

  ctx.save()
  ctx.font = font
  const lines = wrapText(ctx, text, maxWidth, maxLines)
  ctx.restore()

  return {
    lines,
    height: lines.length * lineHeight,
  }
}

function drawSectionEyebrow(ctx, text, x, y, theme = {}) {
  const lineWidth = theme.lineWidth ?? 36
  const lineColor = theme.lineColor ?? theme.color ?? COLOR.accent

  ctx.textBaseline = 'top'
  fillRoundRect(ctx, x, y + 10, lineWidth, 4, 2, lineColor)
  ctx.fillStyle = theme.color ?? COLOR.accentStrong
  ctx.font = theme.font ?? '700 22px Inter, sans-serif'
  ctx.fillText(text.toUpperCase(), x + lineWidth + 14, y)

  return y + (theme.height ?? 28)
}

function drawMetaItem(ctx, {
  label,
  value,
  x,
  y,
  maxWidth,
  labelColor = COLOR.soft,
  labelFont = '700 20px Inter, sans-serif',
  valueColor = COLOR.text,
  valueFont = '500 34px Inter, sans-serif',
  valueLineHeight = 42,
  maxLines = 2,
  labelGap = 28,
}) {
  if (!value) return y

  ctx.textBaseline = 'top'
  ctx.fillStyle = labelColor
  ctx.font = labelFont
  ctx.fillText(label.toUpperCase(), x, y)

  ctx.fillStyle = valueColor
  ctx.font = valueFont
  const lines = wrapText(ctx, value, maxWidth, maxLines)
  return drawTextBlock(ctx, lines, x, y + labelGap, valueLineHeight)
}

function drawMoodChip(ctx, x, y, mood, theme) {
  const paddingX = theme.paddingX ?? 18
  const height = theme.height ?? 58

  ctx.font = theme.font
  const width = Math.max(theme.minWidth ?? 0, ctx.measureText(mood).width + paddingX * 2)

  if (theme.shadowColor) {
    ctx.save()
    ctx.shadowColor = theme.shadowColor
    ctx.shadowBlur = theme.shadowBlur ?? 18
    ctx.shadowOffsetY = theme.shadowOffsetY ?? 10
    fillRoundRect(ctx, x, y, width, height, height / 2, theme.background)
    ctx.restore()
  } else {
    fillRoundRect(ctx, x, y, width, height, height / 2, theme.background)
  }

  if (theme.border) {
    strokeRoundRect(ctx, x, y, width, height, height / 2, theme.border, theme.borderWidth ?? 1)
  }

  ctx.save()
  ctx.fillStyle = theme.color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(mood, x + width / 2, y + height / 2 + (theme.textOffsetY ?? 0))
  ctx.restore()

  return height
}

function drawElevatedPanel(ctx, {
  x,
  y,
  width,
  height,
  radius,
  fill,
  border,
  borderWidth = 1,
  shadowColor = 'rgba(80,50,30,0.12)',
  shadowBlur = 24,
  shadowOffsetY = 12,
}) {
  ctx.save()
  ctx.shadowColor = shadowColor
  ctx.shadowBlur = shadowBlur
  ctx.shadowOffsetY = shadowOffsetY
  fillRoundRect(ctx, x, y, width, height, radius, fill)
  ctx.restore()

  if (border) {
    strokeRoundRect(ctx, x, y, width, height, radius, border, borderWidth)
  }
}

function drawRotatedSheet(ctx, {
  x,
  y,
  width,
  height,
  radius = 40,
  rotation = 0,
  fill,
  border,
  borderWidth = 1,
  shadowColor = 'rgba(80,50,30,0.12)',
  shadowBlur = 24,
  shadowOffsetY = 12,
}) {
  ctx.save()
  ctx.translate(x + width / 2, y + height / 2)
  ctx.rotate(rotation)
  ctx.save()
  ctx.shadowColor = shadowColor
  ctx.shadowBlur = shadowBlur
  ctx.shadowOffsetY = shadowOffsetY
  fillRoundRect(ctx, -width / 2, -height / 2, width, height, radius, fill)
  ctx.restore()

  if (border) {
    strokeRoundRect(ctx, -width / 2, -height / 2, width, height, radius, border, borderWidth)
  }

  ctx.restore()
}

async function drawPolaroidPhotoFrame(ctx, moment, frame) {
  const {
    x,
    y,
    width,
    height,
    rotation = -0.028,
    photoInsetX = 22,
    photoInsetTop = 20,
    photoBottomPad = 88,
  } = frame

  const photoWidth = width - photoInsetX * 2
  const photoHeight = height - photoInsetTop - photoBottomPad

  ctx.save()
  ctx.translate(x + width / 2, y + height / 2)
  ctx.rotate(rotation)

  ctx.save()
  ctx.shadowColor = 'rgba(59, 35, 18, 0.2)'
  ctx.shadowBlur = 36
  ctx.shadowOffsetY = 18
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(-width / 2, -height / 2, width, height)
  ctx.restore()

  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(-width / 2, -height / 2, width, height)
  ctx.strokeStyle = 'rgba(23,20,14,0.06)'
  ctx.lineWidth = 2
  ctx.strokeRect(-width / 2 + 1, -height / 2 + 1, width - 2, height - 2)

  await drawPhoto(
    ctx,
    moment,
    -width / 2 + photoInsetX,
    -height / 2 + photoInsetTop,
    photoWidth,
    photoHeight,
    0,
  )

  const frameTitle = moment.title || 'Момент'
  const titleWidth = width - 124
  const titleLineHeight = 46
  const titleAreaY = height / 2 - photoBottomPad + 22
  const titleAreaHeight = photoBottomPad - 34

  ctx.save()
  ctx.fillStyle = 'rgba(23,20,14,0.92)'
  ctx.font = '600 52px "Cormorant Garamond", Georgia, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  const titleLines = wrapText(ctx, frameTitle, titleWidth, 2)
  let titleY = titleAreaY + Math.max(0, (titleAreaHeight - titleLines.length * titleLineHeight) / 2) - 11

  for (const line of titleLines) {
    ctx.fillText(line, 0, titleY)
    titleY += titleLineHeight
  }

  ctx.restore()
  ctx.restore()
}

async function drawPolaroid(canvas, moment) {
  const width = 1080
  const height = 1920
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const peopleNames = getMomentPeopleNames(moment)

  drawBackground(ctx, 'polaroid', width, height)

  const dateText = formatStoryDate(getMomentDisplayAt(moment))
  drawCanvasHeader(ctx, {
    logoX: 84,
    logoY: 82,
    dateX: 996,
    dateY: 94,
    dateText,
  })

  drawRotatedSheet(ctx, {
    x: 110,
    y: 182,
    width: 860,
    height: 850,
    radius: 42,
    rotation: -0.07,
    fill: 'rgba(255,255,255,0.44)',
    border: 'rgba(160,94,44,0.06)',
    shadowColor: 'rgba(80,50,30,0.08)',
    shadowBlur: 24,
    shadowOffsetY: 12,
  })

  drawRotatedSheet(ctx, {
    x: 154,
    y: 166,
    width: 832,
    height: 812,
    radius: 40,
    rotation: 0.045,
    fill: 'rgba(244,234,224,0.96)',
    border: 'rgba(160,94,44,0.08)',
    shadowColor: 'rgba(80,50,30,0.1)',
    shadowBlur: 28,
    shadowOffsetY: 14,
  })

  await drawPolaroidPhotoFrame(ctx, moment, {
    x: 110,
    y: 184,
    width: 860,
    height: 850,
    rotation: -0.014,
    photoInsetX: 20,
    photoInsetTop: 20,
    photoBottomPad: 132,
  })

  const contentX = 102
  const contentWidth = width - contentX * 2
  const contentGap = 35
  let y = 1034 + contentGap

  if (moment.description) {
    ctx.fillStyle = COLOR.mid
    ctx.font = '500 36px Inter, sans-serif'
    const descriptionLines = wrapText(ctx, moment.description, contentWidth - 20, 2)
    y = drawTextBlock(ctx, descriptionLines, contentX, y, 54)
  }

  const hasMeta = Boolean(moment.song_title || peopleNames.length || moment.mood || moment.location)

  if (hasMeta) {
    const panelTopPadding = 36
    const panelBottomPadding = 24
    const panelBottomInset = 24
    const peopleValue = peopleNames.join(', ')
    const peopleHeight = peopleNames.length
      ? getWrappedTextMetrics(ctx, peopleValue, '500 33px Inter, sans-serif', contentWidth - 108, 2, 42).height + 28
      : 0
    const locationHeight = moment.location
      ? getWrappedTextMetrics(ctx, moment.location, '500 33px Inter, sans-serif', contentWidth - 108, 2, 42).height + 28
      : 0
    const songBlockHeight = moment.song_title ? 170 : 0
    const peopleBlockHeight = peopleNames.length ? peopleHeight + 20 : 0
    const moodBlockHeight = moment.mood ? 76 : 0
    const locationBlockHeight = moment.location ? locationHeight + 22 : 0
    const panelHeight = panelTopPadding
      + panelBottomPadding
      + songBlockHeight
      + peopleBlockHeight
      + moodBlockHeight
      + locationBlockHeight

    const panelX = 86
    const panelWidth = 908
    const panelY = Math.min(y + contentGap, height - panelBottomInset - panelHeight)

    drawElevatedPanel(ctx, {
      x: panelX,
      y: panelY,
      width: panelWidth,
      height: panelHeight,
      radius: 42,
      fill: 'rgba(255,250,245,0.88)',
      border: 'rgba(160,94,44,0.08)',
      shadowColor: 'rgba(80,50,30,0.12)',
      shadowBlur: 36,
      shadowOffsetY: 18,
    })

    let metaY = panelY + panelTopPadding
    const metaX = panelX + 34
    const metaWidth = panelWidth - 68

    if (moment.song_title) {
      metaY += await drawSongChip(ctx, metaX, metaY, metaWidth, moment, {
        dark: false,
        height: 146,
        radius: 30,
        songBg: 'rgba(243,236,227,0.92)',
        songBorder: 'rgba(160,94,44,0.08)',
        songIconBg: COLOR.accentLight,
        songIconStroke: COLOR.accent,
        songTitle: COLOR.text,
        songSubtitle: COLOR.mid,
        shadowColor: 'rgba(160,94,44,0.08)',
      })
      metaY += 24
    }

    if (peopleNames.length > 0) {
      metaY = drawMetaItem(ctx, {
        label: 'С кем',
        value: peopleValue,
        x: metaX,
        y: metaY,
        maxWidth: metaWidth,
        labelColor: COLOR.soft,
        valueColor: COLOR.text,
        valueFont: '500 33px Inter, sans-serif',
        valueLineHeight: 42,
      })
      metaY += 20
    }

    if (moment.mood) {
      metaY += drawMoodChip(ctx, metaX, metaY, moment.mood, {
        font: '600 30px Inter, sans-serif',
        color: COLOR.text,
        background: '#F6EFE6',
        border: 'rgba(160,94,44,0.08)',
        paddingX: 16,
        height: 56,
        minWidth: 92,
      })
      metaY += 20
    }

    if (moment.location) {
      drawHairline(ctx, metaX, metaY, metaWidth, 'rgba(160,94,44,0.08)')
      metaY += 22
      metaY = drawMetaItem(ctx, {
        label: 'Место',
        value: moment.location,
        x: metaX,
        y: metaY,
        maxWidth: metaWidth,
        labelColor: COLOR.soft,
        valueColor: COLOR.text,
        valueFont: '500 33px Inter, sans-serif',
        valueLineHeight: 42,
      })
    }
  }
}

async function drawMinimal(canvas, moment) {
  const width = 1080
  const height = 1920
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const peopleNames = getMomentPeopleNames(moment)
  const dateText = formatStoryDate(getMomentDisplayAt(moment))

  drawBackground(ctx, 'minimal', width, height)

  drawElevatedPanel(ctx, {
    x: 34,
    y: 34,
    width: 1012,
    height: 1852,
    radius: 58,
    fill: 'rgba(255,255,255,0.68)',
    border: 'rgba(160,94,44,0.08)',
    shadowColor: 'rgba(80,50,30,0.12)',
    shadowBlur: 44,
    shadowOffsetY: 24,
  })

  ctx.textBaseline = 'top'
  ctx.fillStyle = COLOR.text
  ctx.font = '600 48px "Cormorant Garamond", Georgia, serif'
  ctx.fillText('memi', 90, 88)

  drawTopBadge(ctx, dateText, 986, 82, {
    badgeBg: 'rgba(247,240,231,0.92)',
    badgeText: COLOR.mid,
    border: 'rgba(160,94,44,0.08)',
    height: 48,
    paddingX: 20,
  })

  const photoX = 78
  const photoY = 164
  const photoWidth = 924
  const photoHeight = 780

  drawElevatedPanel(ctx, {
    x: photoX - 6,
    y: photoY - 6,
    width: photoWidth + 12,
    height: photoHeight + 12,
    radius: 44,
    fill: 'rgba(255,255,255,0.55)',
    border: 'rgba(160,94,44,0.08)',
    shadowColor: 'rgba(80,50,30,0.1)',
    shadowBlur: 28,
    shadowOffsetY: 18,
  })
  await drawPhoto(ctx, moment, photoX, photoY, photoWidth, photoHeight, 40)

  const contentX = 110
  const contentWidth = 860
  let y = 1016

  y = drawSectionEyebrow(ctx, 'История', contentX, y, {
    color: COLOR.mid,
    lineColor: COLOR.accent,
  })

  ctx.fillStyle = COLOR.text
  ctx.font = '700 76px "Cormorant Garamond", Georgia, serif'
  const titleLines = wrapText(ctx, moment.title || 'Момент', contentWidth, 2)
  y = drawTextBlock(ctx, titleLines, contentX, y + 20, 80)

  if (moment.description) {
    y += 28
    ctx.fillStyle = COLOR.mid
    ctx.font = '500 38px Inter, sans-serif'
    const descriptionLines = wrapText(ctx, moment.description, contentWidth, 3)
    y = drawTextBlock(ctx, descriptionLines, contentX, y, 58)
  }

  y += 30
  drawHairline(ctx, contentX, y, contentWidth, COLOR.line)
  y += 26

  if (moment.song_title) {
    y += await drawSongChip(ctx, contentX, y, contentWidth, moment, {
      dark: false,
      height: 140,
      radius: 30,
      songBg: '#F8F0E5',
      songBorder: 'rgba(160,94,44,0.08)',
      songIconBg: COLOR.accent,
      songIconStroke: '#FFFFFF',
      songTitle: COLOR.text,
      songSubtitle: COLOR.mid,
    })
    y += 28
  }

  const columnGap = 32
  const columnWidth = (contentWidth - columnGap) / 2

  if (peopleNames.length > 0 && moment.location) {
    const leftBottom = drawMetaItem(ctx, {
      label: 'С кем',
      value: peopleNames.join(', '),
      x: contentX,
      y,
      maxWidth: columnWidth,
      labelColor: COLOR.soft,
      valueColor: COLOR.text,
      valueFont: '500 31px Inter, sans-serif',
      valueLineHeight: 40,
      maxLines: 3,
    })
    const rightBottom = drawMetaItem(ctx, {
      label: 'Место',
      value: moment.location,
      x: contentX + columnWidth + columnGap,
      y,
      maxWidth: columnWidth,
      labelColor: COLOR.soft,
      valueColor: COLOR.text,
      valueFont: '500 31px Inter, sans-serif',
      valueLineHeight: 40,
      maxLines: 3,
    })
    y = Math.max(leftBottom, rightBottom) + 22
  } else if (peopleNames.length > 0) {
    y = drawMetaItem(ctx, {
      label: 'С кем',
      value: peopleNames.join(', '),
      x: contentX,
      y,
      maxWidth: contentWidth,
      labelColor: COLOR.soft,
      valueColor: COLOR.text,
      valueFont: '500 32px Inter, sans-serif',
      valueLineHeight: 40,
      maxLines: 3,
    }) + 22
  } else if (moment.location) {
    y = drawMetaItem(ctx, {
      label: 'Место',
      value: moment.location,
      x: contentX,
      y,
      maxWidth: contentWidth,
      labelColor: COLOR.soft,
      valueColor: COLOR.text,
      valueFont: '500 32px Inter, sans-serif',
      valueLineHeight: 40,
      maxLines: 3,
    }) + 22
  }

  if (moment.mood) {
    drawMoodChip(ctx, contentX, y, moment.mood, {
      font: '600 30px Inter, sans-serif',
      color: COLOR.text,
      background: '#F5EBDD',
      border: 'rgba(160,94,44,0.08)',
      paddingX: 16,
      height: 56,
      minWidth: 92,
    })
  }
}

async function drawDark(canvas, moment) {
  const width = 1080
  const height = 1920
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const peopleNames = getMomentPeopleNames(moment)
  const dateText = formatStoryDate(getMomentDisplayAt(moment))

  drawBackground(ctx, 'dark', width, height)

  const photoX = 24
  const photoY = 24
  const photoWidth = 1032
  const photoHeight = 944
  await drawPhoto(ctx, moment, photoX, photoY, photoWidth, photoHeight, 58, true)

  clipRoundRect(ctx, photoX, photoY, photoWidth, photoHeight, 58)
  const photoFade = ctx.createLinearGradient(0, photoY + 420, 0, photoY + photoHeight)
  photoFade.addColorStop(0, 'rgba(23,20,14,0)')
  photoFade.addColorStop(0.74, 'rgba(23,20,14,0.54)')
  photoFade.addColorStop(1, 'rgba(23,20,14,0.9)')
  ctx.fillStyle = photoFade
  ctx.fillRect(photoX, photoY, photoWidth, photoHeight)
  ctx.restore()

  const topShade = ctx.createLinearGradient(0, 0, 0, 240)
  topShade.addColorStop(0, 'rgba(23,20,14,0.54)')
  topShade.addColorStop(1, 'rgba(23,20,14,0)')
  ctx.fillStyle = topShade
  ctx.fillRect(0, 0, width, 240)

  drawCanvasHeader(ctx, {
    logoX: 86,
    logoY: 84,
    dateX: 994,
    dateY: 96,
    dateText,
    dark: true,
  })

  drawSoftGlow(ctx, 864, 876, 240, 'rgba(217,139,82,0.14)', 1)
  const panelX = 36
  const panelY = 760
  const panelWidth = 1008
  const panelHeight = 1080

  drawElevatedPanel(ctx, {
    x: panelX,
    y: panelY,
    width: panelWidth,
    height: panelHeight,
    radius: 52,
    fill: 'rgba(28,21,16,0.88)',
    border: 'rgba(255,244,230,0.08)',
    shadowColor: 'rgba(0,0,0,0.34)',
    shadowBlur: 48,
    shadowOffsetY: 24,
  })

  const contentX = panelX + 48
  const contentWidth = panelWidth - 96
  let y = panelY + 58

  y = drawSectionEyebrow(ctx, 'Момент', contentX, y, {
    color: COLOR.accent,
    lineColor: COLOR.accent,
  })

  ctx.fillStyle = '#FFF4E6'
  ctx.font = '700 82px "Cormorant Garamond", Georgia, serif'
  const titleLines = wrapText(ctx, moment.title || 'Момент', contentWidth, 2)
  y = drawTextBlock(ctx, titleLines, contentX, y + 22, 84)

  if (moment.description) {
    y += 30
    ctx.fillStyle = COLOR.darkTextSoft
    ctx.font = '500 38px Inter, sans-serif'
    const descriptionLines = wrapText(ctx, moment.description, contentWidth, 3)
    y = drawTextBlock(ctx, descriptionLines, contentX, y, 58)
  }

  y += 30

  if (moment.song_title) {
    y += await drawSongChip(ctx, contentX, y, contentWidth, moment, {
      dark: true,
      height: 148,
      radius: 32,
      songBg: 'rgba(52,39,30,0.92)',
      songBorder: 'rgba(255,244,230,0.08)',
      songIconBg: 'rgba(217,139,82,0.16)',
      songIconStroke: COLOR.accent,
      songTitle: '#FFF4E6',
      songSubtitle: 'rgba(245,235,221,0.62)',
      shadowColor: 'rgba(0,0,0,0.2)',
    })
    y += 28
  }

  drawHairline(ctx, contentX, y, contentWidth, COLOR.darkLine)
  y += 24

  if (peopleNames.length > 0) {
    y = drawMetaItem(ctx, {
      label: 'С кем',
      value: peopleNames.join(', '),
      x: contentX,
      y,
      maxWidth: contentWidth,
      labelColor: 'rgba(245,235,221,0.4)',
      valueColor: '#FFF4E6',
      valueFont: '500 33px Inter, sans-serif',
      valueLineHeight: 42,
      maxLines: 2,
    })
    y += 22
  }

  if (moment.mood) {
    y += drawMoodChip(ctx, contentX, y, moment.mood, {
      font: '600 30px Inter, sans-serif',
      color: '#FFF4E6',
      background: 'rgba(255,244,230,0.08)',
      border: 'rgba(255,244,230,0.1)',
      paddingX: 16,
      height: 56,
      minWidth: 92,
    })
    y += 22
  }

  if (moment.location) {
    drawHairline(ctx, contentX, y, contentWidth, COLOR.darkLine)
    y += 22
    drawMetaItem(ctx, {
      label: 'Место',
      value: moment.location,
      x: contentX,
      y,
      maxWidth: contentWidth,
      labelColor: 'rgba(245,235,221,0.4)',
      valueColor: '#FFF4E6',
      valueFont: '500 33px Inter, sans-serif',
      valueLineHeight: 42,
      maxLines: 2,
    })
  }
}

// ── Тема «Лето» ───────────────────────────────────────────────────────────────
async function drawSummer(canvas, moment) {
  const width = 1080
  const height = 1920
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const peopleNames = getMomentPeopleNames(moment)

  // Солнечный фон
  const bg = ctx.createLinearGradient(0, 0, width, height)
  bg.addColorStop(0, '#FFF8E1')
  bg.addColorStop(0.45, '#FFE0B2')
  bg.addColorStop(1, '#FFCCBC')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  // Декоративные круги — солнце
  ctx.save()
  ctx.globalAlpha = 0.18
  ctx.fillStyle = '#FFB300'
  ctx.beginPath()
  ctx.arc(width - 120, 140, 280, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 0.10
  ctx.beginPath()
  ctx.arc(width - 120, 140, 380, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  const dateText = formatStoryDate(getMomentDisplayAt(moment))
  drawCanvasHeader(ctx, { logoX: 84, logoY: 82, dateX: 996, dateY: 94, dateText })

  // Фото
  const photoX = 64
  const photoY = 180
  const photoWidth = width - 128
  const photoHeight = 840
  await drawPhoto(ctx, moment, photoX, photoY, photoWidth, photoHeight, 48)

  // Нижняя панель
  const panelX = 48
  const panelY = 1068
  const panelWidth = width - 96
  const panelHeight = 780

  drawElevatedPanel(ctx, {
    x: panelX,
    y: panelY,
    width: panelWidth,
    height: panelHeight,
    radius: 52,
    fill: 'rgba(255,255,255,0.82)',
    border: 'rgba(255,152,0,0.14)',
    shadowColor: 'rgba(200,100,30,0.14)',
    shadowBlur: 40,
    shadowOffsetY: 20,
  })

  const contentX = panelX + 52
  const contentWidth = panelWidth - 104
  let y = panelY + 58

  y = drawSectionEyebrow(ctx, 'Момент', contentX, y, {
    color: '#E65100',
    lineColor: '#FF6D00',
  })

  ctx.fillStyle = '#3E2723'
  ctx.font = '700 80px "Cormorant Garamond", Georgia, serif'
  const titleLines = wrapText(ctx, moment.title || 'Момент', contentWidth, 2)
  y = drawTextBlock(ctx, titleLines, contentX, y + 18, 82)

  if (moment.description) {
    y += 28
    ctx.fillStyle = '#6D4C41'
    ctx.font = '500 36px Inter, sans-serif'
    const descriptionLines = wrapText(ctx, moment.description, contentWidth, 2)
    y = drawTextBlock(ctx, descriptionLines, contentX, y, 54)
  }

  y += 32
  drawHairline(ctx, contentX, y, contentWidth, 'rgba(255,152,0,0.18)')
  y += 26

  if (moment.song_title) {
    y += await drawSongChip(ctx, contentX, y, contentWidth, moment, {
      dark: false,
      height: 140,
      radius: 28,
      songBg: 'rgba(255,243,224,0.9)',
      songBorder: 'rgba(255,152,0,0.14)',
      songIconBg: 'rgba(255,152,0,0.16)',
      songIconStroke: '#E65100',
      songTitle: '#3E2723',
      songSubtitle: '#8D6E63',
      shadowColor: 'rgba(200,100,30,0.1)',
    })
    y += 28
  }

  if (peopleNames.length > 0) {
    drawMetaItem(ctx, {
      label: 'С кем',
      value: peopleNames.join(', '),
      x: contentX, y,
      maxWidth: contentWidth,
      labelColor: '#8D6E63',
      valueColor: '#3E2723',
      valueFont: '500 33px Inter, sans-serif',
      valueLineHeight: 42,
      maxLines: 2,
    })
    y += 80
  }

  if (moment.mood) {
    drawMoodChip(ctx, contentX, y, moment.mood, {
      font: '600 30px Inter, sans-serif',
      color: '#E65100',
      background: 'rgba(255,152,0,0.1)',
      border: 'rgba(255,152,0,0.2)',
      paddingX: 16, height: 56, minWidth: 92,
    })
  }
}

// ── Тема «Кино» ───────────────────────────────────────────────────────────────
async function drawCinema(canvas, moment) {
  const width = 1080
  const height = 1920
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const peopleNames = getMomentPeopleNames(moment)

  // Чёрный фон
  ctx.fillStyle = '#0A0A0A'
  ctx.fillRect(0, 0, width, height)

  // Лентопроперфорация — декор слева
  ctx.save()
  ctx.globalAlpha = 0.08
  ctx.fillStyle = '#fff'
  for (let i = 0; i < 24; i++) {
    const hy = 80 + i * 78
    roundRect(ctx, 18, hy, 36, 48, 6)
    ctx.fill()
    roundRect(ctx, width - 54, hy, 36, 48, 6)
    ctx.fill()
  }
  ctx.restore()

  // Letterbox bars
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, 120)
  ctx.fillRect(0, height - 120, width, 120)

  const dateText = formatStoryDate(getMomentDisplayAt(moment))
  drawCanvasHeader(ctx, { logoX: 84, logoY: 44, dateX: 996, dateY: 54, dateText, dark: true })

  // Фото (ч/б через filter)
  const photoX = 72
  const photoY = 148
  const photoWidth = width - 144
  const photoHeight = 900
  ctx.save()
  ctx.filter = 'grayscale(80%) contrast(1.1)'
  await drawPhoto(ctx, moment, photoX, photoY, photoWidth, photoHeight, 12)
  ctx.restore()

  // Виньетка
  clipRoundRect(ctx, photoX, photoY, photoWidth, photoHeight, 12)
  const vignette = ctx.createRadialGradient(width / 2, photoY + photoHeight / 2, photoHeight * 0.28, width / 2, photoY + photoHeight / 2, photoHeight * 0.8)
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(1, 'rgba(0,0,0,0.5)')
  ctx.fillStyle = vignette
  ctx.fillRect(photoX, photoY, photoWidth, photoHeight)
  ctx.restore()

  // Кадровая рамка поверх фото
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 3
  ctx.strokeRect(photoX + 1, photoY + 1, photoWidth - 2, photoHeight - 2)
  ctx.restore()

  // Нижняя панель
  const panelX = 48
  const panelY = 1092
  const panelWidth = width - 96
  const panelHeight = 718

  drawElevatedPanel(ctx, {
    x: panelX, y: panelY,
    width: panelWidth, height: panelHeight,
    radius: 32,
    fill: 'rgba(18,14,12,0.95)',
    border: 'rgba(255,255,255,0.06)',
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowBlur: 48,
    shadowOffsetY: 24,
  })

  const contentX = panelX + 52
  const contentWidth = panelWidth - 104
  let y = panelY + 52

  // Eyebrow
  ctx.fillStyle = 'rgba(255,255,255,0.28)'
  ctx.font = '600 26px Inter, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText('— MOMENT', contentX, y)
  y += 52

  ctx.fillStyle = '#F5F5F5'
  ctx.font = '700 76px "Cormorant Garamond", Georgia, serif'
  const titleLines = wrapText(ctx, moment.title || 'Момент', contentWidth, 2)
  y = drawTextBlock(ctx, titleLines, contentX, y, 80)

  if (moment.description) {
    y += 26
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = '400 34px Inter, sans-serif'
    const descriptionLines = wrapText(ctx, moment.description, contentWidth, 2)
    y = drawTextBlock(ctx, descriptionLines, contentX, y, 52)
  }

  y += 28
  drawHairline(ctx, contentX, y, contentWidth, 'rgba(255,255,255,0.08)')
  y += 24

  if (moment.song_title) {
    y += await drawSongChip(ctx, contentX, y, contentWidth, moment, {
      dark: true,
      height: 136,
      radius: 24,
      songBg: 'rgba(40,30,22,0.9)',
      songBorder: 'rgba(255,255,255,0.06)',
      songIconBg: 'rgba(255,255,255,0.06)',
      songIconStroke: 'rgba(255,255,255,0.5)',
      songTitle: '#F5F5F5',
      songSubtitle: 'rgba(255,255,255,0.4)',
      shadowColor: 'rgba(0,0,0,0.2)',
    })
    y += 24
  }

  if (peopleNames.length > 0) {
    drawMetaItem(ctx, {
      label: 'С кем',
      value: peopleNames.join(', '),
      x: contentX, y,
      maxWidth: contentWidth,
      labelColor: 'rgba(255,255,255,0.3)',
      valueColor: '#F5F5F5',
      valueFont: '500 33px Inter, sans-serif',
      valueLineHeight: 42,
      maxLines: 2,
    })
    y += 80
  }

  if (moment.mood) {
    drawMoodChip(ctx, contentX, y, moment.mood, {
      font: '600 30px Inter, sans-serif',
      color: 'rgba(255,255,255,0.72)',
      background: 'rgba(255,255,255,0.06)',
      border: 'rgba(255,255,255,0.08)',
      paddingX: 16, height: 56, minWidth: 92,
    })
  }
}

async function drawCard(canvas, moment, template) {
  if (template === 'minimal') return drawMinimal(canvas, moment)
  if (template === 'dark') return drawDark(canvas, moment)
  if (template === 'summer') return drawSummer(canvas, moment)
  if (template === 'cinema') return drawCinema(canvas, moment)
  return drawPolaroid(canvas, moment)
}

function TemplateToggle({ activeTemplate, onChange, dark, ownedThemes }) {
  const freeTemplates = TEMPLATES.filter((t) => !t.paid)
  const paidTemplates = TEMPLATES.filter((t) => t.paid)

  function renderBtn(template) {
    const active = template.id === activeTemplate
    const locked = template.paid && !ownedThemes?.includes(template.themeKey)

    return (
      <button
        key={template.id}
        type="button"
        onClick={() => onChange(template.id)}
        className="font-sans transition-all active:opacity-70 relative"
        style={{
          border: 'none',
          borderRadius: 18,
          background: active
            ? 'linear-gradient(135deg, #D98B52 0%, #BE6D34 100%)'
            : 'transparent',
          color: active ? '#fff' : (locked ? (dark ? 'rgba(255,244,231,0.38)' : 'rgba(23,20,14,0.35)') : (dark ? 'rgba(255,244,231,0.72)' : 'var(--mid)')),
          minHeight: 44,
          fontSize: 13,
          fontWeight: active ? 700 : 600,
          boxShadow: active
            ? (dark ? '0 10px 18px rgba(0,0,0,0.24)' : '0 10px 18px rgba(217,139,82,0.22)')
            : 'none',
          transform: active ? 'translateY(-1px)' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          paddingLeft: 6,
          paddingRight: 6,
        }}
      >
        {template.label}
        {locked && <span style={{ fontSize: 10 }}>🔒</span>}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Бесплатные темы */}
      <div
        className="grid gap-2 rounded-[24px] p-[6px]"
        style={{
          gridTemplateColumns: `repeat(${freeTemplates.length}, 1fr)`,
          backgroundColor: dark ? 'rgba(255,244,231,0.05)' : 'rgba(255,255,255,0.72)',
          border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(160,94,44,0.08)',
          boxShadow: dark ? 'inset 0 1px 0 rgba(255,255,255,0.04)' : 'inset 0 1px 0 rgba(255,255,255,0.72)',
        }}
      >
        {freeTemplates.map(renderBtn)}
      </div>

      {/* Платные темы */}
      <div
        className="grid gap-2 rounded-[24px] p-[6px]"
        style={{
          gridTemplateColumns: `repeat(${paidTemplates.length}, 1fr)`,
          backgroundColor: dark ? 'rgba(255,244,231,0.03)' : 'rgba(255,255,255,0.5)',
          border: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(217,139,82,0.14)',
        }}
      >
        {paidTemplates.map(renderBtn)}
      </div>
    </div>
  )
}

function ThemePurchaseSheet({ theme, onClose, onPurchased }) {
  const currentUser = useAppStore((s) => s.currentUser)
  const addOwnedTheme = useAppStore((s) => s.addOwnedTheme)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleBuy() {
    if (loading || !currentUser?.telegram_id) return
    setLoading(true)
    setError(null)
    try {
      const productId = `theme_${theme.themeKey}`
      const status = await openStarsPayment(productId, currentUser.telegram_id)
      if (status === 'paid') {
        addOwnedTheme(theme.themeKey)
        onPurchased(theme.id)
        onClose()
      }
    } catch (err) {
      setError('Не удалось открыть оплату. Попробуй ещё раз.')
      console.error('[ThemePurchaseSheet]', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ backgroundColor: 'rgba(23,20,14,0.54)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="px-4 pb-safe pt-6 rounded-t-[28px]"
        style={{ backgroundColor: 'var(--base)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-1" style={{ marginBottom: 24 }}>
          <span style={{ fontSize: 40 }}>{theme.id === 'summer' ? '🌅' : '🎬'}</span>
          <p className="font-sans" style={{ color: 'var(--text)', fontSize: 18, fontWeight: 700, marginTop: 8 }}>
            Тема «{theme.id === 'summer' ? 'Лето' : 'Кино'}»
          </p>
          <p className="font-sans text-center" style={{ color: 'var(--mid)', fontSize: 13, maxWidth: 260 }}>
            {theme.hint}
          </p>
        </div>

        <div
          className="font-sans text-center"
          style={{
            backgroundColor: 'rgba(217,139,82,0.08)',
            borderRadius: 14,
            color: 'var(--mid)',
            fontSize: 13,
            padding: '10px 16px',
            marginBottom: 20,
          }}
        >
          Покупка навсегда — без подписки
        </div>

        {error && (
          <p className="font-sans text-center" style={{ color: '#E05252', fontSize: 13, marginBottom: 12 }}>{error}</p>
        )}

        <button
          type="button"
          onClick={handleBuy}
          disabled={loading}
          className="w-full font-sans font-semibold transition-opacity active:opacity-70"
          style={{
            backgroundColor: loading ? 'var(--surface)' : 'var(--accent)',
            color: loading ? 'var(--soft)' : '#fff',
            borderRadius: 9999,
            padding: '14px 0',
            fontSize: 15,
            border: 'none',
            marginBottom: 10,
          }}
        >
          {loading ? 'Открываю оплату...' : 'Купить · 79 ⭐'}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-full font-sans transition-opacity active:opacity-60"
          style={{ color: 'var(--mid)', fontSize: 14, background: 'none', border: 'none', paddingBottom: 8 }}
        >
          Отмена
        </button>
      </div>
    </div>
  )
}

function BackIcon({ dark }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M15 5L8 12L15 19"
        stroke={dark ? '#F5EBDD' : 'var(--text)'}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ShareIcon({ disabled, dark }) {
  const color = disabled
    ? (dark ? 'rgba(245,235,221,0.28)' : 'rgba(23,20,14,0.28)')
    : 'var(--accent)'

  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
      <circle cx="18" cy="5" r="2.75" stroke={color} strokeWidth="1.8" />
      <circle cx="6" cy="12" r="2.75" stroke={color} strokeWidth="1.8" />
      <circle cx="18" cy="19" r="2.75" stroke={color} strokeWidth="1.8" />
      <path d="M8.6 13.5L15.4 17.3M15.4 6.7L8.6 10.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export default function StoryPreview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const moments = useAppStore((state) => state.moments)
  const ownedThemes = useAppStore((state) => state.ownedThemes)
  const moment = moments.find((item) => item.id === id)

  const canvasRef = useRef(null)
  const [template, setTemplate] = useState('polaroid')
  const [rendering, setRendering] = useState(true)
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState(null)
  const [purchaseTheme, setPurchaseTheme] = useState(null) // тема ожидающая покупки

  const dark = template === 'dark' || template === 'cinema'
  const activeTemplate = TEMPLATES.find((item) => item.id === template) ?? TEMPLATES[0]

  useEffect(() => {
    let cancelled = false

    async function renderCard() {
      if (!moment || !canvasRef.current) return

      setRendering(true)
      setError(null)

      try {
        await document.fonts?.ready
        if (cancelled || !canvasRef.current) return
        await drawCard(canvasRef.current, moment, template)
        if (!cancelled) {
          setRendering(false)
        }
      } catch (renderError) {
        console.error(renderError)
        if (!cancelled) {
          setError('Не получилось собрать карточку')
          setRendering(false)
        }
      }
    }

    renderCard()

    return () => {
      cancelled = true
    }
  }, [moment, template])

  function handleTemplateChange(nextTemplate) {
    if (nextTemplate === template) return
    const tpl = TEMPLATES.find((t) => t.id === nextTemplate)
    // Если тема платная и не куплена — показываем шит покупки
    if (tpl?.paid && !ownedThemes?.includes(tpl.themeKey)) {
      tgHaptic('light')
      setPurchaseTheme(tpl)
      return
    }
    tgHaptic('light')
    setTemplate(nextTemplate)
  }

  async function shareCardFile(file) {
    await navigator.share({
      files: [file],
    })
  }

  async function createCardFile() {
    return createCanvasFile(canvasRef.current, getCardFilename(id))
  }

  async function handleDownload() {
    if (!canvasRef.current) return
    tgHaptic('medium')

    const file = await createCardFile()
    if (!file) return

    try {
      if (shouldUseShareFallback(window.Telegram?.WebApp) && canShareFiles([file])) {
        await shareCardFile(file)
        return
      }

      triggerBrowserDownload(file)
    } catch (downloadError) {
      if (downloadError?.name === 'AbortError') {
        return
      }

      console.error('[StoryPreview] download error:', downloadError)

      try {
        if (canShareFiles([file])) {
          await shareCardFile(file)
          return
        }
      } catch (shareFallbackError) {
        if (shareFallbackError?.name === 'AbortError') {
          return
        }

        console.error('[StoryPreview] download fallback error:', shareFallbackError)
      }
    }
  }

  async function handleShare() {
    if (!canvasRef.current) return
    tgHaptic('light')

    try {
      const file = await createCardFile()

      if (file && canShareFiles([file])) {
        await shareCardFile(file)
        return
      }
    } catch (shareError) {
      if (shareError?.name === 'AbortError') {
        return
      }
      console.error('[StoryPreview] share error:', shareError)
    }

    handleDownload()
  }

  async function handleSendToTelegram() {
    if (!canvasRef.current || sending || sent) return

    setSendError(null)

    const chatId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id
    if (!chatId) {
      setSendError('Открой карточку через Telegram-бота, чтобы отправить её туда')
      return
    }

    tgHaptic('medium')
    setSending(true)

    try {
      const imageBase64 = canvasRef.current.toDataURL('image/jpeg', 0.84)
      const caption = moment?.title ? `✨ ${moment.title}` : 'Мой момент'
      const { data, error: invokeError } = await supabase.functions.invoke('send-card', {
        body: { imageBase64, chatId, caption },
      })

      if (invokeError) {
        throw new Error(invokeError.message ?? 'Не удалось отправить карточку')
      }

      if (data?.error) {
        throw new Error(data.error)
      }

      setSent(true)
      tgHaptic('light')
      setTimeout(() => setSent(false), 3000)
    } catch (sendCardError) {
      console.error('[StoryPreview] send-card error:', sendCardError)
      setSendError(sendCardError.message || 'Не удалось отправить карточку')
    } finally {
      setSending(false)
    }
  }

  if (!moment) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4" style={{ backgroundColor: 'var(--base)' }}>
        <p className="font-sans" style={{ color: 'var(--mid)', fontSize: 15 }}>
          Момент не найден
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="font-sans transition-opacity active:opacity-60"
          style={{ border: 'none', background: 'none', color: 'var(--accent)', fontSize: 15, fontWeight: 600 }}
        >
          Назад
        </button>
      </div>
    )
  }

  return (
    <>
    <div
      className="flex h-full flex-col"
      style={{
        background: dark ? 'linear-gradient(180deg, #241A14 0%, #17140E 100%)' : 'var(--base)',
        transition: 'background 0.24s ease',
      }}
    >
      <div
        className="px-4 pt-topbar"
        style={{
          borderBottom: dark ? '1px solid rgba(255,244,231,0.08)' : '1px solid var(--divider)',
          paddingBottom: 14,
        }}
      >
        <div className="grid grid-cols-[40px_1fr_40px] items-center">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center transition-opacity active:opacity-60"
            style={{ border: 'none', background: 'none' }}
            aria-label="Назад"
          >
            <BackIcon dark={dark} />
          </button>

          <div className="text-center">
            <span
              className="font-sans"
              style={{
                color: dark ? '#F5EBDD' : 'var(--text)',
                fontSize: 17,
                fontWeight: 700,
              }}
            >
              Карточка момента
            </span>
          </div>

          <div />
        </div>
      </div>

      <div className="hide-scrollbar flex-1 overflow-y-auto">
        <div className="px-4 pt-6 pb-6">
          <div className="mx-auto w-full" style={{ maxWidth: 'min(364px, calc((100vh - 300px) * 9 / 16))' }}>
            <div
              className="relative overflow-hidden rounded-[34px] p-[10px]"
              style={{
                background: dark
                  ? 'linear-gradient(180deg, rgba(255,244,231,0.08) 0%, rgba(255,244,231,0.03) 100%)'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(247,240,232,0.68) 100%)',
                border: dark ? '1px solid rgba(255,244,231,0.08)' : '1px solid rgba(160,94,44,0.08)',
                boxShadow: dark ? '0 28px 56px rgba(0,0,0,0.28)' : '0 24px 52px rgba(80,50,30,0.14)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
              }}
            >
              <div
                className="pointer-events-none absolute inset-x-10 top-0 h-16 rounded-full"
                style={{
                  background: dark ? 'rgba(217,139,82,0.08)' : 'rgba(255,255,255,0.74)',
                  filter: 'blur(18px)',
                }}
              />

              <div
                className="relative overflow-hidden rounded-[28px]"
                style={{
                  border: dark ? '1px solid rgba(255,244,231,0.08)' : '1px solid rgba(160,94,44,0.08)',
                }}
              >
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
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-[28px]"
                  style={{ backgroundColor: dark ? 'rgba(23,20,14,0.48)' : 'rgba(247,244,240,0.56)' }}
                >
                  <span
                    className="font-sans"
                    style={{
                      color: dark ? 'rgba(245,235,221,0.76)' : 'var(--mid)',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Собираем превью...
                  </span>
                </div>
              )}

              {error && (
                <div className="absolute inset-0 flex items-center justify-center rounded-[28px]">
                  <span className="font-sans" style={{ color: '#D94040', fontSize: 13, fontWeight: 600 }}>
                    {error}
                  </span>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="px-4 pb-safe"
        style={{
          borderTop: dark ? '1px solid rgba(255,244,231,0.08)' : '1px solid rgba(160,94,44,0.08)',
          backgroundColor: dark ? 'rgba(23,20,14,0.78)' : 'rgba(247,244,240,0.88)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          paddingTop: 16,
        }}
      >
        <div className="mx-auto w-full max-w-[356px]">
          <TemplateToggle activeTemplate={template} onChange={handleTemplateChange} dark={dark} ownedThemes={ownedThemes} />

          <p
            className="font-sans text-center"
            style={{
              marginTop: 12,
              marginBottom: 0,
              color: dark ? 'rgba(245,235,221,0.68)' : 'var(--mid)',
              fontSize: 13,
              fontWeight: 500,
              lineHeight: 1.45,
              minHeight: 38,
            }}
          >
            {activeTemplate.hint}
          </p>

          {sendError && (
            <p
              className="font-sans text-center"
              style={{
                marginTop: 12,
                marginBottom: 0,
                borderRadius: 16,
                backgroundColor: dark ? 'rgba(217,64,64,0.12)' : 'rgba(217,64,64,0.08)',
                color: '#D94040',
                fontSize: 13,
                fontWeight: 500,
                lineHeight: 1.45,
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
            className="mt-3 w-full font-sans transition-opacity active:opacity-70"
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
              onClick={handleDownload}
              disabled={rendering}
              className="font-sans transition-opacity active:opacity-70"
              style={{
                border: 'none',
                borderRadius: 18,
                minHeight: 52,
                backgroundColor: dark ? 'rgba(255,244,231,0.92)' : 'var(--surface)',
                color: rendering ? 'rgba(23,20,14,0.32)' : 'var(--text)',
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              Скачать
            </button>

            <button
              type="button"
              onClick={handleShare}
              disabled={rendering}
              className="flex items-center justify-center transition-opacity active:opacity-60"
              style={{
                border: 'none',
                borderRadius: 18,
                minHeight: 52,
                backgroundColor: dark ? 'rgba(255,244,231,0.92)' : 'var(--surface)',
              }}
              aria-label="Поделиться"
            >
              <ShareIcon disabled={rendering} dark={dark} />
            </button>
          </div>
        </div>
      </div>
    </div>

    {purchaseTheme && (
      <ThemePurchaseSheet
        theme={purchaseTheme}
        onClose={() => setPurchaseTheme(null)}
        onPurchased={(themeId) => setTemplate(themeId)}
      />
    )}
    </>
  )
}

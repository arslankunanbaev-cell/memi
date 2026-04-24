import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { canShareFiles, createCanvasFile, getCardFilename, shouldUseShareFallback, triggerBrowserDownload } from '../lib/cardExport'
import { proxifyCoverUrl } from '../lib/imageProxy'
import { getMomentDisplayAt } from '../lib/momentTime'
import { supabase } from '../lib/supabase'
import { tgHaptic } from '../lib/telegram'
import { useAppStore } from '../store/useAppStore'

const TEMPLATES = [
  { id: 'polaroid', label: 'Полароид' },
  { id: 'minimal', label: 'Минимал' },
  { id: 'dark', label: 'Тёмный' },
]

const COLOR = {
  base: '#F7F4F0',
  card: '#FBF7F0',
  cardAlt: '#F3ECE3',
  accent: '#D98B52',
  accentLight: '#E9D2BC',
  text: '#17140E',
  mid: '#8A7A6A',
  darkBg: '#17140E',
  darkCard: '#221A14',
  darkCardAlt: '#34271E',
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

const imageCache = new Map()

async function loadImage(src) {
  if (imageCache.has(src)) return imageCache.get(src)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageCache.set(src, img)
      resolve(img)
    }
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
    darkGradient.addColorStop(0, '#241A14')
    darkGradient.addColorStop(1, COLOR.darkBg)
    ctx.fillStyle = darkGradient
    ctx.fillRect(0, 0, width, height)

    const glow = ctx.createRadialGradient(width / 2, height * 0.16, 80, width / 2, height * 0.16, width * 0.55)
    glow.addColorStop(0, 'rgba(217,139,82,0.18)')
    glow.addColorStop(1, 'rgba(217,139,82,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, width, height)
    return
  }

  const baseGradient = ctx.createLinearGradient(0, 0, 0, height)
  baseGradient.addColorStop(0, '#FCF8F2')
  baseGradient.addColorStop(1, COLOR.base)
  ctx.fillStyle = baseGradient
  ctx.fillRect(0, 0, width, height)

  const glow = ctx.createRadialGradient(width / 2, height * 0.2, 100, width / 2, height * 0.2, width * 0.58)
  glow.addColorStop(0, 'rgba(233,210,188,0.75)')
  glow.addColorStop(1, 'rgba(233,210,188,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)
}

function drawLocationChip(ctx, x, y, maxWidth, text, theme) {
  if (!text) return

  const chipH = 72
  const iconAreaW = 52
  const padH = 28

  ctx.font = '500 34px Inter, sans-serif'
  const clipped = trimToWidth(ctx, text, maxWidth - iconAreaW - padH * 2)
  const chipW = Math.min(maxWidth, ctx.measureText(clipped).width + iconAreaW + padH * 2)

  fillRoundRect(ctx, x, y, chipW, chipH, chipH / 2, theme.chipBg)

  // Pin icon centered vertically
  const pinCX = x + padH + 11
  const pinTop = y + (chipH - 26) / 2
  ctx.save()
  ctx.strokeStyle = theme.iconColor
  ctx.lineWidth = 3.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(pinCX, pinTop + 2)
  ctx.bezierCurveTo(pinCX - 9, pinTop + 2, pinCX - 9, pinTop + 16, pinCX, pinTop + 22)
  ctx.bezierCurveTo(pinCX + 9, pinTop + 16, pinCX + 9, pinTop + 2, pinCX, pinTop + 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(pinCX, pinTop + 11, 3, 0, Math.PI * 2)
  ctx.fillStyle = theme.iconColor
  ctx.fill()
  ctx.restore()

  ctx.fillStyle = theme.textColor
  ctx.font = '500 34px Inter, sans-serif'
  ctx.textBaseline = 'middle'
  ctx.fillText(clipped, x + padH + iconAreaW, y + chipH / 2)
}

async function drawSongChip(ctx, x, y, width, moment, theme) {
  if (!moment.song_title) return 0

  const chipHeight = 140
  const coverSize = 96
  const coverX = x + 20
  const coverY = y + (chipHeight - coverSize) / 2

  // Background
  fillRoundRect(ctx, x, y, width, chipHeight, 30, theme.songBg)

  // Left accent stripe
  fillRoundRect(ctx, x + 13, y + 20, 4, chipHeight - 40, 2, theme.songIconStroke)

  const songCover = proxifyCoverUrl(moment.song_cover)

  if (songCover) {
    try {
      await drawPhoto(ctx, { photo_url: songCover }, coverX, coverY, coverSize, coverSize, 22, theme.dark)
    } catch {
      fillRoundRect(ctx, coverX, coverY, coverSize, coverSize, 22, theme.songIconBg)
    }
  } else {
    fillRoundRect(ctx, coverX, coverY, coverSize, coverSize, 22, theme.songIconBg)
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
  }

  ctx.textBaseline = 'top'
  ctx.fillStyle = theme.songTitle
  ctx.font = '700 38px Inter, sans-serif'
  ctx.fillText(trimToWidth(ctx, moment.song_title, width - 154), x + 136, y + 26)

  if (moment.song_artist) {
    ctx.fillStyle = theme.songSubtitle
    ctx.font = '500 30px Inter, sans-serif'
    ctx.fillText(trimToWidth(ctx, moment.song_artist, width - 154), x + 136, y + 78)
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


function drawMoodChip(ctx, x, y, mood, theme) {
  const paddingX = theme.paddingX ?? 20
  const height = theme.height ?? 58

  ctx.font = theme.font
  const width = Math.max(theme.minWidth ?? 0, ctx.measureText(mood).width + paddingX * 2)
  fillRoundRect(ctx, x, y, width, height, height / 2, theme.background)
  ctx.fillStyle = theme.color
  ctx.textBaseline = 'middle'
  ctx.fillText(mood, x + paddingX, y + height / 2)

  return height
}

function drawPeopleChip(ctx, x, y, maxWidth, peopleNames, theme) {
  if (peopleNames.length === 0) return y

  // Label row
  ctx.textBaseline = 'top'
  ctx.fillStyle = theme.labelColor
  ctx.font = '600 26px Inter, sans-serif'
  ctx.fillText('С КЕМ', x, y)
  y += 36

  // Names
  ctx.fillStyle = theme.textColor
  ctx.font = '500 36px Inter, sans-serif'
  const lines = wrapText(ctx, peopleNames.join(', '), maxWidth, 2)
  return drawTextBlock(ctx, lines, x, y, 48)
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
    bgColor = '#FFFFFF',
    shadowOpacity = 0.18,
    photoRadius = 0,
    drawImage = true,
  } = frame

  const photoWidth = width - photoInsetX * 2
  const photoHeight = height - photoInsetTop - photoBottomPad

  ctx.save()
  ctx.translate(x + width / 2, y + height / 2)
  ctx.rotate(rotation)

  ctx.save()
  ctx.shadowColor = `rgba(59, 35, 18, ${shadowOpacity})`
  ctx.shadowBlur = 36
  ctx.shadowOffsetY = 18
  ctx.fillStyle = bgColor
  ctx.fillRect(-width / 2, -height / 2, width, height)
  ctx.restore()

  ctx.strokeStyle = 'rgba(23,20,14,0.05)'
  ctx.lineWidth = 2
  ctx.strokeRect(-width / 2 + 1, -height / 2 + 1, width - 2, height - 2)

  if (drawImage) {
    await drawPhoto(
      ctx,
      moment,
      -width / 2 + photoInsetX,
      -height / 2 + photoInsetTop,
      photoWidth,
      photoHeight,
      photoRadius,
    )
  }

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

  const frameX = 108
  const frameY = 178
  const frameWidth = 864
  const frameHeight = 830

  // Ghost frame stacked behind — plain, warm-tinted, counter-rotated
  await drawPolaroidPhotoFrame(ctx, moment, {
    x: frameX + 8,
    y: frameY + 6,
    width: frameWidth,
    height: frameHeight,
    rotation: 0.052,
    photoInsetX: 18,
    photoInsetTop: 18,
    photoBottomPad: 110,
    bgColor: '#EDE7DC',
    shadowOpacity: 0.07,
    drawImage: false,
  })

  // Main polaroid frame
  await drawPolaroidPhotoFrame(ctx, moment, {
    x: frameX,
    y: frameY,
    width: frameWidth,
    height: frameHeight,
    rotation: -0.018,
    photoInsetX: 18,
    photoInsetTop: 18,
    photoBottomPad: 110,
    bgColor: '#FFFFFF',
    shadowOpacity: 0.20,
    photoRadius: 10,
  })

  const contentX = 98
  const contentWidth = width - contentX * 2
  let y = 1104

  // Accent ornament line above title
  ctx.save()
  ctx.fillStyle = COLOR.accent
  ctx.fillRect(contentX, y - 34, 52, 3)
  ctx.restore()

  ctx.textBaseline = 'top'
  ctx.fillStyle = COLOR.text
  ctx.font = '700 88px "Cormorant Garamond", Georgia, serif'
  const titleLines = wrapText(ctx, moment.title || 'Момент', contentWidth, 2)
  y = drawTextBlock(ctx, titleLines, contentX, y, 90)

  if (moment.description) {
    y += 30
    ctx.fillStyle = COLOR.mid
    ctx.font = '500 40px Inter, sans-serif'
    const descriptionLines = wrapText(ctx, moment.description, contentWidth, 2)
    y = drawTextBlock(ctx, descriptionLines, contentX, y, 54)
  }

  if (moment.song_title) {
    y += 36
    const songHeight = await drawSongChip(ctx, contentX, y, contentWidth, moment, {
      dark: false,
      songBg: COLOR.cardAlt,
      songIconBg: COLOR.accentLight,
      songIconStroke: COLOR.accent,
      songTitle: COLOR.text,
      songSubtitle: COLOR.mid,
    })
    y += songHeight
  }

  if (peopleNames.length > 0) {
    y += 26
    y = drawPeopleChip(ctx, contentX, y, contentWidth, peopleNames, {
      labelColor: COLOR.mid,
      textColor: COLOR.text,
    })
  }

  if (moment.mood) {
    y += 22
    y += drawMoodChip(ctx, contentX, y, moment.mood, {
      font: '600 36px Inter, sans-serif',
      color: COLOR.text,
      background: '#F0E6DA',
      paddingX: 28,
      height: 72,
      minWidth: 160,
    })
  }

  if (moment.location) {
    y += 20
    drawLocationChip(ctx, contentX, y, contentWidth, moment.location, {
      chipBg: COLOR.cardAlt,
      iconColor: COLOR.mid,
      textColor: COLOR.mid,
    })
  }
}

async function drawMinimal(canvas, moment) {
  const width = 1080
  const height = 1920
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const peopleNames = getMomentPeopleNames(moment)

  drawBackground(ctx, 'minimal', width, height)

  const photoX = 72
  const photoY = 164
  const photoWidth = 936
  const photoHeight = 826
  const dateText = formatStoryDate(getMomentDisplayAt(moment))

  drawCanvasHeader(ctx, {
    logoX: 72,
    logoY: 76,
    dateX: 1008,
    dateY: 88,
    dateText,
  })

  // Blurred atmosphere haze behind photo (uses cached image)
  if (moment.photo_url) {
    try {
      const image = await loadImage(moment.photo_url)
      ctx.save()
      ctx.filter = 'blur(54px)'
      ctx.globalAlpha = 0.28
      const hazeScale = Math.max(width / image.width, (photoHeight + 200) / image.height)
      const hazeW = image.width * hazeScale
      const hazeH = image.height * hazeScale
      const hazeX = (width - hazeW) / 2
      const hazeY = photoY - 80 + (photoHeight + 200 - hazeH) / 2
      ctx.drawImage(image, hazeX - 60, hazeY - 40, hazeW + 120, hazeH + 80)
      ctx.globalAlpha = 1
      ctx.filter = 'none'
      ctx.restore()
    } catch {}
  }

  // Photo drop shadow (draw placeholder rect first, then photo covers it)
  ctx.save()
  ctx.shadowColor = 'rgba(80, 50, 30, 0.18)'
  ctx.shadowBlur = 44
  ctx.shadowOffsetY = 18
  fillRoundRect(ctx, photoX, photoY, photoWidth, photoHeight, 46, '#FAF7F3')
  ctx.restore()

  await drawPhoto(ctx, moment, photoX, photoY, photoWidth, photoHeight, 46)

  const contentX = 72
  const contentWidth = width - contentX * 2
  let y = photoY + photoHeight + 88

  // Accent ornament line above title
  ctx.save()
  ctx.fillStyle = COLOR.accent
  ctx.fillRect(contentX, y - 30, 52, 3)
  ctx.restore()

  ctx.textBaseline = 'top'
  ctx.fillStyle = COLOR.text
  ctx.font = '700 88px "Cormorant Garamond", Georgia, serif'
  const titleLines = wrapText(ctx, moment.title || 'Момент', contentWidth, 2)
  y = drawTextBlock(ctx, titleLines, contentX, y, 90)

  if (moment.description) {
    y += 30
    ctx.fillStyle = COLOR.mid
    ctx.font = '500 40px Inter, sans-serif'
    const descriptionLines = wrapText(ctx, moment.description, contentWidth, 2)
    y = drawTextBlock(ctx, descriptionLines, contentX, y, 54)
  }

  if (moment.song_title) {
    y += 36
    const songHeight = await drawSongChip(ctx, contentX, y, contentWidth, moment, {
      dark: false,
      songBg: '#F7ECDC',
      songIconBg: COLOR.accent,
      songIconStroke: '#FFFFFF',
      songTitle: COLOR.text,
      songSubtitle: COLOR.mid,
    })
    y += songHeight
  }

  if (peopleNames.length > 0) {
    y += 26
    y = drawPeopleChip(ctx, contentX, y, contentWidth, peopleNames, {
      labelColor: COLOR.mid,
      textColor: COLOR.text,
    })
  }

  if (moment.mood) {
    y += 22
    y += drawMoodChip(ctx, contentX, y, moment.mood, {
      font: '600 36px Inter, sans-serif',
      color: COLOR.text,
      background: '#F0E6DA',
      paddingX: 28,
      height: 72,
      minWidth: 160,
    })
  }

  if (moment.location) {
    y += 20
    drawLocationChip(ctx, contentX, y, contentWidth, moment.location, {
      chipBg: '#F7ECDC',
      iconColor: COLOR.accent,
      textColor: COLOR.mid,
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

  drawBackground(ctx, 'dark', width, height)

  const dateText = formatStoryDate(getMomentDisplayAt(moment))
  const photoHeight = 960 // cinematic — ~50% of canvas
  await drawPhoto(ctx, moment, 0, 0, width, photoHeight, 0, true)

  // Cinematic bottom fade
  const photoFade = ctx.createLinearGradient(0, photoHeight * 0.42, 0, photoHeight + 80)
  photoFade.addColorStop(0, 'rgba(23,20,14,0)')
  photoFade.addColorStop(0.55, 'rgba(23,20,14,0.62)')
  photoFade.addColorStop(1, 'rgba(23,20,14,1)')
  ctx.fillStyle = photoFade
  ctx.fillRect(0, 0, width, photoHeight + 80)

  // Top vignette
  const topShade = ctx.createLinearGradient(0, 0, 0, 240)
  topShade.addColorStop(0, 'rgba(23,20,14,0.52)')
  topShade.addColorStop(1, 'rgba(23,20,14,0)')
  ctx.fillStyle = topShade
  ctx.fillRect(0, 0, width, 240)

  // Amber light leak — top-right corner
  const lightLeak = ctx.createRadialGradient(width, 0, 0, width, 0, 700)
  lightLeak.addColorStop(0, 'rgba(217,139,82,0.15)')
  lightLeak.addColorStop(0.5, 'rgba(217,139,82,0.04)')
  lightLeak.addColorStop(1, 'rgba(217,139,82,0)')
  ctx.fillStyle = lightLeak
  ctx.fillRect(0, 0, width, photoHeight)

  drawCanvasHeader(ctx, {
    logoX: 84,
    logoY: 82,
    dateX: 996,
    dateY: 94,
    dateText,
    dark: true,
  })

  const contentX = 84
  const contentWidth = width - contentX * 2
  let y = photoHeight + 72

  // Accent ornament line above title
  ctx.save()
  ctx.fillStyle = COLOR.accent
  ctx.fillRect(contentX, y - 30, 52, 3)
  ctx.restore()

  ctx.textBaseline = 'top'
  ctx.fillStyle = '#FFF4E6'
  ctx.font = '700 88px "Cormorant Garamond", Georgia, serif'
  const titleLines = wrapText(ctx, moment.title || 'Момент', contentWidth, 2)
  y = drawTextBlock(ctx, titleLines, contentX, y, 90)

  if (moment.description) {
    y += 30
    ctx.fillStyle = 'rgba(245, 235, 221, 0.7)'
    ctx.font = '500 40px Inter, sans-serif'
    const descriptionLines = wrapText(ctx, moment.description, contentWidth, 2)
    y = drawTextBlock(ctx, descriptionLines, contentX, y, 54)
  }

  if (moment.song_title) {
    y += 36
    const songHeight = await drawSongChip(ctx, contentX, y, contentWidth, moment, {
      dark: true,
      songBg: COLOR.darkCardAlt,
      songIconBg: 'rgba(217,139,82,0.16)',
      songIconStroke: COLOR.accent,
      songTitle: '#FFF4E6',
      songSubtitle: 'rgba(245, 235, 221, 0.62)',
    })
    y += songHeight
  }

  if (peopleNames.length > 0) {
    y += 26
    y = drawPeopleChip(ctx, contentX, y, contentWidth, peopleNames, {
      labelColor: 'rgba(245, 235, 221, 0.45)',
      textColor: 'rgba(245, 235, 221, 0.88)',
    })
  }

  if (moment.mood) {
    y += 22
    y += drawMoodChip(ctx, contentX, y, moment.mood, {
      font: '600 36px Inter, sans-serif',
      color: '#FFF4E6',
      background: 'rgba(255, 244, 230, 0.12)',
      paddingX: 28,
      height: 72,
      minWidth: 160,
    })
  }

  if (moment.location) {
    y += 20
    drawLocationChip(ctx, contentX, y, contentWidth, moment.location, {
      chipBg: 'rgba(255, 244, 230, 0.08)',
      iconColor: COLOR.accent,
      textColor: 'rgba(245, 235, 221, 0.72)',
    })
  }
}

async function drawCard(canvas, moment, template) {
  if (template === 'minimal') return drawMinimal(canvas, moment)
  if (template === 'dark') return drawDark(canvas, moment)
  return drawPolaroid(canvas, moment)
}

function TemplateToggle({ activeTemplate, onChange, dark }) {
  return (
    <div
      className="grid grid-cols-3 gap-2 rounded-[22px] p-1"
      style={{
        backgroundColor: dark ? 'rgba(255,255,255,0.08)' : 'var(--surface)',
        border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(160,94,44,0.08)',
      }}
    >
      {TEMPLATES.map((template) => {
        const active = template.id === activeTemplate

        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onChange(template.id)}
            className="font-sans transition-all active:opacity-70"
            style={{
              border: 'none',
              borderRadius: 18,
              backgroundColor: active ? 'var(--accent)' : 'transparent',
              color: active ? '#fff' : (dark ? 'rgba(255,244,231,0.72)' : 'var(--mid)'),
              minHeight: 44,
              fontSize: 15,
              fontWeight: active ? 700 : 600,
            }}
          >
            {template.label}
          </button>
        )
      })}
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
  const moment = moments.find((item) => item.id === id)

  const canvasRef = useRef(null)
  const [template, setTemplate] = useState('polaroid')
  const [rendering, setRendering] = useState(true)
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState(null)

  const dark = template === 'dark'

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
          <div className="mx-auto w-full" style={{ maxWidth: 'min(356px, calc((100vh - 300px) * 9 / 16))' }}>
            <div
              className="relative rounded-[32px] p-2"
              style={{
                backgroundColor: dark ? 'rgba(255,244,231,0.04)' : 'rgba(255,255,255,0.56)',
                border: dark ? '1px solid rgba(255,244,231,0.08)' : '1px solid rgba(160,94,44,0.08)',
                boxShadow: dark ? '0 24px 48px rgba(0,0,0,0.26)' : '0 20px 44px rgba(80,50,30,0.12)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
              }}
            >
              <canvas
                ref={canvasRef}
                style={{
                  width: '100%',
                  aspectRatio: '9 / 16',
                  display: 'block',
                  borderRadius: 26,
                  backgroundColor: dark ? '#1F1712' : '#FBF7F0',
                }}
              />

              {rendering && (
                <div
                  className="absolute inset-2 flex items-center justify-center rounded-[26px]"
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
                <div className="absolute inset-2 flex items-center justify-center rounded-[26px]">
                  <span className="font-sans" style={{ color: '#D94040', fontSize: 13, fontWeight: 600 }}>
                    {error}
                  </span>
                </div>
              )}
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
          <TemplateToggle activeTemplate={template} onChange={handleTemplateChange} dark={dark} />

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
  )
}

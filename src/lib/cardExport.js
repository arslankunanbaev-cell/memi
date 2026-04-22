const JPEG_MIME_TYPE = 'image/jpeg'

export function getCardFilename(id) {
  return `memi-${id?.slice?.(0, 8) ?? 'moment'}.jpg`
}

export function shouldUseShareFallback(webApp = window.Telegram?.WebApp ?? null) {
  const platform = webApp?.platform?.toLowerCase?.() ?? ''
  return platform === 'ios' || platform === 'android' || platform === 'webk'
}

export function canShareFiles(files) {
  if (!navigator.share || !navigator.canShare || !files?.length) {
    return false
  }

  try {
    return navigator.canShare({ files })
  } catch {
    return false
  }
}

export function canvasToBlob(canvas, quality = 0.92) {
  return new Promise((resolve) => {
    canvas?.toBlob?.(resolve, JPEG_MIME_TYPE, quality)
  })
}

export async function createCanvasFile(canvas, filename, quality = 0.92) {
  const blob = await canvasToBlob(canvas, quality)
  if (!blob) return null
  return new File([blob], filename, { type: JPEG_MIME_TYPE })
}

export function triggerBrowserDownload(file) {
  const objectUrl = URL.createObjectURL(file)
  const link = document.createElement('a')

  link.href = objectUrl
  link.download = file.name
  link.rel = 'noopener'
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()

  const cleanup = () => {
    link.remove()
    URL.revokeObjectURL(objectUrl)
  }

  if (typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(cleanup)
    return
  }

  window.setTimeout(cleanup, 0)
}

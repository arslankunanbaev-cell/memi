const DEFAULT_CROP = { x: 50, y: 50 }

function clampPercent(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 50
  return Math.min(100, Math.max(0, Math.round(number)))
}

export function normalizePhotoCrop(crop) {
  return {
    x: clampPercent(crop?.x),
    y: clampPercent(crop?.y),
  }
}

export function getMomentPhotoCrop(moment) {
  return normalizePhotoCrop({
    x: moment?.photo_crop_x ?? DEFAULT_CROP.x,
    y: moment?.photo_crop_y ?? DEFAULT_CROP.y,
  })
}

export function getPhotoCropStyle(momentOrCrop) {
  const crop = 'photo_crop_x' in (momentOrCrop ?? {})
    ? getMomentPhotoCrop(momentOrCrop)
    : normalizePhotoCrop(momentOrCrop)

  return {
    objectFit: 'cover',
    objectPosition: `${crop.x}% ${crop.y}%`,
  }
}

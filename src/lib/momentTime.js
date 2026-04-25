function toTimeValue(iso) {
  if (!iso) return 0

  const value = Date.parse(iso)
  return Number.isNaN(value) ? 0 : value
}

function inferAddedAtFromPhotoPath(moment) {
  const photoPath = moment?.photo_path
  if (typeof photoPath !== 'string' || !photoPath) return null

  const match = photoPath.match(/(?:^|\/)(\d{13})(?:\.[^/.]+)?$/)
  if (!match) return null

  const timestamp = Number(match[1])
  if (!Number.isFinite(timestamp)) return null

  return new Date(timestamp).toISOString()
}

export function getMomentDisplayAt(moment) {
  if (!moment) return null
  return moment.moment_at ?? moment.created_at ?? null
}

export function getMomentAddedAt(moment) {
  if (!moment) return null
  return moment.created_at ?? null
}

export function compareMomentsByAddedAt(left, right) {
  return toTimeValue(getMomentAddedAt(right)) - toTimeValue(getMomentAddedAt(left))
}

export function compareMomentsByDisplayAt(left, right) {
  return toTimeValue(getMomentDisplayAt(right)) - toTimeValue(getMomentDisplayAt(left))
}

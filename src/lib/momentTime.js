function toTimeValue(iso) {
  if (!iso) return 0

  const value = Date.parse(iso)
  return Number.isNaN(value) ? 0 : value
}

export function getMomentDisplayAt(moment) {
  if (!moment) return null
  return moment.moment_at ?? moment.created_at ?? null
}

export function getMomentAddedAt(moment) {
  if (!moment) return null
  return moment.created_at ?? getMomentDisplayAt(moment)
}

export function compareMomentsByAddedAt(left, right) {
  return toTimeValue(getMomentAddedAt(right)) - toTimeValue(getMomentAddedAt(left))
}

export function compareMomentsByDisplayAt(left, right) {
  return toTimeValue(getMomentDisplayAt(right)) - toTimeValue(getMomentDisplayAt(left))
}

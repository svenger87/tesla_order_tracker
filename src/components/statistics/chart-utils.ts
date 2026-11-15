/**
 * Month keys ("YYYY-MM") for charts that bucket by month.
 *
 * Some orders carry a delivery (or even order) date in a later month — a booked
 * appointment, or a typo — and every such row used to open a month on the axis
 * that has not happened yet. Charts of what happened stop at the current month.
 */
export function currentMonthKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/** Drop entries whose month key lies after the current month. */
export function clampToCurrentMonth<T>(data: T[], getKey: (item: T) => string, now: Date = new Date()): T[] {
  const limit = currentMonthKey(now)
  return data.filter(item => getKey(item) <= limit)
}

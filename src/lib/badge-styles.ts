/**
 * Badge style helper for consistent visual differentiation across table and cards.
 * Returns Tailwind class strings for different badge categories.
 */

export type BadgeCategory = 'model' | 'range' | 'drive' | 'vehicleType'

export function getBadgeStyle(category: BadgeCategory, value: string): string {
  switch (category) {
    case 'model':
      if (value.toLowerCase().includes('performance')) {
        return '' // Uses variant="destructive" (red)
      }
      if (value.toLowerCase().includes('premium') || value.toLowerCase().includes('long')) {
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
      }
      return '' // default secondary

    case 'range':
      if (value.toLowerCase().includes('max') || value.toLowerCase().includes('maximale')) {
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
      }
      return '' // default outline

    case 'drive':
      if (value.toLowerCase().includes('awd') || value.toLowerCase().includes('dual')) {
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800 font-mono'
      }
      return 'font-mono' // default mono style for all drive badges

    default:
      return ''
  }
}

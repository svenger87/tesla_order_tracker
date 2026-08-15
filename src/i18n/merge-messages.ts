type MessageTree = { [key: string]: string | MessageTree }

function isTree(value: unknown): value is MessageTree {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Lay a translation over the source language, key by key.
 *
 * Translations arrive through Crowdin, which means a string added to the source
 * file is live in production before it reaches the other 21 languages. Without a
 * fallback next-intl renders the key path itself — a visitor on the French site
 * met a page whose headline read "errors.pageNotFoundTitle".
 *
 * Merging per key rather than per namespace matters: taking whole namespaces
 * from whichever file has them would mean one new key in a namespace drops the
 * translations of everything beside it.
 *
 * An empty string in the translation is kept as-is. It is a decision someone
 * made, not an absence.
 */
export function mergeMessages(source: MessageTree, translation: MessageTree): MessageTree {
  const merged: MessageTree = { ...source }

  for (const [key, value] of Object.entries(translation)) {
    const base = merged[key]
    merged[key] = isTree(value) && isTree(base) ? mergeMessages(base, value) : value
  }

  return merged
}

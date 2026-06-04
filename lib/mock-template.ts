import { faker } from '@faker-js/faker'

type AnyObject = Record<string, any>

/**
 * Replace occurrences of {{faker.path}} in a string.
 * Supports patterns like {{faker.name.firstName}} (no args).
 */
function replaceFakerPlaceholders(s: string) {
  // If the string is EXACTLY a single placeholder (e.g. "{{faker.number.int}}"),
  // return the raw resolved value (number, boolean, etc.) rather than casting it to a string.
  const exactMatch = s.trim().match(/^{{\s*faker\.([a-zA-Z0-9_.]+)\s*}}$/)
  if (exactMatch) {
    const path = exactMatch[1]
    try {
      const parts = path.split('.')
      let cur: any = faker
      for (const p of parts) {
        if (cur == null) return ''
        cur = cur[p]
      }
      if (typeof cur === 'function') return cur()
      return cur ?? ''
    } catch {
      return ''
    }
  }

  // Otherwise, perform string substitution for embedded placeholders
  return s.replace(/{{\s*faker\.([a-zA-Z0-9_.]+)\s*}}/g, (_, path) => {
    try {
      const parts = path.split('.')
      let cur: any = faker
      for (const p of parts) {
        if (cur == null) return ''
        cur = cur[p]
      }
      if (typeof cur === 'function') return String(cur())
      return String(cur ?? '')
    } catch {
      return ''
    }
  })
}

/**
 * Recursively walk through value and replace templates in strings.
 * - If value is a string => apply replaceFakerPlaceholders
 * - If array/object => traverse
 */
export function renderTemplate(value: any): any {
  if (value == null) return value
  if (typeof value === 'string') {
    // If the whole string is JSON-serializable and contains faker placeholders,
    // we still return string with replacements.
    return replaceFakerPlaceholders(value)
  }
  if (Array.isArray(value)) {
    return value.map((v) => renderTemplate(v))
  }
  if (typeof value === 'object') {
    const out: AnyObject = {}
    for (const [k, v] of Object.entries(value)) {
      out[k] = renderTemplate(v)
    }
    return out
  }
  return value
}
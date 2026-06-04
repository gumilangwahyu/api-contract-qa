// lib/schema-infer.ts
// Infer a JSON Schema from an example object (best-effort, simple)
function detectStringFormat(s: string) {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/.test(s)) return 'date-time'
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return 'date'
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return 'email'
  if (/^https?:\/\/.+/.test(s)) return 'uri'
  return undefined
}

function inferType(value: any) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  const t = typeof value
  if (t === 'string') return 'string'
  if (t === 'boolean') return 'boolean'
  if (t === 'number') {
    return Number.isInteger(value) ? 'integer' : 'number'
  }
  if (t === 'object') return 'object'
  return 'string'
}

export function inferJsonSchema(value: any): any {
  if (value === null) return { type: 'null' }

  const t = inferType(value)

  if (t === 'object') {
    const props: Record<string, any> = {}
    for (const [k, v] of Object.entries(value)) {
      props[k] = inferJsonSchema(v)
    }
    const required = Object.keys(props)
    return {
      type: 'object',
      properties: props,
      required,
      additionalProperties: false,
    }
  }

  if (t === 'array') {
    const items = value.length > 0 ? inferJsonSchema(value[0]) : {}
    return {
      type: 'array',
      items,
      minItems: Math.max(1, value.length),
    }
  }

  if (t === 'string') {
    const schema: any = { type: 'string', example: value }
    const fmt = detectStringFormat(value)
    if (fmt) schema.format = fmt
    return schema
  }

  if (t === 'integer' || t === 'number') {
    return { type: t, example: value }
  }

  if (t === 'boolean') {
    return { type: 'boolean', example: value }
  }

  return { type: 'string', example: String(value) }
}
import { faker } from '@faker-js/faker'

let jsf: any = null
try {
  // require dinamically agar tidak memblok build kalau package belum diinstall
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  jsf = require('json-schema-faker')
  if (jsf) {
    try {
      jsf.extend('faker', () => faker)
      jsf.option({
        alwaysFakeOptionals: true,
        useExamplesValue: true,
        useDefaultValue: true,
        resolveJsonPath: true,
        // prevent generating many extraneous optionals by controlling probabilities
        optionalsProbability: 0.8,
        maxItems: 3,
      })
    } catch (e) {
      // ignore
    }
  }
} catch {
  jsf = null
}

/** Basic helpers */
function isObject(v: any) {
  return v && typeof v === 'object' && !Array.isArray(v)
}

function coercePrimitive(value: any, schemaType: string | undefined) {
  if (schemaType === 'string') return String(value)
  if (schemaType === 'integer' || schemaType === 'number') {
    const n = Number(value)
    return Number.isNaN(n) ? 0 : (schemaType === 'integer' ? Math.floor(n) : n)
  }
  if (schemaType === 'boolean') return Boolean(value)
  return value
}

/**
 * Sanitize a generated sample to match schema as closely as possible:
 * - For objects: keep only schema.properties keys (if present). Ensure required keys exist.
 * - For arrays: sanitize each item using schema.items.
 * - For primitives: coerce basic types.
 */
function sanitizeAgainstSchema(schema: any, sample: any): any {
  if (!schema || typeof schema !== 'object') return sample

  const t = schema.type
  if (!t) {
    // infer type
    if (schema.properties) return sanitizeAgainstSchema({ ...schema, type: 'object' }, sample)
    if (schema.items) return sanitizeAgainstSchema({ ...schema, type: 'array' }, sample)
    return sample
  }

  if (t === 'object') {
    const props = schema.properties || {}
    const out: Record<string, any> = {}

    // If sample is not object, try to create one
    const src = isObject(sample) ? sample : {}

    // Keep only defined properties
    for (const [k, propSchema] of Object.entries(props)) {
      const pSchema = propSchema as any
      if (k in src) {
        out[k] = sanitizeAgainstSchema(pSchema, src[k])
      } else {
        // missing: fill with example/default or generate a simple faker value
        if (pSchema.example !== undefined) out[k] = pSchema.example
        else if (pSchema.default !== undefined) out[k] = pSchema.default
        else {
          out[k] = simpleGenerate(pSchema)
        }
      }
    }

    // Ensure required keys exist (already handled above), ignore any extra keys in sample
    return out
  }

  if (t === 'array') {
    const itemsSchema = schema.items || {}
    if (!Array.isArray(sample)) {
      // create minimal array with one sanitized item
      return [sanitizeAgainstSchema(itemsSchema, sample)]
    }
    return sample.map((it: any) => sanitizeAgainstSchema(itemsSchema, it))
  }

  // primitives
  return coercePrimitive(sample, t)
}

/** Fallback simple generator (keeps consistent with schema) */
function simpleGenerate(schema: any): any {
  if (!schema || typeof schema !== 'object') return schema ?? {}

  const t = schema.type
  if (!t) {
    if (schema.properties) return simpleGenerate({ ...schema, type: 'object' })
    if (schema.items) return simpleGenerate({ ...schema, type: 'array' })
    return {}
  }

  if (t === 'object') {
    const out: Record<string, any> = {}
    const props = schema.properties || {}
    for (const [k, v] of Object.entries(props)) {
      out[k] = simpleGenerate(v as any)
    }
    return out
  }

  if (t === 'array') {
    const it = schema.items || {}
    return [simpleGenerate(it)]
  }

  if (t === 'string') {
    if (schema.enum && Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0]
    if (schema.format === 'uri' || schema.format === 'url') return faker.internet.url()
    if (schema.format === 'email') return faker.internet.email()
    if (schema.example) return schema.example
    return faker.lorem.word()
  }

  if (t === 'integer' || t === 'number') {
    if (schema.enum && Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0]
    if (typeof schema.minimum === 'number') return schema.minimum
    return 0
  }

  if (t === 'boolean') return true

  return null
}

/**
 * Main generator:
 * - Try jsf (if available)
 * - Fallback to simpleGenerate
 * - Always sanitize result by schema to remove extra keys and enforce structure
 */
export function generateSampleFromJsonSchema(schema: any): any {
  if (!schema || typeof schema !== 'object') return {}

  let sample: any = null

  if (jsf) {
    try {
      // jsf.generate might be synchronous (older versions) or jsf(schema)
      if (typeof jsf.generate === 'function') {
        sample = jsf.generate(schema)
      } else if (typeof jsf === 'function') {
        sample = jsf(schema)
      } else if (typeof jsf.resolve === 'function') {
        // synchronous fallback: try resolve but it returns Promise — handle via fallback path
        // to keep API sync, fall back to simpleGenerate if resolve exists
        sample = simpleGenerate(schema)
      } else {
        sample = simpleGenerate(schema)
      }
    } catch (e) {
      sample = simpleGenerate(schema)
    }
  } else {
    sample = simpleGenerate(schema)
  }

  try {
    return sanitizeAgainstSchema(schema, sample)
  } catch (e) {
    // If sanitization fails for unexpected reason, return fallback sample
    return simpleGenerate(schema)
  }
}
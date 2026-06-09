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
/** Find all array paths defined inside the JSON Schema recursively */
export function findArrayPaths(schema: any, currentPath: string = ''): string[] {
  if (!schema || typeof schema !== 'object') return []
  let paths: string[] = []

  const t = schema.type
  if (t === 'array') {
    paths.push(currentPath || 'root')
    if (schema.items) {
      const itemsPaths = findArrayPaths(schema.items, currentPath ? `${currentPath}[]` : '[]')
      paths = paths.concat(itemsPaths)
    }
  } else if (t === 'object' && schema.properties) {
    for (const [k, v] of Object.entries(schema.properties)) {
      const nextPath = currentPath ? `${currentPath}.${k}` : k
      paths = paths.concat(findArrayPaths(v, nextPath))
    }
  } else if (schema.properties) {
    for (const [k, v] of Object.entries(schema.properties)) {
      const nextPath = currentPath ? `${currentPath}.${k}` : k
      paths = paths.concat(findArrayPaths(v, nextPath))
    }
  } else if (schema.items) {
    paths = paths.concat(findArrayPaths(schema.items, currentPath ? `${currentPath}[]` : '[]'))
  }

  return paths
}

function resolveArrayLength(currentPath: string, arrayLengths?: Record<string, number> | number): number {
  if (typeof arrayLengths === 'number') return arrayLengths
  if (arrayLengths && typeof arrayLengths === 'object') {
    const pathKey = currentPath || 'root'
    if (typeof arrayLengths[pathKey] === 'number') return arrayLengths[pathKey]
    if (typeof arrayLengths['__globalDefault'] === 'number') return arrayLengths['__globalDefault']
  }
  return 5
}

function sanitizeAgainstSchema(
  schema: any,
  sample: any,
  currentPath: string,
  arrayLengths?: Record<string, number> | number
): any {
  if (!schema || typeof schema !== 'object') return sample

  const t = schema.type
  if (!t) {
    // infer type
    if (schema.properties) return sanitizeAgainstSchema({ ...schema, type: 'object' }, sample, currentPath, arrayLengths)
    if (schema.items) return sanitizeAgainstSchema({ ...schema, type: 'array' }, sample, currentPath, arrayLengths)
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
      const nextPath = currentPath ? `${currentPath}.${k}` : k
      if (k in src) {
        out[k] = sanitizeAgainstSchema(pSchema, src[k], nextPath, arrayLengths)
      } else {
        // missing: fill with example/default or generate a simple faker value
        if (pSchema.example !== undefined) out[k] = pSchema.example
        else if (pSchema.default !== undefined) out[k] = pSchema.default
        else {
          out[k] = simpleGenerate(pSchema, nextPath, arrayLengths)
        }
      }
    }

    // Ensure required keys exist (already handled above), ignore any extra keys in sample
    return out
  }

  if (t === 'array') {
    const itemsSchema = schema.items || {}
    const len = resolveArrayLength(currentPath, arrayLengths)
    const nextPath = currentPath ? `${currentPath}[]` : '[]'

    if (!Array.isArray(sample)) {
      // create array with len sanitized items
      const arr = []
      for (let i = 0; i < len; i++) {
        arr.push(sanitizeAgainstSchema(itemsSchema, sample, nextPath, arrayLengths))
      }
      return arr
    }
    // If it's an array, adjust its length to fit len
    const arr = [...sample]
    if (arr.length < len) {
      while (arr.length < len) {
        arr.push(arr[0] ? JSON.parse(JSON.stringify(arr[0])) : simpleGenerate(itemsSchema, nextPath, arrayLengths))
      }
    } else if (arr.length > len) {
      arr.length = len
    }
    return arr.map((it: any) => sanitizeAgainstSchema(itemsSchema, it, nextPath, arrayLengths))
  }

  // primitives
  return coercePrimitive(sample, t)
}

/** Fallback simple generator (keeps consistent with schema) */
function simpleGenerate(schema: any, currentPath: string, arrayLengths?: Record<string, number> | number): any {
  if (!schema || typeof schema !== 'object') return schema ?? {}

  const t = schema.type
  if (!t) {
    if (schema.properties) return simpleGenerate({ ...schema, type: 'object' }, currentPath, arrayLengths)
    if (schema.items) return simpleGenerate({ ...schema, type: 'array' }, currentPath, arrayLengths)
    return {}
  }

  if (t === 'object') {
    const out: Record<string, any> = {}
    const props = schema.properties || {}
    for (const [k, v] of Object.entries(props)) {
      const nextPath = currentPath ? `${currentPath}.${k}` : k
      out[k] = simpleGenerate(v as any, nextPath, arrayLengths)
    }
    return out
  }

  if (t === 'array') {
    const it = schema.items || {}
    const len = resolveArrayLength(currentPath, arrayLengths)
    const nextPath = currentPath ? `${currentPath}[]` : '[]'
    const arr = []
    for (let i = 0; i < len; i++) {
      arr.push(simpleGenerate(it, nextPath, arrayLengths))
    }
    return arr
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
export function generateSampleFromJsonSchema(schema: any, arrayLengths?: Record<string, number> | number): any {
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
        sample = simpleGenerate(schema, '', arrayLengths)
      } else {
        sample = simpleGenerate(schema, '', arrayLengths)
      }
    } catch (e) {
      sample = simpleGenerate(schema, '', arrayLengths)
    }
  } else {
    sample = simpleGenerate(schema, '', arrayLengths)
  }

  try {
    return sanitizeAgainstSchema(schema, sample, '', arrayLengths)
  } catch (e) {
    // If sanitization fails for unexpected reason, return fallback sample
    return simpleGenerate(schema, '', arrayLengths)
  }
}
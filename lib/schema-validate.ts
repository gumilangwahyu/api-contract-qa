// lib/schema-validate.ts
// Uses Ajv to validate and provides simple diff helpers (missing required, extra props, type mismatches)
import Ajv from 'ajv'

function isObject(v: any) {
  return v && typeof v === 'object' && !Array.isArray(v)
}

function collectMissingRequired(schema: any, sample: any, path = ''): string[] {
  const out: string[] = []
  if (!schema || typeof schema !== 'object') return out
  const t = schema.type
  if (!t) {
    if (schema.properties) return collectMissingRequired({ ...schema, type: 'object' }, sample, path)
    return out
  }
  if (t === 'object') {
    const props = schema.properties || {}
    const required = schema.required || []
    const requiredSet = new Set(required)
    for (const req of required) {
      const p = path ? `${path}.${req}` : req
      if (!sample || !(req in (sample || {}))) out.push(p)
      else {
        out.push(...collectMissingRequired(props[req], sample[req], p))
      }
    }
    // Also descend into present properties to find nested required (skipping already processed ones)
    for (const [k, propSchema] of Object.entries(props)) {
      if (!requiredSet.has(k) && sample && k in sample) {
        const p = path ? `${path}.${k}` : k
        out.push(...collectMissingRequired(propSchema, sample[k], p))
      }
    }
    return out
  }
  if (t === 'array') {
    const itemsSchema = schema.items || {}
    if (Array.isArray(sample)) {
      for (let i = 0; i < sample.length; i++) {
        out.push(...collectMissingRequired(itemsSchema, sample[i], `${path}[${i}]`))
      }
    } else {
      out.push(path)
    }
    return out
  }
  return out
}

function collectExtraProperties(schema: any, sample: any, path = ''): string[] {
  const out: string[] = []
  if (!schema || typeof schema !== 'object') return out
  const t = schema.type
  if (!t) {
    if (schema.properties) return collectExtraProperties({ ...schema, type: 'object' }, sample, path)
    return out
  }
  if (t === 'object') {
    const props = schema.properties || {}
    if (isObject(sample)) {
      for (const key of Object.keys(sample)) {
        if (!(key in props)) {
          const p = path ? `${path}.${key}` : key
          out.push(p)
        } else {
          const p = path ? `${path}.${key}` : key
          out.push(...collectExtraProperties(props[key], sample[key], p))
        }
      }
    }
    return out
  }
  if (t === 'array') {
    const itemsSchema = schema.items || {}
    if (Array.isArray(sample)) {
      for (let i = 0; i < sample.length; i++) {
        out.push(...collectExtraProperties(itemsSchema, sample[i], `${path}[${i}]`))
      }
    }
    return out
  }
  return out
}

function collectTypeMismatches(schema: any, sample: any, path = ''): string[] {
  const out: string[] = []
  if (!schema || typeof schema !== 'object') return out
  const t = schema.type
  if (!t) {
    if (schema.properties) return collectTypeMismatches({ ...schema, type: 'object' }, sample, path)
    return out
  }
  if (t === 'object') {
    const props = schema.properties || {}
    if (!isObject(sample)) {
      out.push(path || '(root)')
      return out
    }
    for (const [k, propSchema] of Object.entries(props)) {
      const p = path ? `${path}.${k}` : k
      out.push(...collectTypeMismatches(propSchema, sample && k in sample ? sample[k] : undefined, p))
    }
    return out
  }
  if (t === 'array') {
    const itemsSchema = schema.items || {}
    if (!Array.isArray(sample)) {
      out.push(path || '(root)')
      return out
    }
    for (let i = 0; i < sample.length; i++) {
      out.push(...collectTypeMismatches(itemsSchema, sample[i], `${path}[${i}]`))
    }
    return out
  }
  // primitive types
  if (sample === undefined || sample === null) {
    // handled elsewhere (missing)
    return out
  }
  const actualType = Array.isArray(sample) ? 'array' : typeof sample === 'number' && Number.isInteger(sample) ? 'integer' : typeof sample
  // treat number vs integer loosely
  if (t === 'integer' && actualType === 'number' && !Number.isInteger(sample)) {
    out.push(path || '(root)')
  } else if (t === 'number' && actualType !== 'number') {
    out.push(path || '(root)')
  } else if (t === 'string' && actualType !== 'string') {
    out.push(path || '(root)')
  } else if (t === 'boolean' && actualType !== 'boolean') {
    out.push(path || '(root)')
  }
  return out
}

export function validateSchema(schema: any, sample: any) {
  try {
    const ajv = new Ajv({ strict: false, allErrors: true })
    const valid = ajv.validate(schema, sample)
    const errors = ajv.errors || null
    const missing = collectMissingRequired(schema, sample)
    const extra = collectExtraProperties(schema, sample)
    const typeMismatches = collectTypeMismatches(schema, sample)
    return { valid: Boolean(valid), errors, missing, extra, typeMismatches }
  } catch (err: any) {
    return {
      valid: false,
      errors: [{ message: err?.message || 'Invalid JSON Schema structure' } as any],
      missing: [],
      extra: [],
      typeMismatches: []
    }
  }
}
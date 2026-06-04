// Simple wrapper for Vercel KV (or fallback in-memory for local)
// If using @vercel/kv install and configure properly; here we provide basic fallback.
let memoryKV: Record<string, string> = {}

export async function incrementHitCount(key: string) {
  const k = `hits:${key}:${new Date().toISOString().split('T')[0]}`
  const v = parseInt((memoryKV[k] as any) || '0', 10) + 1
  memoryKV[k] = String(v)
  return v
}

export async function getHitCount(key: string) {
  const k = `hits:${key}:${new Date().toISOString().split('T')[0]}`
  return parseInt((memoryKV[k] as any) || '0', 10)
}

export async function setCachedResponse(key: string, value: any, ttl = 300) {
  memoryKV[`cache:${key}`] = JSON.stringify({ value, expiresAt: Date.now() + ttl * 1000 })
}

export async function getCachedResponse(key: string) {
  const raw = memoryKV[`cache:${key}`]
  if (!raw) return null
  const parsed = JSON.parse(raw)
  if (Date.now() > parsed.expiresAt) {
    delete memoryKV[`cache:${key}`]
    return null
  }
  return parsed.value
}
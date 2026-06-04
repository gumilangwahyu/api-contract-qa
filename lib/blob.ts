import fs from 'fs/promises'
import path from 'path'

/**
 * Upload wrapper:
 * - If BLOB_UPLOAD_URL and BLOB_READ_WRITE_TOKEN are set, POST file bytes to BLOB_UPLOAD_URL (you must provide an upload endpoint)
 * - Otherwise save to ./public/uploads/<projectId> and return a public URL (/uploads/...)
 *
 * Note: In production you should hook into Vercel Blob SDK / S3 / Cloud provider instead.
 */

export async function uploadFile(file: any, projectId: string) {
  // normalize File/Blob - in Next.js formData returns a web File which has arrayBuffer()
  const buf = Buffer.from(await file.arrayBuffer())

  if (process.env.BLOB_UPLOAD_URL && process.env.BLOB_READ_WRITE_TOKEN) {
    // User must provide a BLOB_UPLOAD_URL that accepts POST binary with Authorization header
    const res = await fetch(process.env.BLOB_UPLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
        'x-filename': file.name || 'file',
        'Content-Type': 'application/octet-stream',
      },
      body: buf,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Remote blob upload failed: ${res.status} ${text}`)
    }
    const json = await res.json().catch(() => ({}))
    return { url: json.url || json.path || '', key: json.key || json.id || '' }
  }

  // Fallback to writing into public/uploads
  const safeProjectId = projectId.replace(/[^a-zA-Z0-9.\-_]/g, '_')
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', safeProjectId)
  await fs.mkdir(uploadsDir, { recursive: true })
  const safeName = `${Date.now()}-${(file.name || 'file').replace(/[^a-zA-Z0-9.\-_]/g, '_')}`
  const fp = path.join(uploadsDir, safeName)
  await fs.writeFile(fp, buf)
  const url = `/uploads/${safeProjectId}/${safeName}`
  return { url, key: `${safeProjectId}/${safeName}` }
}

export async function deleteFile(key: string) {
  // If using remote blob provider, you should implement DELETE via provider API.
  // For local fallback, unlink the file from public/uploads.
  try {
    if (!key) return true
    // Prevent path traversal
    const safeKey = key.replace(/\.\./g, '').replace(/^[/\\]+/, '')
    const p = path.join(process.cwd(), 'public', 'uploads', safeKey)
    const resolvedPath = path.resolve(p)
    const baseDir = path.resolve(path.join(process.cwd(), 'public', 'uploads'))
    if (!resolvedPath.startsWith(baseDir)) {
      console.warn('Path traversal attempt blocked in deleteFile:', key)
      return false
    }
    await fs.unlink(resolvedPath).catch(() => {})
    return true
  } catch {
    return false
  }
}
'use client'
import { useState } from 'react'
import { useGlobalUI } from './GlobalUIProvider'

export function FileUploadZone({ projectId, type, onUploadComplete }: { projectId: string; type: 'mock-data' | 'test-scenario' | 'response-payload'; onUploadComplete?: (id: string) => void }) {
  const { showLoader, hideLoader, showToast, handleError } = useGlobalUI()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    fd.append('projectId', projectId)
    fd.append('type', type)
    setUploading(true)
    showLoader('Mengunggah file...')
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Upload failed')
      showToast('File berhasil diunggah!', 'success')
      onUploadComplete?.(json.id)
    } catch (err: any) {
      handleError(err, 'Gagal mengunggah file')
      setError(err?.message || 'Upload failed')
    } finally {
      setUploading(false)
      hideLoader()
    }
  }

  return (
    <div className="card">
      <label className="label">Upload File (max 100KB)</label>
      <input type="file" onChange={handleFile} className="input" />
      {uploading && <p>Uploading...</p>}
      {error && <p className="text-red-400">{error}</p>}
    </div>
  )
}
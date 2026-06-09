'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGlobalUI } from './GlobalUIProvider'

type TestCaseFormProps = {
  projectId: string
  endpointId: string
  onCreated?: (testCaseId: string) => void
}

export function TestCaseForm({ projectId, endpointId, onCreated }: TestCaseFormProps) {
  const router = useRouter()
  const { showLoader, hideLoader, showToast, handleError } = useGlobalUI()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [requestBody, setRequestBody] = useState('')
  const [queryParams, setQueryParams] = useState('')
  const [headers, setHeaders] = useState('')
  const [expectedStatus, setExpectedStatus] = useState(200)
  const [expectedBody, setExpectedBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!name) {
      showToast('Nama test case wajib diisi.', 'warning')
      setError('Name is required')
      return
    }

    showLoader('Membuat test case baru...')
    setLoading(true)
    try {
      const res = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          endpointId,
          name,
          description,
          requestBody: requestBody || undefined,
          queryParams: queryParams || undefined,
          headers: headers || undefined,
          expectedStatus,
          expectedBody: expectedBody || undefined,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        showToast(json?.error || 'Gagal membuat test case', 'error')
        setError(json?.error || 'Failed to create test case')
      } else {
        showToast('Test case berhasil dibuat!', 'success')
        setSuccess('Test case created')
        onCreated?.(json.id)
        setTimeout(() => router.refresh(), 500)
      }
    } catch (err: any) {
      handleError(err, 'Terjadi kesalahan jaringan saat membuat test case.')
      setError(err?.message || 'Network error')
    } finally {
      setLoading(false)
      hideLoader()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h3 className="text-lg font-semibold">Create Test Case</h3>

      <div>
        <label className="label">Name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div>
        <label className="label">Description</label>
        <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div>
        <label className="label">Request Body (JSON)</label>
        <textarea className="input h-24" value={requestBody} onChange={(e) => setRequestBody(e.target.value)} />
      </div>

      <div>
        <label className="label">Query Params (JSON)</label>
        <textarea className="input h-20" value={queryParams} onChange={(e) => setQueryParams(e.target.value)} />
      </div>

      <div>
        <label className="label">Headers (JSON)</label>
        <textarea className="input h-20" value={headers} onChange={(e) => setHeaders(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Expected Status</label>
          <input className="input" type="number" value={expectedStatus} onChange={(e) => setExpectedStatus(Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Expected Body (JSON matcher)</label>
          <input className="input" value={expectedBody} onChange={(e) => setExpectedBody(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Test'}</button>
        <button type="button" className="btn btn-secondary" onClick={() => {
          setName(''); setDescription(''); setRequestBody(''); setQueryParams(''); setHeaders(''); setExpectedStatus(200); setExpectedBody(''); setError(null); setSuccess(null)
        }}>Reset</button>
      </div>

      {error && <div className="text-sm text-red-400">{error}</div>}
      {success && <div className="text-sm text-green-400">{success}</div>}
    </form>
  )
}

export default TestCaseForm
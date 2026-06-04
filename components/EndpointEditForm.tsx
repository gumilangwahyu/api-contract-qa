'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { generateSampleFromJsonSchema } from '../lib/schema-mock'

type Props = {
  endpoint: any
  projectSlug: string
  projectId: string
}

export default function EndpointEditForm({ endpoint, projectSlug, projectId: _projectId }: Props) {
  const router = useRouter()
  const [method, setMethod] = useState(endpoint.method || 'GET')
  const [path, setPath] = useState(endpoint.path || '/example')
  const [description, setDescription] = useState(endpoint.description || '')
  const [mockData, setMockData] = useState(endpoint.mockData || '{}')
  const [statusCode, setStatusCode] = useState(endpoint.statusCode || 200)
  const [delay, setDelay] = useState(endpoint.delay || 0)
  const [requestSchema, setRequestSchema] = useState(endpoint.requestSchema || '{}')
  const [responseSchema, setResponseSchema] = useState(endpoint.responseSchema || '{}')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [strictMode, setStrictMode] = useState<boolean>(true)
  const [copyMsg, setCopyMsg] = useState<string | null>(null)

  function applyStrictToSchema(schemaObj: any) {
    if (!schemaObj || typeof schemaObj !== 'object') return schemaObj
    if (schemaObj.type === 'object') {
      schemaObj.additionalProperties = false
      const props = schemaObj.properties || {}
      for (const k of Object.keys(props)) {
        applyStrictToSchema(props[k])
      }
    } else if (schemaObj.type === 'array' && schemaObj.items) {
      applyStrictToSchema(schemaObj.items)
    } else if (schemaObj.properties) {
      for (const k of Object.keys(schemaObj.properties)) applyStrictToSchema(schemaObj.properties[k])
    }
    return schemaObj
  }

  async function handleGenerateSampleFromSchema() {
    setError(null)
    try {
      let parsedSchema = JSON.parse(responseSchema || '{}')
      if (strictMode) parsedSchema = applyStrictToSchema(parsedSchema)
      const sample = generateSampleFromJsonSchema(parsedSchema)
      setMockData(JSON.stringify(sample, null, 2))
      setCopyMsg('Sample generated')
      setTimeout(() => setCopyMsg(null), 1200)
    } catch (e: any) {
      setError('Gagal generate sample: responseSchema harus valid JSON Schema')
    }
  }

  async function handleGenerateSampleFromSchemaAI() {
    setError(null)
    setLoading(true)
    try {
      let parsedSchema = JSON.parse(responseSchema || '{}')
      if (strictMode) parsedSchema = applyStrictToSchema(parsedSchema)

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schema: parsedSchema,
          method,
          path,
          description,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        console.warn('AI generation failed/limited, falling back to local faker:', json?.error)
        const sample = generateSampleFromJsonSchema(parsedSchema)
        setMockData(JSON.stringify(sample, null, 2))
        setCopyMsg('AI Limit/Error — Fallback to Local Faker')
        setTimeout(() => setCopyMsg(null), 3000)
      } else {
        setMockData(JSON.stringify(json.data, null, 2))
        setCopyMsg('AI Sample generated')
        setTimeout(() => setCopyMsg(null), 1200)
      }
    } catch (e: any) {
      console.warn('AI generation failed, falling back to local faker:', e)
      try {
        let parsedSchema = JSON.parse(responseSchema || '{}')
        if (strictMode) parsedSchema = applyStrictToSchema(parsedSchema)
        const sample = generateSampleFromJsonSchema(parsedSchema)
        setMockData(JSON.stringify(sample, null, 2))
        setCopyMsg('AI Error — Fallback to Local Faker')
        setTimeout(() => setCopyMsg(null), 3000)
      } catch (fakerErr) {
        setError('Gagal membuat mock data dengan AI, dan fallback Faker juga gagal. Pastikan Response Schema valid.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/endpoints/${endpoint.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          path,
          description,
          mockData,
          statusCode,
          delay,
          requestSchema,
          responseSchema,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || 'Failed to update')
      } else {
        router.push(`/projects/${projectSlug}/endpoints`)
      }
    } catch (e: any) {
      setError(e?.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this endpoint? This action cannot be undone.')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/endpoints/${endpoint.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || 'Failed to delete')
      } else {
        router.push(`/projects/${projectSlug}`)
      }
    } catch (e: any) {
      setError(e?.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="card space-y-4 max-w-3xl">
      <h3 className="text-lg font-semibold">Edit Endpoint</h3>

      <div>
        <label className="label">Method</label>
        <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option>GET</option>
          <option>POST</option>
          <option>PUT</option>
          <option>PATCH</option>
          <option>DELETE</option>
        </select>
      </div>

      <div>
        <label className="label">Path</label>
        <input className="input" value={path} onChange={(e) => setPath(e.target.value)} />
      </div>

      <div>
        <label className="label">Description</label>
        <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="flex items-center gap-4">
        <label className="label inline-flex items-center gap-2">
          <input type="checkbox" checked={strictMode} onChange={(e) => setStrictMode(e.target.checked)} /> Strict mode (additionalProperties: false)
        </label>
      </div>

      <div className="grid md:grid-cols-2 gap-2">
        <div>
          <label className="label">Request Schema (JSON Schema, optional)</label>
          <textarea className="input h-24" value={requestSchema} onChange={(e) => setRequestSchema(e.target.value)} />
        </div>
        <div>
          <label className="label">Response Schema (JSON Schema, optional)</label>
          <textarea className="input h-24" value={responseSchema} onChange={(e) => setResponseSchema(e.target.value)} />
          <div className="mt-2 flex gap-2 flex-wrap">
            <button type="button" className="btn btn-secondary text-sm" onClick={handleGenerateSampleFromSchema}>Generate (Local Faker)</button>
            <button type="button" className="btn btn-primary text-sm" onClick={handleGenerateSampleFromSchemaAI} disabled={loading}>Generate with AI (Gemini)</button>
          </div>
        </div>
      </div>

      <div>
        <label className="label">Mock data (JSON)</label>
        <textarea className="input h-28" value={mockData} onChange={(e) => setMockData(e.target.value)} />
        {copyMsg && <div className="text-xs text-green-400 mt-1">{copyMsg}</div>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Status Code</label>
          <input className="input" type="number" value={statusCode} onChange={(e) => setStatusCode(Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Delay (ms)</label>
          <input className="input" type="number" value={delay} onChange={(e) => setDelay(Number(e.target.value))} />
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={loading}>Save</button>
        <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={loading}>Delete</button>
      </div>

      {error && <div className="text-sm text-red-400">{error}</div>}
    </form>
  )
}
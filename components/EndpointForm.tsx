'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { faker } from '@faker-js/faker'
import { generateSampleFromJsonSchema } from '../lib/schema-mock'
import { inferJsonSchema } from '../lib/schema-infer'
import { validateSchema } from '../lib/schema-validate'

type VariantItem = {
  id: string
  name: string
  whenKey: string
  whenValue: string
  statusCode: number
  response: string
}

type EndpointFormProps = {
  projectId: string
  onCreated?: (endpointId: string) => void
}

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

/** Client-side template renderer for {{faker.*}} placeholders */
function renderTemplateClient(value: any): any {
  if (value == null) return value
  if (typeof value === 'string') {
    return value.replace(/{{\s*faker\.([a-zA-Z0-9_.]+)\s*}}/g, (_, path) => {
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
  if (Array.isArray(value)) return value.map((v) => renderTemplateClient(v))
  if (typeof value === 'object') {
    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(value)) out[k] = renderTemplateClient(v)
    return out
  }
  return value
}

export default function EndpointForm({ projectId, onCreated }: EndpointFormProps) {
  const router = useRouter()
  const [method, setMethod] = useState('GET')
  const [path, setPath] = useState('/example')
  const [description, setDescription] = useState('')
  const [mockData, setMockData] = useState('{}')
  const [statusCode, setStatusCode] = useState(200)
  const [delay, setDelay] = useState(0)
  const [requestSchema, setRequestSchema] = useState('{}')
  const [responseSchema, setResponseSchema] = useState('{}')
  const [variants, setVariants] = useState<VariantItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copyMsg, setCopyMsg] = useState<string | null>(null)
  const [strictMode, setStrictMode] = useState<boolean>(true)
  const [validationRes, setValidationRes] = useState<any | null>(null)
  const [showPreview, setShowPreview] = useState<boolean>(false)
  const [previewObj, setPreviewObj] = useState<any>(null)
  const [renderedPreview, setRenderedPreview] = useState<any>(null)
  const firstInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    try {
      const u = typeof window !== 'undefined' ? window.location.href : ''
      const url = new URL(u)
      const qs = url.searchParams
      const hm = url.hash && url.hash.startsWith('#') ? url.hash.slice(1) : ''
      const hashParams = new URLSearchParams(hm)

      const get = (k: string) => qs.get(k) ?? hashParams.get(k)

      const m = get('method')
      const p = get('path')
      const md = get('mockData')
      const sc = get('statusCode')
      const d = get('delay')

      if (m) setMethod(m.toUpperCase())
      if (p) setPath(p)
      if (md) setMockData(decodeURIComponent(md))
      if (sc) setStatusCode(Number(sc))
      if (d) setDelay(Number(d))
    } catch {
      // ignore parse errors
    }

    setTimeout(() => firstInputRef.current?.focus(), 50)
  }, [])

  function addVariant() {
    setVariants((s) => [
      ...s,
      { id: uid(), name: `variant-${s.length + 1}`, whenKey: '', whenValue: '', statusCode: 200, response: JSON.stringify({ message: 'ok' }, null, 2) },
    ])
  }

  function updateVariant(id: string, patch: Partial<VariantItem>) {
    setVariants((s) => s.map((v) => (v.id === id ? { ...v, ...patch } : v)))
  }

  function removeVariant(id: string) {
    setVariants((s) => s.filter((v) => v.id !== id))
  }

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

  async function handleInferSchemaFromMock() {
    setError(null)
    try {
      const parsed = JSON.parse(mockData)
      const inferred = inferJsonSchema(parsed)
      if (strictMode) applyStrictToSchema(inferred)
      setResponseSchema(JSON.stringify(inferred, null, 2))
      setCopyMsg('Inferred schema applied')
      setTimeout(() => setCopyMsg(null), 1200)
    } catch (e: any) {
      setError('Gagal meng-infer schema: mockData harus valid JSON')
    }
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

  async function handleValidateSample() {
    setError(null)
    try {
      const parsedSchema = JSON.parse(responseSchema || '{}')
      const parsedSample = JSON.parse(mockData || '{}')
      const schemaToUse = strictMode ? applyStrictToSchema(parsedSchema) : parsedSchema
      const res = validateSchema(schemaToUse, parsedSample)
      setValidationRes(res)
    } catch (e: any) {
      setError('Gagal validasi: pastikan responseSchema dan mockData valid JSON')
    }
  }

  async function handleCopyMock() {
    try {
      await navigator.clipboard.writeText(mockData)
      setCopyMsg('Copied!')
      setTimeout(() => setCopyMsg(null), 1500)
    } catch {
      setCopyMsg('Copy failed')
      setTimeout(() => setCopyMsg(null), 1500)
    }
  }

  function computeFinalMockObject() {
    if (variants.length > 0) {
      const mapped = variants.map((v) => {
        const whenObj: Record<string, any> | undefined = v.whenKey ? { [v.whenKey]: v.whenValue } : undefined
        let parsedResp: any = undefined
        try {
          parsedResp = JSON.parse(v.response)
        } catch {
          parsedResp = v.response
        }
        return { name: v.name || undefined, when: whenObj, statusCode: v.statusCode, response: parsedResp }
      })
      return { variants: mapped }
    } else {
      try {
        return JSON.parse(mockData)
      } catch {
        return mockData
      }
    }
  }

  function refreshPreview() {
    const finalMock = computeFinalMockObject()
    setPreviewObj(finalMock)
    try {
      const rendered = renderTemplateClient(finalMock)
      setRenderedPreview(rendered)
    } catch {
      setRenderedPreview(finalMock)
    }
  }

  function downloadJSON(filename: string, data: any) {
    try {
      const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError('Gagal download file')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!path.startsWith('/')) {
      setError('Path harus diawali dengan "/"')
      return
    }

    const finalMockObj = computeFinalMockObject()
    let finalMock: any = null
    finalMock = typeof finalMockObj === 'string' ? finalMockObj : finalMockObj

    let reqSchema = '{}'
    let resSchema = '{}'
    try { reqSchema = JSON.stringify(JSON.parse(requestSchema)) } catch { reqSchema = requestSchema || '{}' }
    try { resSchema = JSON.stringify(JSON.parse(responseSchema)) } catch { resSchema = responseSchema || '{}' }

    setLoading(true)
    try {
      const res = await fetch('/api/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          method,
          path,
          description,
          mockData: typeof finalMock === 'string' ? finalMock : JSON.stringify(finalMock),
          statusCode,
          delay,
          requestSchema: reqSchema,
          responseSchema: resSchema,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || 'Gagal membuat endpoint')
      } else {
        setSuccess('Endpoint dibuat')
        onCreated?.(json.id)
        setTimeout(() => router.refresh(), 600)
      }
    } catch (err: any) {
      setError(err?.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h3 className="text-lg font-semibold">Create Endpoint</h3>

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
        <input ref={firstInputRef} className="input" value={path} onChange={(e) => setPath(e.target.value)} />
        <p className="text-xs text-gray-400 mt-1">Contoh: /users atau /users/:id</p>
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
            <button type="button" className="btn btn-secondary" onClick={handleGenerateSampleFromSchema}>Generate (Local Faker)</button>
            <button type="button" className="btn btn-primary" onClick={handleGenerateSampleFromSchemaAI} disabled={loading}>Generate with AI (Gemini)</button>
            <button type="button" className="btn" onClick={() => { setResponseSchema('{}'); setMockData('{}') }}>Clear</button>
            <button type="button" className="btn" onClick={() => {
              // download schema JSON
              try {
                const schemaObj = JSON.parse(responseSchema || '{}')
                downloadJSON('response-schema.json', schemaObj)
              } catch {
                downloadJSON('response-schema.json', responseSchema)
              }
            }}>Download Schema</button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 items-start">
        <div className="flex-1">
          <label className="label">Mock data (JSON) — will be ignored when Variants exist</label>
          <textarea className="input h-28 w-full" value={mockData} onChange={(e) => setMockData(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2 w-40">
          <button type="button" className="btn" onClick={handleCopyMock}>Copy</button>
          <button type="button" className="btn" onClick={handleInferSchemaFromMock}>Infer schema from Example</button>
          <button type="button" className="btn" onClick={() => {
            // download mock JSON (if parseable, download as JSON; otherwise as text)
            try {
              const m = JSON.parse(mockData || '{}')
              downloadJSON('mock-data.json', m)
            } catch {
              downloadJSON('mock-data.json', mockData)
            }
          }}>Download Mock</button>
          <div className="text-xs text-gray-300">{copyMsg ?? ''}</div>
        </div>
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

      <div className="card">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Variants (optional)</h4>
          <div className="flex gap-2">
            <button type="button" className="btn" onClick={addVariant}>Add variant</button>
            <button type="button" className="btn btn-secondary" onClick={() => setVariants([])}>Clear variants</button>
          </div>
        </div>

        {variants.length === 0 && <p className="text-sm text-gray-400 mt-2">No variants defined — server will use the plain Mock data above.</p>}

        {variants.map((v) => (
          <div key={v.id} className="mt-3 border border-slate-700 p-3 rounded">
            <div className="grid md:grid-cols-3 gap-2">
              <div>
                <label className="label">Name</label>
                <input className="input" value={v.name} onChange={(e) => updateVariant(v.id, { name: e.target.value })} />
              </div>
              <div>
                <label className="label">When (key)</label>
                <input className="input" value={v.whenKey} onChange={(e) => updateVariant(v.id, { whenKey: e.target.value })} placeholder="query.status or header.x-test" />
              </div>
              <div>
                <label className="label">When (value)</label>
                <input className="input" value={v.whenValue} onChange={(e) => updateVariant(v.id, { whenValue: e.target.value })} />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-2 mt-2">
              <div>
                <label className="label">Status Code</label>
                <input className="input" type="number" value={v.statusCode} onChange={(e) => updateVariant(v.id, { statusCode: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">Response (JSON)</label>
                <textarea className="input h-28" value={v.response} onChange={(e) => updateVariant(v.id, { response: e.target.value })} />
              </div>
            </div>

            <div className="mt-2 flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => removeVariant(v.id)}>Remove</button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button type="button" className="btn" onClick={handleValidateSample}>Validate sample</button>
        <button type="button" className="btn" onClick={() => { refreshPreview(); setShowPreview((s) => !s) }}>{showPreview ? 'Hide Preview' : 'Show Preview'}</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Endpoint'}</button>
        <button type="button" className="btn btn-secondary" onClick={() => {
          setMethod('GET')
          setPath('/example')
          setDescription('')
          setMockData('{}')
          setStatusCode(200)
          setDelay(0)
          setRequestSchema('{}')
          setResponseSchema('{}')
          setVariants([])
          setError(null)
          setSuccess(null)
          firstInputRef.current?.focus()
        }}>Reset</button>
      </div>

      {error && <div className="text-sm text-red-400">{error}</div>}
      {success && <div className="text-sm text-green-400">{success}</div>}

      {validationRes && (
        <div className="card mt-4">
          <h4 className="font-medium">Validation result</h4>
          <p>Valid: <strong>{validationRes.valid ? 'yes' : 'no'}</strong></p>
          {validationRes.errors && <pre className="text-xs mt-2">{JSON.stringify(validationRes.errors, null, 2)}</pre>}
          <div className="mt-2">
            <strong>Missing required fields:</strong>
            {validationRes.missing.length === 0 ? <span className="ml-2 text-gray-400">none</span> : (
              <ul className="list-disc pl-6">
                {validationRes.missing.map((m: string) => <li key={m}>{m}</li>)}
              </ul>
            )}
          </div>
          <div className="mt-2">
            <strong>Extra properties:</strong>
            {validationRes.extra.length === 0 ? <span className="ml-2 text-gray-400">none</span> : (
              <ul className="list-disc pl-6">
                {validationRes.extra.map((m: string) => <li key={m}>{m}</li>)}
              </ul>
            )}
          </div>
          <div className="mt-2">
            <strong>Type mismatches (paths):</strong>
            {validationRes.typeMismatches.length === 0 ? <span className="ml-2 text-gray-400">none</span> : (
              <ul className="list-disc pl-6">
                {validationRes.typeMismatches.map((m: string) => <li key={m}>{m}</li>)}
              </ul>
            )}
          </div>
        </div>
      )}

      {showPreview && (
        <div className="card mt-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Preview (final mock)</h4>
            <div className="flex gap-2">
              <button type="button" className="btn" onClick={refreshPreview}>Refresh Preview</button>
              <button type="button" className="btn" onClick={() => {
                try { downloadJSON('mock-data-final.json', previewObj ?? JSON.parse(mockData)) } catch { downloadJSON('mock-data-final.json', previewObj ?? mockData) }
              }}>Download Preview</button>
            </div>
          </div>

          <div className="mt-3">
            <strong>Raw final mock object:</strong>
            <pre className="text-xs mt-2 p-2 bg-slate-900 rounded overflow-auto">{JSON.stringify(previewObj ?? computeFinalMockObject(), null, 2)}</pre>
          </div>

          <div className="mt-3">
            <strong>Rendered (faker placeholders substituted):</strong>
            <pre className="text-xs mt-2 p-2 bg-slate-900 rounded overflow-auto">{JSON.stringify(renderedPreview ?? renderTemplateClient(previewObj ?? computeFinalMockObject()), null, 2)}</pre>
          </div>
        </div>
      )}
    </form>
  )
}
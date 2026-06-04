'use client'

import { useState } from 'react'

type Props = { testCaseId: string }

export default function TestRunButton({ testCaseId }: Props) {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [enqueued, setEnqueued] = useState<string | null>(null)

  async function runNow() {
    setError(null); setResult(null); setEnqueued(null); setRunning(true)
    try {
      const res = await fetch(`/api/tests/${testCaseId}/run`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) setError(json?.error || 'Failed to run')
      else setResult(json.result ?? json)
    } catch (e: any) {
      setError(e?.message || 'Network error')
    } finally { setRunning(false) }
  }

  async function enqueue() {
    setError(null); setResult(null); setEnqueued(null)
    try {
      const res = await fetch(`/api/tests/${testCaseId}/run?background=true`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) setError(json?.error || 'Failed to enqueue')
      else setEnqueued(json.jobId || 'ok')
    } catch (e: any) {
      setError(e?.message || 'Network error')
    }
  }

  return (
    <div className="inline-block">
      <div className="flex gap-2">
        <button className="btn btn-primary" onClick={runNow} disabled={running}>{running ? 'Running...' : 'Run'}</button>
        <button className="btn" onClick={enqueue}>Enqueue</button>
      </div>
      {error && <div className="text-xs text-red-400 mt-2">{error}</div>}
      {enqueued && <div className="text-xs text-green-400 mt-2">Enqueued: {enqueued}</div>}
      {result && (
        <div className="mt-2 card text-sm">
          <div><strong>Passed:</strong> {result.passed ? 'yes' : 'no'}</div>
          <div><strong>Status:</strong> {result.status}</div>
          <div><strong>Duration:</strong> {result.duration} ms</div>
          <div className="mt-2"><strong>Body:</strong>
            <pre className="text-xs mt-1 p-2 bg-slate-900 rounded overflow-auto">{JSON.stringify(result.body, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
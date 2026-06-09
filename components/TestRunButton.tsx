'use client'

import { useState } from 'react'
import { useGlobalUI } from './GlobalUIProvider'

type Props = { testCaseId: string }

export default function TestRunButton({ testCaseId }: Props) {
  const { showLoader, hideLoader, showToast, handleError } = useGlobalUI()
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [enqueued, setEnqueued] = useState<string | null>(null)

  async function runNow() {
    setError(null); setResult(null); setEnqueued(null); setRunning(true)
    showLoader('Menjalankan pengujian...')
    try {
      const res = await fetch(`/api/tests/${testCaseId}/run`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        showToast(json?.error || 'Gagal menjalankan pengujian', 'error')
        setError(json?.error || 'Failed to run')
      } else {
        const testRes = json.result ?? json
        setResult(testRes)
        if (testRes.passed) {
          showToast('Pengujian sukses dijalankan dan status LULUS (PASS)!', 'success')
        } else {
          showToast('Pengujian selesai dijalankan, namun GAGAL (FAIL).', 'warning')
        }
      }
    } catch (e: any) {
      handleError(e, 'Gagal menghubungi server pengujian')
      setError(e?.message || 'Network error')
    } finally {
      setRunning(false)
      hideLoader()
    }
  }

  async function enqueue() {
    setError(null); setResult(null); setEnqueued(null)
    showLoader('Memasukkan pengujian ke antrean...')
    try {
      const res = await fetch(`/api/tests/${testCaseId}/run?background=true`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        showToast(json?.error || 'Gagal antre pengujian', 'error')
        setError(json?.error || 'Failed to enqueue')
      } else {
        const jobId = json.jobId || 'ok'
        setEnqueued(jobId)
        showToast(`Pengujian dimasukkan ke antrean latar belakang (Job ID: ${jobId})`, 'success')
      }
    } catch (e: any) {
      handleError(e, 'Gagal mengantrekan pengujian')
      setError(e?.message || 'Network error')
    } finally {
      hideLoader()
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
'use client'
import { useState } from 'react'
import { useGlobalUI } from './GlobalUIProvider'

export function LiveTestRunner({ testId }: { testId: string }) {
  const { showLoader, hideLoader, showToast, handleError } = useGlobalUI()
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<any>(null)

  async function run() {
    setRunning(true)
    showLoader('Menjalankan pengujian langsung...')
    try {
      const res = await fetch(`/api/tests/${testId}/run`, { method: 'POST' })
      const json = await res.json()
      setResult(json)
      if (res.ok && json.passed) {
        showToast('Pengujian LULUS (PASS)!', 'success')
      } else if (res.ok) {
        showToast('Pengujian GAGAL (FAIL).', 'warning')
      } else {
        showToast(json?.error || 'Gagal menjalankan pengujian', 'error')
      }
    } catch (err: any) {
      handleError(err, 'Terjadi kesalahan sistem saat menjalankan pengujian')
      setResult({ error: 'Failed' })
    } finally {
      setRunning(false)
      hideLoader()
    }
  }

  return (
    <div className="card">
      <button className="btn btn-primary" onClick={run} disabled={running}>{running ? 'Running...' : 'Run Test'}</button>
      {result && <pre className="mt-4 text-sm">{JSON.stringify(result, null, 2)}</pre>}
    </div>
  )
}
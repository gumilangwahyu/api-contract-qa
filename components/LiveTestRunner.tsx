'use client'
import { useState } from 'react'

export function LiveTestRunner({ testId }: { testId: string }) {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<any>(null)

  async function run() {
    setRunning(true)
    try {
      const res = await fetch(`/api/tests/${testId}/run`, { method: 'POST' })
      const json = await res.json()
      setResult(json)
    } catch (err) { setResult({ error: 'Failed' }) }
    setRunning(false)
  }

  return (
    <div className="card">
      <button className="btn btn-primary" onClick={run} disabled={running}>{running ? 'Running...' : 'Run Test'}</button>
      {result && <pre className="mt-4 text-sm">{JSON.stringify(result, null, 2)}</pre>}
    </div>
  )
}
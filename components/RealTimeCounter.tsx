'use client'
import { useEffect, useState } from 'react'
export function RealTimeCounter({ projectId }: { projectId: string }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let mounted = true
    const fetchCount = async () => {
      const res = await fetch(`/api/projects/${projectId}/metrics`)
      if (!res.ok) return
      const json = await res.json()
      if (mounted) setCount(json?.hitsToday || 0)
    }
    fetchCount()
    const t = setInterval(fetchCount, 2000)
    return () => { mounted = false; clearInterval(t) }
  }, [projectId])

  return <div className="card">Hits today: <b>{count}</b></div>
}
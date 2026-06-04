'use client'
import { useEffect, useState } from 'react'

export function useRealTime(projectId: string, interval = 500) {
  const [data, setData] = useState<any>(null)
  useEffect(() => {
    if (!projectId) return
    let mounted = true
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/metrics`)
        if (!mounted) return
        if (res.ok) setData(await res.json())
      } catch (err) { console.error(err) }
    }
    fetchData()
    const t = setInterval(fetchData, interval)
    return () => { mounted = false; clearInterval(t) }
  }, [projectId, interval])

  return { data }
}
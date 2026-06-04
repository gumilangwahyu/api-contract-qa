'use client'
import { useEffect, useState } from 'react'
export function CollaborativeViewer({ projectId }: { projectId: string }) {
  const [messages] = useState<any[]>([])
  useEffect(() => {
    // Placeholder: integrate with real WS
    return () => {}
  }, [projectId])

  return (
    <div className="card">
      <h4 className="mb-2">Live Activity</h4>
      <div className="text-sm max-h-40 overflow-auto">
        {messages.length === 0 ? <p className="text-gray-400">No activity</p> : messages.map((m,i)=>(<pre key={i}>{JSON.stringify(m)}</pre>))}
      </div>
    </div>
  )
}
'use client'
import { useEffect, useRef, useState } from 'react'

export function useWebSocket(projectId: string) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<any>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!projectId) return
    const url = (typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws') + '://' + window.location.host + '/api/ws'
    const ws = new WebSocket(url)
    wsRef.current = ws
    ws.onopen = () => setIsConnected(true)
    ws.onmessage = (e) => setLastMessage(JSON.parse(e.data))
    ws.onclose = () => setIsConnected(false)
    ws.onerror = () => setIsConnected(false)
    return () => { ws.close() }
  }, [projectId])

  const send = (msg: any) => {
    try { wsRef.current?.send(JSON.stringify(msg)) } catch {}
  }

  return { isConnected, lastMessage, send }
}
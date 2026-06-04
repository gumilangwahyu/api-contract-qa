// Lightweight WebSocket manager for dev. For production on Vercel use Edge WebSocket or external provider.
import { Server as HTTPServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'

type Msg =
  | { type: 'test-start' | 'test-update' | 'test-complete' | 'hit-update' | 'status'; data?: any; projectId?: string; testCaseId?: string }

let wss: WebSocketServer | null = null
const rooms = new Map<string, Set<WebSocket>>()

export function initWebSocket(server: HTTPServer) {
  if (wss) return wss
  wss = new WebSocketServer({ server })
  wss.on('connection', (ws) => {
    ws.on('message', (msg) => {
      try {
        const data: Msg = JSON.parse(String(msg))
        if (data.projectId) broadcastToRoom(data.projectId, data)
      } catch (e) { console.error(e) }
    })
    ws.on('close', () => {
      rooms.forEach((set) => set.delete(ws))
    })
  })
  return wss
}

export function joinRoom(projectId: string, ws: WebSocket) {
  if (!rooms.has(projectId)) rooms.set(projectId, new Set())
  rooms.get(projectId)!.add(ws)
}

export function leaveRoom(projectId: string, ws: WebSocket) {
  rooms.get(projectId)?.delete(ws)
}

export function broadcastToRoom(projectId: string, message: any) {
  const set = rooms.get(projectId)
  if (!set) return
  const s = JSON.stringify(message)
  for (const client of set) {
    if (client.readyState === 1) client.send(s)
  }
}
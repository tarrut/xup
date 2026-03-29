import { useCallback, useEffect, useRef } from 'react'
import { challengesApi } from '../api/challenges'
import type { WsMessage } from '../types'

export function useWebSocket(
  partyCode: string,
  onMessage: (msg: WsMessage) => void,
) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectDelay = useRef(1500)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const connectRef = useRef<() => Promise<void>>()

  const connect = useCallback(async () => {
    try {
      const { ticket } = await challengesApi.wsTicket()
      const proto = location.protocol === 'https:' ? 'wss' : 'ws'
      const ws = new WebSocket(`${proto}://${location.host}/ws/${partyCode}?ticket=${ticket}`)

      ws.onopen = () => {
        reconnectDelay.current = 1500
      }

      ws.onmessage = (event) => {
        try {
          onMessageRef.current(JSON.parse(event.data))
        } catch {}
      }

      ws.onclose = () => {
        reconnectTimer.current = setTimeout(() => {
          reconnectTimer.current = null
          connectRef.current?.()
        }, reconnectDelay.current)
        reconnectDelay.current = Math.min(reconnectDelay.current * 1.5, 30000)
      }

      ws.onerror = () => ws.close()
      wsRef.current = ws
    } catch {
      reconnectTimer.current = setTimeout(() => connectRef.current?.(), reconnectDelay.current)
    }
  }, [partyCode])

  connectRef.current = connect

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])
}

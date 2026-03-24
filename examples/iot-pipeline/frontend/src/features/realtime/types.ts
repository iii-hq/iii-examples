/** Engine stream protocol — outbound message variants */
export type StreamEventType = 'sync' | 'create' | 'update' | 'delete' | 'event' | 'unauthorized'

export interface StreamEvent {
  type: 'stream'
  timestamp: number
  streamName: string
  groupId: string
  id: string | null
  event: {
    type: StreamEventType
    data?: unknown
    event?: { type: string; data: unknown }
  }
}

/** Join/leave messages sent by the client */
export interface StreamJoinMessage {
  type: 'join'
  data: {
    subscriptionId: string
    streamName: string
    groupId: string
    id?: string
  }
}

export interface StreamLeaveMessage {
  type: 'leave'
  data: {
    subscriptionId: string
    streamName: string
    groupId: string
    id?: string
  }
}

/** Convenience type for event payloads stored in the events stream */
export interface StreamEventPayload {
  type: 'function_call' | 'sensor_reading' | 'worker_status'
  timestamp: number
  [key: string]: unknown
}

/** Alert payload stored in the alerts stream */
export interface StreamAlertPayload {
  sensor_id: string
  severity: string
  message: string
  z_score: number
  timestamp: string
}

/** Replaces WsEvent — used by event.store.ts and useStreams for dashboard event routing */
export type DashboardEventType = 'sensor_reading' | 'function_call' | 'anomaly_alert' | 'worker_status'

export interface DashboardEvent {
  type: DashboardEventType
  timestamp: number
  payload: Record<string, unknown>
}

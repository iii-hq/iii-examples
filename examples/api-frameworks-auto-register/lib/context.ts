// Shared context for workflow orchestration
// Legacy workers don't need this - workflow manages it

export interface Logger {
  info: (msg: string, data?: Record<string, unknown>) => void
  warn: (msg: string, data?: Record<string, unknown>) => void
  error: (msg: string, data?: Record<string, unknown>) => void
}

export interface WorkflowContext {
  requestId: string
  startTime: number
  logger: Logger
  state: Map<string, unknown>
}

export function createContext(requestId?: string): WorkflowContext {
  const id = requestId || `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const startTime = Date.now()

  const logger: Logger = {
    info: (msg, data) => console.log(`[${id}] INFO: ${msg}`, data || ''),
    warn: (msg, data) => console.warn(`[${id}] WARN: ${msg}`, data || ''),
    error: (msg, data) => console.error(`[${id}] ERROR: ${msg}`, data || ''),
  }

  return {
    requestId: id,
    startTime,
    logger,
    state: new Map(),
  }
}

export function elapsed(ctx: WorkflowContext): number {
  return Date.now() - ctx.startTime
}

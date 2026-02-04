import type { Request, Response, NextFunction } from 'express'

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  const message = err.message ?? 'Internal server error'

  if (message.includes('Circuit breaker is open')) {
    res.status(503).json({ error: 'Service temporarily unavailable', detail: message })
    return
  }

  if (message.startsWith('Upstream 404')) {
    res.status(404).json({ error: 'Not found', detail: message })
    return
  }

  if (message.startsWith('Upstream 401')) {
    res.status(502).json({ error: 'Upstream authentication failed', detail: message })
    return
  }

  if (message.includes('timeout')) {
    res.status(504).json({ error: 'Gateway timeout', detail: message })
    return
  }

  if (message.startsWith('Upstream')) {
    res.status(502).json({ error: 'Bad gateway', detail: message })
    return
  }

  res.status(500).json({ error: 'Internal server error', detail: message })
}

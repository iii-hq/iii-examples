import type { Request, Response, NextFunction } from 'express'

export function loggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()
  const correlationId = (req.headers['x-correlation-id'] as string) || `gw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  res.setHeader('x-correlation-id', correlationId)
  ;(req as Record<string, unknown>).correlationId = correlationId

  res.on('finish', () => {
    const elapsed = Date.now() - start
    console.log(`[${correlationId}] ${req.method} ${req.path} ${res.statusCode} ${elapsed}ms`)
  })

  next()
}

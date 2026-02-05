import type { Request, Response, NextFunction } from 'express'

const GATEWAY_KEY = process.env.GATEWAY_API_KEY ?? 'gateway-key-456'

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const key = req.headers['x-api-key']
  if (key !== GATEWAY_KEY) {
    res.status(401).json({ error: 'Unauthorized: invalid or missing x-api-key' })
    return
  }
  next()
}

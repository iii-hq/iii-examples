// Legacy Hono Products API
// Simple CRUD - no knowledge of III orchestration

import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { Bridge } from '@iii-dev/sdk'
import { autoRegister } from '../lib/auto-register'
import type { Product, GetByIdInput } from '../lib/types'

const app = new Hono()

// In-memory store (legacy style)
const products: Product[] = []

// Legacy REST endpoints (still work standalone)
app.get('/products', (c) => c.json(products))
app.get('/products/:id', (c) => {
  const product = products.find(p => p.id === c.req.param('id'))
  return product ? c.json(product) : c.json({ error: 'Not found' }, 404)
})
app.post('/products', async (c) => {
  const body = await c.req.json<Product>()
  products.push(body)
  return c.json(body, 201)
})

// Start server and register with III
serve({ fetch: app.fetch, port: 3003 }, () => {
  console.log('[Hono] Products API on :3003')

  const bridge = new Bridge('ws://127.0.0.1:49134')

  autoRegister({
    bridge,
    prefix: 'products',
    handlers: {
      list: async () => products,
      get: async (input: GetByIdInput) => products.find(p => p.id === input.id) || null,
      create: async (input: Product) => { products.push(input); return input },
    }
  })
})

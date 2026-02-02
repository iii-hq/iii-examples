import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { Bridge } from '@iii-dev/sdk'
import { autoRegister } from '../lib/auto-register'
import type { Product, GetByIdInput } from '../lib/types'

const app = new Hono()
const products: Product[] = []

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

serve({ fetch: app.fetch, port: 3003 }, () => {
  console.log('[Hono] Products API on :3003')

  const bridge = new Bridge('ws://127.0.0.1:49134')

  autoRegister({
    bridge,
    prefix: 'products',
    handlers: {
      list: { handler: async () => products, method: 'GET' },
      get: { handler: async (input: GetByIdInput) => products.find(p => p.id === input.id) || null, method: 'GET' },
      create: { handler: async (input: Product) => { products.push(input); return input }, method: 'POST' },
    }
  })
})

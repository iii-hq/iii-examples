/**
 * Hono Worker - Products Domain
 * 
 * This worker manages products and registers all routes
 * with III Engine on initialization (serve callback).
 */

import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { Bridge } from '@iii-dev/sdk'

const bridge = new Bridge(process.env.III_BRIDGE_URL ?? 'ws://localhost:49134')

// In-memory store
type Product = { id: string; name: string; price: number }
const products = new Map<string, Product>()

// Route handlers (these become III functions)
const listProducts = async () => [...products.values()]
const getProduct = async ({ id }: { id: string }) => products.get(id) ?? null
const createProduct = async (data: Product) => {
  products.set(data.id, data)
  return data
}

// Hono app
const app = new Hono()

app.get('/products', async (c) => c.json(await listProducts()))
app.get('/products/:id', async (c) => {
  const product = await getProduct({ id: c.req.param('id') })
  if (!product) return c.json({ error: 'Product not found' }, 404)
  return c.json(product)
})
app.post('/products', async (c) => c.json(await createProduct(await c.req.json()), 201))

// Start server and register with III Engine
const PORT = 3003
serve({ fetch: app.fetch, port: PORT }, () => {
  // One-liner registration
  bridge.registerFunction({ function_path: 'products.list' }, listProducts)
  bridge.registerFunction({ function_path: 'products.get' }, getProduct)
  bridge.registerFunction({ function_path: 'products.create' }, createProduct)

  console.log(`[Hono] Products worker running on http://localhost:${PORT}`)
  console.log(`[Hono] Registered: products.list, products.get, products.create`)
})

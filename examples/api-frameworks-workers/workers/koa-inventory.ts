/**
 * Koa Worker - Inventory Domain
 * 
 * This worker manages inventory and registers all routes
 * with III Engine on initialization (app.listen callback).
 */

import Koa from 'koa'
import Router from '@koa/router'
import bodyParser from 'koa-bodyparser'
import { Bridge } from '@iii-dev/sdk'

const bridge = new Bridge(process.env.III_BRIDGE_URL ?? 'ws://localhost:49134')

// In-memory store
type Inventory = { productId: string; quantity: number }
const inventory = new Map<string, Inventory>()

// Route handlers (these become III functions)
const getInventory = async ({ productId }: { productId: string }) => inventory.get(productId) ?? null
const setInventory = async (data: Inventory) => {
  inventory.set(data.productId, data)
  return data
}

// Koa app
const app = new Koa()
const router = new Router()

app.use(bodyParser())

router.get('/inventory/:productId', async (ctx: Koa.Context) => {
  const inv = await getInventory({ productId: ctx.params.productId })
  if (!inv) { ctx.status = 404; ctx.body = { error: 'Not found' }; return }
  ctx.body = inv
})

router.put('/inventory/:productId', async (ctx: Koa.Context) => {
  const body = ctx.request.body as { quantity: number }
  ctx.body = await setInventory({ productId: ctx.params.productId, quantity: body.quantity })
})

app.use(router.routes())

// Start server and register with III Engine
const PORT = 3004
app.listen(PORT, () => {
  // One-liner registration of all handlers
  bridge.registerFunction({ function_path: 'inventory.get' }, getInventory)
  bridge.registerFunction({ function_path: 'inventory.set' }, setInventory)

  console.log(`[Koa] Inventory worker running on http://localhost:${PORT}`)
  console.log(`[Koa] Registered: inventory.get, inventory.set`)
})

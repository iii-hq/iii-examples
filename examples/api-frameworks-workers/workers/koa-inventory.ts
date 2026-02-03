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
type Inventory = { id: string; quantity: number }
const inventory = new Map<string, Inventory>()

const getInventory = async ({ id }: { id: string }) => inventory.get(id) ?? null
const setInventory = async (data: Inventory) => {
  inventory.set(data.id, data)
  return data
}
const decrementInventory = async ({ id, quantity }: { id: string; quantity: number }) => {
  const inv = inventory.get(id)
  if (!inv || inv.quantity < quantity) return null
  inv.quantity -= quantity
  inventory.set(id, inv)
  return inv
}

const app = new Koa()
const router = new Router()

app.use(bodyParser())

router.get('/inventory/:id', async (ctx: Koa.Context) => {
  const inv = await getInventory({ id: ctx.params.id })
  if (!inv) { ctx.status = 404; ctx.body = { error: 'Not found' }; return }
  ctx.body = inv
})

router.put('/inventory/:id', async (ctx: Koa.Context) => {
  const body = ctx.request.body as { quantity: number }
  ctx.body = await setInventory({ id: ctx.params.id, quantity: body.quantity })
})

router.post('/inventory/:id/decrement', async (ctx: Koa.Context) => {
  const body = ctx.request.body as { quantity: number }
  const inv = await decrementInventory({ id: ctx.params.id, quantity: body.quantity })
  if (!inv) { ctx.status = 400; ctx.body = { error: 'Insufficient stock or not found' }; return }
  ctx.body = inv
})

app.use(router.routes())

// Start server and register with III Engine
const PORT = 3004
app.listen(PORT, () => {
  // One-liner registration of all handlers
  bridge.registerFunction({ function_path: 'inventory.get' }, getInventory)
  bridge.registerFunction({ function_path: 'inventory.set' }, setInventory)
  bridge.registerFunction({ function_path: 'inventory.decrement' }, decrementInventory)

  console.log(`[Koa] Inventory worker running on http://localhost:${PORT}`)
  console.log(`[Koa] Registered: inventory.get, inventory.set, inventory.decrement`)
})

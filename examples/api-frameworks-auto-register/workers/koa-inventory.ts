// Legacy Koa Inventory API
// Simple CRUD - no knowledge of III orchestration

import Koa from 'koa'
import Router from '@koa/router'
import bodyParser from 'koa-bodyparser'
import { Bridge } from '@iii-dev/sdk'
import { autoRegister } from '../lib/auto-register'
import type { Inventory, InventoryInput } from '../lib/types'

const app = new Koa()
const router = new Router()
app.use(bodyParser())

// In-memory store (legacy style)
const inventory = new Map<string, number>()

// Legacy REST endpoints (still work standalone)
router.get('/inventory/:productId', (ctx) => {
  const qty = inventory.get(ctx.params.productId) || 0
  ctx.body = { productId: ctx.params.productId, quantity: qty }
})
router.put('/inventory/:productId', (ctx) => {
  const body = ctx.request.body as { quantity: number }
  inventory.set(ctx.params.productId, body.quantity)
  ctx.body = { productId: ctx.params.productId, quantity: body.quantity }
})

app.use(router.routes())

// Start server and register with III
app.listen(3004, () => {
  console.log('[Koa] Inventory API on :3004')

  const bridge = new Bridge('ws://127.0.0.1:49134')

  autoRegister({
    bridge,
    prefix: 'inventory',
    handlers: {
      get: async (input: InventoryInput): Promise<Inventory> => ({
        productId: input.productId,
        quantity: inventory.get(input.productId) || 0
      }),
      set: async (input: InventoryInput): Promise<Inventory> => {
        inventory.set(input.productId, input.quantity || 0)
        return { productId: input.productId, quantity: input.quantity || 0 }
      },
      decrement: async (input: InventoryInput): Promise<Inventory> => {
        const current = inventory.get(input.productId) || 0
        const newQty = current - (input.quantity || 1)
        inventory.set(input.productId, newQty)
        return { productId: input.productId, quantity: newQty }
      },
    }
  })
})

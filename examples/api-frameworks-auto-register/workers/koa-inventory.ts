import Koa from 'koa'
import Router from '@koa/router'
import bodyParser from 'koa-bodyparser'
import { createBridge } from '../lib/bridge'
import { autoRegister } from '../lib/auto-register'
import type { Inventory, InventoryInput } from '../lib/types'

const app = new Koa()
const router = new Router()
app.use(bodyParser())

const inventory = new Map<string, number>()

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

app.listen(3004, () => {
  console.log('[Koa] Inventory API on :3004')

  const bridge = createBridge('koa-inventory')

  autoRegister({
    bridge,
    prefix: 'inventory',
    handlers: {
      get: {
        handler: async (input: InventoryInput): Promise<Inventory> => ({
          productId: input.productId,
          quantity: inventory.get(input.productId) || 0
        }),
        method: 'GET'
      },
      set: {
        handler: async (input: InventoryInput): Promise<Inventory> => {
          inventory.set(input.productId, input.quantity || 0)
          return { productId: input.productId, quantity: input.quantity || 0 }
        },
        method: 'PUT'
      },
      decrement: {
        handler: async (input: InventoryInput): Promise<Inventory> => {
          const current = inventory.get(input.productId) || 0
          const newQty = current - (input.quantity || 1)
          inventory.set(input.productId, newQty)
          return { productId: input.productId, quantity: newQty }
        },
        method: 'POST'
      },
    }
  })
})

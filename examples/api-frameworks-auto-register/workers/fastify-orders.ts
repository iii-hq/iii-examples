// Legacy Fastify Orders API
// Simple CRUD - no knowledge of III orchestration

import Fastify from 'fastify'
import { Bridge } from '@iii-dev/sdk'
import { autoRegister } from '../lib/auto-register'
import type { Order, GetByIdInput, CreateOrderInput } from '../lib/types'

const fastify = Fastify()

// In-memory store (legacy style)
const orders: Order[] = []

// Legacy REST endpoints (still work standalone)
fastify.get('/orders', async () => orders)
fastify.get<{ Params: { id: string } }>('/orders/:id', async (req) => {
  return orders.find(o => o.id === req.params.id) || { error: 'Not found' }
})
fastify.post<{ Body: CreateOrderInput }>('/orders', async (req) => {
  const order: Order = { ...req.body, id: `order-${Date.now()}`, status: 'pending' }
  orders.push(order)
  return order
})

// Start server and register with III
fastify.listen({ port: 3002 }, () => {
  console.log('[Fastify] Orders API on :3002')

  const bridge = new Bridge('ws://127.0.0.1:49134')

  autoRegister({
    bridge,
    prefix: 'orders',
    handlers: {
      list: async () => orders,
      get: async (input: GetByIdInput) => orders.find(o => o.id === input.id) || null,
      create: async (input: CreateOrderInput): Promise<Order> => {
        const order: Order = { ...input, id: `order-${Date.now()}`, status: 'pending' }
        orders.push(order)
        return order
      },
    }
  })
})

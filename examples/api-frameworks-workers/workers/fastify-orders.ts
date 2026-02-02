/**
 * Fastify Worker - Orders Domain
 * 
 * This worker manages orders and registers all routes
 * with III Engine on initialization (onReady hook).
 */

import Fastify from 'fastify'
import { Bridge } from '@iii-dev/sdk'

const bridge = new Bridge(process.env.III_BRIDGE_URL ?? 'ws://localhost:49134')

// In-memory store
type Order = { id: string; userId: string; productId: string; quantity: number; status: string }
const orders = new Map<string, Order>()

// Route handlers (these become III functions)
const listOrders = async () => [...orders.values()]
const getOrder = async ({ id }: { id: string }) => orders.get(id) ?? null
const createOrder = async (data: Omit<Order, 'status'>) => {
  const order: Order = { ...data, status: 'pending' }
  orders.set(data.id, order)
  return order
}

// Fastify app
const fastify = Fastify({ logger: false })

fastify.get('/orders', async () => listOrders())
fastify.get<{ Params: { id: string } }>('/orders/:id', async (req, reply) => {
  const order = await getOrder({ id: req.params.id })
  if (!order) return reply.status(404).send({ error: 'Order not found' })
  return order
})
fastify.post<{ Body: Omit<Order, 'status'> }>('/orders', async (req, reply) => {
  return reply.status(201).send(await createOrder(req.body))
})

// Register with III Engine on ready
fastify.addHook('onReady', async () => {
  bridge.registerFunction({ function_path: 'orders.list', description: 'List all orders' }, listOrders)
  bridge.registerFunction({ function_path: 'orders.get', description: 'Get order by ID' }, getOrder)
  bridge.registerFunction({ function_path: 'orders.create', description: 'Create an order' }, createOrder)

  console.log(`[Fastify] Registered: orders.list, orders.get, orders.create`)
})

// Start server
const PORT = 3002
fastify.listen({ port: PORT }).then(() => {
  console.log(`[Fastify] Orders worker running on http://localhost:${PORT}`)
})

/**
 * Multi-Framework Orchestration Example
 * 
 * This example demonstrates how to run multiple API frameworks
 * (Express, Fastify, Hono, Koa) in a single process, all orchestrated
 * by the iii-engine using multi-trigger capability.
 * 
 * Each framework handles a different domain:
 * - Express (port 3001): Users
 * - Fastify (port 3002): Orders
 * - Hono (port 3003): Products
 * - Koa (port 3004): Inventory
 */

import express from 'express'
import Fastify from 'fastify'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import Koa from 'koa'
import Router from '@koa/router'
import bodyParser from 'koa-bodyparser'
import { Bridge } from '@iii-dev/sdk'

// Initialize the III Engine bridge
const bridge = new Bridge(process.env.III_BRIDGE_URL ?? 'ws://localhost:49134')

// ============================================================
// EXPRESS - USERS (port 3001)
// ============================================================

type User = { id: string; name: string; email: string }
const users = new Map<string, User>()

const getUsers = async () => [...users.values()]
const getUser = async ({ id }: { id: string }) => users.get(id) ?? null
const createUser = async (data: User) => {
  users.set(data.id, data)
  return data
}

const expressApp = express()
expressApp.use(express.json())

expressApp.get('/users', async (_req, res) => {
  res.json(await getUsers())
})

expressApp.get('/users/:id', async (req, res) => {
  const user = await getUser({ id: req.params.id })
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(user)
})

expressApp.post('/users', async (req, res) => {
  const user = await createUser(req.body)
  res.status(201).json(user)
})

// ============================================================
// FASTIFY - ORDERS (port 3002)
// ============================================================

type Order = { id: string; userId: string; productId: string; quantity: number; status: string }
const orders = new Map<string, Order>()

const getOrders = async () => [...orders.values()]
const getOrder = async ({ id }: { id: string }) => orders.get(id) ?? null
const createOrder = async (data: Omit<Order, 'status'>) => {
  const order: Order = { ...data, status: 'pending' }
  orders.set(data.id, order)
  return order
}

const fastify = Fastify({ logger: false })

fastify.get('/orders', async () => {
  return getOrders()
})

fastify.get<{ Params: { id: string } }>('/orders/:id', async (req, reply) => {
  const order = await getOrder({ id: req.params.id })
  if (!order) return reply.status(404).send({ error: 'Order not found' })
  return order
})

fastify.post<{ Body: Omit<Order, 'status'> }>('/orders', async (req, reply) => {
  const order = await createOrder(req.body)
  return reply.status(201).send(order)
})

// ============================================================
// HONO - PRODUCTS (port 3003)
// ============================================================

type Product = { id: string; name: string; price: number }
const products = new Map<string, Product>()

const getProducts = async () => [...products.values()]
const getProduct = async ({ id }: { id: string }) => products.get(id) ?? null
const createProduct = async (data: Product) => {
  products.set(data.id, data)
  return data
}

const honoApp = new Hono()

honoApp.get('/products', async (c) => {
  return c.json(await getProducts())
})

honoApp.get('/products/:id', async (c) => {
  const product = await getProduct({ id: c.req.param('id') })
  if (!product) return c.json({ error: 'Product not found' }, 404)
  return c.json(product)
})

honoApp.post('/products', async (c) => {
  const data = await c.req.json<Product>()
  const product = await createProduct(data)
  return c.json(product, 201)
})

// ============================================================
// KOA - INVENTORY (port 3004)
// ============================================================

type Inventory = { productId: string; quantity: number }
const inventory = new Map<string, Inventory>()

const getInventory = async ({ productId }: { productId: string }) => inventory.get(productId) ?? null
const updateInventory = async (data: Inventory) => {
  inventory.set(data.productId, data)
  return data
}

const koaApp = new Koa()
const koaRouter = new Router()

koaApp.use(bodyParser())

koaRouter.get('/inventory/:productId', async (ctx: Koa.Context) => {
  const inv = await getInventory({ productId: ctx.params.productId })
  if (!inv) {
    ctx.status = 404
    ctx.body = { error: 'Inventory not found' }
    return
  }
  ctx.body = inv
})

koaRouter.put('/inventory/:productId', async (ctx: Koa.Context) => {
  const data = ctx.request.body as { quantity: number }
  const inv = await updateInventory({ productId: ctx.params.productId, quantity: data.quantity })
  ctx.body = inv
})

koaApp.use(koaRouter.routes())
koaApp.use(koaRouter.allowedMethods())

// ============================================================
// CROSS-FRAMEWORK ORCHESTRATION WORKFLOW
// ============================================================

// API Response type for III Engine
type ApiResponse = { status_code: number; body: unknown }

/**
 * Orchestrated Order Creation Workflow
 * 
 * This demonstrates the power of III Engine orchestration:
 * A single API call coordinates across ALL 4 frameworks:
 * 
 *   1. Express  → Validate user exists
 *   2. Hono     → Validate product exists  
 *   3. Koa      → Check inventory available
 *   4. Fastify  → Create the order
 *   5. Koa      → Update inventory
 * 
 * All via bridge.invokeFunction() - the III Engine routes
 * each call to the correct framework's handler.
 */
const createOrderWorkflow = async (req: { body: { userId: string; productId: string; quantity: number } }): Promise<ApiResponse> => {
  const { userId, productId, quantity } = req.body

  // Step 1: Validate user exists (Express)
  const user = await bridge.invokeFunction('users.get', { id: userId })
  if (!user) {
    return { status_code: 404, body: { error: `User ${userId} not found` } }
  }

  // Step 2: Validate product exists (Hono)
  const product = await bridge.invokeFunction('products.get', { id: productId })
  if (!product) {
    return { status_code: 404, body: { error: `Product ${productId} not found` } }
  }

  // Step 3: Check inventory (Koa)
  const inv = await bridge.invokeFunction('inventory.get', { productId }) as Inventory | null
  if (!inv || inv.quantity < quantity) {
    return { 
      status_code: 400, 
      body: { error: `Insufficient inventory. Available: ${inv?.quantity ?? 0}, Requested: ${quantity}` } 
    }
  }

  // Step 4: Create order (Fastify)
  const order = await bridge.invokeFunction('orders.create', {
    id: `order-${Date.now()}`,
    userId,
    productId,
    quantity
  })

  // Step 5: Update inventory (Koa)
  const updatedInventory = await bridge.invokeFunction('inventory.update', {
    productId,
    quantity: inv.quantity - quantity
  })

  // Return orchestrated result
  return {
    status_code: 201,
    body: {
      message: 'Order created successfully via cross-framework orchestration',
      order,
      user,
      product,
      inventory: updatedInventory
    }
  }
}

// ============================================================
// INITIALIZATION - Register ALL functions with III Engine
// ============================================================

async function init() {
  console.log('\n=== Multi-Framework Orchestration Example ===\n')

  // Register Users functions (Express)
  bridge.registerFunction({ function_path: 'users.list', description: 'List all users' }, getUsers)
  bridge.registerFunction({ function_path: 'users.get', description: 'Get user by ID' }, getUser)
  bridge.registerFunction({ function_path: 'users.create', description: 'Create a new user' }, createUser)

  // Register Orders functions (Fastify)
  bridge.registerFunction({ function_path: 'orders.list', description: 'List all orders' }, getOrders)
  bridge.registerFunction({ function_path: 'orders.get', description: 'Get order by ID' }, getOrder)
  bridge.registerFunction({ function_path: 'orders.create', description: 'Create a new order' }, createOrder)

  // Register Products functions (Hono)
  bridge.registerFunction({ function_path: 'products.list', description: 'List all products' }, getProducts)
  bridge.registerFunction({ function_path: 'products.get', description: 'Get product by ID' }, getProduct)
  bridge.registerFunction({ function_path: 'products.create', description: 'Create a new product' }, createProduct)

  // Register Inventory functions (Koa)
  bridge.registerFunction({ function_path: 'inventory.get', description: 'Get inventory for product' }, getInventory)
  bridge.registerFunction({ function_path: 'inventory.update', description: 'Update inventory' }, updateInventory)

  // Register cross-framework orchestration workflow + API trigger
  bridge.registerFunction({ 
    function_path: 'api.post.order/create', 
    description: 'Orchestrated order creation across all 4 frameworks' 
  }, createOrderWorkflow)
  
  bridge.registerTrigger({
    trigger_type: 'api',
    function_path: 'api.post.order/create',
    config: { 
      api_path: 'order/create', 
      http_method: 'POST',
      description: 'Create order with cross-framework orchestration'
    },
  })

  // Start all framework servers
  expressApp.listen(3001, () => {
    console.log('  Express (Users)     -> http://localhost:3001')
  })

  await fastify.listen({ port: 3002 })
  console.log('  Fastify (Orders)    -> http://localhost:3002')

  serve({ fetch: honoApp.fetch, port: 3003 }, () => {
    console.log('  Hono (Products)     -> http://localhost:3003')
  })

  koaApp.listen(3004, () => {
    console.log('  Koa (Inventory)     -> http://localhost:3004')
  })

  console.log('\n  All frameworks registered with III Engine!\n')
  console.log('==============================================\n')
}

init().catch(console.error)

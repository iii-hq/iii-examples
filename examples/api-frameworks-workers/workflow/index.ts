/**
 * Workflow - Orchestration Layer
 * 
 * This is a separate Node process that creates workflows
 * orchestrating the Express, Fastify, Hono, and Koa workers.
 * 
 * Think of this like a company with legacy APIs:
 * - Express manages Users (legacy user service)
 * - Fastify manages Orders (legacy order service)
 * - Hono manages Products (legacy product service)
 * - Koa manages Inventory (legacy inventory service)
 * 
 * Now with III Engine, we can orchestrate them all together!
 */

import { Bridge, type ApiRequest, type ApiResponse } from '@iii-dev/sdk'

const bridge = new Bridge(process.env.III_BRIDGE_URL ?? 'ws://localhost:49134')

// ============================================================
// WORKFLOW: Create Order (orchestrates all 4 frameworks!)
// ============================================================

const createOrder = async (req: ApiRequest<{ userId: string; productId: string; quantity: number }>): Promise<ApiResponse> => {
  const { userId, productId, quantity } = req.body

  // 1. Validate user (Express)
  const user = await bridge.invokeFunction('users.get', { id: userId })
  if (!user) return { status_code: 404, body: { error: 'User not found' } }

  // 2. Validate product (Hono)
  const product = await bridge.invokeFunction('products.get', { id: productId })
  if (!product) return { status_code: 404, body: { error: 'Product not found' } }

  // 3. Check inventory (Koa)
  const inv = await bridge.invokeFunction('inventory.get', { productId }) as { quantity: number } | null
  if (!inv || inv.quantity < quantity) {
    return { status_code: 400, body: { error: `Insufficient stock: ${inv?.quantity ?? 0}` } }
  }

  // 4. Create order (Fastify)
  const order = await bridge.invokeFunction('orders.create', {
    id: `order-${Date.now()}`,
    userId,
    productId,
    quantity
  })

  // 5. Update inventory (Koa)
  await bridge.invokeFunction('inventory.set', { productId, quantity: inv.quantity - quantity })

  return { status_code: 201, body: { order, user, product } }
}

// ============================================================
// Register workflow with III Engine
// ============================================================

bridge.registerFunction({ function_path: 'api.post.order' }, createOrder)
bridge.registerTrigger({
  trigger_type: 'api',
  function_path: 'api.post.order',
  config: { api_path: 'order', http_method: 'POST' }
})

console.log('[Workflow] POST /order - Orchestrates: Express + Hono + Koa + Fastify')

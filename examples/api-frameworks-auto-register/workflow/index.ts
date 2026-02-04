import { Bridge, getContext, currentTraceId } from '@iii-dev/sdk'
import type { Context } from '@iii-dev/sdk'
import type { User, Product, Order, Inventory, CreateOrderInput } from '../lib/types'

const ENGINE_URL = process.env.III_ENGINE_URL ?? 'ws://127.0.0.1:49134'

const bridge = new Bridge(ENGINE_URL, {
  otel: { enabled: true, serviceName: 'workflow-orchestrator', metricsEnabled: true, metricsExportIntervalMs: 5000 },
})

async function invoke<T>(ctx: Context, fn: string, input: unknown): Promise<T> {
  ctx.logger.info(`Calling ${fn}`, { input })
  const response = await bridge.invokeFunction(fn, input) as { status_code?: number; body?: T } | T
  const result = (response && typeof response === 'object' && 'body' in response)
    ? response.body as T
    : response as T
  ctx.logger.info(`${fn} returned`, { result })
  return result
}

function validateInput(input: CreateOrderInput): string | null {
  if (!input.userId?.trim()) return 'userId is required'
  if (!input.productId?.trim()) return 'productId is required'
  if (!input.quantity || input.quantity < 1) return 'quantity must be at least 1'
  return null
}

bridge.registerFunction(
  { function_path: 'workflow.createOrder' },
  async (req: { body?: CreateOrderInput } & CreateOrderInput) => {
    const input: CreateOrderInput = req.body || req
    const ctx = getContext()
    const traceId = currentTraceId()
    ctx.logger.info('Starting order workflow', input)

    const validationError = validateInput(input)
    if (validationError) {
      ctx.logger.error('Validation failed', { error: validationError })
      return { status_code: 400, body: { error: validationError } }
    }

    const { userId, productId, quantity } = input

    try {
      const user = await invoke<User | null>(ctx, 'users.get', { id: userId })
      if (!user) {
        ctx.logger.error('User not found', { userId })
        return { status_code: 404, body: { error: 'User not found' } }
      }

      const product = await invoke<Product | null>(ctx, 'products.get', { id: productId })
      if (!product) {
        ctx.logger.error('Product not found', { productId })
        return { status_code: 404, body: { error: 'Product not found' } }
      }

      const stock = await invoke<Inventory>(ctx, 'inventory.get', { productId })
      if (stock.quantity < quantity) {
        ctx.logger.warn('Insufficient stock', { requested: quantity, available: stock.quantity })
        return { status_code: 400, body: { error: 'Insufficient stock', available: stock.quantity } }
      }

      const order = await invoke<Order>(ctx, 'orders.create', { userId, productId, quantity })
      const newStock = await invoke<Inventory>(ctx, 'inventory.decrement', { productId, quantity })

      ctx.logger.info('Order workflow complete', { orderId: order.id })

      return {
        status_code: 201,
        body: {
          message: 'Order created successfully',
          traceId,
          order,
          user,
          product,
          inventory: newStock,
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      ctx.logger.error('Workflow failed', { error: message })
      return { status_code: 500, body: { error: message, traceId } }
    }
  }
)

bridge.registerTrigger({
  trigger_type: 'api',
  function_path: 'workflow.createOrder',
  config: { api_path: 'order', http_method: 'POST' },
})

console.log('[Workflow] Order orchestration ready')
console.log('  POST /order - Creates order across 4 legacy services')

import { type ApiRequest, type ApiResponse, getContext } from '@iii-dev/sdk'
import { state, emitEvent, iii } from './iii-client'
import type { CreateOrderInput, OrderState } from './types'

const createOrder = async (req: ApiRequest<CreateOrderInput>): Promise<ApiResponse> => {
  const { logger } = getContext()
  const { userId, productId, quantity } = req.body

  const orderId = crypto.randomUUID()
  const now = Date.now()

  const orderState: OrderState = {
    orderId,
    userId,
    productId,
    quantity,
    status: 'pending',
    createdAt: now,
    updatedAt: now
  }

  logger.info('Creating order', { orderId, userId, productId, quantity })

  await state.set('orders', orderId, orderState)
  await emitEvent('order.requested', { orderId })

  logger.info('Order created, processing async', { orderId })

  return {
    status_code: 202,
    body: { orderId, status: 'pending', message: 'Order is being processed' }
  }
}

const getOrder = async (req: ApiRequest): Promise<ApiResponse> => {
  const orderId = req.path_params.orderId

  const order = await state.get('orders', orderId)
  if (!order) {
    return { status_code: 404, body: { error: 'Order not found' } }
  }

  return { status_code: 200, body: order }
}

iii.registerFunction({ function_path: 'workflow.order.create' }, createOrder)
iii.registerFunction({ function_path: 'workflow.order.get' }, getOrder)

iii.registerTrigger({
  trigger_type: 'api',
  function_path: 'workflow.order.create',
  config: { api_path: 'order', http_method: 'POST' }
})

iii.registerTrigger({
  trigger_type: 'api',
  function_path: 'workflow.order.get',
  config: { api_path: 'order/:orderId', http_method: 'GET' }
})

console.log('[Workflow] POST /order - Creates order and emits order.requested event')
console.log('[Workflow] GET /order/:orderId - Query order status from state')

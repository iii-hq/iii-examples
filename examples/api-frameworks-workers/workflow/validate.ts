import { getContext } from '@iii-dev/sdk'
import { call, enqueue, register, state } from './iii-client'
import type { OrderRequestedEvent, User, Product } from './types'

const validateOrder = async (event: { event: { data: OrderRequestedEvent } }) => {
  const { logger } = getContext()
  const { orderId } = event.event.data

  logger.info('Validating order', { orderId })

  const order = await state.get('orders', orderId)

  const [user, product] = await Promise.all([
    call<{ id: string }, User | null>('workers::express::getUser', { id: order.userId }),
    call<{ id: string }, Product | null>('workers::hono::getProduct', { id: order.productId })
  ])

  if (!user || !product) {
    const error = !user ? 'User not found' : 'Product not found'
    logger.error('Validation failed', { orderId, error })

    await state.set('orders', orderId, { ...order, status: 'rejected', error, updatedAt: Date.now() })

    return
  }

  logger.info('Order validated', { orderId, userId: user.id, productId: product.id })

  await state.set('orders', orderId, { ...order, status: 'validated', user, product, updatedAt: Date.now() })

  await enqueue('order.validated', { orderId })
}

const validateOrderCondition = async (event: { event: { data: OrderRequestedEvent } }) => {
  const { logger } = getContext()
  const { orderId } = event.event.data

  logger.info('Validating order', { orderId })

  const order = await state.get('orders', orderId)

  if (!order) {
    logger.error('Order not found', { orderId })
    return false
  }

  if (order.status !== 'pending') {
    logger.warn('Order not in pending status, skipping validation', { orderId, status: order.status })
    return false
  }

  return true
}

register({ function_id: 'workers::workflow::validateOrderCondition' }, validateOrderCondition)
register({ function_id: 'workers::workflow::validateOrder' }, validateOrder)

register({
  trigger_type: 'event',
  function_id: 'workers::workflow::validateOrder',
  config: { topic: 'order.requested', condition_function_path: 'workers::workflow::validateOrderCondition' }
})

console.log('[Workflow] validateOrder - Triggered by order.requested, validates user + product in parallel')

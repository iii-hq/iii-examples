import { getContext } from '@iii-dev/sdk'
import { iii, state } from './iii-client'
import type { OrderRequestedEvent, User, Product } from './types'

const validateOrder = async (event: { event: { data: OrderRequestedEvent } }) => {
  const { logger } = getContext()
  const { orderId } = event.event.data

  logger.info('Validating order', { orderId })

  const order = await state.get('orders', orderId)

  const [user, product] = await Promise.all([
    iii.invokeFunction<{ id: string }, User | null>('users.get', { id: order.userId }),
    iii.invokeFunction<{ id: string }, Product | null>('products.get', { id: order.productId })
  ])

  if (!user || !product) {
    const error = !user ? 'User not found' : 'Product not found'
    logger.error('Validation failed', { orderId, error })

    await state.set('orders', orderId, { ...order, status: 'rejected', error, updatedAt: Date.now() })

    return
  }

  logger.info('Order validated', { orderId, userId: user.id, productId: product.id })

  await state.set('orders', orderId, { ...order, status: 'validated', user, product, updatedAt: Date.now() })

  await iii.invokeFunction('event.emit', {
    topic: 'order.validated',
    data: { orderId }
  })
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

iii.registerFunction({ function_path: 'workflow.order.conditions.validate' }, validateOrderCondition)
iii.registerFunction({ function_path: 'workflow.order.validate' }, validateOrder)

iii.registerTrigger({
  trigger_type: 'event',
  function_path: 'workflow.order.validate',
  config: { topic: 'order.requested', condition_function_path: 'workflow.order.validate' }
})

console.log('[Workflow] order.validate - Triggered by order.requested, validates user + product in parallel')

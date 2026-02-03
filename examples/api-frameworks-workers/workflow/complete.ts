import { getContext } from '@iii-dev/sdk'
import { iii, state } from './iii-client'
import type { OrderReadyEvent } from './types'

type Order = { id: string; userId: string; productId: string; quantity: number; status: string }
type Inventory = { id: string; quantity: number }

const completeOrder = async (event: { event: { data: OrderReadyEvent } }) => {
  const { logger } = getContext()
  const { orderId } = event.event.data

  logger.info('Completing order', { orderId })

  const order = await state.get('orders', orderId)

  if (order.status !== 'ready') {
    logger.warn('Order not in ready status, skipping completion', { orderId, status: order.status })
    return
  }

  const decrementResult = await iii.invokeFunction<
    { id: string; quantity: number },
    Inventory | null
  >('inventory.decrement', { id: order.productId, quantity: order.quantity })

  if (!decrementResult) {
    const error = 'Failed to decrement inventory - stock may have changed'
    logger.error('Inventory decrement failed', { orderId, error })

    await state.set('orders', orderId, { ...order, status: 'rejected', error, updatedAt: Date.now() })

    return
  }

  const createdOrder = await iii.invokeFunction<Omit<Order, 'status'>, Order>(
    'orders.create',
    { id: orderId, userId: order.userId, productId: order.productId, quantity: order.quantity }
  )

  logger.info('Order created in legacy system', { orderId, orderStatus: createdOrder.status })

  await state.set('orders', orderId, { ...order, status: 'completed', updatedAt: Date.now() })

  logger.info('Order completed', { orderId })
}

iii.registerFunction({ function_path: 'workflow.order.complete' }, completeOrder)

iii.registerTrigger({
  trigger_type: 'event',
  function_path: 'workflow.order.complete',
  config: { topic: 'order.ready' }
})

console.log('[Workflow] order.complete - Triggered by order.ready, creates order')

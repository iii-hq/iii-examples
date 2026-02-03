import { getContext } from '@iii-dev/sdk'
import { emitEvent, iii, state } from './iii-client'
import type { OrderValidatedEvent } from './types'

type Inventory = { id: string; quantity: number }

const checkInventory = async (event: { event: { data: OrderValidatedEvent } }) => {
  const { logger } = getContext()
  const { orderId } = event.event.data

  logger.info('Checking inventory', { orderId })

  const order = await state.get('orders', orderId)

  const inventory = await iii.invokeFunction<{ id: string }, Inventory | null>(
    'inventory.get',
    { id: order.productId }
  )

  if (!inventory || inventory.quantity < order.quantity) {
    const availableStock = inventory?.quantity ?? 0
    const error = `Insufficient stock: requested ${order.quantity}, available ${availableStock}`
    logger.error('Inventory check failed', { orderId, error })

    await state.set('orders', orderId, { ...order, status: 'rejected', error, availableStock, updatedAt: Date.now() })

    return
  }

  logger.info('Inventory available', { orderId, available: inventory.quantity, requested: order.quantity })

  await state.set('orders', orderId, { ...order, status: 'ready', availableStock: inventory.quantity, updatedAt: Date.now() })

  await emitEvent('order.ready', { orderId })
}

iii.registerFunction({ function_path: 'workflow.order.checkInventory' }, checkInventory)

iii.registerTrigger({
  trigger_type: 'event',
  function_path: 'workflow.order.checkInventory',
  config: {
    topic: 'order.validated'
  }
})

console.log('[Workflow] order.checkInventory - Triggered by order.validated')

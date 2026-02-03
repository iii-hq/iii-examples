import { getContext } from '@iii-dev/sdk'
import { iii } from './iii-client'
import type { OrderState } from './types'

type StateEventData = {
  type: string
  event_type: 'state:created' | 'state:updated' | 'state:deleted'
  group_id: string
  item_id: string
  old_value: OrderState | null
  new_value: OrderState
}

const isOrderCompleted = async (event: StateEventData): Promise<boolean> => {
  if (event.group_id !== 'orders') return false
  if (event.event_type !== 'state:updated') return false
  
  const oldStatus = event.old_value?.status
  const newStatus = event.new_value.status
  
  return newStatus === 'completed' && oldStatus !== 'completed'
}

const isOrderRejected = async (event: StateEventData): Promise<boolean> => {
  if (event.group_id !== 'orders') return false
  if (event.event_type !== 'state:updated') return false
  
  const oldStatus = event.old_value?.status
  const newStatus = event.new_value.status
  
  return newStatus === 'rejected' && oldStatus !== 'rejected'
}

const handleOrderCompleted = async (event: StateEventData) => {
  const { logger } = getContext()
  const orderId = event.item_id
  const order = event.new_value
  
  logger.info('Sending completion notification', { orderId })
  
  iii.invokeFunctionAsync('notifications.send', {
    userId: order.userId,
    type: 'order_completed',
    message: `Your order ${orderId} has been completed! Product: ${order.product?.name}, Quantity: ${order.quantity}`
  })
}

const handleOrderRejected = async (event: StateEventData) => {
  const { logger } = getContext()
  const orderId = event.item_id
  const order = event.new_value
  
  logger.info('Sending rejection notification', { orderId })
  
  iii.invokeFunctionAsync('notifications.send', {
    userId: order.userId,
    type: 'order_rejected',
    message: `Your order ${orderId} was rejected: ${order.error || 'Unknown reason'}`
  })
}

iii.registerFunction({ function_path: 'workflow.notifications.isCompleted' }, isOrderCompleted)
iii.registerFunction({ function_path: 'workflow.notifications.isRejected' }, isOrderRejected)
iii.registerFunction({ function_path: 'workflow.notifications.handleCompleted' }, handleOrderCompleted)
iii.registerFunction({ function_path: 'workflow.notifications.handleRejected' }, handleOrderRejected)

iii.registerTrigger({
  trigger_type: 'state',
  function_path: 'workflow.notifications.handleCompleted',
  config: {
    condition_function_path: 'workflow.notifications.isCompleted'
  }
})

iii.registerTrigger({
  trigger_type: 'state',
  function_path: 'workflow.notifications.handleRejected',
  config: {
    condition_function_path: 'workflow.notifications.isRejected'
  }
})

console.log('[Workflow] notifications.handleCompleted - Triggered by state changes with condition')
console.log('[Workflow] notifications.handleRejected - Triggered by state changes with condition')

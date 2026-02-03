export type OrderStatus = 'pending' | 'validated' | 'ready' | 'completed' | 'rejected'

export type User = {
  id: string
  name: string
  email: string
}

export type Product = {
  id: string
  name: string
  price: number
}

export type OrderState = {
  orderId: string
  userId: string
  productId: string
  quantity: number
  status: OrderStatus
  error?: string
  user?: User
  product?: Product
  availableStock?: number
  createdAt: number
  updatedAt: number
}

export type OrderRequestedEvent = {
  orderId: string
}

export type OrderValidatedEvent = {
  orderId: string
}

export type OrderReadyEvent = {
  orderId: string
}

export type OrderCompletedEvent = {
  orderId: string
  userId: string
}

export type OrderRejectedEvent = {
  orderId: string
  reason: string
}

export type CreateOrderInput = {
  userId: string
  productId: string
  quantity: number
}

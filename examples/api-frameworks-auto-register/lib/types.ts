// Shared types for all workers and workflow

export interface User {
  id: string
  name: string
  email: string
}

export interface Product {
  id: string
  name: string
  price: number
}

export interface Order {
  id: string
  userId: string
  productId: string
  quantity: number
  status: string
}

export interface Inventory {
  productId: string
  quantity: number
}

// Input types
export interface GetByIdInput {
  id: string
}

export interface CreateOrderInput {
  userId: string
  productId: string
  quantity: number
}

export interface InventoryInput {
  productId: string
  quantity?: number
}

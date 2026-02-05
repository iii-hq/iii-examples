import { createBridge } from '../lib/bridge'
import type {
  User,
  CreateUserInput,
  GetByIdInput,
  CreateSubscriptionInput,
  StripeCustomer,
  StripeSubscription,
} from '../lib/types'

const bridge = createBridge('user-service')

const users: Map<string, User> = new Map()

function generateId(): string {
  return `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

bridge.registerFunction(
  { function_path: 'users.create' },
  async (input: CreateUserInput): Promise<User> => {
    const user: User = {
      id: generateId(),
      email: input.email,
      name: input.name,
      plan: input.plan ?? 'free',
      createdAt: new Date().toISOString(),
    }
    users.set(user.id, user)
    return user
  }
)

bridge.registerFunction(
  { function_path: 'users.get' },
  async (input: GetByIdInput): Promise<User | null> => {
    return users.get(input.id) ?? null
  }
)

bridge.registerFunction(
  { function_path: 'users.update' },
  async (input: Partial<User> & { id: string }): Promise<User | null> => {
    const existing = users.get(input.id)
    if (!existing) return null

    const updated: User = {
      ...existing,
      ...input,
      id: existing.id,
      createdAt: existing.createdAt,
    }
    users.set(updated.id, updated)
    return updated
  }
)

bridge.registerFunction(
  { function_path: 'users.list' },
  async (): Promise<User[]> => {
    return Array.from(users.values())
  }
)

bridge.registerFunction(
  { function_path: 'billing.createSubscription' },
  async (input: { userId: string; plan: string }): Promise<{
    user: User
    stripeCustomer: StripeCustomer
    subscription: StripeSubscription
  } | null> => {
    const user = users.get(input.userId)
    if (!user) return null

    const stripeCustomer = await bridge.invokeFunction('stripe.createCustomer', {
      email: user.email,
      name: user.name,
    }) as StripeCustomer

    const subscription = await bridge.invokeFunction('stripe.createSubscription', {
      customerId: stripeCustomer.id,
      plan: input.plan,
    } satisfies CreateSubscriptionInput) as StripeSubscription

    const updatedUser: User = {
      ...user,
      stripeCustomerId: stripeCustomer.id,
      subscriptionId: subscription.id,
      plan: input.plan,
    }
    users.set(user.id, updatedUser)

    return { user: updatedUser, stripeCustomer, subscription }
  }
)

process.on('SIGINT', () => process.exit(0))
process.on('SIGTERM', () => process.exit(0))

console.log('[User Service] User management functions registered')
console.log('  users.create - Create new user')
console.log('  users.get - Get user by ID')
console.log('  users.update - Update user')
console.log('  users.list - List all users')
console.log('  billing.createSubscription - Create Stripe subscription (calls stripe.*)')

import { createBridge } from '../lib/bridge'
import type {
  StripeCustomer,
  StripeSubscription,
  StripeCharge,
  CreateCustomerInput,
  CreateSubscriptionInput,
  ChargeInput,
} from '../lib/types'

const STRIPE_URL = process.env.STRIPE_URL ?? 'http://127.0.0.1:4040'

const bridge = createBridge('stripe-bridge')

const STRIPE_ID_PATTERN = /^(cus|sub|ch)_[a-f0-9]{32}$/

function validateStripeId(id: string, prefix: string): void {
  if (!id || typeof id !== 'string') {
    throw new Error(`Invalid ${prefix} ID: must be a non-empty string`)
  }
  if (id.length > 50) {
    throw new Error(`Invalid ${prefix} ID: too long`)
  }
  if (!id.startsWith(`${prefix}_`)) {
    throw new Error(`Invalid ${prefix} ID: must start with "${prefix}_"`)
  }
  if (!STRIPE_ID_PATTERN.test(id)) {
    throw new Error(`Invalid ${prefix} ID format`)
  }
}

async function stripeRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const response = await fetch(`${STRIPE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    throw new Error(`Stripe API error: ${response.status} ${response.statusText}${errorBody ? ` - ${errorBody}` : ''}`)
  }

  return response.json()
}

bridge.registerFunction(
  { function_path: 'stripe.createCustomer' },
  async (input: CreateCustomerInput): Promise<StripeCustomer> => {
    return stripeRequest<StripeCustomer>('POST', '/v1/customers', input)
  }
)

bridge.registerFunction(
  { function_path: 'stripe.getCustomer' },
  async (input: { id: string }): Promise<StripeCustomer> => {
    validateStripeId(input.id, 'cus')
    return stripeRequest<StripeCustomer>('GET', `/v1/customers/${encodeURIComponent(input.id)}`)
  }
)

bridge.registerFunction(
  { function_path: 'stripe.createSubscription' },
  async (input: CreateSubscriptionInput): Promise<StripeSubscription> => {
    return stripeRequest<StripeSubscription>('POST', '/v1/subscriptions', {
      customer: input.customerId,
      plan: input.plan,
    })
  }
)

bridge.registerFunction(
  { function_path: 'stripe.charge' },
  async (input: ChargeInput): Promise<StripeCharge> => {
    return stripeRequest<StripeCharge>('POST', '/v1/charges', {
      customer: input.customerId,
      amount: input.amount,
      currency: input.currency ?? 'usd',
    })
  }
)

process.on('SIGINT', () => process.exit(0))
process.on('SIGTERM', () => process.exit(0))

console.log('[Stripe Bridge] Wrapping Rust HTTP server as iii functions')
console.log('  stripe.createCustomer - POST /v1/customers')
console.log('  stripe.getCustomer - GET /v1/customers/:id')
console.log('  stripe.createSubscription - POST /v1/subscriptions')
console.log('  stripe.charge - POST /v1/charges')

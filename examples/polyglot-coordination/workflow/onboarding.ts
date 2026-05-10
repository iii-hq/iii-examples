import { getContext, currentTraceId } from '@iii-dev/sdk'
import type { Context } from '@iii-dev/sdk'
import { createBridge } from '../lib/bridge'
import type {
  User,
  StripeCustomer,
  StripeSubscription,
  AnalyticsResult,
  OnboardingMetrics,
  OnboardUserInput,
  OnboardingResult,
} from '../lib/types'

const bridge = createBridge('onboarding-workflow')

async function invoke<T>(ctx: Context, fn: string, input: unknown): Promise<T> {
  ctx.logger.info(`Calling ${fn}`, { input })
  const result = (await bridge.invokeFunction(fn, input)) as T
  ctx.logger.info(`${fn} returned`, { result })
  return result
}

bridge.registerFunction(
  { function_path: 'workflow.onboardUser' },
  async (req: { body?: OnboardUserInput } & OnboardUserInput) => {
    const input: OnboardUserInput = req.body || req
    const ctx = getContext()
    const traceId = currentTraceId()

    ctx.logger.info('Starting user onboarding workflow', { input, traceId })

    if (!input.email?.trim()) {
      return { status_code: 400, body: { error: 'email is required' } }
    }
    if (!input.name?.trim()) {
      return { status_code: 400, body: { error: 'name is required' } }
    }
    if (!input.plan?.trim()) {
      return { status_code: 400, body: { error: 'plan is required' } }
    }

    try {
      ctx.logger.info('Step 1: Creating user in Node.js User Service')
      const user = await invoke<User>(ctx, 'users.create', {
        email: input.email,
        name: input.name,
        plan: input.plan,
      })

      ctx.logger.info('Step 2: Creating Stripe customer via Rust HTTP server')
      const stripeCustomer = await invoke<StripeCustomer>(ctx, 'stripe.createCustomer', {
        email: user.email,
        name: user.name,
      })

      ctx.logger.info('Step 3: Creating subscription in Rust Stripe')
      const subscription = await invoke<StripeSubscription>(ctx, 'stripe.createSubscription', {
        customerId: stripeCustomer.id,
        plan: input.plan,
      })

      ctx.logger.info('Step 4: Running analytics via Python stdin/stdout IPC')
      const analytics = await invoke<AnalyticsResult>(ctx, 'analytics.score', {
        userId: user.id,
        email: user.email,
        name: user.name,
      })

      ctx.logger.info('Step 5: Updating user with Stripe and analytics data')
      const updatedUser = await invoke<User | null>(ctx, 'users.update', {
        id: user.id,
        stripeCustomerId: stripeCustomer.id,
        subscriptionId: subscription.id,
        riskScore: analytics.riskScore,
      })

      if (!updatedUser) {
        ctx.logger.error('Failed to update user', { userId: user.id })
        return { status_code: 500, body: { error: 'Failed to update user', traceId } }
      }

      const result: OnboardingResult = {
        user: updatedUser,
        stripeCustomer,
        subscription,
        analytics,
      }

      ctx.logger.info('Onboarding workflow complete', { userId: user.id, traceId })

      return {
        status_code: 201,
        body: {
          message: 'User onboarded successfully',
          traceId,
          ...result,
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      ctx.logger.error('Onboarding workflow failed', { error: message, traceId })
      return { status_code: 500, body: { error: message, traceId } }
    }
  }
)

bridge.registerFunction(
  { function_path: 'workflow.getOnboardingMetrics' },
  async () => {
    const ctx = getContext()
    const traceId = currentTraceId()

    ctx.logger.info('Fetching onboarding metrics', { traceId })

    try {
      const users = await invoke<User[]>(ctx, 'users.list', {})

      const metrics = await invoke<OnboardingMetrics>(ctx, 'analytics.onboardingMetrics', {
        users,
      })

      return {
        status_code: 200,
        body: {
          traceId,
          metrics,
          userCount: users.length,
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      ctx.logger.error('Failed to get metrics', { error: message, traceId })
      return { status_code: 500, body: { error: message, traceId } }
    }
  }
)

bridge.registerTrigger({
  trigger_type: 'api',
  function_path: 'workflow.onboardUser',
  config: { api_path: 'onboard', http_method: 'POST' },
})

bridge.registerTrigger({
  trigger_type: 'api',
  function_path: 'workflow.getOnboardingMetrics',
  config: { api_path: 'onboard/metrics', http_method: 'GET' },
})

process.on('SIGINT', () => process.exit(0))
process.on('SIGTERM', () => process.exit(0))

console.log('[Onboarding Workflow] Polyglot coordination ready')
console.log('  POST /onboard - Full onboarding flow (Node.js → Rust → Python)')
console.log('  GET  /onboard/metrics - Aggregate metrics from Python analytics')
console.log('')
console.log('Architecture:')
console.log('  • Node.js User Service (users.* functions)')
console.log('  • Rust Fake Stripe HTTP server (stripe.* via bridge)')
console.log('  • Python Analytics via stdin/stdout IPC (analytics.* via bridge)')
console.log('')
console.log('All function calls look identical - the caller never knows the transport!')

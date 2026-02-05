import { createBridge } from '../lib/bridge'
import { PythonIPC } from '../lib/python-ipc'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import type { AnalyticsScoreInput, AnalyticsResult, OnboardingMetrics, User } from '../lib/types'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PYTHON_SCRIPT = join(__dirname, '../services/python-analytics/analytics.py')

const bridge = createBridge('data-requester')
const python = new PythonIPC(PYTHON_SCRIPT)

async function start() {
  console.log('[Data Requester] Starting Python analytics subprocess...')
  await python.start()
  await python.waitReady()
  console.log('[Data Requester] Python analytics ready (stdin/stdout IPC)')

  bridge.registerFunction(
    { function_path: 'analytics.score' },
    async (input: AnalyticsScoreInput): Promise<AnalyticsResult> => {
      return python.call<AnalyticsResult>('score', input)
    }
  )

  bridge.registerFunction(
    { function_path: 'analytics.riskProfile' },
    async (input: AnalyticsScoreInput): Promise<AnalyticsResult> => {
      const result = await python.call<AnalyticsResult>('score', input)
      return {
        ...result,
        factors: [
          ...result.factors,
          result.riskScore > 70 ? 'high_risk' : result.riskScore > 40 ? 'medium_risk' : 'low_risk',
        ],
      }
    }
  )

  bridge.registerFunction(
    { function_path: 'analytics.onboardingMetrics' },
    async (input: { users: User[] }): Promise<OnboardingMetrics> => {
      return python.call<OnboardingMetrics>('metrics', input)
    }
  )

  console.log('[Data Requester] Python functions exposed via iii:')
  console.log('  analytics.score - Risk scoring (via stdin/stdout)')
  console.log('  analytics.riskProfile - Extended risk profile')
  console.log('  analytics.onboardingMetrics - Aggregate metrics')
}

process.on('SIGINT', () => {
  python.stop()
  process.exit(0)
})

process.on('SIGTERM', () => {
  python.stop()
  process.exit(0)
})

start().catch((err) => {
  console.error('[Data Requester] Failed to start:', err)
  process.exit(1)
})

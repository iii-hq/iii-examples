// Auto-register all handlers from a framework instance
// Works with Express, Fastify, Hono, Koa - any framework with routes

import { Bridge } from '@iii-dev/sdk'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (input: any) => Promise<any>

interface AutoRegisterOptions {
  bridge: Bridge
  prefix: string
  handlers: Record<string, Handler>
}

/**
 * Auto-register all handlers with III Engine
 * 
 * @example
 * autoRegister({
 *   bridge,
 *   prefix: 'users',
 *   handlers: {
 *     list: async () => users,
 *     get: async ({ id }) => users.find(u => u.id === id),
 *     create: async (data) => { users.push(data); return data }
 *   }
 * })
 * // Registers: users.list, users.get, users.create
 */
export function autoRegister({ bridge, prefix, handlers }: AutoRegisterOptions): void {
  for (const [name, handler] of Object.entries(handlers)) {
    const functionPath = `${prefix}.${name}`
    
    bridge.registerFunction(
      { function_path: functionPath },
      async (input) => handler(input)
    )

    console.log(`  ✓ Registered: ${functionPath}`)
  }
}

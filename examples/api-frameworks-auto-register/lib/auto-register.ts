import { Bridge } from '@iii-dev/sdk'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (input: any) => Promise<any>

interface HandlerConfig {
  handler: Handler
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  description?: string
}

interface AutoRegisterOptions {
  bridge: Bridge
  prefix: string
  handlers: Record<string, HandlerConfig>
}

export function autoRegister({ bridge, prefix, handlers }: AutoRegisterOptions): void {
  for (const [name, config] of Object.entries(handlers)) {
    const functionPath = `${prefix}.${name}`
    const apiPath = `${prefix}/${name}`

    bridge.registerFunction(
      { function_path: functionPath, description: config.description },
      async (input) => {
        const data = input?.body ?? input
        const result = await config.handler(data)
        return { status_code: 200, body: result }
      }
    )

    bridge.registerTrigger({
      trigger_type: 'api',
      function_path: functionPath,
      config: { api_path: apiPath, http_method: config.method },
    })

    console.log(`  ✓ ${functionPath} [${config.method} /${apiPath}]`)
  }
}

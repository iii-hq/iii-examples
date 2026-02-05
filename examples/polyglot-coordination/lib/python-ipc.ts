import { spawn, type ChildProcess } from 'child_process'
import { createInterface, type Interface } from 'readline'
import { EventEmitter } from 'events'

interface PendingRequest {
  resolve: (result: unknown) => void
  reject: (error: Error) => void
  timeout: ReturnType<typeof setTimeout>
}

export class PythonIPC extends EventEmitter {
  private process: ChildProcess | null = null
  private readline: Interface | null = null
  private requestId = 0
  private pending = new Map<number, PendingRequest>()
  private ready = false
  private readyPromise: Promise<void>
  private readyResolve!: () => void

  constructor(
    private scriptPath: string,
    private timeoutMs = 30000,
    private maxPendingRequests = 1000
  ) {
    super()
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve
    })
  }

  async start(): Promise<void> {
    this.process = spawn('python3', [this.scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    this.readline = createInterface({
      input: this.process.stdout!,
      crlfDelay: Infinity,
    })

    this.readline.on('line', (line) => this.handleLine(line))

    this.process.stderr?.on('data', (data) => {
      const msg = data.toString().trim()
      if (msg) console.error(`[Python stderr] ${msg}`)
    })

    this.process.on('close', (code) => {
      this.ready = false
      this.emit('close', code)
      for (const [id, req] of this.pending) {
        clearTimeout(req.timeout)
        req.reject(new Error(`Python process exited with code ${code}`))
        this.pending.delete(id)
      }
    })

    this.process.on('error', (err) => {
      this.emit('error', err)
    })

    await this.call('ping', {})
    this.ready = true
    this.readyResolve()
  }

  async waitReady(): Promise<void> {
    return this.readyPromise
  }

  async call<T = unknown>(method: string, params: unknown): Promise<T> {
    if (!this.process || !this.process.stdin) {
      throw new Error('Python process not started')
    }

    if (this.pending.size >= this.maxPendingRequests) {
      throw new Error(`Too many pending requests (max: ${this.maxPendingRequests})`)
    }

    const id = ++this.requestId
    if (this.requestId > Number.MAX_SAFE_INTEGER - 1) {
      this.requestId = 0
    }
    const request = JSON.stringify({ id, method, params })

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`Request ${method} timed out after ${this.timeoutMs}ms`))
      }, this.timeoutMs)

      this.pending.set(id, { resolve: resolve as (r: unknown) => void, reject, timeout })
      this.process!.stdin!.write(request + '\n')
    })
  }

  private handleLine(line: string): void {
    try {
      const response = JSON.parse(line)
      const { id, result, error } = response

      const req = this.pending.get(id)
      if (!req) return

      clearTimeout(req.timeout)
      this.pending.delete(id)

      if (error) {
        req.reject(new Error(error.message || error))
      } else {
        req.resolve(result)
      }
    } catch {
      console.error(`[Python IPC] Failed to parse: ${line}`)
    }
  }

  stop(): void {
    if (this.process) {
      this.process.kill()
      this.process = null
    }
    if (this.readline) {
      this.readline.close()
      this.readline = null
    }
  }
}

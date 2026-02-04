export class HealthChecker {
  private healthy = false
  private interval: ReturnType<typeof setInterval> | null = null
  private readonly url: string
  private readonly pollMs: number

  constructor(url: string, pollMs = 10000) {
    this.url = url
    this.pollMs = pollMs
  }

  start() {
    this.check()
    this.interval = setInterval(() => this.check(), this.pollMs)
  }

  stop() {
    if (this.interval) clearInterval(this.interval)
  }

  isHealthy() {
    return this.healthy
  }

  private async check() {
    try {
      const res = await fetch(`${this.url}/health`, { signal: AbortSignal.timeout(5000) })
      this.healthy = res.ok
    } catch {
      this.healthy = false
    }
  }
}

type State = 'closed' | 'open' | 'half-open'

export class CircuitBreaker {
  private state: State = 'closed'
  private failures = 0
  private lastFailure = 0
  private readonly threshold: number
  private readonly resetTimeout: number

  constructor(threshold = 5, resetTimeoutMs = 30000) {
    this.threshold = threshold
    this.resetTimeout = resetTimeoutMs
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'half-open'
      } else {
        throw new Error('Circuit breaker is open')
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (err) {
      this.onFailure()
      throw err
    }
  }

  private onSuccess() {
    this.failures = 0
    this.state = 'closed'
  }

  private onFailure() {
    this.failures++
    this.lastFailure = Date.now()
    if (this.failures >= this.threshold) {
      this.state = 'open'
    }
  }

  getState(): State {
    return this.state
  }
}

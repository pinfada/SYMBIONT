// communication/resilient-message-bus.ts
// Message Bus résilient avec circuit breaker (Phase 1)

import { swLocalStorage } from '../background/service-worker-adapter'

type Message = { type: string; payload: any }
type SendResult = { success: boolean; queued?: boolean; error?: any }

type FailureStrategy = {
  maxRetries: number
  backoffStrategy: 'exponential' | 'linear' | 'immediate'
  fallbackAction: (msg: Message) => Promise<void>
  criticalLevel: 'high' | 'medium' | 'low'
}

class SimpleCircuitBreaker {
  private failureCount = 0
  private open = false
  private lastFailure = 0
  private readonly failureThreshold = 5
  private readonly recoveryTimeout = 30000

  isOpen() {
    if (this.open && Date.now() - this.lastFailure > this.recoveryTimeout) {
      this.open = false
      this.failureCount = 0
    }
    return this.open
  }

  recordSuccess() {
    this.failureCount = 0
    this.open = false
  }

  recordFailure() {
    this.failureCount++
    this.lastFailure = Date.now()
    if (this.failureCount >= this.failureThreshold) {
      this.open = true
    }
  }
}

class SimplePersistentQueue {
  private key = 'symbiont_messages'
  constructor() {}
  async enqueue(msg: Message) {
    const arr = JSON.parse(await swLocalStorage.getItem(this.key) || '[]')
    arr.push(msg)
    await swLocalStorage.setItem(this.key, JSON.stringify(arr))
  }
  async dequeue(): Promise<Message | undefined> {
    const arr = JSON.parse(await swLocalStorage.getItem(this.key) || '[]')
    const msg = arr.shift()
    await swLocalStorage.setItem(this.key, JSON.stringify(arr))
    return msg
  }
  async getAll(): Promise<Message[]> {
    return JSON.parse(await swLocalStorage.getItem(this.key) || '[]')
  }
}

export class ResilientMessageBus {
  private connectionState: 'connected' | 'degraded' | 'offline' = 'offline'
  private messageQueue = new SimplePersistentQueue()
  private failureStrategies: Map<string, FailureStrategy> = new Map()
  private circuitBreaker = new SimpleCircuitBreaker()

  constructor() {
    this.setupFailureStrategies()
  }

  private setupFailureStrategies(): void {
    this.failureStrategies.set('ORGANISM_UPDATE', {
      maxRetries: 3,
      backoffStrategy: 'exponential',
      fallbackAction: this.cacheOrganismState,
      criticalLevel: 'high'
    })
    this.failureStrategies.set('INTERACTION_DETECTED', {
      maxRetries: 5,
      backoffStrategy: 'linear',
      fallbackAction: this.queueForLaterSync,
      criticalLevel: 'medium'
    })
    this.failureStrategies.set('PAGE_ANALYSIS_COMPLETE', {
      maxRetries: 2,
      backoffStrategy: 'immediate',
      fallbackAction: this.processLocally,
      criticalLevel: 'low'
    })
  }

  async send(message: Message): Promise<SendResult> {
    if (this.circuitBreaker.isOpen()) {
      await this.messageQueue.enqueue(message)
      return { success: false, queued: true, error: 'Circuit breaker open' }
    }
    let retries = 0
    const strategy = this.failureStrategies.get(message.type)
    const maxRetries = strategy?.maxRetries || 2
    while (retries <= maxRetries) {
      try {
        // Simule l'envoi (à remplacer par chrome.runtime.sendMessage ou autre)
        await this.simulateSend(message)
        this.circuitBreaker.recordSuccess()
        return { success: true }
      } catch (error) {
        this.circuitBreaker.recordFailure()
        retries++
        if (retries > maxRetries) {
          if (strategy) await strategy.fallbackAction.call(this, message)
          await this.messageQueue.enqueue(message)
          return { success: false, queued: true, error }
        }
        await this.wait(this.getBackoff(strategy?.backoffStrategy, retries))
      }
    }
    return { success: false, queued: true, error: 'Unknown error' }
  }

  private async simulateSend(message: Message) {
    // Simule un échec 20% du temps
    if (Math.random() < 0.2) throw new Error('Simulated send failure')
    // Sinon, succès
    return
  }

  private getBackoff(type: string = 'immediate', attempt: number) {
    if (type === 'exponential') return 500 * Math.pow(2, attempt)
    if (type === 'linear') return 500 * attempt
    return 0
  }
  private wait(ms: number) { return new Promise(res => setTimeout(res, ms)) }

  // Fallbacks simulés
  private async cacheOrganismState(msg: Message) {
    await swLocalStorage.setItem('symbiont_organism_cache', JSON.stringify(msg))
  }
  private async queueForLaterSync(msg: Message) {
    await this.messageQueue.enqueue(msg)
  }
  private async processLocally(msg: Message) {
    await swLocalStorage.setItem('symbiont_local_processing', JSON.stringify(msg))
  }
}

// TODO: Exporter/brancher sur le bus de messages principal 
// communication/resilient-message-bus.ts
// Message Bus résilient avec circuit breaker (Phase 1)

import { swLocalStorage } from '../background/service-worker-adapter'
import { logger } from '@shared/utils/secureLogger';

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
    logger.info('[ResilientMessageBus] enqueue', msg)
    const arr = JSON.parse(await swLocalStorage.getItem(this.key) || '[]')
    arr.push(msg)
    await swLocalStorage.setItem(this.key, JSON.stringify(arr))
    logger.info('[ResilientMessageBus] enqueue OK', arr.length)
  }
  async dequeue(): Promise<Message | undefined> {
    const arr = JSON.parse(await swLocalStorage.getItem(this.key) || '[]')
    const msg = arr.shift()
    await swLocalStorage.setItem(this.key, JSON.stringify(arr))
    logger.info('[ResilientMessageBus] dequeue', msg)
    return msg
  }
  async getAll(): Promise<Message[]> {
    const arr = JSON.parse(await swLocalStorage.getItem(this.key) || '[]')
    logger.info('[ResilientMessageBus] getAll', arr.length)
    return arr
  }
}

export class ResilientMessageBus {
  private connectionState: 'connected' | 'degraded' | 'offline' = 'offline'
  private messageQueue = new SimplePersistentQueue()
  private failureStrategies: Map<string, FailureStrategy> = new Map()
  private circuitBreaker = new SimpleCircuitBreaker()
  private failureQueue: Message[] = []
  private isConnected: boolean = false;
  private connectionAttempts: number = 0;

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
        await this.deliver(message)
        this.circuitBreaker.recordSuccess()
        await this.flushQueuedMessages()
        return { success: true }
      } catch (_error) {
        this.circuitBreaker.recordFailure()
        retries++
        if (retries > maxRetries) {
          if (strategy) await strategy.fallbackAction.call(this, message)
          await this.messageQueue.enqueue(message)
          return { success: false, queued: true, error: _error }
        }
        await this.wait(this.getBackoff(strategy?.backoffStrategy, retries))
      }
    }
    return { success: false, queued: true, error: 'Unknown error' }
  }
  /**
   * Livraison réelle via chrome.runtime.sendMessage.
   * Rejette si l'API n'est pas disponible ou si aucun destinataire
   * (ex: popup fermé) n'est à l'écoute — la stratégie de retry/queue
   * prend alors le relais.
   */
  private async deliver(message: Message): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      throw new Error('chrome.runtime.sendMessage unavailable')
    }
    await chrome.runtime.sendMessage(message)
  }

  /**
   * Rejoue les messages mis en file pendant une indisponibilité,
   * dès qu'une livraison réussit à nouveau.
   */
  private async flushQueuedMessages(): Promise<void> {
    const pending = await this.messageQueue.getAll()
    if (pending.length === 0) return
    let msg = await this.messageQueue.dequeue()
    while (msg) {
      try {
        await this.deliver(msg)
      } catch {
        await this.messageQueue.enqueue(msg)
        return
      }
      msg = await this.messageQueue.dequeue()
    }
  }

  private getBackoff(type: string = 'immediate', attempt: number) {
    if (type === 'exponential') return 500 * Math.pow(2, attempt)
    if (type === 'linear') return 500 * attempt
    return 0
  }
  private wait(ms: number) { return new Promise(res => setTimeout(res, ms)) }

  // Fallbacks simulés
  private async cacheOrganismState(msg: Message) {
    logger.info('[ResilientMessageBus] fallback cacheOrganismState', msg)
    await swLocalStorage.setItem('symbiont_organism_cache', JSON.stringify(msg))
  }
  private async queueForLaterSync(msg: Message) {
    logger.info('[ResilientMessageBus] fallback queueForLaterSync', msg)
    await this.messageQueue.enqueue(msg)
  }
  private async processLocally(msg: Message) {
    logger.info('[ResilientMessageBus] fallback processLocally', msg)
    await swLocalStorage.setItem('symbiont_local_processing', JSON.stringify(msg))
  }
} 
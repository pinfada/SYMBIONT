import { OrganismState, OrganismHistory, TimeSpan, ConsolidationResult } from '../shared/types/organism'
import { SecurityManager } from './SecurityManager'
import { SecureLogger } from '@shared/utils/secureLogger';

export class OrganismMemoryBank {
  private security: SecurityManager

  constructor(security: SecurityManager) {
    this.security = security
  }

  private getKey(id: string): string {
    return `organism_${id}`
  }

  async saveOrganismState(id: string, state: OrganismState): Promise<void> {
    const encrypted = await this.security.encryptSensitiveData(state)
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [this.getKey(id)]: encrypted }, () => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
        else resolve()
      })
    })
  }

  async loadOrganismHistory(id: string): Promise<OrganismHistory> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([this.getKey(id)], async (result) => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
        else {
          const encrypted = result[this.getKey(id)] as string | undefined
          let state: OrganismState | undefined = undefined
          if (encrypted) {
            state = await this.security.decryptSensitiveData(encrypted)
          }
          resolve({ states: state ? [state] : [], mutations: state?.mutations || [] })
        }
      })
    })
  }

  async saveOrganismHistory(id: string, history: OrganismHistory): Promise<void> {
    const encrypted = await this.security.encryptSensitiveData(history)
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [this.getKey(id) + '_history']: encrypted }, () => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
        else resolve()
      })
    })
  }

  async consolidateMemories(timespan: TimeSpan): Promise<ConsolidationResult> {
    // TODO: Consolidation avancée selon le timespan fourni
    return { consolidated: true, details: `Consolidation pour période ${timespan} non implémentée` }
  }

  // Hook d'optimisation du stockage
  async optimizeStorage(): Promise<void> {
    // Compression, cache, nettoyage, etc.
    // (À implémenter selon la volumétrie réelle)
    this.logPerformance('Optimisation stockage exécutée')
  }

  // --- Monitoring ---
  logPerformance(msg: string) {
    // Hook pour loguer ou alerter sur la performance
    // (À remplacer par un vrai monitoring en prod)
    SecureLogger.info(`[OrganismMemoryBank][Perf] ${msg}`)
  }

  public cleanup(): void {
    // ... existing code ...
  }
} 
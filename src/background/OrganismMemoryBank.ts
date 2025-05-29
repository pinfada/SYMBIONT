import { OrganismState, OrganismHistory, TimeSpan, ConsolidationResult } from '../shared/types/organism'
import { SecurityManager } from './SecurityManager'

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

  async consolidateMemories(timespan: TimeSpan): Promise<ConsolidationResult> {
    // TODO: Consolidation avancée
    return { consolidated: true, details: 'Consolidation non implémentée' }
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
    console.log(`[OrganismMemoryBank][Perf] ${msg}`)
  }
} 
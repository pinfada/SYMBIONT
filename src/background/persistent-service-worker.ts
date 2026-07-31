import { logger } from '@shared/utils/secureLogger';
import { hasAlarmsAPI } from '@shared/utils/browser-env';
// background/persistent-service-worker.ts
// Cycle de vie background cross-navigateur (service worker Chrome / page d'événements Firefox)
//
// Un setInterval ne survit ni à la suspension d'un service worker Chrome ni
// au déchargement d'une page d'événements Firefox. chrome.alarms est le seul
// mécanisme de réveil fiable dans les deux mondes : l'alarme réveille le
// background, le heartbeat est écrit, l'état critique est vérifié.

const HEARTBEAT_ALARM = 'symbiont-heartbeat';
const HEARTBEAT_PERIOD_MINUTES = 1; // minimum commun Chrome/Firefox
const HEARTBEAT_STALE_MS = 3 * 60_000;

export class PersistentServiceWorker {
  private isAlive = true
  private lastHeartbeat: number = Date.now()
  private fallbackInterval: ReturnType<typeof setInterval> | undefined = undefined

  constructor() {
    this.setupLifecycle()
  }

  private setupLifecycle(): void {
    if (hasAlarmsAPI()) {
      // Alarme périodique : réveille le background même suspendu/déchargé
      chrome.alarms.create(HEARTBEAT_ALARM, { periodInMinutes: HEARTBEAT_PERIOD_MINUTES })
      chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name !== HEARTBEAT_ALARM) return
        this.sendHeartbeat()
        this.checkConnectionHealth()
        this.performMaintenance()
      })
      logger.info('Lifecycle: alarms-based heartbeat active')
    } else {
      // Environnement sans chrome.alarms (tests) : repli setInterval
      this.fallbackInterval = setInterval(() => {
        this.sendHeartbeat()
        this.checkConnectionHealth()
        this.performMaintenance()
      }, HEARTBEAT_PERIOD_MINUTES * 60_000)
      logger.warn('Lifecycle: chrome.alarms unavailable, using setInterval fallback')
    }

    // Réveil après redémarrage navigateur
    chrome.runtime.onStartup?.addListener(() => {
      logger.info('🚀 Background restarted')
      this.reinitialize()
    })

    // Sauvegarde d'état avant suspension (Chrome émet onSuspend ; Firefox
    // décharge la page d'événements sans préavis — l'état doit donc être
    // écrit à chaque heartbeat, pas seulement ici)
    chrome.runtime.onSuspend?.addListener(() => {
      logger.info('⚠️ Background suspending - saving critical state')
      this.saveEmergencyState()
    })
  }

  private sendHeartbeat() {
    this.lastHeartbeat = Date.now()
    chrome.storage.local.set({ symbiont_last_heartbeat: this.lastHeartbeat }, () => {
      if (chrome.runtime.lastError) {
        logger.warn('Erreur heartbeat:', chrome.runtime.lastError)
      } else {
        logger.debug('💓 Heartbeat', new Date(this.lastHeartbeat).toISOString())
      }
    })
  }

  private checkConnectionHealth(): boolean {
    chrome.storage.local.get(['symbiont_last_heartbeat'], (result) => {
      const last = result.symbiont_last_heartbeat || 0
      const now = Date.now()
      if (last && now - last > HEARTBEAT_STALE_MS) {
        logger.warn('⏱️ Heartbeat trop ancien — le background a été suspendu longtemps')
      }
    })
    return true
  }

  private reinitialize() {
    this.isAlive = true
    this.lastHeartbeat = Date.now()
    this.performMaintenance()
    logger.info('♻️ Background réinitialisé')
  }

  private saveEmergencyState() {
    chrome.storage.local.set({ symbiont_emergency_state: { timestamp: Date.now(), isAlive: this.isAlive } }, () => {
      if (chrome.runtime.lastError) {
        logger.error('Erreur sauvegarde état critique:', chrome.runtime.lastError)
      } else {
        logger.info('💾 État critique sauvegardé')
      }
    })
  }

  private async performMaintenance(): Promise<void> {
    // L'état critique est persisté à chaque réveil : sur Firefox, la page
    // d'événements peut être déchargée sans onSuspend.
    this.saveEmergencyState()
  }

  dispose(): void {
    if (this.fallbackInterval) clearInterval(this.fallbackInterval)
    if (hasAlarmsAPI()) {
      chrome.alarms.clear(HEARTBEAT_ALARM)
    }
  }
}

// Instanciation automatique du cycle de vie background
export const persistentServiceWorker = new PersistentServiceWorker()

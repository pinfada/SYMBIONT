// Suivi navigation SPA

// Type pour le changement de navigation (doit correspondre à NavigationChange dans index.ts)
import type { NavigationChange } from '../index';

export class NavigationObserver {
  /**
   * Observe les changements de navigation SPA
   * @param handler Fonction appelée à chaque changement
   */
  observe(handler: (change: NavigationChange) => void): void {
    // Mock : rien à faire
  }
  disconnect(): void {
    // Mock : rien à faire
  }
}
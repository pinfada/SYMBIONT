import type { NavigationChange } from '../../content/index';

export class NavigationObserver {
  private handler: ((change: NavigationChange) => void) | null = null;

  constructor(messageBus?: any) {}

  observe(handler: (change: NavigationChange) => void): void {
    this.handler = handler;
    // Ici, on pourrait brancher sur l'historique ou les events SPA si besoin
  }

  disconnect(): void {
    this.handler = null;
    // Ici, on pourrait retirer les listeners si besoin
  }
}

export default NavigationObserver; 

import type { NavigationChange } from '../index';
export declare class NavigationObserver {
    /**
     * Observe les changements de navigation SPA
     * @param handler Fonction appelée à chaque changement
     */
    observe(handler: (change: NavigationChange) => void): void;
    disconnect(): void;
}

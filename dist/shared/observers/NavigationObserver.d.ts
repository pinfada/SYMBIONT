import type { NavigationChange } from '../../content/index';
export declare class NavigationObserver {
    private handler;
    constructor(messageBus?: any);
    observe(handler: (change: NavigationChange) => void): void;
    disconnect(): void;
}
export default NavigationObserver;
//# sourceMappingURL=NavigationObserver.d.ts.map
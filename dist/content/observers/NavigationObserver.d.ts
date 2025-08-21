import { MessageBus } from '../../core/messaging/MessageBus';
export interface NavigationEvent {
    type: 'page_load' | 'page_unload' | 'navigation_start' | 'navigation_end' | 'hash_change' | 'state_change' | 'back_forward' | 'link_click' | 'form_navigation';
    timestamp: number;
    url: {
        from: string;
        to: string;
        domain: string;
        path: string;
        params: Record<string, string>;
        hash: string | undefined;
    };
    method: 'click' | 'form' | 'back' | 'forward' | 'programmatic' | 'typed' | 'bookmark';
    duration?: number;
    data?: Record<string, any>;
}
export interface NavigationMetrics {
    sessionStart: number;
    pageCount: number;
    domainCount: number;
    backCount: number;
    forwardCount: number;
    averagePageDuration: number;
    navigationVelocity: number;
    bounceRate: number;
    deepEngagementPages: number;
    navigationPattern: 'linear' | 'bouncing' | 'exploring' | 'focused' | 'lost';
}
export declare class NavigationObserver extends EventTarget {
    private messageBus;
    private isActive;
    private sessionStart;
    private currentUrl;
    private previousUrl;
    private pageStartTime;
    private navigationHistory;
    private pageDurations;
    private domainHistory;
    private backNavigationCount;
    private forwardNavigationCount;
    private formNavigationCount;
    private linkClickCount;
    private lastNavigationTime;
    private navigationGaps;
    private bounceThreshold;
    private deepEngagementThreshold;
    constructor(messageBus?: MessageBus);
    private setupEventListeners;
    private setupPerformanceObserver;
    private initializeCurrentPage;
    private handlePageLoad;
    private handleBeforeUnload;
    private handlePageUnload;
    private handlePopState;
    private handleHashChange;
    private handleLinkClick;
    private handleFormSubmit;
    private handleVisibilityChange;
    private handleNavigationTiming;
    private recordPageDuration;
    private updateUrlState;
    private isBackNavigation;
    private isForwardNavigation;
    private findLinkElement;
    private getDomain;
    private getHash;
    private parseUrlParams;
    private determineNavigationMethod;
    private calculateMetrics;
    private determineNavigationPattern;
    private emitNavigationEvent;
    start(): void;
    stop(): void;
    getMetrics(): NavigationMetrics;
    on(event: string, handler: (_event: Event) => void): void;
    getNavigationHistory(): any;
    getCurrentPageInfo(): any;
}
//# sourceMappingURL=NavigationObserver.d.ts.map
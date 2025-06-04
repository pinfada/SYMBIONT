import { MessageBus } from '../../core/messaging/MessageBus';
export interface AttentionMetrics {
    focusLevel: number;
    readingSpeed: number;
    scrollVelocity: number;
    dwellTime: number;
    tabSwitches: number;
    windowFocusTime: number;
    idleTime: number;
    multitaskingScore: number;
    engagementPattern: 'deep' | 'scanning' | 'distracted' | 'focused' | 'idle';
}
export interface AttentionEvent {
    type: 'focus_change' | 'visibility_change' | 'idle_start' | 'idle_end' | 'deep_focus' | 'distraction' | 'reading_flow';
    timestamp: number;
    metrics: Partial<AttentionMetrics>;
    context: {
        url: string;
        title: string;
        visibleText: string;
        scrollPosition: number;
        elementInFocus?: string;
    };
}
export declare class AttentionMonitor extends EventTarget {
    private messageBus;
    private isActive;
    private startTime;
    private lastActivity;
    private windowFocusStart;
    private totalFocusTime;
    private tabSwitchCount;
    private scrollStartTime;
    private scrollDistance;
    private lastScrollPosition;
    private currentElement;
    private elementDwellStart;
    private focusHistory;
    private attentionScore;
    private idleThreshold;
    private deepFocusThreshold;
    private isIdle;
    private isDeepFocus;
    private textAnalysisBuffer;
    private averageReadingSpeed;
    private readingSpeedHistory;
    constructor(messageBus?: MessageBus);
    private setupEventListeners;
    private setupIntersectionObserver;
    private trackElementFocus;
    private analyzeElementDwell;
    private analyzeReadingContent;
    private handleWindowFocus;
    private handleWindowBlur;
    private handleVisibilityChange;
    private handleActivity;
    private handleScroll;
    private handleSelection;
    private updateFocusLevel;
    private checkIdle;
    private analyzeAttention;
    private calculateMetrics;
    private determineEngagementPattern;
    private getCurrentContext;
    private getVisibleText;
    private getElementSelector;
    private emitAttentionEvent;
    start(): void;
    stop(): void;
    getMetrics(): AttentionMetrics;
    on(event: string, handler: (event: any) => void): void;
    getStats(): any;
}
//# sourceMappingURL=AttentionMonitor.d.ts.map
import { MessageBus } from '../../core/messaging/MessageBus';
export interface ScrollMetrics {
    totalDistance: number;
    maxDepth: number;
    currentDepth: number;
    pageHeight: number;
    scrollVelocity: number;
    pauseCount: number;
    backtrackCount: number;
    readingTime: number;
    engagementScore: number;
    scrollPattern: 'linear' | 'jumped' | 'scanning' | 'reading' | 'searching';
}
export interface ScrollEvent {
    type: 'scroll_start' | 'scroll_pause' | 'scroll_resume' | 'scroll_end' | 'deep_scroll' | 'backtrack' | 'jump';
    timestamp: number;
    position: number;
    velocity: number;
    direction: 'up' | 'down';
    metrics: Partial<ScrollMetrics>;
}
export declare class ScrollTracker extends EventTarget {
    private messageBus;
    private isActive;
    private startTime;
    private lastScrollPosition;
    private lastScrollTime;
    private scrollHistory;
    private scrollSessions;
    private totalScrollDistance;
    private maxScrollDepth;
    private pauseStartTime;
    private pauseCount;
    private backtrackCount;
    private isScrolling;
    private isPaused;
    private pauseThreshold;
    private velocityHistory;
    private lastDirection;
    private readingSegments;
    private averageReadingSpeed;
    private currentReadingStart;
    private pageAnalysis;
    constructor(messageBus?: MessageBus);
    private setupEventListeners;
    private analyzePage;
    private analyzeContentSections;
    private handleScroll;
    private handleScrollStart;
    private handleScrollPause;
    private handleScrollResume;
    private updateScrollData;
    private analyzeReadingSegment;
    private getPositionAtTime;
    private getTextInRange;
    private getScrollPercentage;
    private calculateMetrics;
    private calculateEngagementScore;
    private determineScrollPattern;
    private isLinearProgression;
    private emitScrollEvent;
    start(): void;
    stop(): void;
    getMetrics(): ScrollMetrics;
    on(event: string, handler: (event: any) => void): void;
    getReadingAnalysis(): any;
    getScrollPattern(): any;
}
//# sourceMappingURL=ScrollTracker.d.ts.map
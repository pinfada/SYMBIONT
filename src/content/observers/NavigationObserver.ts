// Suivi navigation SPA

// Observer de navigation avancé pour SYMBIONT
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
  duration?: number; // temps sur la page précédente
  data?: Record<string, any>;
}

export interface NavigationMetrics {
  sessionStart: number;
  pageCount: number;
  domainCount: number;
  backCount: number;
  forwardCount: number;
  averagePageDuration: number;
  navigationVelocity: number; // pages per minute
  bounceRate: number; // pages with < 10 seconds
  deepEngagementPages: number; // pages with > 2 minutes
  navigationPattern: 'linear' | 'bouncing' | 'exploring' | 'focused' | 'lost';
}

export class NavigationObserver extends EventTarget {
  private messageBus: MessageBus | null;
  private isActive: boolean = false;
  private sessionStart: number = 0;
  
  // Navigation tracking
  private currentUrl: string = '';
  private previousUrl: string = '';
  private pageStartTime: number = 0;
  private navigationHistory: Array<{
    url: string;
    timestamp: number;
    duration: number;
    method: string;
    referrer: string;
  }> = [];
  
  // Metrics tracking
  private pageDurations: number[] = [];
  private domainHistory: Set<string> = new Set();
  private backNavigationCount: number = 0;
  private forwardNavigationCount: number = 0;
  private formNavigationCount: number = 0;
  private linkClickCount: number = 0;
  
  // Pattern detection
  private lastNavigationTime: number = 0;
  private navigationGaps: number[] = [];
  private bounceThreshold: number = 10000; // 10 seconds
  private deepEngagementThreshold: number = 120000; // 2 minutes

  constructor(messageBus?: MessageBus) {
    super();
    this.messageBus = messageBus || null;
    this.setupEventListeners();
    this.initializeCurrentPage();
  }

  private setupEventListeners(): void {
    // Page lifecycle events
    window.addEventListener('load', this.handlePageLoad.bind(this));
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    window.addEventListener('unload', this.handlePageUnload.bind(this));
    
    // Navigation events
    window.addEventListener('popstate', this.handlePopState.bind(this));
    window.addEventListener('hashchange', this.handleHashChange.bind(this));
    
    // Link tracking
    document.addEventListener('click', this.handleLinkClick.bind(this), true);
    
    // Form navigation tracking
    document.addEventListener('submit', this.handleFormSubmit.bind(this), true);
    
    // Page visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Performance Navigation Timing API
    if ('PerformanceObserver' in window) {
      this.setupPerformanceObserver();
    }
  }

  private setupPerformanceObserver(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            this.handleNavigationTiming(entry as PerformanceNavigationTiming);
          }
        }
      });
      
      observer.observe({ entryTypes: ['navigation'] });
    } catch (error) {
      console.warn('Performance Observer not available:', error);
    }
  }

  private initializeCurrentPage(): void {
    this.currentUrl = window.location.href;
    this.pageStartTime = Date.now();
    this.sessionStart = Date.now();
    this.domainHistory.add(this.getDomain(this.currentUrl));
    
    this.emitNavigationEvent({
      type: 'page_load',
      timestamp: this.pageStartTime,
      url: {
        from: document.referrer || 'direct',
        to: this.currentUrl,
        domain: this.getDomain(this.currentUrl),
        path: window.location.pathname,
        params: this.parseUrlParams(this.currentUrl),
        hash: window.location.hash || undefined
      },
      method: this.determineNavigationMethod(document.referrer),
      data: {
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    });
  }

  private handlePageLoad(): void {
    // Page fully loaded
    const loadTime = Date.now() - this.pageStartTime;
    
    this.emitNavigationEvent({
      type: 'navigation_end',
      timestamp: Date.now(),
      url: {
        from: this.previousUrl,
        to: this.currentUrl,
        domain: this.getDomain(this.currentUrl),
        path: window.location.pathname,
        params: this.parseUrlParams(this.currentUrl),
        hash: window.location.hash || undefined
      },
      method: 'programmatic',
      duration: loadTime,
      data: {
        loadTime,
        readyState: document.readyState
      }
    });
  }

  private handleBeforeUnload(): void {
    this.recordPageDuration();
  }

  private handlePageUnload(): void {
    this.recordPageDuration();
    
    this.emitNavigationEvent({
      type: 'page_unload',
      timestamp: Date.now(),
      url: {
        from: this.currentUrl,
        to: 'unknown',
        domain: this.getDomain(this.currentUrl),
        path: window.location.pathname,
        params: this.parseUrlParams(this.currentUrl),
        hash: window.location.hash || undefined
      },
      method: 'programmatic',
      duration: Date.now() - this.pageStartTime
    });
  }

  private handlePopState(event: PopStateEvent): void {
    const newUrl = window.location.href;
    const isBack = this.isBackNavigation(newUrl);
    const isForward = this.isForwardNavigation(newUrl);
    
    if (isBack) this.backNavigationCount++;
    if (isForward) this.forwardNavigationCount++;
    
    this.recordPageDuration(false);
    this.updateUrlState(newUrl);
    
    const hash = window.location.hash || undefined;
    
    this.emitNavigationEvent({
      type: isBack ? 'back_forward' : isForward ? 'back_forward' : 'state_change',
      timestamp: Date.now(),
      url: {
        from: this.previousUrl,
        to: newUrl,
        domain: this.getDomain(newUrl),
        path: window.location.pathname,
        params: this.parseUrlParams(newUrl),
        hash
      },
      method: isBack ? 'back' : isForward ? 'forward' : 'programmatic',
      data: {
        state: event.state,
        direction: isBack ? 'back' : isForward ? 'forward' : 'unknown'
      }
    });
  }

  private handleHashChange(): void {
    const newUrl = window.location.href;
    
    this.emitNavigationEvent({
      type: 'hash_change',
      timestamp: Date.now(),
      url: {
        from: this.currentUrl,
        to: newUrl,
        domain: this.getDomain(newUrl),
        path: window.location.pathname,
        params: this.parseUrlParams(newUrl),
        hash: window.location.hash || undefined
      },
      method: 'programmatic',
      data: {
        oldHash: this.getHash(this.currentUrl),
        newHash: window.location.hash || undefined
      }
    });
    
    this.currentUrl = newUrl;
  }

  private handleLinkClick(event: MouseEvent): void {
    const link = this.findLinkElement(event.target as Element);
    if (!link) return;
    
    const href = link.href;
    if (!href || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return;
    }
    
    this.linkClickCount++;
    
    // Detect if this will cause navigation
    const isExternal = this.getDomain(href) !== this.getDomain(this.currentUrl);
    const isSamePage = href.split('#')[0] === this.currentUrl.split('#')[0];
    
    if (!isSamePage) {
      this.recordPageDuration();
      this.updateUrlState(href);
      
      this.emitNavigationEvent({
        type: 'link_click',
        timestamp: Date.now(),
        url: {
          from: this.currentUrl,
          to: href,
          domain: this.getDomain(href),
          path: new URL(href).pathname,
          params: this.parseUrlParams(href),
          hash: new URL(href).hash || undefined
        },
        method: 'click',
        data: {
          linkText: link.textContent?.slice(0, 100),
          linkClass: link.className,
          isExternal,
          target: link.target,
          modifiers: {
            ctrl: event.ctrlKey,
            shift: event.shiftKey,
            alt: event.altKey,
            meta: event.metaKey
          }
        }
      });
    }
  }

  private handleFormSubmit(event: Event): void {
    const form = event.target as HTMLFormElement;
    if (!form || form.tagName !== 'FORM') return;
    
    this.formNavigationCount++;
    
    const action = form.action || this.currentUrl;
    const method = (form.method || 'get').toLowerCase();
    
    this.recordPageDuration();
    
    this.emitNavigationEvent({
      type: 'form_navigation',
      timestamp: Date.now(),
      url: {
        from: this.currentUrl,
        to: action,
        domain: this.getDomain(action),
        path: new URL(action).pathname,
        params: this.parseUrlParams(action),
        hash: new URL(action).hash || undefined
      },
      method: 'form',
      data: {
        formMethod: method,
        formAction: action,
        fieldCount: form.elements.length,
        hasFileInput: Array.from(form.elements).some(el => 
          (el as HTMLInputElement).type === 'file'
        )
      }
    });
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      // Page became hidden - pause duration tracking
      this.recordPageDuration(false); // Don't reset timer
    } else {
      // Page became visible - resume tracking
      this.pageStartTime = Date.now();
    }
  }

  private handleNavigationTiming(timing: PerformanceNavigationTiming): void {
    const navigationData = {
      loadType: timing.type,
      redirectCount: timing.redirectCount,
      domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
      loadComplete: timing.loadEventEnd - timing.loadEventStart,
      networkTime: timing.responseEnd - timing.requestStart,
      serverTime: timing.responseStart - timing.requestStart,
      transferSize: timing.transferSize,
      decodedBodySize: timing.decodedBodySize
    };
    
    this.emitNavigationEvent({
      type: 'navigation_start',
      timestamp: Date.now(),
      url: {
        from: this.previousUrl,
        to: this.currentUrl,
        domain: this.getDomain(this.currentUrl),
        path: window.location.pathname,
        params: this.parseUrlParams(this.currentUrl),
        hash: window.location.hash || undefined
      },
      method: 'programmatic',
      data: navigationData
    });
  }

  // Utility methods
  private recordPageDuration(resetTimer: boolean = true): void {
    if (this.pageStartTime > 0) {
      const duration = Date.now() - this.pageStartTime;
      this.pageDurations.push(duration);
      
      // Keep history manageable
      if (this.pageDurations.length > 100) {
        this.pageDurations = this.pageDurations.slice(-100);
      }
      
      // Record navigation history
      this.navigationHistory.push({
        url: this.currentUrl,
        timestamp: this.pageStartTime,
        duration,
        method: 'recorded',
        referrer: this.previousUrl
      });
      
      if (resetTimer) {
        this.pageStartTime = Date.now();
      }
      
      // Track navigation timing gaps
      if (this.lastNavigationTime > 0) {
        const gap = Date.now() - this.lastNavigationTime;
        this.navigationGaps.push(gap);
        if (this.navigationGaps.length > 20) {
          this.navigationGaps = this.navigationGaps.slice(-20);
        }
      }
      this.lastNavigationTime = Date.now();
    }
  }

  private updateUrlState(newUrl: string): void {
    this.previousUrl = this.currentUrl;
    this.currentUrl = newUrl;
    this.domainHistory.add(this.getDomain(newUrl));
  }

  private isBackNavigation(newUrl: string): boolean {
    // Simple heuristic: check if new URL was visited recently
    const recentUrls = this.navigationHistory.slice(-5).map(h => h.url);
    return recentUrls.includes(newUrl) && newUrl !== this.currentUrl;
  }

  // @ts-expect-error Paramètre réservé pour usage futur
  private isForwardNavigation(newUrl: string): boolean {
    // Simple forward navigation detection
    return true;
  }

  private findLinkElement(element: Element | null): HTMLAnchorElement | null {
    while (element && element !== document.body) {
      if (element.tagName === 'A' && (element as HTMLAnchorElement).href) {
        return element as HTMLAnchorElement;
      }
      element = element.parentElement;
    }
    return null;
  }

  private getDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  private getHash(url: string): string {
    try {
      return new URL(url).hash;
    } catch {
      return '';
    }
  }

  private parseUrlParams(url: string): Record<string, string> {
    try {
      const urlObj = new URL(url);
      const params: Record<string, string> = {};
      for (const [key, value] of urlObj.searchParams.entries()) {
        params[key] = value;
      }
      return params;
    } catch {
      return {};
    }
  }

  private determineNavigationMethod(referrer: string): NavigationEvent['method'] {
    if (!referrer) return 'typed';
    if (referrer.includes('google.com') || referrer.includes('bing.com') || referrer.includes('search')) {
      return 'click'; // Search engine
    }
    if (this.getDomain(referrer) === this.getDomain(this.currentUrl)) {
      return 'click'; // Same domain
    }
    return 'click'; // External link
  }

  private calculateMetrics(): NavigationMetrics {
    const sessionDuration = Date.now() - this.sessionStart;
    const avgPageDuration = this.pageDurations.length > 0 
      ? this.pageDurations.reduce((a, b) => a + b, 0) / this.pageDurations.length 
      : 0;
    
    const navigationVelocity = this.pageDurations.length / Math.max(1, sessionDuration / 60000); // pages per minute
    
    const bouncePages = this.pageDurations.filter(d => d < this.bounceThreshold).length;
    const bounceRate = this.pageDurations.length > 0 ? bouncePages / this.pageDurations.length : 0;
    
    const deepEngagementPages = this.pageDurations.filter(d => d > this.deepEngagementThreshold).length;
    
    const pattern = this.determineNavigationPattern();
    
    return {
      sessionStart: this.sessionStart,
      pageCount: this.pageDurations.length,
      domainCount: this.domainHistory.size,
      backCount: this.backNavigationCount,
      forwardCount: this.forwardNavigationCount,
      averagePageDuration: avgPageDuration,
      navigationVelocity,
      bounceRate,
      deepEngagementPages,
      navigationPattern: pattern
    };
  }

  private determineNavigationPattern(): NavigationMetrics['navigationPattern'] {
    if (this.pageDurations.length < 3) return 'exploring';
    
    const avgDuration = this.pageDurations.reduce((a, b) => a + b, 0) / this.pageDurations.length;
    const bounceRate = this.pageDurations.filter(d => d < this.bounceThreshold).length / this.pageDurations.length;
    
    if (bounceRate > 0.7) return 'bouncing';
    if (avgDuration > this.deepEngagementThreshold) return 'focused';
    if (this.backNavigationCount > this.pageDurations.length * 0.3) return 'lost';
    if (this.domainHistory.size === 1) return 'focused';
    
    return 'linear';
  }

  private emitNavigationEvent(event: NavigationEvent): void {
    this.dispatchEvent(new CustomEvent('navigation', { detail: event }));
    
    // Send to background if message bus available
    if (this.messageBus) {
      this.messageBus.sendToBackground({
        type: 'NAVIGATION_EVENT',
        payload: event
      });
    }
  }

  // Public API
  public start(): void {
    this.isActive = true;
    console.log('🧭 NavigationObserver started');
  }

  public stop(): void {
    this.isActive = false;
    this.recordPageDuration();
    console.log('🧭 NavigationObserver stopped');
  }

  public getMetrics(): NavigationMetrics {
    return this.calculateMetrics();
  }

  public on(event: string, handler: (event: any) => void): void {
    this.addEventListener(event, (e: any) => handler(e.detail));
  }

  public getNavigationHistory(): any {
    return {
      history: this.navigationHistory.slice(-20), // Last 20 navigations
      currentSession: {
        duration: Date.now() - this.sessionStart,
        pageCount: this.pageDurations.length,
        domains: Array.from(this.domainHistory)
      },
      patterns: {
        averagePageDuration: this.pageDurations.reduce((a, b) => a + b, 0) / this.pageDurations.length,
        navigationVelocity: this.pageDurations.length / Math.max(1, (Date.now() - this.sessionStart) / 60000),
        bounceRate: this.pageDurations.filter(d => d < this.bounceThreshold).length / this.pageDurations.length
      }
    };
  }

  public getCurrentPageInfo(): any {
    return {
      url: this.currentUrl,
      domain: this.getDomain(this.currentUrl),
      timeOnPage: Date.now() - this.pageStartTime,
      isActive: this.isActive,
      referrer: this.previousUrl
    };
  }
}
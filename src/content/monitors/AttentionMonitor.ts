// Monitoring avancé de l'attention utilisateur pour SYMBIONT
import { MessageBus } from '../../core/messaging/MessageBus';
import { safeGetClasses } from '../../shared/utils/safeOperations';
import { SecureLogger } from '@shared/utils/secureLogger';

export interface AttentionMetrics {
  focusLevel: number; // 0-1
  readingSpeed: number; // WPM
  scrollVelocity: number; // pixels/second
  dwellTime: number; // ms sur l'élément actuel
  tabSwitches: number;
  windowFocusTime: number; // temps total de focus fenêtre
  idleTime: number; // temps d'inactivité
  multitaskingScore: number; // 0-1, basé sur les changements de focus
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

export class AttentionMonitor extends EventTarget {
  private messageBus: MessageBus | null;
  private isActive: boolean = false;
  private startTime: number = 0;
  
  // Tracking state
  private lastActivity: number = Date.now();
  private windowFocusStart: number = Date.now();
  private totalFocusTime: number = 0;
  private tabSwitchCount: number = 0;
  private scrollStartTime: number = 0;
  private scrollDistance: number = 0;
  private lastScrollPosition: number = 0;
  private currentElement: Element | null = null;
  private elementDwellStart: number = 0;
  
  // Metrics computation
  private focusHistory: number[] = [];
  private attentionScore: number = 0.5;
  private idleThreshold: number = 30000; // 30 seconds
  private deepFocusThreshold: number = 120000; // 2 minutes
  private isIdle: boolean = false;
  private isDeepFocus: boolean = false;
  
  // Reading analysis
  private textAnalysisBuffer: Array<{text: string, timestamp: number, position: number}> = [];
  private averageReadingSpeed: number = 200; // WPM initial estimate
  private readingSpeedHistory: number[] = [];

  constructor(messageBus?: MessageBus) {
    super();
    this.messageBus = messageBus || null;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Window focus/blur events
    window.addEventListener('focus', this.handleWindowFocus.bind(this));
    window.addEventListener('blur', this.handleWindowBlur.bind(this));
    
    // Page visibility API
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // User activity tracking
    document.addEventListener('mousemove', this.handleActivity.bind(this), { passive: true });
    document.addEventListener('keydown', this.handleActivity.bind(this), { passive: true });
    document.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
    document.addEventListener('click', this.handleActivity.bind(this), { passive: true });
    
    // Reading flow detection
    document.addEventListener('selectionchange', this.handleSelection.bind(this));
    
    // Element focus tracking
    this.setupIntersectionObserver();
    
    // Periodic analysis
    setInterval(() => this.analyzeAttention(), 5000); // Every 5 seconds
    setInterval(() => this.checkIdle(), 1000); // Every second
  }

  private setupIntersectionObserver(): void {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.trackElementFocus(entry.target);
        }
      });
    }, {
      threshold: [0.5], // Element is at least 50% visible
      rootMargin: '0px 0px -50% 0px' // Focus on upper half of viewport
    });

    // Observe text elements
    const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, article, section');
    textElements.forEach(element => observer.observe(element));
  }

  private trackElementFocus(element: Element): void {
    if (this.currentElement !== element) {
      // Calculate dwell time on previous element
      if (this.currentElement && this.elementDwellStart > 0) {
        const dwellTime = Date.now() - this.elementDwellStart;
        this.analyzeElementDwell(this.currentElement, dwellTime);
      }
      
      this.currentElement = element;
      this.elementDwellStart = Date.now();
      
      // Analyze reading content
      this.analyzeReadingContent(element);
    }
  }

  private analyzeElementDwell(element: Element, dwellTime: number): void {
    const text = element.textContent || '';
    const wordCount = text.split(/\s+/).length;
    
    if (wordCount > 10 && dwellTime > 1000) { // Meaningful text and time
      const readingSpeed = (wordCount / (dwellTime / 60000)); // WPM
      this.readingSpeedHistory.push(readingSpeed);
      
      if (this.readingSpeedHistory.length > 10) {
        this.readingSpeedHistory = this.readingSpeedHistory.slice(-10);
      }
      
      this.averageReadingSpeed = this.readingSpeedHistory.reduce((a, b) => a + b, 0) / this.readingSpeedHistory.length;
    }
  }

  private analyzeReadingContent(element: Element): void {
    const text = element.textContent || '';
    const position = element.getBoundingClientRect().top + window.scrollY;
    
    this.textAnalysisBuffer.push({
      text: text.slice(0, 100), // First 100 chars for analysis
      timestamp: Date.now(),
      position
    });
    
    // Keep buffer reasonable size
    if (this.textAnalysisBuffer.length > 20) {
      this.textAnalysisBuffer = this.textAnalysisBuffer.slice(-20);
    }
  }

  private handleWindowFocus(): void {
    this.windowFocusStart = Date.now();
    this.lastActivity = Date.now();
    
    this.emitAttentionEvent({
      type: 'focus_change',
      timestamp: Date.now(),
      metrics: { focusLevel: 1 },
      context: this.getCurrentContext()
    });
  }

  private handleWindowBlur(): void {
    const focusSession = Date.now() - this.windowFocusStart;
    this.totalFocusTime += focusSession;
    this.tabSwitchCount++;
    
    this.emitAttentionEvent({
      type: 'focus_change',
      timestamp: Date.now(),
      metrics: { 
        focusLevel: 0,
        windowFocusTime: this.totalFocusTime,
        tabSwitches: this.tabSwitchCount
      },
      context: this.getCurrentContext()
    });
  }

  private handleVisibilityChange(): void {
    const isVisible = !document.hidden;
    
    this.emitAttentionEvent({
      type: 'visibility_change',
      timestamp: Date.now(),
      metrics: { 
        focusLevel: isVisible ? 1 : 0 
      },
      context: this.getCurrentContext()
    });
    
    if (isVisible) {
      this.handleActivity();
    }
  }

  private handleActivity(): void {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivity;
    
    // End idle state
    if (this.isIdle) {
      this.isIdle = false;
      this.emitAttentionEvent({
        type: 'idle_end',
        timestamp: now,
        metrics: { 
          idleTime: timeSinceLastActivity,
          focusLevel: 0.7
        },
        context: this.getCurrentContext()
      });
    }
    
    this.lastActivity = now;
    
    // Update focus level based on activity frequency
    this.updateFocusLevel(timeSinceLastActivity);
  }

  private handleScroll(): void {
    const currentScroll = window.scrollY;
    const scrollDelta = Math.abs(currentScroll - this.lastScrollPosition);
    const now = Date.now();
    
    if (this.scrollStartTime === 0) {
      this.scrollStartTime = now;
    }
    
    this.scrollDistance += scrollDelta;
    this.lastScrollPosition = currentScroll;
    
    // Calculate scroll velocity
    const scrollTime = now - this.scrollStartTime;
    // @ts-expect-error Vélocité réservée pour usage futur
    const scrollVelocity = this.scrollDistance / (scrollTime / 1000); // pixels/second
    
    // Reset scroll tracking after pause
    if (scrollTime > 500) {
      this.scrollStartTime = now;
      this.scrollDistance = scrollDelta;
    }
    
    this.handleActivity();
  }

  private handleSelection(): void {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 10) {
      const selectedText = selection.toString();
      const wordCount = selectedText.split(/\s+/).length;
      
      this.emitAttentionEvent({
        type: 'reading_flow',
        timestamp: Date.now(),
        metrics: {
          readingSpeed: wordCount, // Simple metric
          focusLevel: 0.8
        },
        context: this.getCurrentContext()
      });
    }
  }

  private updateFocusLevel(timeSinceLastActivity: number): void {
    // Focus level decreases with inactivity
    let newFocusLevel = 1.0;
    
    if (timeSinceLastActivity > 5000) { // 5 seconds
      newFocusLevel = Math.max(0.3, 1.0 - (timeSinceLastActivity / 30000)); // Decrease over 30s
    }
    
    this.focusHistory.push(newFocusLevel);
    if (this.focusHistory.length > 20) {
      this.focusHistory = this.focusHistory.slice(-20);
    }
    
    this.attentionScore = this.focusHistory.reduce((a, b) => a + b, 0) / this.focusHistory.length;
  }

  private checkIdle(): void {
    const now = Date.now();
    const timeSinceActivity = now - this.lastActivity;
    
    if (!this.isIdle && timeSinceActivity > this.idleThreshold) {
      this.isIdle = true;
      this.emitAttentionEvent({
        type: 'idle_start',
        timestamp: now,
        metrics: { 
          idleTime: timeSinceActivity,
          focusLevel: 0.1
        },
        context: this.getCurrentContext()
      });
    }
    
    // Check for deep focus
    const focusSession = now - this.windowFocusStart;
    if (!this.isDeepFocus && !this.isIdle && focusSession > this.deepFocusThreshold && this.attentionScore > 0.7) {
      this.isDeepFocus = true;
      this.emitAttentionEvent({
        type: 'deep_focus',
        timestamp: now,
        metrics: {
          focusLevel: 0.9,
          windowFocusTime: focusSession,
          engagementPattern: 'deep'
        },
        context: this.getCurrentContext()
      });
    }
  }

  private analyzeAttention(): void {
    if (!this.isActive) return;
    
    const now = Date.now();
    const metrics = this.calculateMetrics();
    
    // Determine engagement pattern
    const pattern = this.determineEngagementPattern(metrics);
    metrics.engagementPattern = pattern;
    
    // Emit periodic attention analysis
    this.emitAttentionEvent({
      type: pattern === 'distracted' ? 'distraction' : 'focus_change',
      timestamp: now,
      metrics,
      context: this.getCurrentContext()
    });
  }

  private calculateMetrics(): AttentionMetrics {
    const now = Date.now();
    const sessionTime = now - this.startTime;
    const currentFocusSession = now - this.windowFocusStart;
    const timeSinceActivity = now - this.lastActivity;
    
    // Calculate scroll velocity
    const scrollVelocity = this.scrollDistance / Math.max(1, (now - this.scrollStartTime) / 1000);
    
    // Calculate multitasking score
    const multitaskingScore = Math.max(0, 1 - (this.tabSwitchCount / Math.max(1, sessionTime / 60000)));
    
    return {
      focusLevel: this.attentionScore,
      readingSpeed: this.averageReadingSpeed,
      scrollVelocity: scrollVelocity || 0,
      dwellTime: this.currentElement ? now - this.elementDwellStart : 0,
      tabSwitches: this.tabSwitchCount,
      windowFocusTime: this.totalFocusTime + currentFocusSession,
      idleTime: timeSinceActivity,
      multitaskingScore,
      engagementPattern: 'focused' // Will be overridden
    };
  }

  private determineEngagementPattern(metrics: AttentionMetrics): AttentionMetrics['engagementPattern'] {
    if (metrics.idleTime > this.idleThreshold) {
      return 'idle';
    }
    
    if (metrics.focusLevel < 0.3 || metrics.tabSwitches > 5) {
      return 'distracted';
    }
    
    if (metrics.scrollVelocity > 1000 && metrics.dwellTime < 2000) {
      return 'scanning';
    }
    
    if (metrics.focusLevel > 0.8 && metrics.windowFocusTime > this.deepFocusThreshold) {
      return 'deep';
    }
    
    return 'focused';
  }

  private getCurrentContext(): AttentionEvent['context'] {
    const visibleText = this.getVisibleText();
    
    const info = {
      url: window.location.href,
      title: document.title,
      visibleText: visibleText,
      scrollPosition: window.scrollY
    } as { url: string; title: string; visibleText: string; scrollPosition: number; elementInFocus?: string; };
    
    const activeElement = document.activeElement;
    if (activeElement) {
      info.elementInFocus = (activeElement.tagName || 'unknown').toLowerCase();
      if (activeElement.id) {
        info.elementInFocus += `#${activeElement.id}`;
      } else {
        const classes = safeGetClasses(activeElement);
        if (classes.length > 0) {
          info.elementInFocus += `.${classes.slice(0, 2).join('.')}`;
        }
      }
    }
    
    return info;
  }

  private getVisibleText(): string {
    const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
    let visibleText = '';
    
    for (const element of Array.from(textElements)) {
      const rect = element.getBoundingClientRect();
      if (rect.top >= 0 && rect.top <= window.innerHeight) {
        visibleText += element.textContent + ' ';
        if (visibleText.length > 500) break; // Limit
      }
    }
    
    return visibleText.trim();
  }

  // @ts-expect-error Méthode réservée pour usage futur
  private getElementSelector(element: Element): string {
    // Generate unique selector for element
    const classes = safeGetClasses(element);
    return (element.tagName || 'unknown').toLowerCase() + 
           (element.id ? '#' + element.id : '') +
           (classes.length > 0 ? '.' + classes.join('.') : '');
  }

  private emitAttentionEvent(event: AttentionEvent): void {
    this.dispatchEvent(new CustomEvent('attention', { detail: event }));
    
    // Send to background if message bus available
    if (this.messageBus) {
      this.messageBus.sendToBackground({
        type: 'ATTENTION_EVENT',
        payload: event
      });
    }
  }

  // Public API
  public start(): void {
    this.isActive = true;
    this.startTime = Date.now();
    this.windowFocusStart = Date.now();
    this.lastActivity = Date.now();
    SecureLogger.info('👁️ AttentionMonitor started');
  }

  public stop(): void {
    this.isActive = false;
    SecureLogger.info('👁️ AttentionMonitor stopped');
  }

  public getMetrics(): AttentionMetrics {
    return this.calculateMetrics();
  }

  public on(event: string, handler: (event: any) => void): void {
    this.addEventListener(event, (e: any) => handler(e.detail));
  }

  public getStats(): any {
    return {
      isActive: this.isActive,
      attentionScore: this.attentionScore,
      totalFocusTime: this.totalFocusTime,
      tabSwitches: this.tabSwitchCount,
      averageReadingSpeed: this.averageReadingSpeed,
      isIdle: this.isIdle,
      isDeepFocus: this.isDeepFocus
    };
  }
}
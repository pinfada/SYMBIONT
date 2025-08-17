// Tracking avancé du scroll pour l'analyse comportementale SYMBIONT
import { MessageBus } from '../../core/messaging/MessageBus';
import { safeAverage } from '../../shared/utils/safeOperations';
import { logger } from '@shared/utils/secureLogger';

export interface ScrollMetrics {
  totalDistance: number; // pixels totaux scrollés
  maxDepth: number; // profondeur maximale atteinte
  currentDepth: number; // position actuelle
  pageHeight: number; // hauteur totale de la page
  scrollVelocity: number; // vitesse de scroll moyenne
  pauseCount: number; // nombre de pauses
  backtrackCount: number; // nombre de retours en arrière
  readingTime: number; // temps estimé de lecture
  engagementScore: number; // 0-1 score d'engagement
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

export class ScrollTracker extends EventTarget {
  private messageBus: MessageBus | null;
  private isActive: boolean = false;
  private startTime: number = 0;
  
  // Scroll tracking state
  private lastScrollPosition: number = 0;
  private lastScrollTime: number = 0;
  private scrollHistory: Array<{position: number, timestamp: number, velocity: number}> = [];
  // @ts-expect-error Sessions réservées pour usage futur
  private scrollSessions: Array<{start: number, end: number, distance: number}> = [];
  
  // Metrics tracking
  private totalScrollDistance: number = 0;
  private maxScrollDepth: number = 0;
  private pauseStartTime: number = 0;
  private pauseCount: number = 0;
  private backtrackCount: number = 0;
  private isScrolling: boolean = false;
  private isPaused: boolean = false;
  private pauseThreshold: number = 1000; // 1 second
  private velocityHistory: number[] = [];
  private lastDirection: 'up' | 'down' = 'down';
  
  // Reading analysis
  private readingSegments: Array<{start: number, end: number, duration: number}> = [];
  private averageReadingSpeed: number = 200; // WPM estimate
  private currentReadingStart: number = 0;
  
  // Page analysis
  private pageAnalysis: {
    height: number;
    textDensity: number;
    imageCount: number;
    linkCount: number;
    contentSections: Array<{start: number, end: number, type: string}>;
  } | null = null;

  constructor(messageBus?: MessageBus) {
    super();
    this.messageBus = messageBus || null;
    this.setupEventListeners();
    this.analyzePage();
  }

  private setupEventListeners(): void {
    // Scroll event with throttling
    let scrollTimeout: number;
    window.addEventListener('scroll', () => {
      if (!this.isActive) return;
      
      this.handleScroll();
      
      // Detect scroll pause
      clearTimeout(scrollTimeout);
      scrollTimeout = window.setTimeout(() => {
        this.handleScrollPause();
      }, this.pauseThreshold);
    }, { passive: true });
    
    // Page load and resize
    window.addEventListener('load', () => this.analyzePage());
    window.addEventListener('resize', () => this.analyzePage());
  }

  private analyzePage(): void {
    const bodyHeight = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );
    
    // Analyze content density
    const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, article, section');
    const totalTextLength = Array.from(textElements).reduce((sum, el) => sum + (el.textContent?.length || 0), 0);
    const textDensity = totalTextLength / bodyHeight; // chars per pixel
    
    const imageCount = document.querySelectorAll('img').length;
    const linkCount = document.querySelectorAll('a').length;
    
    // Analyze content sections
    const contentSections = this.analyzeContentSections();
    
    this.pageAnalysis = {
      height: bodyHeight,
      textDensity,
      imageCount,
      linkCount,
      contentSections
    };
  }

  private analyzeContentSections(): Array<{start: number, end: number, type: string}> {
    const sections: Array<{start: number, end: number, type: string}> = [];
    
    // Find main content sections
    const mainElements = document.querySelectorAll('article, main, section, .content, .post, .article');
    
    for (const element of Array.from(mainElements)) {
      const rect = element.getBoundingClientRect();
      const start = rect.top + window.scrollY;
      const end = start + rect.height;
      
      // Determine section type based on content
      const text = element.textContent || '';
      const images = element.querySelectorAll('img').length;
      const links = element.querySelectorAll('a').length;
      
      let type = 'text';
      if (images > text.length / 500) type = 'media';
      else if (links > text.length / 200) type = 'navigation';
      else if (text.length > 1000) type = 'article';
      
      sections.push({ start, end, type });
    }
    
    return sections.sort((a, b) => a.start - b.start);
  }

  private handleScroll(): void {
    const currentPosition = window.scrollY;
    const currentTime = Date.now();
    
    if (!this.isScrolling) {
      this.handleScrollStart(currentPosition, currentTime);
    }
    
    // Calculate velocity
    const timeDelta = currentTime - this.lastScrollTime;
    const positionDelta = Math.abs(currentPosition - this.lastScrollPosition);
    const velocity = timeDelta > 0 ? positionDelta / timeDelta : 0; // pixels/ms
    
    // Determine direction
    const direction: 'up' | 'down' = currentPosition > this.lastScrollPosition ? 'down' : 'up';
    
    // Detect backtracking
    if (direction !== this.lastDirection && positionDelta > 100) {
      this.backtrackCount++;
      this.emitScrollEvent({
        type: 'backtrack',
        timestamp: currentTime,
        position: currentPosition,
        velocity: velocity * 1000, // convert to pixels/second
        direction,
        metrics: this.calculateMetrics()
      });
    }
    
    // Detect jumps (large position changes)
    if (positionDelta > window.innerHeight && timeDelta < 100) {
      this.emitScrollEvent({
        type: 'jump',
        timestamp: currentTime,
        position: currentPosition,
        velocity: velocity * 1000,
        direction,
        metrics: this.calculateMetrics()
      });
    }
    
    // Update tracking data
    this.updateScrollData(currentPosition, currentTime, velocity, direction);
    
    // Check for deep scroll milestone
    const scrollPercentage = this.getScrollPercentage();
    if (scrollPercentage > 0.8 && this.maxScrollDepth < 0.8) {
      this.emitScrollEvent({
        type: 'deep_scroll',
        timestamp: currentTime,
        position: currentPosition,
        velocity: velocity * 1000,
        direction,
        metrics: this.calculateMetrics()
      });
    }
    
    this.lastScrollPosition = currentPosition;
    this.lastScrollTime = currentTime;
    this.lastDirection = direction;
    this.isPaused = false;
  }

  private handleScrollStart(position: number, timestamp: number): void {
    this.isScrolling = true;
    this.currentReadingStart = timestamp;
    
    this.emitScrollEvent({
      type: 'scroll_start',
      timestamp,
      position,
      velocity: 0,
      direction: 'down',
      metrics: this.calculateMetrics()
    });
  }

  private handleScrollPause(): void {
    if (this.isScrolling && !this.isPaused) {
      this.isPaused = true;
      this.pauseCount++;
      this.pauseStartTime = Date.now();
      
      // Analyze reading time during pause
      this.analyzeReadingSegment();
      
      this.emitScrollEvent({
        type: 'scroll_pause',
        timestamp: this.pauseStartTime,
        position: this.lastScrollPosition,
        velocity: 0,
        direction: this.lastDirection,
        metrics: this.calculateMetrics()
      });
    }
  }

  // @ts-expect-error Méthode réservée pour usage futur
  private handleScrollResume(): void {
    this.isPaused = false;
    this.emitScrollEvent({
      type: 'scroll_resume',
      timestamp: Date.now(),
      position: window.scrollY,
      velocity: 0,
      direction: 'down',
      metrics: this.calculateMetrics()
    });
  }

  // @ts-expect-error Méthode réservée pour usage futur
  private updateScrollData(position: number, timestamp: number, velocity: number, direction: 'up' | 'down'): void {
    // Update total distance
    const distance = Math.abs(position - this.lastScrollPosition);
    this.totalScrollDistance += distance;
    
    // Update max depth
    const scrollPercentage = this.getScrollPercentage();
    this.maxScrollDepth = Math.max(this.maxScrollDepth, scrollPercentage);
    
    // Store scroll data point
    this.scrollHistory.push({
      position,
      timestamp,
      velocity: velocity * 1000 // convert to pixels/second
    });
    
    // Keep history manageable
    if (this.scrollHistory.length > 100) {
      this.scrollHistory = this.scrollHistory.slice(-100);
    }
    
    // Update velocity history
    this.velocityHistory.push(velocity * 1000);
    if (this.velocityHistory.length > 20) {
      this.velocityHistory = this.velocityHistory.slice(-20);
    }
  }

  private analyzeReadingSegment(): void {
    if (this.currentReadingStart > 0) {
      const duration = Date.now() - this.currentReadingStart;
      const startPosition = this.getPositionAtTime(this.currentReadingStart);
      const endPosition = this.lastScrollPosition;
      
      if (duration > 2000 && Math.abs(endPosition - startPosition) < window.innerHeight) {
        // User spent time reading this section
        this.readingSegments.push({
          start: startPosition,
          end: endPosition,
          duration
        });
        
        // Estimate reading speed
        const visibleText = this.getTextInRange(startPosition, endPosition);
        if (visibleText.length > 100) {
          const wordCount = visibleText.split(/\s+/).length;
          const readingSpeed = (wordCount / (duration / 60000)); // WPM
          
          if (readingSpeed > 50 && readingSpeed < 800) { // Reasonable reading speed
            this.averageReadingSpeed = (this.averageReadingSpeed + readingSpeed) / 2;
          }
        }
      }
      
      this.currentReadingStart = 0;
    }
  }

  private getPositionAtTime(timestamp: number): number {
    const dataPoint = this.scrollHistory.find(point => 
      Math.abs(point.timestamp - timestamp) < 1000
    );
    return dataPoint ? dataPoint.position : this.lastScrollPosition;
  }

  private getTextInRange(startY: number, endY: number): string {
    const elements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
    let text = '';
    
    for (const element of Array.from(elements)) {
      const rect = element.getBoundingClientRect();
      const elementY = rect.top + window.scrollY;
      
      if (elementY >= startY && elementY <= endY) {
        text += element.textContent + ' ';
      }
    }
    
    return text.trim();
  }

  private getScrollPercentage(): number {
    if (!this.pageAnalysis) return 0;
    const maxScrollTop = this.pageAnalysis.height - window.innerHeight;
    return maxScrollTop > 0 ? Math.min(1, this.lastScrollPosition / maxScrollTop) : 0;
  }

  private calculateMetrics(): ScrollMetrics {
    const averageVelocity = safeAverage(this.velocityHistory);
    
    const totalReadingTime = this.readingSegments.reduce((sum, segment) => sum + segment.duration, 0);
    
    // Calculate engagement score
    const engagementScore = this.calculateEngagementScore();
    
    // Determine scroll pattern
    const scrollPattern = this.determineScrollPattern();
    
    return {
      totalDistance: this.totalScrollDistance,
      maxDepth: this.maxScrollDepth,
      currentDepth: this.getScrollPercentage(),
      pageHeight: this.pageAnalysis?.height || 0,
      scrollVelocity: averageVelocity,
      pauseCount: this.pauseCount,
      backtrackCount: this.backtrackCount,
      readingTime: totalReadingTime,
      engagementScore,
      scrollPattern
    };
  }

  private calculateEngagementScore(): number {
    let score = 0.5; // Base score
    
    // Positive factors
    if (this.maxScrollDepth > 0.7) score += 0.2; // Deep reading
    if (this.pauseCount > 3) score += 0.1; // Multiple pauses (reading)
    if (this.readingSegments.length > 2) score += 0.15; // Multiple reading segments
    
    // Negative factors
    if (this.backtrackCount > 5) score -= 0.1; // Too much backtracking
    
    // Vérifier que velocityHistory n'est pas vide avant de calculer la moyenne
    const avgVelocity = safeAverage(this.velocityHistory);
    if (avgVelocity > 2000) score -= 0.15; // Too fast scrolling
    
    // Reading time bonus
    const totalTime = Date.now() - this.startTime;
    if (totalTime > 0) {
      const readingRatio = this.readingSegments.reduce((sum, s) => sum + s.duration, 0) / totalTime;
      score += readingRatio * 0.2;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  private determineScrollPattern(): ScrollMetrics['scrollPattern'] {
    // Vérifier que velocityHistory n'est pas vide
    if (this.velocityHistory.length === 0) {
      return 'linear'; // Valeur par défaut si pas assez de données
    }
    
    const avgVelocity = safeAverage(this.velocityHistory);
    
    if (this.readingSegments.length > 2 && avgVelocity < 500) {
      return 'reading';
    }
    
    if (avgVelocity > 2000 && this.pauseCount < 3) {
      return 'scanning';
    }
    
    if (this.backtrackCount > this.pauseCount) {
      return 'searching';
    }
    
    if (this.scrollHistory.length > 10) {
      // Check for linear pattern
      const positions = this.scrollHistory.slice(-10).map(h => h.position);
      const isLinear = this.isLinearProgression(positions);
      if (isLinear) return 'linear';
    }
    
    return 'jumped';
  }

  private isLinearProgression(positions: number[]): boolean {
    if (!positions || positions.length < 3) return false;
    
    let increasingCount = 0;
    for (let i = 1; i < positions.length; i++) {
      if (positions[i] > positions[i-1]) increasingCount++;
    }
    
    return increasingCount / (positions.length - 1) > 0.7; // 70% increasing
  }

  private emitScrollEvent(event: ScrollEvent): void {
    this.dispatchEvent(new CustomEvent('scroll_event', { detail: event }));
    
    // Send to background if message bus available
    if (this.messageBus) {
      this.messageBus.sendToBackground({
        type: 'SCROLL_EVENT',
        payload: event
      });
    }
  }

  // Public API
  public start(): void {
    this.isActive = true;
    this.startTime = Date.now();
    this.lastScrollPosition = window.scrollY;
    this.lastScrollTime = Date.now();
    logger.info('📜 ScrollTracker started');
  }

  public stop(): void {
    this.isActive = false;
    
    if (this.isScrolling) {
      this.emitScrollEvent({
        type: 'scroll_end',
        timestamp: Date.now(),
        position: this.lastScrollPosition,
        velocity: 0,
        direction: this.lastDirection,
        metrics: this.calculateMetrics()
      });
    }
    
    logger.info('📜 ScrollTracker stopped');
  }

  public getMetrics(): ScrollMetrics {
    return this.calculateMetrics();
  }

  public on(event: string, handler: (event: any) => void): void {
    this.addEventListener(event, (e: any) => handler(e.detail));
  }

  public getReadingAnalysis(): any {
    return {
      segments: this.readingSegments,
      averageReadingSpeed: this.averageReadingSpeed,
      totalReadingTime: this.readingSegments.reduce((sum, s) => sum + s.duration, 0),
      readingEfficiency: this.calculateEngagementScore()
    };
  }

  public getScrollPattern(): any {
    return {
      pattern: this.determineScrollPattern(),
      metrics: this.calculateMetrics(),
      history: this.scrollHistory.slice(-20), // Last 20 data points
      pageAnalysis: this.pageAnalysis
    };
  }
}
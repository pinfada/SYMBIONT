import { PerformanceMetrics, VisualMutation } from '../shared/types/organism'
import { OrganismMemoryBank } from './OrganismMemoryBank'
import { logger } from '@/shared/utils/secureLogger';
import { WebGLBridgeManager } from './OffscreenWebGL';

// MV3-Compatible WebGL Orchestrator
// Routes WebGL operations to appropriate rendering contexts

interface RenderRequest {
  id: string;
  type: 'organism' | 'evolution' | 'neural_activity';
  data: any;
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
}

interface RenderTarget {
  type: 'offscreen' | 'popup' | 'content_script';
  available: boolean;
  performance: number; // 0-1 score
}

export class WebGLOrchestrator {
  private renderQueue: RenderRequest[] = []
  private memoryBank: OrganismMemoryBank
  private webglBridge: WebGLBridgeManager
  private renderTargets: Map<string, RenderTarget> = new Map()
  private isInitialized = false
  private performanceMetrics = {
    avgRenderTime: 0,
    successRate: 0,
    queueLength: 0
  }

  constructor(memoryBank: OrganismMemoryBank) {
    this.memoryBank = memoryBank
    this.webglBridge = new WebGLBridgeManager()
    this.initializeRenderTargets()
  }

  async initialize(): Promise<void> {
    try {
      // Initialize WebGL bridge (Offscreen API + fallbacks)
      await this.webglBridge.initialize()
      
      // Setup render target monitoring
      this.monitorRenderTargets()
      
      // Start processing queue
      this.startQueueProcessor()
      
      this.isInitialized = true
      logger.info('WebGL Orchestrator initialized with MV3 compatibility')
      
    } catch (error) {
      logger.error('WebGL Orchestrator initialization failed:', error)
      throw error
    }
  }

  private initializeRenderTargets(): void {
    // Register available render targets
    this.renderTargets.set('offscreen', {
      type: 'offscreen',
      available: false, // Will be detected during init
      performance: 1.0 // Highest performance
    })
    
    this.renderTargets.set('popup', {
      type: 'popup', 
      available: false,
      performance: 0.8
    })
    
    this.renderTargets.set('content_script', {
      type: 'content_script',
      available: false,
      performance: 0.6
    })
  }

  private async monitorRenderTargets(): Promise<void> {
    // Check Offscreen API availability
    const offscreenTarget = this.renderTargets.get('offscreen')!
    if (chrome.offscreen && typeof chrome.offscreen.createDocument === 'function') {
      offscreenTarget.available = true
      logger.info('Offscreen API available for WebGL rendering')
    }
    
    // Monitor popup state
    chrome.action && chrome.action.onClicked && chrome.action.onClicked.addListener(() => {
      const popupTarget = this.renderTargets.get('popup')!
      popupTarget.available = true
    })
    
    // Monitor content script availability
    this.checkContentScriptAvailability()
  }

  private async checkContentScriptAvailability(): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({ active: true })
      const contentTarget = this.renderTargets.get('content_script')!
      contentTarget.available = tabs.length > 0
    } catch (error) {
      logger.warn('Content script availability check failed:', error)
    }
  }

  async updateOrganismVisuals(id: string, mutations: VisualMutation[]): Promise<void> {
    try {
      // Load organism state
      const history = await this.memoryBank.loadOrganismHistory(id)
      const organism = history.states[0]
      if (!organism) return

      // Apply visual mutations
      mutations.forEach(mutation => {
        switch (mutation.type) {
          case 'color':
            organism.visualState = {
              ...organism.visualState,
              color: mutation.value as [number, number, number]
            }
            break
          case 'size':
            organism.visualState = {
              ...organism.visualState,
              scale: mutation.value as number
            }
            break
          case 'shape':
            organism.visualState = {
              ...organism.visualState,
              geometry: mutation.value as string
            }
            break
          case 'animation':
            organism.visualState = {
              ...organism.visualState,
              animation: mutation.value as string
            }
            break
        }
      })

      // Queue render request with priority
      const renderRequest: RenderRequest = {
        id,
        type: 'organism',
        data: { organism, mutations },
        priority: 'medium',
        timestamp: Date.now()
      }
      
      await this.queueRenderRequest(renderRequest)
      
      // Save updated organism state
      await this.memoryBank.saveOrganismHistory(id, history)
    } catch (error) {
      logger.error('Failed to update organism visuals:', error)
    }
  }

  async queueRenderRequest(request: RenderRequest): Promise<void> {
    // Add to queue with priority sorting
    this.renderQueue.push(request)
    this.renderQueue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder]
    })
    
    // Update metrics
    this.performanceMetrics.queueLength = this.renderQueue.length
    
    logger.info(`Queued render request ${request.id} (${request.priority} priority)`)
  }

  private async processRenderQueue(): Promise<void> {
    if (this.renderQueue.length === 0) return
    
    // Get best available render target
    const renderTarget = this.selectBestRenderTarget()
    if (!renderTarget) {
      logger.warn('No render targets available, queuing requests')
      return
    }
    
    // Process up to 3 requests per cycle to avoid blocking
    const requestsToProcess = this.renderQueue.splice(0, 3)
    
    for (const request of requestsToProcess) {
      try {
        const startTime = Date.now()
        
        await this.executeRenderRequest(request, renderTarget)
        
        // Update performance metrics
        const renderTime = Date.now() - startTime
        this.performanceMetrics.avgRenderTime = 
          (this.performanceMetrics.avgRenderTime + renderTime) / 2
        this.performanceMetrics.successRate = 
          (this.performanceMetrics.successRate + 1) / 2
          
        logger.debug(`Rendered ${request.id} in ${renderTime}ms via ${renderTarget.type}`)
        
      } catch (error) {
        logger.error(`Render failed for ${request.id}:`, error)
        this.performanceMetrics.successRate = 
          this.performanceMetrics.successRate * 0.9 // Decay success rate
      }
    }
  }

  private selectBestRenderTarget(): RenderTarget | null {
    // Find available target with highest performance score
    let bestTarget: RenderTarget | null = null
    let bestScore = 0
    
    for (const target of this.renderTargets.values()) {
      if (target.available && target.performance > bestScore) {
        bestTarget = target
        bestScore = target.performance
      }
    }
    
    return bestTarget
  }

  private async executeRenderRequest(request: RenderRequest, target: RenderTarget): Promise<void> {
    switch (target.type) {
      case 'offscreen':
        await this.webglBridge.renderOrganism(request as any)
        break
        
      case 'popup':
        // Send to popup via messaging
        await chrome.runtime.sendMessage({
          type: 'POPUP_RENDER_REQUEST',
          request
        })
        break
        
      case 'content_script':
        // Send to active tab's content script
        const tabs = await chrome.tabs.query({ active: true })
        if (tabs[0]?.id) {
          await chrome.tabs.sendMessage(tabs[0].id, {
            type: 'CONTENT_RENDER_REQUEST', 
            request
          })
        }
        break
    }
  }

  private startQueueProcessor(): void {
    // Process queue every 100ms
    setInterval(() => {
      if (this.isInitialized) {
        this.processRenderQueue()
      }
    }, 100)
    
    logger.info('Render queue processor started')
  }

  async optimizePerformance(metrics: PerformanceMetrics): Promise<void> {
    try {
      // Adaptive performance optimization for MV3 architecture
      if (metrics.fps && metrics.fps < 30) {
        // Reduce render target performance expectations
        this.adjustRenderTargetPerformance(0.8)
        logger.info('Reduced render quality due to low FPS')
      }
      
      if (metrics.memoryUsage && metrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
        // Trigger cleanup across all render targets
        await this.cleanupRenderTargets()
      }
      
      if (metrics.renderTime && metrics.renderTime > 16) { // >16ms per frame
        // Prioritize offscreen rendering over content script
        this.adjustTargetPriorities()
      }
      
      // Update performance metrics
      this.performanceMetrics = {
        ...this.performanceMetrics,
        avgRenderTime: metrics.renderTime || this.performanceMetrics.avgRenderTime
      }
      
      this.logPerformance('Performance optimization executed', metrics)
    } catch (error) {
      logger.error('Performance optimization failed:', error)
    }
  }

  private adjustRenderTargetPerformance(factor: number): void {
    for (const target of this.renderTargets.values()) {
      target.performance *= factor
    }
  }

  private async cleanupRenderTargets(): Promise<void> {
    // Request cleanup from offscreen context
    await chrome.runtime.sendMessage({
      type: 'OFFSCREEN_CLEANUP_REQUEST'
    })
    
    // Request cleanup from popup
    await chrome.runtime.sendMessage({
      type: 'POPUP_CLEANUP_REQUEST'
    })
    
    logger.info('Cleanup requested from all render targets')
  }

  private adjustTargetPriorities(): void {
    // Boost offscreen performance score
    const offscreenTarget = this.renderTargets.get('offscreen')
    if (offscreenTarget) {
      offscreenTarget.performance = Math.min(1.0, offscreenTarget.performance * 1.1)
    }
    
    // Reduce content script priority
    const contentTarget = this.renderTargets.get('content_script')
    if (contentTarget) {
      contentTarget.performance *= 0.9
    }
  }

  // Public API methods
  
  async receiveVisualMutation(id: string, mutation: VisualMutation): Promise<void> {
    await this.updateOrganismVisuals(id, [mutation])
  }

  async requestHighPriorityRender(organismId: string, data: any): Promise<void> {
    const request: RenderRequest = {
      id: organismId,
      type: 'organism',
      data,
      priority: 'high',
      timestamp: Date.now()
    }
    
    await this.queueRenderRequest(request)
  }

  async getPerformanceMetrics(): Promise<typeof this.performanceMetrics> {
    return {
      ...this.performanceMetrics,
      // renderTargetStatus removed to fix type compatibility
      queueLength: this.renderQueue.length
    }
  }

  async activateForTab(tabId: number): Promise<void> {
    // Update content script availability for specific tab
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'WEBGL_ACTIVATION_PING' })
      const contentTarget = this.renderTargets.get('content_script')!
      contentTarget.available = true
      logger.info(`Activated WebGL for tab ${tabId}`)
    } catch (error) {
      logger.warn(`Failed to activate WebGL for tab ${tabId}:`, error)
    }
  }

  async processMutation(organismId: string, mutationData: any): Promise<void> {
    const request: RenderRequest = {
      id: organismId,
      type: 'evolution',
      data: mutationData,
      priority: 'medium',
      timestamp: Date.now()
    }
    
    await this.queueRenderRequest(request)
  }

  // Monitoring and cleanup
  
  logPerformance(msg: string, metrics?: PerformanceMetrics): void {
    if (metrics) {
      logger.info(`[WebGL Orchestrator] ${msg}`, {
        fps: metrics.fps,
        renderTime: metrics.renderTime,
        memoryUsage: metrics.memoryUsage,
        queueLength: this.performanceMetrics.queueLength
      })
    } else {
      logger.info(`[WebGL Orchestrator] ${msg}`)
    }
  }
  
  async dispose(): Promise<void> {
    try {
      // Stop queue processor
      this.isInitialized = false
      
      // Cleanup WebGL bridge
      await this.webglBridge.cleanup()
      
      // Clear render queue
      this.renderQueue = []
      
      // Reset render targets
      this.renderTargets.clear()
      
      logger.info('WebGL Orchestrator disposed successfully')
    } catch (error) {
      logger.error('WebGL Orchestrator disposal failed:', error)
    }
  }

  // Status methods
  
  isReady(): boolean {
    return this.isInitialized && this.renderTargets.size > 0
  }

  getQueueLength(): number {
    return this.renderQueue.length
  }

  getRenderTargetStatus(): Record<string, { available: boolean; performance: number }> {
    const status: Record<string, { available: boolean; performance: number }> = {}
    
    for (const [key, target] of this.renderTargets.entries()) {
      status[key] = {
        available: target.available,
        performance: target.performance
      }
    }
    
    return status
  }
} 
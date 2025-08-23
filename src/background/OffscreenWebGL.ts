// src/background/OffscreenWebGL.ts
// Solution Chrome Offscreen API pour WebGL dans Service Worker MV3

import { logger } from '@/shared/utils/secureLogger';

// Types pour le rendu Offscreen
interface RenderRequest {
  type: string;
  requestId: string;
  data: any;
  options: {
    width: number;
    height: number;
    quality: string;
    effects: string[];
  };
}

interface RenderResponse {
  success: boolean;
  imageData?: ImageData | null;
  error?: string;
  renderTime?: number;
}

export class ServiceWorkerWebGLBridge {
  private offscreenCreated = false;
  private pendingRequests = new Map<string, (response: RenderResponse) => void>();

  async initialize(): Promise<boolean> {
    try {
      // Vérifier support Offscreen API
      if (!chrome.offscreen?.createDocument) {
        logger.warn('Offscreen API not supported, falling back to content script rendering');
        return false;
      }

      // Créer document offscreen pour WebGL
      await chrome.offscreen.createDocument({
        url: chrome.runtime.getURL('offscreen.html'),
        reasons: ['DISPLAY_MEDIA'], // Raison officielle pour rendu
        justification: 'WebGL rendering for organism evolution and neural network visualization'
      });

      this.offscreenCreated = true;
      this.setupMessageHandling();
      
      logger.info('Offscreen WebGL context initialized successfully');
      return true;

    } catch (error) {
      logger.error('Failed to initialize Offscreen WebGL:', error);
      return false;
    }
  }

  private setupMessageHandling(): void {
    // Écouter les réponses du document offscreen
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'OFFSCREEN_WEBGL_RESPONSE' && message.requestId) {
        const callback = this.pendingRequests.get(message.requestId);
        if (callback) {
          callback(message.response);
          this.pendingRequests.delete(message.requestId);
        }
      }
      return false; // Ne pas garder le port ouvert
    });
  }

  async renderOrganism(organismData: any): Promise<ImageData | null> {
    if (!this.offscreenCreated) {
      logger.error('Offscreen context not initialized');
      return null;
    }

    const requestId = `render_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Envoyer requête de rendu au document offscreen
      const renderRequest: RenderRequest = {
        type: 'RENDER_ORGANISM',
        requestId,
        data: organismData,
        options: {
          width: 400,
          height: 300,
          quality: 'high',
          effects: ['bloom', 'particles']
        }
      };

      // Promesse pour attendre la réponse
      const responsePromise = new Promise<RenderResponse>((resolve) => {
        this.pendingRequests.set(requestId, resolve);
      });

      // Envoyer à l'offscreen document
      await chrome.runtime.sendMessage({
        ...renderRequest,
        target: 'offscreen'
      });

      // Attendre la réponse avec timeout
      const response = await Promise.race([
        responsePromise,
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Render timeout')), 5000)
        )
      ]);

      return response?.imageData || null;

    } catch (error) {
      logger.error('Organism rendering failed:', error);
      this.pendingRequests.delete(requestId);
      return null;
    }
  }

  async renderEvolutionSteps(organisms: OrganismData[]): Promise<ImageData[]> {
    const results: ImageData[] = [];
    
    // Rendu par batch pour éviter surcharge
    const batchSize = 5;
    for (let i = 0; i < organisms.length; i += batchSize) {
      const batch = organisms.slice(i, i + batchSize);
      const batchPromises = batch.map(organism => this.renderOrganism(organism));
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(result => result !== null) as ImageData[]);
      
      // Pause courte entre batches pour éviter surcharge
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return results;
  }

  async updateShaders(shaderCode: { vertex: string; fragment: string }): Promise<boolean> {
    if (!this.offscreenCreated) return false;

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_SHADERS',
        target: 'offscreen',
        shaders: shaderCode
      });

      return response?.success || false;
    } catch (error) {
      logger.error('Shader update failed:', error);
      return false;
    }
  }

  async cleanup(): Promise<void> {
    if (this.offscreenCreated) {
      try {
        await chrome.offscreen.closeDocument();
        this.offscreenCreated = false;
        this.pendingRequests.clear();
        logger.info('Offscreen WebGL context cleaned up');
      } catch (error) {
        logger.error('Offscreen cleanup failed:', error);
      }
    }
  }
}

// Fallback vers Content Script si Offscreen API non disponible
export class ContentScriptWebGLFallback {
  async renderOrganism(organismData: any): Promise<ImageData | null> {
    try {
      // Trouver un onglet actif avec notre content script
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      
      if (!activeTab?.id) {
        logger.warn('No active tab found for WebGL rendering');
        return null;
      }

      // Déléguer le rendu au content script
      const response = await chrome.tabs.sendMessage(activeTab.id, {
        type: 'CONTENT_WEBGL_RENDER',
        data: organismData
      });

      return response?.imageData || null;

    } catch (error) {
      logger.error('Content script WebGL fallback failed:', error);
      return null;
    }
  }
}

// Manager unifié avec fallback automatique
export class WebGLBridgeManager {
  private offscreenManager: ServiceWorkerWebGLBridge;
  private fallbackManager: ServiceWorkerWebGLBridge; 
  private useOffscreen = false;

  constructor() {
    this.offscreenManager = new ServiceWorkerWebGLBridge();
    this.fallbackManager = new ServiceWorkerWebGLBridge();
  }

  async initialize(): Promise<void> {
    // Tenter Offscreen API en premier
    this.useOffscreen = await this.offscreenManager.initialize();
    
    if (!this.useOffscreen) {
      logger.info('Using Content Script fallback for WebGL rendering');
    }
  }

  async renderOrganism(organismData: any): Promise<ImageData | null> {
    if (this.useOffscreen) {
      return await this.offscreenManager.renderOrganism(organismData);
    } else {
      return await this.fallbackManager.renderOrganism(organismData);
    }
  }

  async cleanup(): Promise<void> {
    if (this.useOffscreen) {
      await this.offscreenManager.cleanup();
    }
  }
}

export default WebGLBridgeManager;
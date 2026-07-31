// src/background/OffscreenWebGL.ts
// Pont entre le service worker Chrome MV3 et le document offscreen WebGL.
//
// Le rendu lui-même vit dans src/background/offscreen-entry.ts (moteur
// partagé OrganismRenderer). Le transport utilise des data URL PNG :
// chrome.runtime.sendMessage sérialise en JSON et détruirait un ImageData.

import { logger } from '@/shared/utils/secureLogger';
import { SecureRandom } from '@/shared/utils/secureRandom';
import { hasOffscreenAPI } from '@/shared/utils/browser-env';

interface RenderResponse {
  success: boolean;
  dataUrl?: string;
  error?: string;
  renderTime?: number;
}

const RENDER_TIMEOUT_MS = 5000;

export class ServiceWorkerWebGLBridge {
  private offscreenCreated = false;
  private pendingRequests = new Map<string, (response: RenderResponse) => void>();

  async initialize(): Promise<boolean> {
    try {
      if (!hasOffscreenAPI()) {
        logger.warn('Offscreen API not supported, falling back to alternate rendering');
        return false;
      }

      await chrome.offscreen.createDocument({
        url: chrome.runtime.getURL('offscreen.html'),
        reasons: ['DISPLAY_MEDIA'],
        justification: 'WebGL rendering for organism evolution visualization'
      });

      this.offscreenCreated = true;
      this.setupMessageHandling();

      logger.info('Offscreen WebGL context initialized successfully');
      return true;

    } catch (error) {
      // Un document offscreen peut déjà exister (réveil du service worker)
      if (error instanceof Error && error.message.includes('single offscreen')) {
        this.offscreenCreated = true;
        this.setupMessageHandling();
        return true;
      }
      logger.error('Failed to initialize Offscreen WebGL:', error);
      return false;
    }
  }

  private setupMessageHandling(): void {
    chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
      if (message.type === 'OFFSCREEN_WEBGL_RESPONSE' && message.requestId) {
        const callback = this.pendingRequests.get(message.requestId);
        if (callback) {
          callback(message.response);
          this.pendingRequests.delete(message.requestId);
        }
      }
      return false;
    });
  }

  /** Rend l'organisme via le document offscreen. Retourne un data URL PNG. */
  async renderOrganism(organismData: unknown): Promise<string | null> {
    if (!this.offscreenCreated) {
      logger.error('Offscreen context not initialized');
      return null;
    }

    const requestId = `render_${Date.now()}_${SecureRandom.random().toString(36).substr(2, 9)}`;

    try {
      const responsePromise = new Promise<RenderResponse>((resolve) => {
        this.pendingRequests.set(requestId, resolve);
      });

      await chrome.runtime.sendMessage({
        type: 'RENDER_ORGANISM',
        target: 'offscreen',
        requestId,
        data: organismData,
      });

      const response = await Promise.race([
        responsePromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Render timeout')), RENDER_TIMEOUT_MS)
        )
      ]);

      return response.success ? (response.dataUrl ?? null) : null;

    } catch (error) {
      logger.error('Organism rendering failed:', error);
      this.pendingRequests.delete(requestId);
      return null;
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

// Fallback vers le content script de l'onglet actif si aucun contexte
// de rendu background n'est disponible.
export class ContentScriptWebGLFallback {
  async renderOrganism(organismData: unknown): Promise<string | null> {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];

      if (!activeTab?.id) {
        logger.warn('No active tab found for WebGL rendering');
        return null;
      }

      const response = await chrome.tabs.sendMessage(activeTab.id, {
        type: 'CONTENT_WEBGL_RENDER',
        data: organismData
      });

      return response?.dataUrl ?? null;

    } catch (error) {
      logger.error('Content script WebGL fallback failed:', error);
      return null;
    }
  }
}

// Manager unifié : offscreen (Chrome) → fallback content script
export class WebGLBridgeManager {
  private offscreenManager: ServiceWorkerWebGLBridge;
  private fallbackManager: ContentScriptWebGLFallback;
  private useOffscreen = false;

  constructor() {
    this.offscreenManager = new ServiceWorkerWebGLBridge();
    this.fallbackManager = new ContentScriptWebGLFallback();
  }

  async initialize(): Promise<void> {
    this.useOffscreen = await this.offscreenManager.initialize();

    if (!this.useOffscreen) {
      logger.info('Using Content Script fallback for WebGL rendering');
    }
  }

  isUsingOffscreen(): boolean {
    return this.useOffscreen;
  }

  async renderOrganism(organismData: unknown): Promise<string | null> {
    if (this.useOffscreen) {
      return await this.offscreenManager.renderOrganism(organismData);
    }
    return await this.fallbackManager.renderOrganism(organismData);
  }

  async cleanup(): Promise<void> {
    if (this.useOffscreen) {
      await this.offscreenManager.cleanup();
    }
  }
}

export default WebGLBridgeManager;

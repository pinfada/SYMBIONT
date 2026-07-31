/**
 * BackgroundPageWebGL — rendu WebGL in-process pour les backgrounds à DOM.
 *
 * Sur Firefox MV3, le background est une page d'événements : elle possède
 * un DOM complet. On peut donc créer un canvas et rendre l'organisme
 * directement, sans document offscreen ni messagerie — zéro sérialisation,
 * zéro latence de transport, qualité maximale.
 *
 * Sur Chrome MV3 (service worker, pas de DOM), `isSupported()` renvoie
 * false et l'orchestrateur bascule sur le document offscreen.
 */

import { logger } from '@/shared/utils/secureLogger';
import { hasDOM } from '@/shared/utils/browser-env';
import {
  OrganismRenderer,
  OrganismRenderData,
} from '@/shared/rendering/OrganismRenderer';

const RENDER_WIDTH = 400;
const RENDER_HEIGHT = 300;

export class BackgroundPageWebGL {
  private renderer: OrganismRenderer | null = null;
  private canvas: HTMLCanvasElement | null = null;

  static isSupported(): boolean {
    return hasDOM();
  }

  initialize(): boolean {
    if (!BackgroundPageWebGL.isSupported()) return false;
    try {
      this.canvas = document.createElement('canvas');
      this.canvas.width = RENDER_WIDTH;
      this.canvas.height = RENDER_HEIGHT;
      // Canvas hors-écran : jamais attaché au DOM visible
      this.renderer = new OrganismRenderer(this.canvas);
      const ok = this.renderer.initialize();
      if (!ok) {
        this.cleanup();
        return false;
      }
      logger.info(`[BackgroundPageWebGL] In-process renderer ready (${this.renderer.contextType})`);
      return true;
    } catch (error) {
      logger.error('[BackgroundPageWebGL] Initialization failed:', error);
      this.cleanup();
      return false;
    }
  }

  /**
   * Rend l'organisme et retourne le PNG en data URL,
   * directement consommable par le popup (balise <img>).
   */
  renderOrganism(data: OrganismRenderData): string | null {
    if (!this.renderer?.isInitialized()) return null;
    const ok = this.renderer.render(
      { ...data, time: data.time ?? (Date.now() % 1_000_000) / 1000 },
      { width: RENDER_WIDTH, height: RENDER_HEIGHT, renderScale: 2 },
    );
    if (!ok) return null;
    return this.renderer.toDataURL();
  }

  cleanup(): void {
    this.renderer?.dispose();
    this.renderer = null;
    this.canvas = null;
  }
}

/**
 * offscreen-entry — script du document offscreen Chrome (offscreen.html).
 *
 * Compilé par webpack vers offscreen/index.js et chargé en script externe :
 * conforme à la CSP `script-src 'self'` (l'ancien script inline était
 * silencieusement bloqué).
 *
 * Protocole : reçoit RENDER_ORGANISM (target: 'offscreen'), rend via le
 * moteur partagé OrganismRenderer, répond OFFSCREEN_WEBGL_RESPONSE avec un
 * data URL PNG — sérialisable dans les messages runtime, contrairement à
 * ImageData qui ne survit pas à la sérialisation JSON de sendMessage.
 */

import { logger } from '@/shared/utils/secureLogger';
import { OrganismRenderer } from '@/shared/rendering/OrganismRenderer';
import { installOffscreenLLM } from './offscreen-llm';

// Le même document offscreen héberge aussi le moteur LLM (WebGPU) : le modèle y
// reste chargé même popup fermé. Coûte juste un listener tant qu'aucun modèle
// n'est demandé (WebLLM n'est importé qu'au premier chargement).
installOffscreenLLM();

const RENDER_WIDTH = 400;
const RENDER_HEIGHT = 300;

const canvas = document.getElementById('offscreen-canvas') as HTMLCanvasElement | null;
let renderer: OrganismRenderer | null = null;

if (canvas) {
  renderer = new OrganismRenderer(canvas);
  if (!renderer.initialize()) {
    renderer = null;
    logger.error('[Offscreen] WebGL initialization failed');
  }
} else {
  logger.error('[Offscreen] #offscreen-canvas not found');
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.target !== 'offscreen') return false;

  switch (message.type) {
    case 'RENDER_ORGANISM': {
      const started = performance.now();
      let dataUrl: string | null = null;

      if (renderer?.isInitialized()) {
        const ok = renderer.render(
          { ...message.data, time: (Date.now() % 1_000_000) / 1000 },
          { width: RENDER_WIDTH, height: RENDER_HEIGHT, renderScale: 2 },
        );
        if (ok) dataUrl = renderer.toDataURL();
      }

      chrome.runtime.sendMessage({
        type: 'OFFSCREEN_WEBGL_RESPONSE',
        requestId: message.requestId,
        response: dataUrl
          ? { success: true, dataUrl, renderTime: performance.now() - started }
          : { success: false, error: 'Offscreen render failed' },
      }).catch(() => { /* service worker endormi : réponse perdue, le bridge timeout */ });
      break;
    }

    case 'OFFSCREEN_PING':
      chrome.runtime.sendMessage({
        type: 'OFFSCREEN_WEBGL_RESPONSE',
        requestId: message.requestId,
        response: { success: renderer !== null },
      }).catch(() => { /* idem */ });
      break;
  }

  return false;
});

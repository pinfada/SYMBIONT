/**
 * fp-detector — Détecteur de fingerprinting exécuté dans le MONDE PRINCIPAL
 * (world: MAIN) de la page, pour observer les APIs réellement appelées par
 * les scripts du site (canvas, audio, WebGL). Il ne PEUT PAS être un content
 * script isolé : ces APIs vivent dans le contexte de la page.
 *
 * Contraintes strictes :
 * - AUCUN import (pas d'accès chrome.* ici) : script autonome.
 * - Ne bloque jamais la page ; en cas d'erreur, on restaure/ignore.
 * - Ne transmet rien : il poste seulement un window.postMessage local que le
 *   content script isolé récupère. Aucune donnée de canvas/audio n'est lue,
 *   seul le FAIT qu'une API d'identification a été appelée est signalé.
 */
(() => {
  const SIGNAL = 'symbiont-fp';
  const seen = new Set<string>();

  function report(kind: string, extra?: Record<string, unknown>): void {
    if (seen.has(kind)) return; // une fois par type et par page suffit
    seen.add(kind);
    try {
      window.postMessage({ __symbiont: SIGNAL, kind, ...extra }, window.location.origin || '*');
    } catch {
      /* ignore */
    }
  }

  // --- Canvas : toDataURL / getImageData (lecture d'empreinte) ---
  try {
    const proto = HTMLCanvasElement.prototype as any;
    const origToDataURL = proto.toDataURL;
    if (typeof origToDataURL === 'function') {
      proto.toDataURL = function (this: HTMLCanvasElement, ...args: unknown[]) {
        const small = (this.width || 0) <= 300 && (this.height || 0) <= 300;
        report('canvasRead', { canvasSmall: small });
        return origToDataURL.apply(this, args as []);
      };
    }
    const ctxProto = (window as any).CanvasRenderingContext2D?.prototype;
    if (ctxProto && typeof ctxProto.getImageData === 'function') {
      const origGetImageData = ctxProto.getImageData;
      ctxProto.getImageData = function (this: CanvasRenderingContext2D, ...args: unknown[]) {
        const canvas = this.canvas;
        const small = canvas ? (canvas.width <= 300 && canvas.height <= 300) : true;
        report('canvasRead', { canvasSmall: small });
        return origGetImageData.apply(this, args as []);
      };
    }
  } catch { /* ignore */ }

  // --- WebGL : sonde du renderer/vendor (UNMASKED_*) ---
  try {
    const patchWebGL = (protoName: string) => {
      const P = (window as any)[protoName]?.prototype;
      if (!P || typeof P.getParameter !== 'function') return;
      const orig = P.getParameter;
      P.getParameter = function (this: WebGLRenderingContext, param: number) {
        // 37445 = UNMASKED_VENDOR_WEBGL, 37446 = UNMASKED_RENDERER_WEBGL
        if (param === 37445 || param === 37446) report('webglProbe');
        return orig.call(this, param);
      };
    };
    patchWebGL('WebGLRenderingContext');
    patchWebGL('WebGL2RenderingContext');
  } catch { /* ignore */ }

  // --- Audio : création d'un AnalyserNode + lecture de fréquences ---
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    const OAC = (window as any).OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    const anProto = (window as any).AnalyserNode?.prototype;
    if (anProto && typeof anProto.getFloatFrequencyData === 'function') {
      const orig = anProto.getFloatFrequencyData;
      anProto.getFloatFrequencyData = function (this: AnalyserNode, arr: Float32Array) {
        report('audioFingerprint');
        return orig.call(this, arr);
      };
    }
    // OfflineAudioContext est un marqueur très fort de fingerprinting audio
    if (OAC && !AC) report('audioFingerprint');
    void AC;
  } catch { /* ignore */ }
})();

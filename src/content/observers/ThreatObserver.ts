/**
 * ThreatObserver — Capteur de menaces côté page (monde isolé).
 *
 * Produit des signaux exploitables par le Cortex (DraftModel/OracleModel) :
 * scripts injectés dynamiquement (eval, obfuscation, tiers), iframes cachés,
 * requêtes réseau tierces / gros payloads / beacons. Ces observations sont
 * ce qui manquait pour que la détection de menaces se déclenche réellement.
 *
 * Tout reste local. Aucune donnée n'est transmise hors du navigateur ; on
 * n'envoie au background que des métadonnées structurelles (pas de contenu).
 */
import { logger } from '@shared/utils/secureLogger';

interface ThreatMetadata {
  hasEval?: boolean;
  obfuscationDepth?: number;
  longEncodedString?: boolean;
  hiddenIframe?: boolean;
  isThirdParty?: boolean;
  largePayload?: boolean;
  beacon?: boolean;
  scriptHash?: string;
  detail?: string;
}

export class ThreatObserver {
  private mutationObserver: MutationObserver | null = null;
  private perfObserver: PerformanceObserver | null = null;
  private started = false;
  // Anti-flood : ne pas ré-émettre le même (source|clé) trop souvent
  private lastEmit: Map<string, number> = new Map();
  private readonly EMIT_COOLDOWN = 15000; // 15 s par clé

  start(): void {
    if (this.started) return;
    this.started = true;

    try {
      this.scanExistingIframes();
      this.observeDomInjections();
      this.observeNetwork();
      logger.info('[ThreatObserver] Started');
    } catch (error) {
      logger.warn('[ThreatObserver] Failed to start:', error);
    }
  }

  stop(): void {
    this.mutationObserver?.disconnect();
    this.perfObserver?.disconnect();
    this.started = false;
  }

  // === Détection d'injection de scripts et d'iframes cachés ===

  private observeDomInjections(): void {
    this.mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.tagName === 'SCRIPT') {
            this.analyzeScript(node as HTMLScriptElement);
          } else if (node.tagName === 'IFRAME') {
            this.analyzeIframe(node as HTMLIFrameElement);
          } else {
            // Scripts/iframes imbriqués dans un sous-arbre inséré
            node.querySelectorAll?.('script').forEach((s) => this.analyzeScript(s as HTMLScriptElement));
            node.querySelectorAll?.('iframe').forEach((f) => this.analyzeIframe(f as HTMLIFrameElement));
          }
        }
      }
    });

    this.mutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  private analyzeScript(script: HTMLScriptElement): void {
    // On ne s'intéresse qu'aux scripts injectés APRÈS le chargement initial
    // (le plus courant vecteur d'injection dynamique) — heuristique légère.
    const src = script.src;
    const isThirdParty = this.isThirdPartyUrl(src);
    const meta: ThreatMetadata = {};

    if (src) {
      if (!isThirdParty) return; // script tiers uniquement pour le bruit réseau
      meta.isThirdParty = true;
      meta.detail = this.safeHost(src);
      this.emit('script_injection', `src:${meta.detail}`, meta);
      return;
    }

    // Script inline : analyser le contenu pour eval/obfuscation
    const code = script.textContent || '';
    if (code.length < 24) return;

    const hasEval = /\b(eval|Function|atob|unescape)\s*\(/.test(code);
    const obfuscationDepth = this.estimateObfuscation(code);
    const longEncodedString = /['"][A-Za-z0-9+/=]{1024,}['"]/.test(code) ||
                              /\\x[0-9a-f]{2}(\\x[0-9a-f]{2}){64,}/i.test(code);

    if (hasEval || obfuscationDepth > 1 || longEncodedString) {
      meta.hasEval = hasEval;
      meta.obfuscationDepth = obfuscationDepth;
      meta.longEncodedString = longEncodedString;
      this.emit('script_injection', `inline:${hasEval}:${obfuscationDepth}`, meta);
    }
  }

  private analyzeIframe(iframe: HTMLIFrameElement): void {
    const isThirdParty = this.isThirdPartyUrl(iframe.src);
    if (!this.isHidden(iframe)) return;

    // Un iframe caché ET tiers est un indicateur fort (tracking / clickjacking)
    this.emit('dom_mutation', `hiddeniframe:${this.safeHost(iframe.src)}`, {
      hiddenIframe: true,
      isThirdParty,
      detail: this.safeHost(iframe.src)
    });
  }

  private scanExistingIframes(): void {
    document.querySelectorAll('iframe').forEach((f) => this.analyzeIframe(f as HTMLIFrameElement));
  }

  // === Détection réseau (ressources tierces, gros payloads, beacons) ===

  private observeNetwork(): void {
    if (typeof PerformanceObserver === 'undefined') return;
    this.perfObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const res = entry as PerformanceResourceTiming;
        if (!res.name) continue;
        if (!this.isThirdPartyUrl(res.name)) continue;

        const size = res.transferSize || res.encodedBodySize || 0;
        const isBeacon = res.initiatorType === 'beacon' ||
                         (res.initiatorType === 'img' && size > 0 && size < 200);
        const largePayload = size > 100 * 1024; // > 100 KB vers un tiers

        if (isBeacon) {
          this.emit('network_request', `beacon:${this.safeHost(res.name)}`, {
            beacon: true, isThirdParty: true, detail: this.safeHost(res.name)
          });
        } else if (largePayload) {
          this.emit('network_request', `large:${this.safeHost(res.name)}`, {
            largePayload: true, isThirdParty: true, detail: this.safeHost(res.name)
          });
        } else {
          this.emit('network_request', `thirdparty:${this.safeHost(res.name)}`, {
            isThirdParty: true, detail: this.safeHost(res.name)
          });
        }
      }
    });
    try {
      this.perfObserver.observe({ type: 'resource', buffered: true });
    } catch {
      this.perfObserver.observe({ entryTypes: ['resource'] });
    }
  }

  // === Émission ===

  private emit(source: string, key: string, metadata: ThreatMetadata): void {
    const emitKey = `${source}|${key}`;
    const now = Date.now();
    const last = this.lastEmit.get(emitKey) || 0;
    if (now - last < this.EMIT_COOLDOWN) return;
    this.lastEmit.set(emitKey, now);
    if (this.lastEmit.size > 200) this.lastEmit.clear(); // borne mémoire

    try {
      chrome.runtime.sendMessage({
        type: 'THREAT_SIGNAL',
        payload: {
          source,
          metadata,
          url: window.location.href,
          timestamp: now
        }
      });
    } catch {
      // Contexte étendu invalidé (navigation) — ignorer
    }
  }

  // === Utilitaires ===

  private isThirdPartyUrl(url: string): boolean {
    if (!url) return false;
    try {
      const u = new URL(url, window.location.href);
      if (u.protocol === 'data:' || u.protocol === 'blob:') return false;
      return this.registrableDomain(u.hostname) !== this.registrableDomain(window.location.hostname);
    } catch {
      return false;
    }
  }

  /** Approximation du domaine enregistrable (eTLD+1 heuristique). */
  private registrableDomain(host: string): string {
    const parts = host.split('.');
    if (parts.length <= 2) return host;
    return parts.slice(-2).join('.');
  }

  private isHidden(el: HTMLElement): boolean {
    try {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
        return true;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width <= 1 || rect.height <= 1) return true;
      // Hors écran
      if (rect.bottom < 0 || rect.right < 0 ||
          rect.top > (window.innerHeight || 0) + 2000) return true;
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Heuristique d'obfuscation : combine plusieurs indices (ratio de caractères
   * non alphanumériques, densité d'échappements hex/unicode, identifiants
   * hexadécimaux, très longues lignes). Retourne une « profondeur » 0..5.
   */
  private estimateObfuscation(code: string): number {
    let depth = 0;
    const sample = code.slice(0, 20000);

    const hexEscapes = (sample.match(/\\x[0-9a-f]{2}/gi) || []).length;
    if (hexEscapes > 40) depth++;
    if (hexEscapes > 200) depth++;

    const unicodeEscapes = (sample.match(/\\u[0-9a-f]{4}/gi) || []).length;
    if (unicodeEscapes > 40) depth++;

    // Identifiants hexadécimaux (_0x1a2b) typiques des packers
    if (/_0x[0-9a-f]{4,}/i.test(sample)) depth++;

    // Très faible ratio d'espaces (minifié + concaténé agressivement)
    const nonSpace = sample.replace(/\s/g, '').length;
    if (nonSpace > 2000 && nonSpace / sample.length > 0.98) depth++;

    return Math.min(5, depth);
  }

  private safeHost(url: string): string {
    try {
      return new URL(url, window.location.href).hostname;
    } catch {
      return 'unknown';
    }
  }
}

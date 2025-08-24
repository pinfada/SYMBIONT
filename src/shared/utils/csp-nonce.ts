/**
 * Système de nonce pour CSP - Génération sécurisée des nonces pour les styles inline critiques
 */

import { SecureRandom } from './secureRandom';

class CSPNonceManager {
  private static currentNonce: string | null = null;

  /**
   * Génère un nouveau nonce CSP sécurisé
   */
  static generateNonce(): string {
    this.currentNonce = btoa(
      Array.from(
        { length: 16 }, 
        () => String.fromCharCode(Math.floor(SecureRandom.random() * 256))
      ).join('')
    ).substring(0, 16);
    
    return this.currentNonce;
  }

  /**
   * Récupère le nonce actuel
   */
  static getCurrentNonce(): string | null {
    return this.currentNonce;
  }

  /**
   * Injecte le nonce dans le CSP meta tag
   */
  static updateCSPMeta(nonce: string): void {
    // Rechercher le meta tag CSP existant
    let cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]') as HTMLMetaElement;
    
    if (!cspMeta) {
      // Créer un nouveau meta tag CSP
      cspMeta = document.createElement('meta');
      cspMeta.httpEquiv = 'Content-Security-Policy';
      document.head.appendChild(cspMeta);
    }

    // Mettre à jour la policy avec le nonce
    const basePolicy = `script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; upgrade-insecure-requests; connect-src 'self'`;
    
    cspMeta.content = basePolicy;
  }

  /**
   * Applique un style inline avec nonce sécurisé
   */
  static applyInlineStyle(element: HTMLElement, styles: string): void {
    const nonce = this.getCurrentNonce();
    if (nonce) {
      const styleElement = document.createElement('style');
      styleElement.setAttribute('nonce', nonce);
      styleElement.textContent = `
        [data-style-id="${element.dataset.styleId || 'dynamic'}"] {
          ${styles}
        }
      `;
      document.head.appendChild(styleElement);
      
      // Marquer l'élément pour application du style
      element.dataset.styleId = element.dataset.styleId || `style-${Date.now()}`;
    }
  }
}

export { CSPNonceManager };
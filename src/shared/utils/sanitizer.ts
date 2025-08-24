/**
 * Sanitiseur sécurisé pour prévenir les injections XSS
 * Utilisé pour valider et nettoyer toutes les entrées utilisateur
 */

export class SecuritySanitizer {
  // Regex pour identifier les caractères dangereux
  private static readonly XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload=/gi,
    /onerror=/gi,
    /onclick=/gi,
    /onmouseover=/gi,
    /onfocus=/gi,
    /onblur=/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi
  ];

  // Caractères autorisés pour l'ADN (base64 safe + quelques caractères spéciaux)
  private static readonly DNA_SAFE_CHARS = /^[A-Za-z0-9\-_=+\/]*$/;
  
  // Caractères autorisés pour les identifiants
  private static readonly ID_SAFE_CHARS = /^[A-Za-z0-9\-_]*$/;

  /**
   * Sanitise une chaîne ADN pour affichage sécurisé
   */
  static sanitizeDNA(dnaString: string): string {
    if (!dnaString || typeof dnaString !== 'string') {
      return 'INVALID_DNA';
    }

    // Limiter la longueur
    const truncated = dnaString.substring(0, 64);
    
    // Vérifier les caractères autorisés
    if (!this.DNA_SAFE_CHARS.test(truncated)) {
      return 'UNSAFE_DNA';
    }

    return truncated;
  }

  /**
   * Sanitise un identifiant pour affichage sécurisé
   */
  static sanitizeId(id: string): string {
    if (!id || typeof id !== 'string') {
      return 'INVALID_ID';
    }

    const truncated = id.substring(0, 32);
    
    if (!this.ID_SAFE_CHARS.test(truncated)) {
      return 'UNSAFE_ID';
    }

    return truncated;
  }

  /**
   * Sanitise tout contenu HTML pour prévenir XSS
   */
  static sanitizeHTML(content: string): string {
    if (!content || typeof content !== 'string') {
      return '';
    }

    let sanitized = content;
    
    // Supprimer les patterns XSS connus
    for (const pattern of this.XSS_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }

    // Encoder les caractères HTML dangereux
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    return sanitized;
  }

  /**
   * Valide qu'une URL est sûre (pas de javascript:, data:, etc.)
   */
  static sanitizeURL(url: string): string | null {
    if (!url || typeof url !== 'string') {
      return null;
    }

    // Whitelist des protocoles autorisés
    const allowedProtocols = ['https:', 'http:', 'chrome-extension:'];
    
    try {
      const parsedUrl = new URL(url);
      
      if (!allowedProtocols.includes(parsedUrl.protocol)) {
        return null;
      }
      
      return parsedUrl.href;
    } catch {
      return null;
    }
  }

  /**
   * Sanitise les données numériques
   */
  static sanitizeNumber(value: unknown, min: number = 0, max: number = 100): number {
    const num = Number(value);
    
    if (isNaN(num) || !isFinite(num)) {
      return min;
    }
    
    return Math.max(min, Math.min(max, num));
  }

  /**
   * Valide et sanitise un objet de traits
   */
  static sanitizeTraits(traits: Record<string, unknown>): Record<string, number> {
    const sanitized: Record<string, number> = {};
    const allowedTraits = ['curiosity', 'focus', 'rhythm', 'empathy', 'creativity', 'resilience', 'adaptability', 'memory', 'intuition'];
    
    for (const trait of allowedTraits) {
      if (trait in traits) {
        sanitized[trait] = this.sanitizeNumber(traits[trait], 0, 1);
      } else {
        sanitized[trait] = 0.5; // Valeur par défaut
      }
    }
    
    return sanitized;
  }
}
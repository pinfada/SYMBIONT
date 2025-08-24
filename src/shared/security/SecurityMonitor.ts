/**
 * Système de monitoring de sécurité pour détecter et prévenir les attaques
 */

export interface SecurityEvent {
  type: 'XSS_ATTEMPT' | 'PERMISSION_ABUSE' | 'INVALID_MESSAGE' | 'REPLAY_ATTACK' | 'DATA_BREACH';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: number;
  details: Record<string, unknown>;
  source: string;
}

export class SecurityMonitor {
  private static events: SecurityEvent[] = [];
  private static readonly MAX_EVENTS = 1000;
  private static readonly ALERT_THRESHOLDS: Partial<Record<SecurityEvent['type'], number>> = {
    XSS_ATTEMPT: 3,
    INVALID_MESSAGE: 10,
    REPLAY_ATTACK: 1,
    DATA_BREACH: 1,
    PERMISSION_ABUSE: 5
  };

  /**
   * Enregistre un événement de sécurité
   */
  static logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: Date.now()
    };

    this.events.push(securityEvent);

    // Limiter le nombre d'événements en mémoire
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }

    // Vérifier les seuils d'alerte
    this.checkAlertThresholds(event.type);

    // Log selon la gravité
    if (event.severity === 'CRITICAL') {
      console.error('🚨 CRITICAL SECURITY EVENT:', securityEvent);
      this.triggerEmergencyResponse(securityEvent);
    } else if (event.severity === 'HIGH') {
      console.warn('⚠️ HIGH SECURITY EVENT:', securityEvent);
    }
  }

  /**
   * Vérifie les seuils d'alerte et déclenche des actions
   */
  private static checkAlertThresholds(eventType: SecurityEvent['type']): void {
    const threshold = this.ALERT_THRESHOLDS[eventType];
    if (!threshold) return;

    const recentEvents = this.events.filter(e => 
      e.type === eventType && 
      Date.now() - e.timestamp < 300000 // 5 minutes
    );

    if (recentEvents.length >= threshold) {
      this.logSecurityEvent({
        type: eventType,
        severity: 'CRITICAL',
        source: 'SecurityMonitor',
        details: {
          message: `Threshold exceeded for ${eventType}`,
          count: recentEvents.length,
          threshold
        }
      });
    }
  }

  /**
   * Réponse d'urgence pour les événements critiques
   */
  private static triggerEmergencyResponse(event: SecurityEvent): void {
    try {
      // Désactiver les fonctionnalités sensibles
      localStorage.setItem('symbiont_security_lockdown', JSON.stringify({
        timestamp: Date.now(),
        reason: event.type,
        details: event.details
      }));

      // Notifier l'utilisateur si possible
      if (typeof chrome !== 'undefined' && chrome.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'assets/icons/icon48.png',
          title: 'SYMBIONT - Incident de Sécurité',
          message: 'Une tentative d\'attaque a été détectée. L\'extension a été verrouillée.'
        });
      }

    } catch (error) {
      console.error('Emergency response failed:', error);
    }
  }

  /**
   * Vérifie si l'extension est en mode verrouillage
   */
  static isInLockdown(): boolean {
    try {
      const lockdown = localStorage.getItem('symbiont_security_lockdown');
      if (!lockdown) return false;

      const data = JSON.parse(lockdown);
      const age = Date.now() - data.timestamp;
      
      // Verrouillage automatique de 1 heure
      return age < 3600000;
    } catch {
      return false;
    }
  }

  /**
   * Déverrouille l'extension (admin uniquement)
   */
  static unlock(adminCode: string): boolean {
    // Code simple pour démo - en prod, utiliser un hash sécurisé
    const validCode = 'SYMBIONT_ADMIN_2024';
    
    if (adminCode === validCode) {
      localStorage.removeItem('symbiont_security_lockdown');
      this.logSecurityEvent({
        type: 'DATA_BREACH', // Réutilisation du type pour le log
        severity: 'MEDIUM',
        source: 'SecurityMonitor',
        details: { action: 'manual_unlock' }
      });
      return true;
    }

    this.logSecurityEvent({
      type: 'DATA_BREACH',
      severity: 'HIGH',
      source: 'SecurityMonitor',
      details: { action: 'unlock_attempt_failed' }
    });
    
    return false;
  }

  /**
   * Retourne les événements de sécurité récents
   */
  static getRecentEvents(limit: number = 50): SecurityEvent[] {
    return this.events
      .slice(-limit)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Statistiques de sécurité
   */
  static getSecurityStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    
    for (const event of this.events) {
      stats[event.type] = (stats[event.type] || 0) + 1;
    }
    
    return stats;
  }

  /**
   * Validation d'URL pour prévenir les attaques par redirection
   */
  static validateURL(url: string): boolean {
    try {
      new URL(url); // Validation basique de l'URL
      
      // Blacklist des schémas dangereux
      const blockedSchemes = ['javascript:', 'data:', 'vbscript:', 'file:'];
      
      if (blockedSchemes.some(scheme => url.toLowerCase().startsWith(scheme))) {
        this.logSecurityEvent({
          type: 'XSS_ATTEMPT',
          severity: 'HIGH',
          source: 'URL_VALIDATOR',
          details: { url, reason: 'blocked_scheme' }
        });
        return false;
      }
      
      return true;
      
    } catch {
      this.logSecurityEvent({
        type: 'XSS_ATTEMPT',
        severity: 'MEDIUM',
        source: 'URL_VALIDATOR',
        details: { url, reason: 'invalid_url' }
      });
      return false;
    }
  }

  /**
   * Initialise le monitoring de sécurité
   */
  static initialize(): void {
    console.log('🛡️ Security Monitor initialized');
    
    // Nettoyer les anciens événements toutes les heures
    setInterval(() => {
      const cutoff = Date.now() - 86400000; // 24 heures
      this.events = this.events.filter(e => e.timestamp > cutoff);
    }, 3600000);
    
    // Vérifier si l'extension était en lockdown
    if (this.isInLockdown()) {
      console.warn('🔒 Extension in security lockdown mode');
    }
  }
}
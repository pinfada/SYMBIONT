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
export declare class SecurityMonitor {
    private static events;
    private static readonly MAX_EVENTS;
    private static readonly ALERT_THRESHOLDS;
    /**
     * Enregistre un événement de sécurité
     */
    static logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void;
    /**
     * Vérifie les seuils d'alerte et déclenche des actions
     */
    private static checkAlertThresholds;
    /**
     * Réponse d'urgence pour les événements critiques
     */
    private static triggerEmergencyResponse;
    /**
     * Vérifie si l'extension est en mode verrouillage
     */
    static isInLockdown(): boolean;
    /**
     * Déverrouille l'extension (admin uniquement)
     */
    static unlock(adminCode: string): boolean;
    /**
     * Retourne les événements de sécurité récents
     */
    static getRecentEvents(limit?: number): SecurityEvent[];
    /**
     * Statistiques de sécurité
     */
    static getSecurityStats(): Record<string, number>;
    /**
     * Validation d'URL pour prévenir les attaques par redirection
     */
    static validateURL(url: string): boolean;
    /**
     * Initialise le monitoring de sécurité
     */
    static initialize(): void;
}
//# sourceMappingURL=SecurityMonitor.d.ts.map
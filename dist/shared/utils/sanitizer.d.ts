/**
 * Sanitiseur sécurisé pour prévenir les injections XSS
 * Utilisé pour valider et nettoyer toutes les entrées utilisateur
 */
export declare class SecuritySanitizer {
    private static readonly XSS_PATTERNS;
    private static readonly DNA_SAFE_CHARS;
    private static readonly ID_SAFE_CHARS;
    /**
     * Sanitise une chaîne ADN pour affichage sécurisé
     */
    static sanitizeDNA(dnaString: string): string;
    /**
     * Sanitise un identifiant pour affichage sécurisé
     */
    static sanitizeId(id: string): string;
    /**
     * Sanitise tout contenu HTML pour prévenir XSS
     */
    static sanitizeHTML(content: string): string;
    /**
     * Valide qu'une URL est sûre (pas de javascript:, data:, etc.)
     */
    static sanitizeURL(url: string): string | null;
    /**
     * Sanitise les données numériques
     */
    static sanitizeNumber(value: unknown, min?: number, max?: number): number;
    /**
     * Valide et sanitise un objet de traits
     */
    static sanitizeTraits(traits: Record<string, unknown>): Record<string, number>;
}
//# sourceMappingURL=sanitizer.d.ts.map
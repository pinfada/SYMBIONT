/**
 * Système de nonce pour CSP - Génération sécurisée des nonces pour les styles inline critiques
 */
declare class CSPNonceManager {
    private static currentNonce;
    /**
     * Génère un nouveau nonce CSP sécurisé
     */
    static generateNonce(): string;
    /**
     * Récupère le nonce actuel
     */
    static getCurrentNonce(): string | null;
    /**
     * Injecte le nonce dans le CSP meta tag
     */
    static updateCSPMeta(nonce: string): void;
    /**
     * Applique un style inline avec nonce sécurisé
     */
    static applyInlineStyle(element: HTMLElement, styles: string): void;
}
export { CSPNonceManager };
//# sourceMappingURL=csp-nonce.d.ts.map
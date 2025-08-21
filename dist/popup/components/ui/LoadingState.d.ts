import React from 'react';
interface LoadingStateProps {
    /** Message affiché pendant le chargement */
    message?: string;
    /** Taille du spinner (small, medium, large) */
    size?: 'small' | 'medium' | 'large';
    /** Afficher une barre de progression si valeur fournie (0-100) */
    progress?: number;
    /** Centrer verticalement le contenu */
    centered?: boolean;
    /** Contexte pour lecteurs d'écran */
    loadingContext?: string;
    /** Fonction appelée si l'utilisateur veut annuler */
    onCancel?: () => void;
}
/**
 * LoadingState - Composant d'état de chargement accessible
 * Suit les guidelines WCAG pour les états de chargement
 */
declare const LoadingState: React.FC<LoadingStateProps>;
export default LoadingState;
//# sourceMappingURL=LoadingState.d.ts.map
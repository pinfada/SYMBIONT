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
const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Chargement en cours...",
  size = 'medium',
  progress,
  centered = true,
  loadingContext = "Contenu en cours de chargement",
  onCancel
}) => {
  const spinnerSizeClass = `loading-spinner--${size}`;
  
  return (
    <div 
      className={`loading-state ${centered ? 'loading-state--centered' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={loadingContext}
    >
      <div className="loading-state__content">
        {/* Spinner animé accessible */}
        <div 
          className={`loading-spinner ${spinnerSizeClass}`}
          aria-hidden="true"
        >
          <div className="loading-spinner__inner">
            <div className="loading-spinner__circle"></div>
            <div className="loading-spinner__circle"></div>
            <div className="loading-spinner__circle"></div>
          </div>
        </div>

        {/* Message de chargement */}
        <div className="loading-state__text">
          <p className="loading-state__message" id="loading-message">
            {message}
          </p>
          
          {/* Barre de progression si fournie */}
          {typeof progress === 'number' && (
            <div className="loading-state__progress">
              <div 
                className="progress-bar"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-labelledby="loading-message"
              >
                <div 
                  className="progress-bar__fill"
                  style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                />
              </div>
              <span className="progress-bar__text" aria-live="polite">
                {Math.round(progress)}%
              </span>
            </div>
          )}
        </div>

        {/* Bouton d'annulation si fourni */}
        {onCancel && (
          <div className="loading-state__actions">
            <button
              onClick={onCancel}
              className="btn-secondary btn-small"
              type="button"
              aria-describedby="cancel-help"
            >
              <span aria-hidden="true">✕</span>
              Annuler
            </button>
            <p id="cancel-help" className="sr-only">
              Annule l'opération en cours
            </p>
          </div>
        )}
      </div>

      {/* Informations contextuelles pour screen readers */}
      <div className="sr-only" aria-atomic="true">
        {loadingContext}. {message}
        {typeof progress === 'number' && ` Progression : ${Math.round(progress)} pourcent.`}
      </div>
    </div>
  );
};

export default LoadingState;
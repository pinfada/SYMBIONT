import { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@shared/utils/secureLogger';
import { SecureRandom } from '@shared/utils/secureRandom';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

/**
 * ErrorBoundary - Composant de gestion d'erreurs accessible et user-friendly
 * Suit les bonnes pratiques WCAG pour l'affichage d'erreurs
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Génère un ID unique pour tracer l'erreur (cryptographically secure)
    const errorId = `err_${Date.now()}_${SecureRandom.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log sécurisé de l'erreur (sans données sensibles)
    logger.error('ErrorBoundary - Erreur React capturée', {
      error: error.message,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId
    });

    // Callback personnalisé si fourni
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  handleReportIssue = () => {
    const errorDetails = {
      message: this.state.error?.message || 'Erreur inconnue',
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };

    // Copier les détails dans le presse-papiers pour faciliter le rapport
    if (navigator.clipboard) {
      navigator.clipboard.writeText(
        `Erreur SYMBIONT:\n${JSON.stringify(errorDetails, null, 2)}`
      ).then(() => {
        logger.info('Détails d\'erreur copiés dans le presse-papiers');
      }).catch(() => {
        logger.warn('Impossible de copier les détails d\'erreur');
      });
    }
  };

  render() {
    if (this.state.hasError) {
      // Utilise le fallback personnalisé si fourni
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Interface d'erreur par défaut - accessible et informative
      return (
        <div 
          className="error-boundary"
          role="alert"
          aria-labelledby="error-title"
          aria-describedby="error-description"
        >
          <div className="error-content">
            <div className="error-icon" aria-hidden="true">
              ⚠️
            </div>
            
            <div className="error-text">
              <h2 id="error-title" className="error-title">
                Oups ! Une erreur s&apos;est produite
              </h2>
              
              <p id="error-description" className="error-description">
                Cette section de l&apos;application a rencontré un problème inattendu. 
                Vos données sont sécurisées et aucune information n&apos;a été perdue.
              </p>

              {this.state.errorId && (
                <p className="error-id">
                  <span className="error-id-label">ID d&apos;erreur :</span>
                  <code className="error-id-value">{this.state.errorId}</code>
                </p>
              )}
            </div>
          </div>

          <div className="error-actions">
            <button
              onClick={this.handleRetry}
              className="btn-primary"
              type="button"
              aria-describedby="retry-help"
            >
              <span aria-hidden="true">🔄</span>
              Réessayer
            </button>

            <button
              onClick={this.handleReportIssue}
              className="btn-secondary"
              type="button"
              aria-describedby="report-help"
            >
              <span aria-hidden="true">📋</span>
              Copier les détails
            </button>
          </div>

          <div className="error-help">
            <p id="retry-help" className="help-text">
              Cliquez sur &quot;Réessayer&quot; pour recharger cette section.
            </p>
            <p id="report-help" className="help-text">
              &quot;Copier les détails&quot; place les informations techniques dans votre presse-papiers 
              pour nous aider à diagnostiquer le problème.
            </p>
          </div>

          {/* Informations techniques pliables pour les développeurs */}
          <details className="error-technical">
            <summary className="technical-summary">
              Détails techniques (pour développeurs)
            </summary>
            <div className="technical-content">
              <p><strong>Message :</strong> {this.state.error?.message}</p>
              <p><strong>Stack :</strong></p>
              <pre className="error-stack">
                {this.state.error?.stack}
              </pre>
            </div>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
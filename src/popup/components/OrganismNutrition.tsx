// Système de nutrition de l'organisme avec explications claires
import React, { useState, useEffect } from 'react';
import { organismStateManager } from '@shared/services/OrganismStateManager';
import type { OrganismState } from '@shared/services/OrganismStateManager';

interface NutritionSource {
  id: 'ritual' | 'interaction' | 'knowledge' | 'social';
  name: string;
  icon: string;
  description: string;
  energyGain: number;
  xpGain: number;
  cooldown: number; // en minutes
  lastUsed?: number;
}

export const OrganismNutrition: React.FC = () => {
  const [state, setState] = useState<OrganismState>(organismStateManager.getState());
  const [feeding, setFeeding] = useState(false);
  const [lastFeedSource, setLastFeedSource] = useState<string>('');
  const [showHelp, setShowHelp] = useState(false);

  const nutritionSources: NutritionSource[] = [
    {
      id: 'knowledge',
      name: 'Connaissance',
      icon: '📚',
      description: 'Visitez des sites éducatifs, scientifiques ou Wikipedia',
      energyGain: 15,
      xpGain: 25,
      cooldown: 5
    },
    {
      id: 'social',
      name: 'Social',
      icon: '👥',
      description: 'Interagissez sur les réseaux sociaux ou forums',
      energyGain: 20,
      xpGain: 15,
      cooldown: 10
    },
    {
      id: 'interaction',
      name: 'Interaction',
      icon: '🖱️',
      description: 'Cliquez et scrollez activement sur les pages',
      energyGain: 10,
      xpGain: 10,
      cooldown: 2
    },
    {
      id: 'ritual',
      name: 'Rituel Mystique',
      icon: '✨',
      description: 'Accomplissez un rituel dans l\'onglet Mystique',
      energyGain: 30,
      xpGain: 50,
      cooldown: 30
    }
  ];

  useEffect(() => {
    const unsubscribe = organismStateManager.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  const handleFeed = async (source: NutritionSource) => {
    setFeeding(true);
    setLastFeedSource(source.name);

    await organismStateManager.feed(source.id);

    // Animation de feedback
    setTimeout(() => {
      setFeeding(false);
    }, 1500);

    // Sauvegarder le temps d'utilisation
    const feedHistory = JSON.parse(localStorage.getItem('feed_history') || '{}');
    feedHistory[source.id] = Date.now();
    localStorage.setItem('feed_history', JSON.stringify(feedHistory));
  };

  const getTimeUntilNextFeed = (source: NutritionSource): string => {
    const feedHistory = JSON.parse(localStorage.getItem('feed_history') || '{}');
    const lastUsed = feedHistory[source.id] || 0;
    const cooldownMs = source.cooldown * 60 * 1000;
    const timeElapsed = Date.now() - lastUsed;

    if (timeElapsed >= cooldownMs) {
      return 'Disponible';
    }

    const timeRemaining = cooldownMs - timeElapsed;
    const minutes = Math.floor(timeRemaining / 60000);
    const seconds = Math.floor((timeRemaining % 60000) / 1000);

    return `${minutes}m ${seconds}s`;
  };

  const isSourceAvailable = (source: NutritionSource): boolean => {
    const feedHistory = JSON.parse(localStorage.getItem('feed_history') || '{}');
    const lastUsed = feedHistory[source.id] || 0;
    const cooldownMs = source.cooldown * 60 * 1000;
    return Date.now() - lastUsed >= cooldownMs;
  };

  const getHungerLevel = (): { text: string; color: string; urgency: string } => {
    const timeSinceLastFeed = (Date.now() - state.lastFeedTime) / 1000 / 60; // minutes

    if (timeSinceLastFeed < 15) {
      return { text: 'Rassasié', color: '#4caf50', urgency: 'low' };
    } else if (timeSinceLastFeed < 30) {
      return { text: 'Normal', color: '#2196f3', urgency: 'medium' };
    } else if (timeSinceLastFeed < 60) {
      return { text: 'Affamé', color: '#ff9800', urgency: 'high' };
    }
    return { text: 'Très affamé', color: '#f44336', urgency: 'critical' };
  };

  const getAutoFeedInfo = (): string => {
    switch (state.currentPageType) {
      case 'science':
      case 'learning':
        return '🧠 Gain automatique de conscience sur cette page éducative';
      case 'social':
        return '👥 Interactions sociales détectées - XP social en cours';
      case 'entertainment':
        return '🎮 Divertissement - Consommation d\'énergie réduite';
      case 'coding':
        return '💻 Environnement de développement - Focus maximal';
      default:
        return '🌐 Navigation standard - Consommation normale';
    }
  };

  return (
    <div className="organism-nutrition">
      <div className="nutrition-header">
        <h3>
          <span>🍽️</span>
          Nutrition de l'Organisme
        </h3>
        <button
          className="help-button"
          onClick={() => setShowHelp(!showHelp)}
        >
          ❓
        </button>
      </div>

      {showHelp && (
        <div className="nutrition-help">
          <h4>Comment nourrir votre organisme ?</h4>
          <p>
            Votre organisme se nourrit de vos activités en ligne.
            Il gagne automatiquement de l'énergie et de l'expérience selon :
          </p>
          <ul>
            <li>Le type de sites que vous visitez</li>
            <li>Vos interactions avec les pages</li>
            <li>Les rituels mystiques que vous accomplissez</li>
            <li>Vos activités sociales</li>
          </ul>
          <p className="help-note">
            💡 L'organisme consomme de l'énergie en permanence.
            Plus il est actif, plus il consomme !
          </p>
        </div>
      )}

      <div className="hunger-status">
        <div className="status-label">État nutritionnel</div>
        <div className="hunger-indicator">
          <span
            className="hunger-level"
            style={{ color: getHungerLevel().color }}
          >
            {getHungerLevel().text}
          </span>
          <div className="energy-display">
            <span className="energy-icon">⚡</span>
            <span className="energy-value">{Math.round(state.energy)}%</span>
          </div>
        </div>
      </div>

      <div className="auto-feed-info">
        {getAutoFeedInfo()}
      </div>

      <div className="nutrition-sources">
        <h4>Sources de nutrition</h4>

        {nutritionSources.map((source) => {
          const available = isSourceAvailable(source);
          const timeRemaining = getTimeUntilNextFeed(source);

          return (
            <div
              key={source.id}
              className={`nutrition-card ${!available ? 'disabled' : ''}`}
            >
              <div className="nutrition-icon">{source.icon}</div>

              <div className="nutrition-info">
                <div className="nutrition-name">{source.name}</div>
                <div className="nutrition-desc">{source.description}</div>

                <div className="nutrition-rewards">
                  <span className="reward">
                    ⚡ +{source.energyGain}
                  </span>
                  <span className="reward">
                    ✨ +{source.xpGain} XP
                  </span>
                  <span className="cooldown">
                    ⏱️ {timeRemaining}
                  </span>
                </div>
              </div>

              {source.id === 'interaction' && available && (
                <button
                  className="feed-button"
                  onClick={() => handleFeed(source)}
                  disabled={feeding}
                >
                  Nourrir
                </button>
              )}
            </div>
          );
        })}
      </div>

      {feeding && (
        <div className="feeding-animation">
          <div className="feeding-message">
            🍽️ {lastFeedSource} en cours...
          </div>
        </div>
      )}

      <div className="nutrition-tips">
        <h4>💡 Conseils</h4>
        <ul>
          <li>Les pages scientifiques augmentent la conscience (+0.3/s)</li>
          <li>Les rituels mystiques sont la meilleure source d'énergie</li>
          <li>L'organisme évolue tous les 100 points d'XP</li>
          <li>Un organisme affamé perd ses capacités progressivement</li>
        </ul>
      </div>

      <style>{`
        .organism-nutrition {
          padding: 16px;
          background: linear-gradient(135deg, #0a0e1a 0%, #0f1419 100%);
          border-radius: 12px;
          border: 1px solid rgba(0, 224, 255, 0.1);
        }

        .nutrition-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .nutrition-header h3 {
          font-size: 16px;
          color: #00e0ff;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
        }

        .help-button {
          background: rgba(0, 224, 255, 0.1);
          border: 1px solid rgba(0, 224, 255, 0.2);
          border-radius: 50%;
          width: 24px;
          height: 24px;
          cursor: pointer;
          color: #00e0ff;
          transition: all 0.2s;
        }

        .help-button:hover {
          background: rgba(0, 224, 255, 0.2);
          transform: scale(1.1);
        }

        .nutrition-help {
          background: rgba(0, 224, 255, 0.05);
          border: 1px solid rgba(0, 224, 255, 0.1);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 16px;
          font-size: 12px;
          color: #8899a6;
        }

        .nutrition-help h4 {
          color: #4fc3f7;
          margin: 0 0 8px 0;
          font-size: 13px;
        }

        .nutrition-help ul {
          margin: 8px 0;
          padding-left: 20px;
        }

        .help-note {
          color: #ffc107;
          margin-top: 8px;
        }

        .hunger-status {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 12px;
        }

        .status-label {
          font-size: 11px;
          color: #8899a6;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .hunger-indicator {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .hunger-level {
          font-size: 16px;
          font-weight: 600;
        }

        .energy-display {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(0, 224, 255, 0.1);
          padding: 4px 8px;
          border-radius: 12px;
        }

        .energy-icon {
          font-size: 14px;
        }

        .energy-value {
          font-size: 14px;
          color: #00e0ff;
          font-weight: 500;
        }

        .auto-feed-info {
          background: rgba(79, 195, 247, 0.1);
          border-left: 3px solid #4fc3f7;
          padding: 8px 12px;
          margin-bottom: 16px;
          font-size: 12px;
          color: #4fc3f7;
          border-radius: 4px;
        }

        .nutrition-sources {
          margin-top: 16px;
        }

        .nutrition-sources h4 {
          font-size: 13px;
          color: #4fc3f7;
          margin-bottom: 12px;
        }

        .nutrition-card {
          display: flex;
          gap: 12px;
          padding: 12px;
          background: rgba(0, 224, 255, 0.03);
          border: 1px solid rgba(0, 224, 255, 0.1);
          border-radius: 8px;
          margin-bottom: 8px;
          transition: all 0.2s;
        }

        .nutrition-card:hover:not(.disabled) {
          background: rgba(0, 224, 255, 0.06);
          border-color: rgba(0, 224, 255, 0.2);
        }

        .nutrition-card.disabled {
          opacity: 0.5;
        }

        .nutrition-icon {
          font-size: 24px;
          min-width: 40px;
          text-align: center;
        }

        .nutrition-info {
          flex: 1;
        }

        .nutrition-name {
          font-size: 13px;
          color: #00e0ff;
          font-weight: 500;
          margin-bottom: 4px;
        }

        .nutrition-desc {
          font-size: 11px;
          color: #8899a6;
          margin-bottom: 6px;
        }

        .nutrition-rewards {
          display: flex;
          gap: 12px;
          font-size: 11px;
        }

        .reward {
          color: #4caf50;
        }

        .cooldown {
          color: #ff9800;
        }

        .feed-button {
          padding: 6px 12px;
          background: linear-gradient(135deg, #00e0ff, #4fc3f7);
          border: none;
          border-radius: 16px;
          color: #0f1419;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .feed-button:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(0, 224, 255, 0.4);
        }

        .feed-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .feeding-animation {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.9);
          border: 2px solid #00e0ff;
          border-radius: 12px;
          padding: 20px 30px;
          z-index: 1000;
          animation: pulse 0.5s ease-in-out;
        }

        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.1); }
        }

        .feeding-message {
          font-size: 16px;
          color: #00e0ff;
        }

        .nutrition-tips {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(0, 224, 255, 0.1);
        }

        .nutrition-tips h4 {
          font-size: 13px;
          color: #ffc107;
          margin-bottom: 8px;
        }

        .nutrition-tips ul {
          margin: 0;
          padding-left: 20px;
          font-size: 11px;
          color: #8899a6;
        }

        .nutrition-tips li {
          margin-bottom: 4px;
        }
      `}</style>
    </div>
  );
};
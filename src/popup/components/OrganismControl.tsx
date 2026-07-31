import React, { useState, useEffect } from 'react';
import { logger } from '@shared/utils/secureLogger';

interface OrganismSettings {
  webglEnabled: boolean;
}

const OrganismControl: React.FC = () => {
  const [settings, setSettings] = useState<OrganismSettings>({
    webglEnabled: true
  });

  const [organismState, setOrganismState] = useState({
    currentPage: '',
    pageType: 'default',
    mood: 'curious',
    energy: 0.8,
    consciousness: 0.5
  });

  // Charger les paramètres sauvegardés
  useEffect(() => {
    chrome.storage.local.get(['symbiont_webgl_settings'], (result) => {
      if (result.symbiont_webgl_settings) {
        setSettings(result.symbiont_webgl_settings);
      }
    });

    // Écouter les mises à jour de l'organisme
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'ORGANISM_STATE_UPDATE') {
        setOrganismState(prev => ({ ...prev, ...message.data }));
      } else if (message.type === 'PAGE_ANALYSIS_UPDATE') {
        setOrganismState(prev => ({
          ...prev,
          currentPage: message.data.url || '',
          pageType: message.data.type || 'default'
        }));
      }
    });
  }, []);

  const toggleWebGL = () => {
    const newEnabled = !settings.webglEnabled;
    const newSettings = { ...settings, webglEnabled: newEnabled };
    setSettings(newSettings);

    // Sauvegarder dans le storage
    chrome.storage.local.set({
      symbiont_webgl_enabled: newEnabled,
      symbiont_webgl_settings: newSettings
    }, () => {
      logger.info(`WebGL organism ${newEnabled ? 'enabled' : 'disabled'}`);

      // Notifier tous les onglets
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              type: 'TOGGLE_ORGANISM',
              enabled: newEnabled
            }).catch(() => {
              // Tab might not have content script
            });
          }
        });
      });
    });
  };



  const getMoodEmoji = (mood: string): string => {
    const moods: Record<string, string> = {
      happy: '😊',
      curious: '🤔',
      excited: '🤩',
      meditating: '🧘',
      hungry: '🤤',
      scared: '😨',
      focused: '🎯'
    };
    return moods[mood] || '🙂';
  };

  const getPageTypeIcon = (type: string): string => {
    const icons: Record<string, string> = {
      science: '🔬',
      social: '👥',
      news: '📰',
      entertainment: '🎬',
      coding: '💻',
      learning: '📚',
      default: '🌐'
    };
    return icons[type] || '🌐';
  };

  return (
    <div className="organism-control">
      <div className="control-header">
        <h3>🧬 Visualisation WebGL</h3>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={settings.webglEnabled}
            onChange={toggleWebGL}
          />
          <span className="slider"></span>
          <span className="toggle-label">
            {settings.webglEnabled ? 'Actif' : 'Inactif'}
          </span>
        </label>
      </div>

      {settings.webglEnabled && (
        <>
          <div className="organism-status">
            <div className="status-row">
              <span className="status-label">État:</span>
              <span className="status-value">
                {getMoodEmoji(organismState.mood)} {organismState.mood}
              </span>
            </div>
            <div className="status-row">
              <span className="status-label">Page:</span>
              <span className="status-value">
                {getPageTypeIcon(organismState.pageType)} {organismState.pageType}
              </span>
            </div>
            <div className="status-row">
              <span className="status-label">Énergie:</span>
              <div className="progress-bar">
                <div
                  className="progress-fill energy"
                  style={{ width: `${organismState.energy * 100}%` }}
                />
              </div>
              <span className="progress-text">{Math.round(organismState.energy * 100)}%</span>
            </div>
            <div className="status-row">
              <span className="status-label">Conscience:</span>
              <div className="progress-bar">
                <div
                  className="progress-fill consciousness"
                  style={{ width: `${organismState.consciousness * 100}%` }}
                />
              </div>
              <span className="progress-text">{Math.round(organismState.consciousness * 100)}%</span>
            </div>
          </div>


          <div className="organism-info">
            <p className="info-text">
              💡 Visualisation WebGL de l&apos;activité de l&apos;extension sur la page courante.
            </p>
            <ul className="behavior-list">
              <li>🔬 <strong>Affichage visuel</strong> : Représentation 3D de l&apos;organisme numérique</li>
              <li>📊 <strong>État</strong> : Indicateurs d&apos;énergie et de conscience basés sur les métriques système</li>
              <li>⚙️ <strong>Configuration</strong> : Position et taille personnalisables de l&apos;affichage</li>
              <li>🎨 <strong>Rendu</strong> : Animation WebGL en temps réel</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default OrganismControl;
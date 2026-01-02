import React, { useState, useEffect } from 'react';
import { logger } from '@shared/utils/secureLogger';

interface OrganismSettings {
  webglEnabled: boolean;
  floatingPosition: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  size: 'small' | 'medium' | 'large';
  interactionMode: 'curious' | 'shy' | 'neutral';
  visibility: 'always' | 'hover' | 'focus';
}

const OrganismControl: React.FC = () => {
  const [settings, setSettings] = useState<OrganismSettings>({
    webglEnabled: true,
    floatingPosition: 'bottom-right',
    size: 'medium',
    interactionMode: 'curious',
    visibility: 'always'
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

  const changePosition = (position: OrganismSettings['floatingPosition']) => {
    const newSettings = { ...settings, floatingPosition: position };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const changeSize = (size: OrganismSettings['size']) => {
    const newSettings = { ...settings, size };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const changeInteractionMode = (mode: OrganismSettings['interactionMode']) => {
    const newSettings = { ...settings, interactionMode: mode };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const saveSettings = (newSettings: OrganismSettings) => {
    chrome.storage.local.set({
      symbiont_webgl_settings: newSettings
    }, () => {
      // Broadcast les nouveaux paramètres
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'UPDATE_ORGANISM_SETTINGS',
            settings: newSettings
          }).catch(() => {});
        }
      });
    });
  };

  const feedOrganism = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'FEED_ORGANISM'
        }, (response) => {
          if (response?.success) {
            setOrganismState(prev => ({
              ...prev,
              energy: Math.min(1, prev.energy + 0.2)
            }));
          }
        });
      }
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
        <h3>🧬 Organisme Compagnon</h3>
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

          <div className="control-section">
            <h4>Position</h4>
            <div className="position-grid">
              <button
                className={`position-btn ${settings.floatingPosition === 'top-left' ? 'active' : ''}`}
                onClick={() => changePosition('top-left')}
                title="Haut gauche"
              >↖</button>
              <button
                className={`position-btn ${settings.floatingPosition === 'top-right' ? 'active' : ''}`}
                onClick={() => changePosition('top-right')}
                title="Haut droite"
              >↗</button>
              <button
                className={`position-btn ${settings.floatingPosition === 'bottom-left' ? 'active' : ''}`}
                onClick={() => changePosition('bottom-left')}
                title="Bas gauche"
              >↙</button>
              <button
                className={`position-btn ${settings.floatingPosition === 'bottom-right' ? 'active' : ''}`}
                onClick={() => changePosition('bottom-right')}
                title="Bas droite"
              >↘</button>
            </div>
          </div>

          <div className="control-section">
            <h4>Taille</h4>
            <div className="size-options">
              {(['small', 'medium', 'large'] as const).map(size => (
                <button
                  key={size}
                  className={`size-btn ${settings.size === size ? 'active' : ''}`}
                  onClick={() => changeSize(size)}
                >
                  {size === 'small' ? 'Petit' : size === 'medium' ? 'Moyen' : 'Grand'}
                </button>
              ))}
            </div>
          </div>

          <div className="control-section">
            <h4>Comportement</h4>
            <select
              value={settings.interactionMode}
              onChange={(e) => changeInteractionMode(e.target.value as OrganismSettings['interactionMode'])}
              className="behavior-select"
            >
              <option value="curious">🔍 Curieux (suit la souris)</option>
              <option value="shy">😳 Timide (fuit la souris)</option>
              <option value="neutral">😐 Neutre (ignore la souris)</option>
            </select>
          </div>

          <div className="control-actions">
            <button
              className="feed-btn"
              onClick={feedOrganism}
              disabled={organismState.energy > 0.9}
            >
              🍎 Nourrir l'organisme
            </button>
          </div>

          <div className="organism-info">
            <p className="info-text">
              💡 Votre organisme vit dans les pages web que vous visitez.
              Il réagit au contenu et évolue selon vos interactions !
            </p>
            <ul className="behavior-list">
              <li>🔬 <strong>Pages scientifiques</strong> : S'excite et change de couleur</li>
              <li>👥 <strong>Réseaux sociaux</strong> : Devient plus social</li>
              <li>💻 <strong>Code</strong> : Se concentre intensément</li>
              <li>🎬 <strong>Divertissement</strong> : Se détend et joue</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default OrganismControl;
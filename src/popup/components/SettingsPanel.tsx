// src/popup/components/SettingsPanel.tsx
import React, { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { SymbiontStorage } from '../../core/storage/SymbiontStorage';
import { logger } from '@shared/utils/secureLogger';

interface Settings {
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  autoMutate: boolean;
  mutationSpeed: number;
  visualQuality: 'low' | 'medium' | 'high';
}

export const SettingsPanel: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<Settings>({
    theme: 'auto',
    notifications: true,
    autoMutate: false,
    mutationSpeed: 1,
    visualQuality: 'high'
  });
  const [autoBackup, setAutoBackup] = useState(false);
  const [featureFlags, setFeatureFlags] = useState<{
    USE_REAL_DNA: boolean;
    USE_REAL_BEHAVIOR: boolean;
    USE_REAL_NETWORK: boolean;
    USE_BACKEND_API: boolean;
  }>({
    USE_REAL_DNA: false,
    USE_REAL_BEHAVIOR: false,
    USE_REAL_NETWORK: false,
    USE_BACKEND_API: false
  });
  
  useEffect(() => {
    loadSettings();
    loadFeatureFlags();
  }, []);
  
  const loadSettings = async () => {
    const storage = new SymbiontStorage();
    await storage.initialize();
    const savedSettings = await storage.getSetting<Settings>('userPreferences', settings);
    if (savedSettings) {
      setSettings(savedSettings);
    }
  };
  
  const loadFeatureFlags = async () => {
    try {
      const { RealDataService } = await import('../services/RealDataService');
      const flags = RealDataService.getFeatureStatus();
      setFeatureFlags(flags);
    } catch (error) {
      logger.warn('Impossible de charger les feature flags:', error);
      // Garder les valeurs par défaut
    }
  };
  
  const saveSettings = async () => {
    const storage = new SymbiontStorage();
    await storage.initialize();
    await storage.setSetting('userPreferences', settings);
  };
  
  const updateSetting = <K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const toggleFeatureFlag = async (feature: string) => {
    try {
      const { RealDataService } = await import('../services/RealDataService');
      const currentValue = featureFlags[feature as keyof typeof featureFlags];
      
      if (currentValue) {
        RealDataService.disableFeature(feature as keyof typeof featureFlags);
      } else {
        RealDataService.enableFeature(feature as keyof typeof featureFlags);
      }
      
      // Mise à jour locale immédiate
      setFeatureFlags(prev => ({
        ...prev,
        [feature]: !currentValue
      }));
    } catch (error) {
      logger.error('Erreur toggle feature flag:', error);
    }
  };

  const migrateToRealData = async () => {
    try {
      const { realDataService } = await import('../services/RealDataService');
      const userId = localStorage.getItem('symbiont_user_id') || 'default-user';
      
      await realDataService.migrateToRealData(userId);
      alert('✅ Migration vers vraies données réussie ! Rechargez l\'extension.');
    } catch (error) {
      logger.error('Erreur migration:', error);
      alert('❌ Erreur lors de la migration. Voir console.');
    }
  };

  return (
    <div className="ext-settings-panel max-w-lg mx-auto p-6 bg-white rounded-xl shadow-lg mt-8">
      <h2 className="text-2xl font-bold text-center text-[#00e0ff] mb-6">Paramètres</h2>
      <section className="ext-settings-section mb-6">
        <h3 className="text-lg font-bold text-[#00e0ff] mb-2">Préférences utilisateur</h3>
        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.notifications} onChange={e => updateSetting('notifications', e.target.checked)} /> Notifications
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.autoMutate} onChange={e => updateSetting('autoMutate', e.target.checked)} /> Mutation automatique
          </label>
          <label className="flex items-center gap-2">
            Qualité visuelle&nbsp;:
            <select value={settings.visualQuality} onChange={e => updateSetting('visualQuality', e.target.value as any)} className="ml-2 rounded-md border px-2 py-1">
              <option value="high">Haute</option>
              <option value="medium">Moyenne</option>
              <option value="low">Basse</option>
            </select>
          </label>
        </div>
      </section>
      <section className="ext-settings-section">
        <h3 className="text-lg font-bold text-[#00e0ff] mb-2">Thème</h3>
        <div className="flex gap-4">
          <button onClick={() => setTheme('light')} className={`rounded-lg px-4 py-2 font-bold ${theme === 'light' ? 'bg-[#00e0ff] text-[#181c22]' : 'bg-[#eaf6fa] text-[#232946]'}`}>Clair</button>
          <button onClick={() => setTheme('dark')} className={`rounded-lg px-4 py-2 font-bold ${theme === 'dark' ? 'bg-[#00e0ff] text-[#181c22]' : 'bg-[#232946] text-white'}`}>Sombre</button>
          <button onClick={() => setTheme('auto')} className={`rounded-lg px-4 py-2 font-bold ${theme === 'auto' ? 'bg-[#00e0ff] text-[#181c22]' : 'bg-[#888] text-white'}`}>Auto</button>
        </div>
      </section>
      <section className="ext-settings-section">
        <h3 className="text-lg font-bold text-[#00e0ff] mb-2">💾 Données</h3>
        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={autoBackup} onChange={e => setAutoBackup(e.target.checked)} /> Sauvegarde automatique
          </label>
        </div>
      </section>
      <section className="ext-settings-section">
        <h3 className="text-lg font-bold text-[#00e0ff] mb-2">🚀 Données Réelles (Mode Avancé)</h3>
        <p className="section-description">
          Activez progressivement les vraies données pour remplacer le mode démo.
          <br />
          ⚠️ Nécessite un rechargement de l'extension après activation.
        </p>
        <div className="feature-flags-grid">
          <div className="feature-flag-item">
            <div className="flag-info">
              <h4>🧬 ADN Comportemental</h4>
              <p>Génère l'ADN basé sur vos vrais patterns de navigation</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={featureFlags.USE_REAL_DNA}
                onChange={() => toggleFeatureFlag('USE_REAL_DNA').catch(console.error)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          <div className="feature-flag-item">
            <div className="flag-info">
              <h4>📊 Métriques Système</h4>
              <p>Collecte les vraies métriques de performance du navigateur</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={featureFlags.USE_REAL_BEHAVIOR}
                onChange={() => toggleFeatureFlag('USE_REAL_BEHAVIOR').catch(console.error)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          <div className="feature-flag-item">
            <div className="flag-info">
              <h4>🌐 Réseau Social</h4>
              <p>Connecte au réseau SYMBIONT réel (nécessite backend)</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={featureFlags.USE_REAL_NETWORK}
                onChange={() => toggleFeatureFlag('USE_REAL_NETWORK').catch(console.error)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          <div className="feature-flag-item">
            <div className="flag-info">
              <h4>🔌 API Backend</h4>
              <p>Utilise l'API serveur pour synchroniser les données</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={featureFlags.USE_BACKEND_API}
                onChange={() => toggleFeatureFlag('USE_BACKEND_API').catch(console.error)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
        <div className="migration-actions">
          <button 
            onClick={migrateToRealData}
            className="btn-primary migration-btn"
            disabled={!featureFlags.USE_REAL_DNA}
          >
            🔄 Migrer vers Vraies Données
          </button>
          <p className="migration-note">
            Cette action génère un nouvel ADN basé sur vos données de navigation réelles
          </p>
        </div>
      </section>
      <div className="flex justify-end mt-6">
        <button onClick={saveSettings} className="bg-[#00e0ff] text-[#181c22] rounded-lg px-5 py-2 font-bold cursor-pointer">Enregistrer</button>
      </div>
    </div>
  );
};

export default SettingsPanel;
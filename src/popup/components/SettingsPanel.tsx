// src/popup/components/SettingsPanel.tsx
import React, { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { SymbiontStorage } from '../../core/storage/SymbiontStorage';
import { AnimatedButton } from './ui/AnimatedButton';

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
  
  useEffect(() => {
    loadSettings();
  }, []);
  
  const loadSettings = async () => {
    const storage = new SymbiontStorage();
    await storage.initialize();
    const savedSettings = await storage.getSetting<Settings>('userPreferences', settings);
    if (savedSettings) {
      setSettings(savedSettings);
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
  
  return (
    <div className="settings-panel max-w-lg mx-auto p-6 bg-white rounded-xl shadow-lg mt-8">
      <h2 className="text-2xl font-bold text-center text-[#00e0ff] mb-6">Paramètres</h2>
      <section className="settings-section mb-6">
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
      <section className="settings-section">
        <h3 className="text-lg font-bold text-[#00e0ff] mb-2">Thème</h3>
        <div className="flex gap-4">
          <button onClick={() => setTheme('light')} className={`rounded-lg px-4 py-2 font-bold ${theme === 'light' ? 'bg-[#00e0ff] text-[#181c22]' : 'bg-[#eaf6fa] text-[#232946]'}`}>Clair</button>
          <button onClick={() => setTheme('dark')} className={`rounded-lg px-4 py-2 font-bold ${theme === 'dark' ? 'bg-[#00e0ff] text-[#181c22]' : 'bg-[#232946] text-white'}`}>Sombre</button>
          <button onClick={() => setTheme('auto')} className={`rounded-lg px-4 py-2 font-bold ${theme === 'auto' ? 'bg-[#00e0ff] text-[#181c22]' : 'bg-[#888] text-white'}`}>Auto</button>
        </div>
      </section>
      <div className="flex justify-end mt-6">
        <button onClick={saveSettings} className="bg-[#00e0ff] text-[#181c22] rounded-lg px-5 py-2 font-bold cursor-pointer">Enregistrer</button>
      </div>
    </div>
  );
};

export default SettingsPanel;
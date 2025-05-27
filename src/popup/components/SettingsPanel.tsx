// src/popup/components/SettingsPanel.tsx
import React, { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { SymbiontStorage } from '@storage/SymbiontStorage';
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
    const storage = SymbiontStorage.getInstance();
    const savedSettings = await storage.getSetting('userPreferences');
    if (savedSettings) {
      setSettings(savedSettings);
    }
  };
  
  const saveSettings = async () => {
    const storage = SymbiontStorage.getInstance();
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
    <div className="settings-panel">
      <section className="settings-section">
        <h3>Appearance</h3>
        
        <div className="setting-item">
          <label>Theme</label>
          <select
            value={settings.theme}
            onChange={(e) => {
              const value = e.target.value as Settings['theme'];
              updateSetting('theme', value);
              setTheme(value);
            }}
          >
            <option value="auto">Auto</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        
        <div className="setting-item">
          <label>Visual Quality</label>
          <select
            value={settings.visualQuality}
            onChange={(e) => updateSetting('visualQuality', e.target.value as Settings['visualQuality'])}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </section>
      
      <section className="settings-section">
        <h3>Behavior</h3>
        
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.notifications}
              onChange={(e) => updateSetting('notifications', e.target.checked)}
            />
            Enable Notifications
          </label>
        </div>
        
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={settings.autoMutate}
              onChange={(e) => updateSetting('autoMutate', e.target.checked)}
            />
            Auto-mutation
          </label>
        </div>
        
        <div className="setting-item">
          <label>Mutation Speed</label>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={settings.mutationSpeed}
            onChange={(e) => updateSetting('mutationSpeed', parseFloat(e.target.value))}
          />
          <span>{settings.mutationSpeed}x</span>
        </div>
      </section>
      
      <AnimatedButton onClick={saveSettings}>
        Save Changes
      </AnimatedButton>
    </div>
  );
};
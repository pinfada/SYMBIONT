// src/ui/OrganismDashboard.tsx

import React, { useState } from 'react';
import { OrganismViewer } from './OrganismViewer';
import { ConsciousnessGauge } from './ConsciousnessGauge';
import { TraitsRadarChart } from './TraitsRadarChart';
import { OrganismTraits } from '../types';

/**
 * OrganismDashboard - Dashboard principal de visualisation et contrôle
 * - Affiche l'organisme, la jauge de conscience, le radar des traits
 * - Permet de muter l'ADN et de randomiser les traits
 */
const DEFAULT_TRAITS: OrganismTraits = {
  curiosity: 0.7,
  focus: 0.5,
  rhythm: 0.6,
  empathy: 0.4,
  creativity: 0.8,
  energy: 0.6,
  harmony: 0.5,
  wisdom: 0.2
};

function randomDNA(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function randomTraits(): OrganismTraits {
  return {
    curiosity: Math.random(),
    focus: Math.random(),
    rhythm: Math.random(),
    empathy: Math.random(),
    creativity: Math.random(),
    energy: Math.random(),
    harmony: Math.random(),
    wisdom: Math.random()
  };
}

export const OrganismDashboard: React.FC = () => {
  const [dna, setDNA] = useState(randomDNA());
  const [traits, setTraits] = useState<OrganismTraits>(DEFAULT_TRAITS);
  const [consciousness, setConsciousness] = useState(0.5);

  // Callback pour recevoir les métriques (ex : ajuster la conscience)
  const handleMetrics = (metrics: any) => {
    // Exemple : conscience = FPS normalisé (à adapter selon logique réelle)
    setConsciousness(Math.max(0, Math.min(1, metrics.fps / 60)));
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 24,
      background: '#181c22',
      minHeight: '100vh',
      padding: 32
    }}>
      <h2 style={{ color: '#00e0ff', letterSpacing: 2, fontWeight: 700 }}>SYMBIONT Organism Dashboard</h2>
      <div style={{ display: 'flex', gap: 40, alignItems: 'center' }}>
        <OrganismViewer dna={dna} traits={traits} width={320} height={320} onMetrics={handleMetrics} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
          <ConsciousnessGauge value={consciousness} />
          <TraitsRadarChart traits={traits} />
        </div>
      </div>
      <div style={{ marginTop: 32, display: 'flex', gap: 16 }}>
        <button
          onClick={() => setDNA(randomDNA())}
          style={{ padding: '8px 18px', borderRadius: 6, background: '#00e0ff', color: '#111', fontWeight: 600, border: 'none', cursor: 'pointer' }}
        >
          ADN aléatoire
        </button>
        <button
          onClick={() => setTraits(randomTraits())}
          style={{ padding: '8px 18px', borderRadius: 6, background: '#222', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer' }}
        >
          Traits aléatoires
        </button>
      </div>
    </div>
  );
}; 
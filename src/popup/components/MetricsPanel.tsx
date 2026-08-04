// src/popup/components/MetricsPanel.tsx
import React, { useState, useEffect } from 'react';
import { useOrganism } from '../hooks/useOrganism';
import { organismStateManager } from '@shared/services/OrganismStateManager';
import type { OrganismState } from '@shared/services/OrganismStateManager';
import { toTraitPercent, clampPercent, traitLabel, moodLabel, pageTypeLabel, formatAge } from './metricsFormat';

interface Stat {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  description?: string;
}

interface ChartData {
  label: string;
  value: number;
  max: number;
}

export const MetricsPanel: React.FC = () => {
  const { organism } = useOrganism();
  const [sharedState, setSharedState] = useState<OrganismState>(organismStateManager.getState());

  useEffect(() => {
    // S'abonner aux changements d'état centralisé
    const unsubscribe = organismStateManager.subscribe((newState) => {
      setSharedState(newState);
    });


    return () => {
      unsubscribe();
    };
  }, []);

  // Styles définis en premier pour le loading
  const styles = {
    container: {
      color: '#e1e8ed',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '12px',
      marginBottom: '24px'
    },
    statCard: {
      background: 'linear-gradient(135deg, rgba(0, 224, 255, 0.05) 0%, rgba(0, 224, 255, 0.02) 100%)',
      border: '1px solid rgba(0, 224, 255, 0.2)',
      borderRadius: '8px',
      padding: '12px',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    },
    statIcon: {
      fontSize: '20px',
      marginBottom: '4px'
    },
    statLabel: {
      fontSize: '11px',
      color: '#8899a6',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
      marginBottom: '4px'
    },
    statValue: (color: string) => ({
      fontSize: '18px',
      fontWeight: '600',
      color: color,
      marginBottom: '2px'
    }),
    statDescription: {
      fontSize: '10px',
      color: '#657786',
      marginTop: '4px'
    },
    traitsSection: {
      marginTop: '24px'
    },
    sectionTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#00e0ff',
      marginBottom: '16px',
      textTransform: 'uppercase' as const,
      letterSpacing: '1px'
    },
    traitBar: {
      marginBottom: '12px'
    },
    traitHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '4px'
    },
    traitLabel: {
      fontSize: '12px',
      color: '#e1e8ed'
    },
    traitValue: {
      fontSize: '11px',
      color: '#00e0ff',
      fontWeight: '600'
    },
    traitProgress: {
      height: '8px',
      background: 'rgba(0, 224, 255, 0.1)',
      borderRadius: '4px',
      overflow: 'hidden'
    },
    traitFill: (width: number) => ({
      height: '100%',
      width: `${width}%`,
      background: 'linear-gradient(90deg, #00e0ff 0%, #4fc3f7 100%)',
      borderRadius: '4px',
      transition: 'width 0.3s ease'
    }),
    dnaSection: {
      marginTop: '24px',
      padding: '12px',
      background: 'rgba(0, 224, 255, 0.05)',
      border: '1px solid rgba(0, 224, 255, 0.2)',
      borderRadius: '8px'
    },
    dnaTitle: {
      fontSize: '12px',
      color: '#00e0ff',
      marginBottom: '8px',
      fontWeight: '600'
    },
    dnaCode: {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#8899a6',
      wordBreak: 'break-all' as const,
      lineHeight: '1.4'
    },
    loading: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      height: '200px',
      gap: '12px',
      color: '#8899a6'
    },
    loadingIcon: {
      fontSize: '32px',
      animation: 'pulse 1.5s ease-in-out infinite'
    }
  };

  if (!organism) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingIcon}>⏳</div>
        <div>Chargement des statistiques...</div>
      </div>
    );
  }

  // Date de naissance : createdAt en priorité, birthTime en repli (les
  // organismes plus anciens n'ont que birthTime). Jamais Date.now() — un âge
  // de « 0m, né aujourd'hui » serait un mensonge, formatAge affiche
  // « Inconnu » quand la date manque.
  const birthTimestamp = organism.createdAt ?? organism.birthTime ?? null;

  const stats: Stat[] = [
    {
      label: 'Évolution',
      value: `Stade ${sharedState.evolutionStage}`,
      icon: '🧬',
      color: '#00e0ff',
      description: `${sharedState.experience} XP total`
    },
    {
      label: 'Âge',
      value: formatAge(birthTimestamp),
      icon: '⏰',
      color: '#4fc3f7',
      description: birthTimestamp
        ? `Né le ${new Date(birthTimestamp).toLocaleDateString()}`
        : 'Date de naissance non enregistrée'
    },
    {
      label: 'Pages visitées',
      value: sharedState.pagesVisited,
      icon: '🌐',
      color: '#9c6ade',
      description: 'Sites explorés'
    },
    {
      label: 'Connaissances',
      value: sharedState.knowledgeGained,
      icon: '📚',
      color: '#4caf50',
      description: 'Savoirs acquis'
    },
    {
      label: 'Énergie',
      value: `${clampPercent(sharedState.energy)}%`,
      icon: '⚡',
      color: sharedState.energy < 30 ? '#ff9800' : '#ffd93d',
      description: 'Niveau d\'énergie synchronisé'
    },
    {
      label: 'Conscience',
      value: `${clampPercent(sharedState.consciousness)}%`,
      icon: '🧠',
      color: '#ff9ff3',
      description: 'Niveau de conscience synchronisé'
    },
    {
      label: 'Interactions sociales',
      value: sharedState.socialInteractions,
      icon: '👥',
      color: '#54a0ff',
      description: 'Échanges sociaux'
    },
    {
      label: 'Humeur',
      value: moodLabel(sharedState.mood),
      icon: '😊',
      color: '#48dbfb',
      description: `Page actuelle : ${pageTypeLabel(sharedState.currentPageType)}`
    }
  ];

  // toTraitPercent normalise les deux échelles héritées (0-1 pour l'organisme
  // par défaut du popup, 0-100 pour celui du background) : sans elle, un
  // trait background de 73,4 s'affichait « 7340 % ».
  const traits: ChartData[] = Object.entries(organism.traits).map(([key, value]) => ({
    label: traitLabel(key),
    value: toTraitPercent(value),
    max: 100
  }));

  return (
    <div style={styles.container}>
      {/* Grille de statistiques */}
      <div style={styles.statsGrid}>
        {stats.map((stat, index) => (
          <div
            key={index}
            style={styles.statCard}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 224, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={styles.statIcon}>{stat.icon}</div>
            <div style={styles.statLabel}>{stat.label}</div>
            <div style={styles.statValue(stat.color)}>{stat.value}</div>
            {stat.description && (
              <div style={styles.statDescription}>{stat.description}</div>
            )}
          </div>
        ))}
      </div>

      {/* Section Traits */}
      <div style={styles.traitsSection}>
        <h3 style={styles.sectionTitle}>Traits de personnalité</h3>
        {traits.map((trait, index) => (
          <div key={index} style={styles.traitBar}>
            <div style={styles.traitHeader}>
              <span style={styles.traitLabel}>{trait.label}</span>
              <span style={styles.traitValue}>{trait.value}%</span>
            </div>
            <div style={styles.traitProgress}>
              <div style={styles.traitFill(trait.value)} />
            </div>
          </div>
        ))}
      </div>

      {/* Section ADN */}
      <div style={styles.dnaSection}>
        <div style={styles.dnaTitle}>🧬 Signature ADN</div>
        <div style={styles.dnaCode}>
          {organism.dna.substring(0, 32)}
          <br />
          {organism.dna.substring(32, 64)}
          {organism.dna.length > 64 ? '…' : ''}
        </div>
      </div>

      {/* Animation pulse */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default MetricsPanel;
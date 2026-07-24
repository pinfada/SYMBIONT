import React, { useEffect, useState } from 'react';
import { IndexedDBCoordinator } from '@/core/storage/IndexedDBCoordinator';
import { logger } from '@shared/utils/secureLogger';

interface BehaviorPattern {
  url: string;
  visitCount: number;
  totalTime: number;
  scrollDepth: number;
  lastVisit: number;
  interactions: Array<{ type: string; timestamp: number; data: unknown }>;
}

/**
 * Panneau de prédiction basé sur les données comportementales réelles
 * persistées en IndexedDB par le background (visites, temps passé,
 * interactions). La "prochaine action" est le site le plus probable,
 * pondéré par fréquence et récence des visites observées.
 */
const PredictionPanel: React.FC = () => {
  const [patterns, setPatterns] = useState<BehaviorPattern[]>([]);
  const [nextAction, setNextAction] = useState('');
  const [predicted, setPredicted] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const coordinator = await IndexedDBCoordinator.getInstance();
        const data = await coordinator.getBehaviorPatterns();
        if (!cancelled) {
          setPatterns(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        logger.warn('[PredictionPanel] Failed to load behavior patterns:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /** Score de probabilité : fréquence des visites pondérée par la récence */
  const scorePattern = (p: BehaviorPattern): number => {
    const daysSinceVisit = (Date.now() - (p.lastVisit || 0)) / (24 * 60 * 60 * 1000);
    const recencyWeight = Math.max(0.1, 1 - daysSinceVisit / 30); // décroît sur 30 jours
    return (p.visitCount || 0) * recencyWeight;
  };

  const hostnameOf = (url: string): string => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  const predictNextAction = () => {
    if (patterns.length === 0) {
      setNextAction('Pas encore assez de données de navigation observées');
      return;
    }
    const best = [...patterns].sort((a, b) => scorePattern(b) - scorePattern(a))[0];
    setNextAction(`Visite probable : ${hostnameOf(best.url)} (${best.visitCount} visites observées)`);
  };

  const analyzeDominantBehavior = () => {
    const interactionCounts = new Map<string, number>();
    for (const p of patterns) {
      for (const i of p.interactions || []) {
        interactionCounts.set(i.type, (interactionCounts.get(i.type) || 0) + 1);
      }
    }

    if (interactionCounts.size === 0) {
      const totalVisits = patterns.reduce((sum, p) => sum + (p.visitCount || 0), 0);
      setPredicted(
        totalVisits > 0
          ? `Comportement dominant : navigation (${totalVisits} visites sur ${patterns.length} sites)`
          : 'Aucune interaction observée pour le moment'
      );
      return;
    }

    const [topType, count] = [...interactionCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    setPredicted(`Comportement dominant : ${topType} (${count} interactions réelles)`);
  };

  // Top 5 des sites par score, pour le graphe
  const topPatterns = [...patterns]
    .sort((a, b) => scorePattern(b) - scorePattern(a))
    .slice(0, 5);
  const maxScore = topPatterns.length > 0 ? scorePattern(topPatterns[0]) : 1;

  const totalInteractions = patterns.reduce(
    (sum, p) => sum + (p.interactions?.length || 0),
    0
  );

  return (
    <div className="prediction-panel" data-testid="prediction-panel">
      <h2 data-testid="prediction-title">Prédiction</h2>

      <button data-testid="next-action-btn" onClick={predictNextAction} disabled={loading}>
        Prochaine action
      </button>
      {nextAction && (
        <div data-testid="next-action">
          Prochaine action : <span>{nextAction}</span>
        </div>
      )}

      <button data-testid="simulate-btn" onClick={analyzeDominantBehavior} disabled={loading}>
        Analyser le comportement
      </button>
      {predicted && <div data-testid="predicted-action">{predicted}</div>}

      <section style={{ marginTop: 20 }}>
        <h3>Données observées</h3>
        <svg width="200" height={Math.max(60, topPatterns.length * 18)} data-testid="ml-metrics-graph">
          {topPatterns.map((p, index) => {
            const width = Math.max(4, (scorePattern(p) / maxScore) * 180);
            return (
              <g key={p.url}>
                <rect x="10" y={index * 18 + 4} width={width} height={12} fill="#4caf50" />
                <title>{`${hostnameOf(p.url)} — ${p.visitCount} visites`}</title>
              </g>
            );
          })}
          {topPatterns.length === 0 && (
            <text x="10" y="30" fill="#888" fontSize="12">
              Aucune donnée pour le moment
            </text>
          )}
        </svg>
        <div data-testid="ml-metrics-log">
          {loading
            ? 'Chargement des données comportementales...'
            : `${patterns.length} sites observés | ${totalInteractions} interactions | prédiction par fréquence + récence`}
        </div>
      </section>
    </div>
  );
};

export default PredictionPanel;

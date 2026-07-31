// Visualiseur unifié de l'organisme - Même rendu que dans les pages
import React, { useEffect, useRef, useState } from 'react';
import { organismStateManager } from '@shared/services/OrganismStateManager';
import type { OrganismState } from '@shared/services/OrganismStateManager';
import { OrganismRenderer } from '@shared/rendering/OrganismRenderer';
import { SecureRandom } from '@shared/utils/secureRandom';
import { organismPreferences, RENDER_SCALE } from '@shared/services/OrganismPreferences';

// Créer une valeur par défaut pour l'état initial
const getDefaultState = (): OrganismState => ({
  energy: 75,
  consciousness: 50,
  mood: 'curious',
  evolutionStage: 1,
  experience: 0,
  lastFeedTime: Date.now(),
  pagesVisited: 0,
  knowledgeGained: 0,
  socialInteractions: 0,
  size: 120,
  position: 'bottom-right',
  behavior: 'curious',
  visible: true,
  currentPageType: 'default',
  isActive: true,
  lastUpdate: Date.now()
});

export const UnifiedOrganismViewer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const [state, setState] = useState<OrganismState>(getDefaultState());
  const [tooltipVisible, setTooltipVisible] = useState(false);

  useEffect(() => {
    // Charger l'état actuel au montage
    setState(organismStateManager.getState());

    // S'abonner aux changements d'état
    const unsubscribe = organismStateManager.subscribe((newState) => {
      setState(newState);
    });

    return () => {
      unsubscribe();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    // Rendu de l'organisme via le moteur fractal partagé (WebGL) — même
    // moteur que le rendu background, pour une identité visuelle unifiée.
    const renderer = new OrganismRenderer(canvas);
    if (!renderer.initialize()) return;

    // Graine cosmétique stable et unique par installation → forme reproductible.
    let seed = parseFloat(localStorage.getItem('symbiont_organism_seed') || '');
    if (!(seed >= 0 && seed < 1)) {
      seed = Math.floor(SecureRandom.random() * 100000) / 100000;
      try { localStorage.setItem('symbiont_organism_seed', String(seed)); } catch { /* quota */ }
    }

    let raf = 0;
    const start = Date.now();
    const drawFrame = () => {
      const s = state;
      const prefs = organismPreferences.get();
      renderer.render(
        {
          energy: s.energy / 100,
          seed,
          traits: traitsFromState(s, seed),
          visualState: { color: moodToColor(s.mood), scale: 0.9 },
          // reduce-motion : image figée (t constant) au lieu d'une animation
          time: prefs.reduceMotion ? 0 : (Date.now() - start) / 1000,
        },
        { width: 200, height: 200, renderScale: RENDER_SCALE[prefs.renderQuality] },
      );
    };

    const loop = () => {
      drawFrame();
      raf = requestAnimationFrame(loop);
    };

    // Réagit aux changements de préférences (qualité / reduce-motion)
    const unsubscribe = organismPreferences.subscribe(() => {
      const prefs = organismPreferences.get();
      cancelAnimationFrame(raf);
      if (prefs.reduceMotion) {
        drawFrame(); // une seule image, pas de boucle
      } else {
        loop();
      }
    });

    return () => {
      cancelAnimationFrame(raf);
      unsubscribe();
      renderer.dispose();
    };
  }, [state]);

  // Couleur primaire de l'organisme selon son humeur (RGB normalisé 0-1).
  function moodToColor(mood: OrganismState['mood']): [number, number, number] {
    const palette: Record<string, [number, number, number]> = {
      happy: [0.31, 0.76, 0.97],
      curious: [0.0, 0.88, 1.0],
      excited: [0.0, 1.0, 0.53],
      meditating: [0.70, 0.53, 1.0],
      hungry: [1.0, 0.60, 0.0],
      tired: [0.38, 0.49, 0.55],
    };
    return palette[mood] || palette.curious;
  }

  // Traits dérivés de l'état : forme stable et unique (via la graine),
  // modulée par la conscience (créativité → lobes) et le comportement.
  function traitsFromState(s: OrganismState, seed: number) {
    const f = (o: number) => ((seed * 1000 + o) % 1);
    return {
      curiosity: s.behavior === 'curious' ? 0.9 : 0.35 + f(11) * 0.5,
      focus: s.behavior === 'focused' ? 0.9 : 0.3 + f(23) * 0.5,
      rhythm: 0.4 + f(37) * 0.5,
      empathy: Math.min(1, s.socialInteractions / 20) * 0.6 + 0.2,
      creativity: Math.min(1, s.consciousness / 100),
    };
  }

  const getEvolutionStars = () => {
    return '⭐'.repeat(Math.min(state.evolutionStage, 5));
  };

  const getHealthStatus = () => {
    if (state.energy < 30) return { text: 'Fatigué', color: '#ff9800' };
    if (state.energy < 50) return { text: 'Normal', color: '#ffc107' };
    return { text: 'Énergique', color: '#4caf50' };
  };

  const getConsciousnessLevel = () => {
    if (state.consciousness < 30) return 'Instinctif';
    if (state.consciousness < 60) return 'Éveillé';
    if (state.consciousness < 80) return 'Conscient';
    return 'Transcendant';
  };

  return (
    <div className="unified-organism-viewer">
      <div className="organism-canvas-container">
        <canvas
          ref={canvasRef}
          className="organism-canvas"
          onMouseEnter={() => setTooltipVisible(true)}
          onMouseLeave={() => setTooltipVisible(false)}
        />

        {tooltipVisible && (
          <div className="organism-tooltip">
            <div className="tooltip-row">
              <span>Humeur:</span>
              <span>{state.mood}</span>
            </div>
            <div className="tooltip-row">
              <span>Type de page:</span>
              <span>{state.currentPageType}</span>
            </div>
            <div className="tooltip-row">
              <span>XP total:</span>
              <span>{state.experience}</span>
            </div>
          </div>
        )}
      </div>

      <div className="organism-stats">
        <div className="stat-row">
          <span className="stat-label">Évolution</span>
          <span className="stat-value">{getEvolutionStars()} Niveau {state.evolutionStage}</span>
        </div>

        <div className="stat-row">
          <span className="stat-label">Énergie</span>
          <div className="stat-bar-container">
            <div
              className="stat-bar energy-bar"
              style={{ width: `${state.energy}%` }}
            />
            <span className="stat-percentage">{Math.round(state.energy)}%</span>
          </div>
        </div>

        <div className="stat-row">
          <span className="stat-label">Conscience</span>
          <div className="stat-bar-container">
            <div
              className="stat-bar consciousness-bar"
              style={{ width: `${state.consciousness}%` }}
            />
            <span className="stat-percentage">{getConsciousnessLevel()}</span>
          </div>
        </div>

        <div className="stat-info">
          <div className="info-item">
            <span className="info-label">Santé:</span>
            <span className="info-value" style={{ color: getHealthStatus().color }}>
              {getHealthStatus().text}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Pages visitées:</span>
            <span className="info-value">{state.pagesVisited}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Connaissances:</span>
            <span className="info-value">{state.knowledgeGained}</span>
          </div>
        </div>
      </div>

      <style>{`
        .unified-organism-viewer {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .organism-canvas-container {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          background: linear-gradient(135deg, #0a0e1a 0%, #0f1419 100%);
          border-radius: 12px;
          padding: 20px;
          border: 1px solid rgba(0, 224, 255, 0.1);
        }

        .organism-canvas {
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0, 224, 255, 0.05) 0%, transparent 70%);
        }

        .organism-tooltip {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.9);
          border: 1px solid rgba(0, 224, 255, 0.3);
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 11px;
          z-index: 10;
        }

        .tooltip-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin: 4px 0;
          color: #8899a6;
        }

        .tooltip-row span:last-child {
          color: #00e0ff;
        }

        .organism-stats {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .stat-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .stat-label {
          font-size: 12px;
          color: #8899a6;
          min-width: 80px;
        }

        .stat-value {
          font-size: 13px;
          color: #00e0ff;
          font-weight: 500;
        }

        .stat-bar-container {
          flex: 1;
          height: 8px;
          background: rgba(0, 224, 255, 0.1);
          border-radius: 4px;
          position: relative;
          overflow: hidden;
        }

        .stat-bar {
          height: 100%;
          border-radius: 4px;
          transition: width 0.5s ease;
          position: relative;
        }

        .energy-bar {
          background: linear-gradient(90deg, #ff9800, #4caf50);
        }

        .consciousness-bar {
          background: linear-gradient(90deg, #00e0ff, #b388ff);
        }

        .stat-percentage {
          position: absolute;
          right: 4px;
          top: -2px;
          font-size: 10px;
          color: white;
          text-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
        }

        .stat-info {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(0, 224, 255, 0.1);
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
        }

        .info-label {
          color: #8899a6;
        }

        .info-value {
          color: #4fc3f7;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};
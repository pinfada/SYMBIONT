// Visualiseur unifié de l'organisme - Même rendu que dans les pages
import React, { useEffect, useRef, useState } from 'react';
import { organismStateManager } from '@shared/services/OrganismStateManager';
import type { OrganismState } from '@shared/services/OrganismStateManager';

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
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configuration du canvas
    canvas.width = 200;
    canvas.height = 200;

    // Particules pour l'organisme
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      life: number;
      color: string;
    }> = [];

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Créer les particules initiales
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: centerX + (Math.random() - 0.5) * 40,
        y: centerY + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 3 + 1,
        life: 1,
        color: getParticleColor(state)
      });
    }

    // Animation
    const animate = () => {
      ctx.fillStyle = 'rgba(15, 20, 25, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle, index) => {
        // Mise à jour de la position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Attraction vers le centre
        const dx = centerX - particle.x;
        const dy = centerY - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 5) {
          particle.vx += dx * 0.001;
          particle.vy += dy * 0.001;
        }

        // Friction
        particle.vx *= 0.98;
        particle.vy *= 0.98;

        // Diminution de vie
        particle.life -= 0.005;

        // Dessin de la particule
        ctx.save();
        ctx.globalAlpha = particle.life * (state.energy / 100);
        ctx.fillStyle = particle.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = particle.color;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Régénération des particules mortes
        if (particle.life <= 0) {
          particles[index] = {
            x: centerX + (Math.random() - 0.5) * 20,
            y: centerY + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size: Math.random() * 3 + 1,
            life: 1,
            color: getParticleColor(state)
          };
        }
      });

      // Noyau central pulsant
      const pulseSize = 15 + Math.sin(Date.now() * 0.002) * 5;
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulseSize);
      gradient.addColorStop(0, getCoreColor(state));
      gradient.addColorStop(0.5, getSecondaryColor(state));
      gradient.addColorStop(1, 'rgba(0, 224, 255, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, pulseSize, 0, Math.PI * 2);
      ctx.fill();

      // Indicateur d'humeur
      drawMoodIndicator(ctx, state, centerX, centerY);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [state]);

  function getParticleColor(state: OrganismState): string {
    const colors: Record<string, string> = {
      happy: '#4fc3f7',
      curious: '#00e0ff',
      excited: '#00ff88',
      meditating: '#b388ff',
      hungry: '#ff9800',
      tired: '#607d8b'
    };
    return colors[state.mood] || '#00e0ff';
  }

  function getCoreColor(state: OrganismState): string {
    if (state.energy < 30) return 'rgba(255, 152, 0, 0.8)';
    if (state.consciousness > 70) return 'rgba(179, 136, 255, 0.8)';
    return 'rgba(0, 224, 255, 0.8)';
  }

  function getSecondaryColor(state: OrganismState): string {
    if (state.energy < 30) return 'rgba(255, 87, 34, 0.4)';
    if (state.consciousness > 70) return 'rgba(124, 77, 255, 0.4)';
    return 'rgba(79, 195, 247, 0.4)';
  }

  function drawMoodIndicator(
    ctx: CanvasRenderingContext2D,
    state: OrganismState,
    centerX: number,
    centerY: number
  ): void {
    const moodEmojis: Record<string, string> = {
      happy: '😊',
      curious: '🤔',
      excited: '🤩',
      meditating: '🧘',
      hungry: '🤤',
      tired: '😴'
    };

    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(moodEmojis[state.mood] || '🧬', centerX, centerY - 40);
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
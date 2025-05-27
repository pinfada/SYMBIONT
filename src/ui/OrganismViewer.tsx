import React, { useEffect, useRef, useState } from 'react';
import { OrganismEngine } from '../generative/OrganismEngine';
import { OrganismTraits, PerformanceMetrics } from '../types';

/**
 * OrganismViewer - Composant React pour visualisation WebGL de l'organisme
 * Props :
 *   - dna : code ADN de l'organisme
 *   - traits : traits comportementaux (optionnel)
 *   - width, height : dimensions du canvas
 *   - onMetrics : callback pour recevoir les métriques de performance
 */
interface OrganismViewerProps {
  dna: string;
  traits?: OrganismTraits;
  width?: number;
  height?: number;
  onMetrics?: (metrics: PerformanceMetrics) => void;
}

export const OrganismViewer: React.FC<OrganismViewerProps> = ({
  dna,
  traits,
  width = 320,
  height = 320,
  onMetrics
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<OrganismEngine | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  // Initialisation et cleanup du moteur WebGL
  useEffect(() => {
    if (!canvasRef.current) return;
    engineRef.current = new OrganismEngine(canvasRef.current, dna);
    let running = true;

    // Boucle de rendu
    const renderLoop = () => {
      if (!running || !engineRef.current) return;
      engineRef.current.render();
      const m = engineRef.current.getPerformanceMetrics();
      setMetrics(m);
      if (onMetrics) onMetrics(m);
      requestAnimationFrame(renderLoop);
    };
    renderLoop();

    return () => {
      running = false;
      engineRef.current?.cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dna]);

  // Mise à jour des traits si modifiés
  useEffect(() => {
    if (engineRef.current && traits) {
      // engineRef.current.setTraits(traits); // À activer si API disponible
    }
  }, [traits]);

  return (
    <div style={{ display: 'inline-block', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ border: '1px solid #222', background: '#111', borderRadius: 8 }}
      />
      {metrics && (
        <div style={{
          position: 'absolute',
          left: 8,
          top: 8,
          background: 'rgba(0,0,0,0.7)',
          color: '#fff',
          fontSize: 12,
          padding: '4px 8px',
          borderRadius: 4
        }}>
          <div>FPS : {metrics.fps}</div>
          <div>GPU : {(metrics.gpuLoad * 100).toFixed(0)}%</div>
          <div>RAM : {metrics.memoryUsage.toFixed(1)} Mo</div>
        </div>
      )}
    </div>
  );
}; 
// src/popup/hooks/useOrganism.ts
import { useContext } from 'react';
import { OrganismContext } from '../contexts/OrganismContext';

export const useOrganism = () => {
  const context = useContext(OrganismContext);
  if (!context) {
    throw new Error('useOrganism must be used within OrganismProvider');
  }
  return context;
};

// src/popup/hooks/useWebGL.ts
import { useRef, useEffect, useState } from 'react';
import { OrganismState } from '../../types/organism';

export const useWebGL = () => {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const engineRef = useRef<any>(null);
  
  useEffect(() => {
    // Vérifier le support WebGL
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    setIsSupported(!!gl);
  }, []);
  
  const initWebGL = async (canvas: HTMLCanvasElement, organism: OrganismState) => {
    // Lazy load le moteur WebGL
    const { OrganismEngine } = await import('../../generative/OrganismEngine');
    
    engineRef.current = new OrganismEngine(canvas, organism);
    
    // Animation loop
    let animationId: number;
    let lastTime = 0;
    
    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      
      if (engineRef.current) {
        engineRef.current.render(deltaTime);
      }
      
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    
    // Cleanup function
    return () => {
      cancelAnimationFrame(animationId);
      if (engineRef.current) {
        engineRef.current.cleanup();
        engineRef.current = null;
      }
    };
  };
  
  return {
    isSupported,
    initWebGL,
    engine: engineRef.current
  };
};
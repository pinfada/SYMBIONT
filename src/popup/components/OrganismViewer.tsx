// src/popup/components/OrganismViewer.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useOrganism } from '../hooks/useOrganism';

export const OrganismViewer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { organism } = useOrganism();
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    if (!canvasRef.current || !organism) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    let animationId: number;
    
    const animate = () => {
      const time = Date.now() * 0.001; // Convert to seconds
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Create a simple visual representation based on DNA
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Enhanced background with particle field
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 250);
      gradient.addColorStop(0, '#0a0d15');
      gradient.addColorStop(0.3, '#12151f');
      gradient.addColorStop(0.7, '#1a1f2e');
      gradient.addColorStop(1, '#0f1419');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add animated particles for depth
      for (let i = 0; i < 15; i++) {
        const particleX = (i * 127 + time * 20) % canvas.width;
        const particleY = (i * 73 + time * 15) % canvas.height;
        const particleSize = 1 + Math.sin(time * 3 + i) * 0.5;
        const particleOpacity = 0.1 + Math.sin(time * 2 + i * 0.5) * 0.1;
        
        ctx.fillStyle = `rgba(0, 224, 255, ${particleOpacity})`;
        ctx.beginPath();
        ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Generate visual based on DNA
      const dnaValue = organism.dna.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const numNodes = 6 + (dnaValue % 6);
      const baseRadius = 60 + (dnaValue % 40);
      
      // Add pulsing effect
      const pulseEffect = Math.sin(time * 2) * 10;
      const radius = baseRadius + pulseEffect;
      
      // Draw organism nodes with rotation
      const rotation = time * 0.5;
      
      for (let i = 0; i < numNodes; i++) {
        const angle = (i / numNodes) * Math.PI * 2 + rotation;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        // Enhanced node with multiple layers and energy pulses
        const breathingEffect = Math.sin(time * 3 + i) * 6 + 18;
        
        // Outer energy field
        const outerGradient = ctx.createRadialGradient(x, y, 0, x, y, breathingEffect * 1.5);
        outerGradient.addColorStop(0, 'rgba(0, 224, 255, 0.4)');
        outerGradient.addColorStop(0.3, 'rgba(79, 195, 247, 0.2)');
        outerGradient.addColorStop(0.7, 'rgba(156, 106, 222, 0.1)');
        outerGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = outerGradient;
        ctx.beginPath();
        ctx.arc(x, y, breathingEffect * 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Main node with enhanced gradient
        const nodeGradient = ctx.createRadialGradient(x, y, 0, x, y, breathingEffect);
        nodeGradient.addColorStop(0, '#00e0ff');
        nodeGradient.addColorStop(0.3, '#4fc3f7');
        nodeGradient.addColorStop(0.7, '#9c6ade');
        nodeGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = nodeGradient;
        ctx.beginPath();
        ctx.arc(x, y, breathingEffect, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner core
        const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, breathingEffect * 0.4);
        coreGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        coreGradient.addColorStop(0.5, 'rgba(0, 224, 255, 0.6)');
        coreGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(x, y, breathingEffect * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        // Enhanced connections with energy flow
        const connectionOpacity = 0.4 + Math.sin(time * 2 + i * 0.5) * 0.3;
        const lineWidth = 2 + Math.sin(time * 4 + i) * 0.5;
        
        // Create gradient line
        const lineGradient = ctx.createLinearGradient(centerX, centerY, x, y);
        lineGradient.addColorStop(0, `rgba(0, 224, 255, ${connectionOpacity * 0.8})`);
        lineGradient.addColorStop(0.5, `rgba(79, 195, 247, ${connectionOpacity})`);
        lineGradient.addColorStop(1, `rgba(156, 106, 222, ${connectionOpacity * 0.6})`);
        
        ctx.strokeStyle = lineGradient;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.shadowColor = '#00e0ff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Energy flow particles along connections
        const flowProgress = (time + i * 0.3) % 2;
        if (flowProgress <= 1) {
          const flowX = centerX + (x - centerX) * flowProgress;
          const flowY = centerY + (y - centerY) * flowProgress;
          const flowSize = 3 + Math.sin(time * 6 + i) * 1;
          
          ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * (1 - flowProgress)})`;
          ctx.beginPath();
          ctx.arc(flowX, flowY, flowSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      // Enhanced central core with multi-layer consciousness representation
      const consciousnessLevel = organism.consciousness || 0.5;
      const baseCoreSize = 30 + consciousnessLevel * 20;
      const consciousnessPulse = Math.sin(time * 4) * 10;
      const coreSize = baseCoreSize + consciousnessPulse;
      
      // Outer consciousness field
      const outerConsciousnessGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreSize * 1.8);
      outerConsciousnessGradient.addColorStop(0, `rgba(0, 224, 255, ${consciousnessLevel * 0.3})`);
      outerConsciousnessGradient.addColorStop(0.4, `rgba(79, 195, 247, ${consciousnessLevel * 0.2})`);
      outerConsciousnessGradient.addColorStop(0.8, `rgba(156, 106, 222, ${consciousnessLevel * 0.1})`);
      outerConsciousnessGradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = outerConsciousnessGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreSize * 1.8, 0, Math.PI * 2);
      ctx.fill();
      
      // Main core with enhanced gradient
      const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreSize);
      coreGradient.addColorStop(0, '#ffffff');
      coreGradient.addColorStop(0.2, '#00e0ff');
      coreGradient.addColorStop(0.5, '#4fc3f7');
      coreGradient.addColorStop(0.8, '#9c6ade');
      coreGradient.addColorStop(1, '#003366');
      
      ctx.shadowColor = '#00e0ff';
      ctx.shadowBlur = 20;
      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Inner light core
      const innerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreSize * 0.3);
      innerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      innerGradient.addColorStop(0.5, 'rgba(0, 224, 255, 0.7)');
      innerGradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = innerGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreSize * 0.3, 0, Math.PI * 2);
      ctx.fill();
      
      // Enhanced consciousness rings with gradient effects
      for (let ring = 1; ring <= 4; ring++) {
        const ringRadius = coreSize + ring * 18 + Math.sin(time * 3 + ring * 0.8) * 7;
        const ringOpacity = consciousnessLevel * 0.4 * (1 - ring * 0.15);
        
        // Create gradient for ring
        const ringGradient = ctx.createConicGradient(time + ring, centerX, centerY);
        ringGradient.addColorStop(0, `rgba(0, 224, 255, ${ringOpacity})`);
        ringGradient.addColorStop(0.25, `rgba(79, 195, 247, ${ringOpacity * 0.8})`);
        ringGradient.addColorStop(0.5, `rgba(156, 106, 222, ${ringOpacity * 0.6})`);
        ringGradient.addColorStop(0.75, `rgba(231, 133, 193, ${ringOpacity * 0.8})`);
        ringGradient.addColorStop(1, `rgba(0, 224, 255, ${ringOpacity})`);
        
        ctx.strokeStyle = ringGradient;
        ctx.lineWidth = 3 - ring * 0.3;
        ctx.shadowColor = '#00e0ff';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      
      // DNA signature text with slight glow
      ctx.shadowColor = '#00e0ff';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#00e0ff';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`ADN: ${organism.dna.substring(0, 8)}...`, centerX, canvas.height - 20);
      ctx.shadowBlur = 0;
      
      animationId = requestAnimationFrame(animate);
    };
    
    setIsInitialized(true);
    animate();
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [organism]);
  
  if (!organism) {
    return (
      <div className="organism-loading-container">
        <div className="organism-loading-content">
          <div className="quantum-loader">
            <div className="quantum-ring"></div>
            <div className="quantum-ring"></div>
            <div className="quantum-ring"></div>
            <div className="quantum-core"></div>
          </div>
          <p className="loading-text">Initialisation de l'organisme quantique...</p>
          <div className="loading-progress">
            <div className="progress-bar"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="organism-viewer-container">
      <canvas 
        ref={canvasRef}
        className="organism-canvas"
        width={400}
        height={300}
        data-testid="organism-canvas"
        title="Observez votre organisme évolutif en temps réel"
      />
      
      {isInitialized && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white p-2 rounded text-xs">
          <div>Génération: {organism.generation}</div>
          <div>Conscience: {Math.round((organism.consciousness || 0.5) * 100)}%</div>
          <div>Mutations: {organism.mutations?.length || 0}</div>
          <div className="text-gray-400 mt-1">Vivant depuis {Math.floor((Date.now() - (organism.createdAt || Date.now())) / 1000 / 60)} min</div>
        </div>
      )}
      
      <div className="absolute bottom-2 left-2 text-xs text-gray-400">
        Organisme SYMBIONT • État: Actif
      </div>
      
      <div className="absolute bottom-2 right-2 text-xs text-blue-400">
        ⚡ Animation en temps réel
      </div>
    </div>
  );
};

// Add enhanced CSS for the new components
const organismViewerStyles = `
.organism-loading-container {
  width: 100%;
  height: 384px;
  background: linear-gradient(135deg, #0a0d15 0%, #12151f 50%, #1a1f2e 100%);
  border-radius: 16px;
  border: 1px solid rgba(0, 224, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.organism-loading-content {
  text-align: center;
  z-index: 2;
}

.quantum-loader {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
}

.quantum-ring {
  position: absolute;
  inset: 0;
  border: 2px solid transparent;
  border-top: 2px solid #00e0ff;
  border-radius: 50%;
  animation: quantumSpin 2s linear infinite;
}

.quantum-ring:nth-child(2) {
  inset: 8px;
  border-top-color: #4fc3f7;
  animation-duration: 1.5s;
  animation-direction: reverse;
}

.quantum-ring:nth-child(3) {
  inset: 16px;
  border-top-color: #9c6ade;
  animation-duration: 1s;
}

.quantum-core {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 16px;
  height: 16px;
  background: radial-gradient(circle, #00e0ff, #4fc3f7);
  border-radius: 50%;
  box-shadow: 0 0 16px rgba(0, 224, 255, 0.6);
  animation: quantumPulse 1.5s ease-in-out infinite;
}

@keyframes quantumSpin {
  to { transform: rotate(360deg); }
}

@keyframes quantumPulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.2); }
}

.loading-text {
  color: #cbd5e1;
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 16px;
  text-shadow: 0 0 10px rgba(0, 224, 255, 0.3);
}

.loading-progress {
  width: 200px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
  margin: 0 auto;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #00e0ff, #4fc3f7, #9c6ade);
  border-radius: 2px;
  animation: progressFlow 2s ease-in-out infinite;
}

@keyframes progressFlow {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}

.organism-viewer-container {
  position: relative;
  width: 100%;
  height: 384px;
  background: linear-gradient(135deg, #000000 0%, #0a0d15 100%);
  border-radius: 16px;
  border: 1px solid rgba(0, 224, 255, 0.15);
  overflow: hidden;
  box-shadow: 
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 8px 32px rgba(0, 224, 255, 0.1);
}

.organism-canvas {
  width: 100%;
  height: 100%;
  cursor: crosshair;
  transition: filter 0.3s ease;
}

.organism-canvas:hover {
  filter: brightness(1.1) saturate(1.1);
}

.organism-stats-panel {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(10, 13, 21, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 224, 255, 0.2);
  border-radius: 12px;
  padding: 16px;
  min-width: 160px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.stat-item:last-child {
  margin-bottom: 0;
}

.stat-label {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 500;
}

.stat-value {
  color: #f1f5f9;
  font-size: 13px;
  font-weight: 700;
  text-shadow: 0 0 8px currentColor;
}

.consciousness-value {
  color: #00e0ff;
}

.mutations-value {
  color: #9c6ade;
}

.age-stat {
  padding-top: 8px;
  border-top: 1px solid rgba(0, 224, 255, 0.1);
  margin-top: 8px;
}

.organism-status-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 48px;
  background: linear-gradient(to top, rgba(10, 13, 21, 0.9), transparent);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  border-top: 1px solid rgba(0, 224, 255, 0.1);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 12px rgba(34, 197, 94, 0.6);
  animation: statusPulse 2s ease-in-out infinite;
}

.status-text {
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 500;
}

.realtime-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pulse-icon {
  color: #4fc3f7;
  font-size: 14px;
  animation: iconPulse 1.5s ease-in-out infinite;
}

.realtime-text {
  color: #4fc3f7;
  font-size: 12px;
  font-weight: 600;
}

@keyframes iconPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.8; }
}
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('organism-viewer-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'organism-viewer-styles';
  styleElement.textContent = organismViewerStyles;
  document.head.appendChild(styleElement);
}
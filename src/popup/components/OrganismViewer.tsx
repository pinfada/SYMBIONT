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
      
      // Background gradient
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 200);
      gradient.addColorStop(0, '#001122');
      gradient.addColorStop(1, '#000811');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
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
        
        // Node glow effect with breathing
        const breathingEffect = Math.sin(time * 3 + i) * 5 + 15;
        const nodeGradient = ctx.createRadialGradient(x, y, 0, x, y, breathingEffect);
        nodeGradient.addColorStop(0, '#00e0ff');
        nodeGradient.addColorStop(0.5, '#0080aa');
        nodeGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = nodeGradient;
        ctx.beginPath();
        ctx.arc(x, y, breathingEffect, 0, Math.PI * 2);
        ctx.fill();
        
        // Connect to center with animated opacity
        const connectionOpacity = 0.3 + Math.sin(time * 2 + i * 0.5) * 0.2;
        ctx.strokeStyle = `rgba(0, 224, 255, ${connectionOpacity})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      
      // Central core with consciousness pulse
      const consciousnessLevel = organism.consciousness || 0.5;
      const coreSize = 25 + consciousnessLevel * 15 + Math.sin(time * 4) * 8;
      const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreSize);
      coreGradient.addColorStop(0, '#00e0ff');
      coreGradient.addColorStop(0.6, '#0066aa');
      coreGradient.addColorStop(1, '#003366');
      
      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Add consciousness rings
      for (let ring = 1; ring <= 3; ring++) {
        const ringRadius = coreSize + ring * 15 + Math.sin(time * 3 + ring) * 5;
        const ringOpacity = consciousnessLevel * 0.3 * (1 - ring * 0.2);
        ctx.strokeStyle = `rgba(0, 224, 255, ${ringOpacity})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
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
      <div className="w-full h-96 bg-gray-900 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner loading-spinner--medium"></div>
          <p className="text-gray-400 mt-4">Chargement de l'organisme...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative w-full h-96 bg-black rounded-lg overflow-hidden border border-gray-700">
      <canvas 
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        width={400}
        height={300}
        data-testid="organism-canvas"
        title="Cliquez pour observer votre organisme de plus près"
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
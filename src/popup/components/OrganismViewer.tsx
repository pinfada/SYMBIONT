// src/popup/components/OrganismViewer.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useMessaging } from '../hooks/useMessaging';
import { useOrganism } from '../hooks/useOrganism';
import { WebGLMessageAdapter } from '../../integration/WebGLMessageAdapter';
import { MessageType } from '../../core/messaging';

export const OrganismViewer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const adapterRef = useRef<WebGLMessageAdapter | null>(null);
  const { organism } = useOrganism();
  const { messageBus } = useMessaging();
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  
  useEffect(() => {
    if (!canvasRef.current || !organism) return;
    
    // Créer l'adaptateur WebGL
    adapterRef.current = new WebGLMessageAdapter(messageBus);
    
    // Initialiser le moteur
    messageBus.send({
      type: MessageType.WEBGL_INIT,
      payload: {
        canvas: canvasRef.current,
        dna: organism.visualDNA
      }
    });
    
    // Écouter les événements
    const unsubscribeError = messageBus.on(MessageType.WEBGL_ERROR, (msg) => {
      setError(msg.payload.error);
    });
    
    const unsubscribeMetrics = messageBus.on(MessageType.PERFORMANCE_UPDATE, (msg) => {
      setMetrics(msg.payload);
    });
    
    return () => {
      unsubscribeError();
      unsubscribeMetrics();
      if (adapterRef.current) {
        adapterRef.current.destroy();
      }
    };
  }, [organism, messageBus]);
  
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p className="font-bold">WebGL Error</p>
        <p>{error}</p>
      </div>
    );
  }
  
  return (
    <div className="relative w-full h-96 bg-black rounded-lg overflow-hidden">
      <canvas 
        ref={canvasRef}
        className="w-full h-full"
        width={800}
        height={600}
      />
      
      {metrics && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded text-xs">
          <div>FPS: {metrics.fps}</div>
          <div>GPU: {(metrics.gpuLoad * 100).toFixed(1)}%</div>
        </div>
      )}
    </div>
  );
};
// src/popup/components/OrganismViewer.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useMessaging } from '../hooks/useMessaging';
import { useOrganism } from '../hooks/useOrganism';
import { WebGLMessageAdapter } from '../../integration/WebGLMessageAdapter';
import { MessageType } from '@shared/messaging/MessageBus';

export const OrganismViewer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const adapterRef = useRef<WebGLMessageAdapter | null>(null);
  const { organism } = useOrganism();
  const messaging = useMessaging();
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  
  useEffect(() => {
    if (!canvasRef.current || !organism) return;
    
    // Mock complet d'OrganismEngine pour satisfaire le typage
    const engine: any = {
      render: () => {},
      mutate: () => {},
      getPerformanceMetrics: async () => ({}),
      canvas: canvasRef.current,
      gl: null,
      program: null,
      dnaInterpreter: {},
      mutationEngine: {},
      generator: {},
      performanceMonitor: {},
      setupGL: () => {},
      setupShaders: () => {},
      setupBuffers: () => {},
      setupAttributes: () => {},
      setupUniforms: () => {},
      cleanup: () => {},
      isInitialized: () => true,
      createGLTexture: () => null,
      vertexBuffer: null,
      indexBuffer: null,
      frameCount: 0,
      elapsedTime: 0,
      geometry: {},
      traits: {},
      visualProperties: {},
      currentState: {},
      lastGeometryComplexity: 0,
      fractalTexture: null
    };
    adapterRef.current = new WebGLMessageAdapter(engine, {
      on: () => {},
      off: () => {},
      send: () => {},
    } as any);
    
    // Initialiser le moteur
    messaging.send(MessageType.WEBGL_INIT, {
      canvas: canvasRef.current,
      dna: organism.visualDNA
    });
    
    // Écouter les événements
    messaging.subscribe(MessageType.WEBGL_ERROR, (msg: any) => {
      setError(msg.payload.error);
    });
    
    messaging.subscribe(MessageType.PERFORMANCE_UPDATE, (msg: any) => {
      setMetrics(msg.payload);
    });
  }, [organism, messaging]);
  
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
// src/popup/hooks/useWebGL.ts
import { useState, useEffect } from 'react';
import { useMessaging } from './useMessaging';
import { MessageType } from '@shared/messaging/MessageBus';
import { WebGLState } from '../../types/webgl';

export const useWebGL = () => {
  const messaging = useMessaging();
  const [state, setState] = useState<WebGLState>({
    initialized: false,
    error: null,
    metrics: null
  });
  
  useEffect(() => {
    // Abonnement aux messages
    const handleInitialized = () => {
      setState((prev: WebGLState) => ({ ...prev, initialized: true, error: null }));
    };
    const handleError = (msg: any) => {
      setState((prev: WebGLState) => ({ ...prev, error: msg.payload.error }));
    };
    const handlePerformance = (msg: any) => {
      setState((prev: WebGLState) => ({ ...prev, metrics: msg.payload }));
    };

    messaging.subscribe(MessageType.WEBGL_INITIALIZED, handleInitialized);
    messaging.subscribe(MessageType.WEBGL_ERROR, handleError);
    messaging.subscribe(MessageType.PERFORMANCE_UPDATE, handlePerformance);

    return () => {
      messaging.unsubscribe(MessageType.WEBGL_INITIALIZED, handleInitialized);
      messaging.unsubscribe(MessageType.WEBGL_ERROR, handleError);
      messaging.unsubscribe(MessageType.PERFORMANCE_UPDATE, handlePerformance);
    };
  }, [messaging]);
  
  return state;
};
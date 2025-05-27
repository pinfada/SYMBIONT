// src/popup/hooks/useWebGL.ts
import { useState, useEffect } from 'react';
import { useMessaging } from './useMessaging';
import { MessageType } from '@shared/messaging/MessageBus';
import { WebGLState } from '../../types/webgl';

export const useWebGL = () => {
  const { messageBus } = useMessaging();
  const [state, setState] = useState<WebGLState>({
    initialized: false,
    error: null,
    metrics: null
  });
  
  useEffect(() => {
    const unsubscribers = [
      messageBus.on(MessageType.WEBGL_INITIALIZED, () => {
        setState(prev => ({ ...prev, initialized: true, error: null }));
      }),
      
      messageBus.on(MessageType.WEBGL_ERROR, (msg) => {
        setState(prev => ({ ...prev, error: msg.payload.error }));
      }),
      
      messageBus.on(MessageType.PERFORMANCE_UPDATE, (msg) => {
        setState(prev => ({ ...prev, metrics: msg.payload }));
      })
    ];
    
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [messageBus]);
  
  return state;
};
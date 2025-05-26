// src/popup/hooks/useMessaging.ts
import { useEffect, useRef } from 'react';
import { useMessageBus } from '../contexts/MessageBusContext';

export const useMessaging = () => {
  const messageBus = useMessageBus();
  const handlersRef = useRef<Map<string, Function>>(new Map());
  
  const subscribe = (type: string, handler: Function) => {
    messageBus.on(type, handler);
    handlersRef.current.set(type, handler);
  };
  
  const unsubscribe = (type: string, handler: Function) => {
    messageBus.off(type, handler);
    handlersRef.current.delete(type);
  };
  
  const send = (type: string, payload: any) => {
    messageBus.send(type, payload);
  };
  
  // Cleanup all handlers on unmount
  useEffect(() => {
    return () => {
      handlersRef.current.forEach((handler, type) => {
        messageBus.off(type, handler);
      });
      handlersRef.current.clear();
    };
  }, [messageBus]);
  
  return {
    subscribe,
    unsubscribe,
    send
  };
};

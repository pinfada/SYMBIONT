import React, { createContext, useContext, ReactNode } from 'react';
import { MessageBus } from '../../core/messaging/MessageBus';

// Singleton du bus de messages pour le contexte popup
const messageBus = new MessageBus('popup');

const MessageBusContext = createContext<MessageBus | null>(null);

export const MessageBusProvider = ({ children }: { children: ReactNode }) => (
  <MessageBusContext.Provider value={messageBus}>
    {children}
  </MessageBusContext.Provider>
);

export const useMessageBus = (): MessageBus => {
  const context = useContext(MessageBusContext);
  if (!context) {
    throw new Error('useMessageBus doit être utilisé dans un MessageBusProvider');
  }
  return context;
}; 
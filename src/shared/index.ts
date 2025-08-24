// Export centralisé pour le module shared
export * from './messaging/MessageBus';
export * from './observers/NavigationObserver';
export * from './utils';

// Nouveaux exports de sécurité
export { SecurityMonitor } from './security/SecurityMonitor';
export { SecureMessageBus } from './messaging/SecureMessageBus';
export type { SecurityEvent } from './security/SecurityMonitor'; 
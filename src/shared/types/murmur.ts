// Type centralisé pour les murmures (cognition réflexive)

export interface Murmur {
  text: string;
  context?: string;
  timestamp: number;
  pattern?: string; // ex : 'routine', 'exploration', etc.
} 
// Utilitaires de sérialisation pour SYMBIONT
// Gère la sérialisation sécurisée des objets complexes

export interface SerializableOrganismState {
  id: string;
  generation: number;
  health: number;
  energy: number;
  traits: Record<string, number>;
  visualDNA: string;
  lastMutation: number;
  mutations: Array<{
    type: string;
    trigger: string;
    magnitude: number;
    timestamp: number;
  }>;
  createdAt: number;
  dna: string;
  birthTime: number;
  socialConnections: Array<{
    id: string;
    type: string;
    strength: number;
  }>;
  memoryFragments: Array<{
    id: string;
    content: string;
    timestamp: number;
  }>;
}

export function sanitizeOrganismState(state: any): SerializableOrganismState | null {
  if (!state) return null;
  
  try {
    return {
      id: String(state.id || ''),
      generation: Number(state.generation || 1),
      health: Number(state.health || 100),
      energy: Number(state.energy || 100),
      traits: sanitizeTraits(state.traits),
      visualDNA: String(state.visualDNA || state.dna || ''),
      lastMutation: Number(state.lastMutation || Date.now()),
      mutations: sanitizeMutations(state.mutations),
      createdAt: Number(state.createdAt || Date.now()),
      dna: String(state.dna || state.visualDNA || ''),
      birthTime: Number(state.birthTime || state.createdAt || Date.now()),
      socialConnections: sanitizeSocialConnections(state.socialConnections),
      memoryFragments: sanitizeMemoryFragments(state.memoryFragments)
    };
  } catch (error) {
    console.error('Failed to sanitize organism state:', error);
    return null;
  }
}

function sanitizeTraits(traits: any): Record<string, number> {
  if (!traits || typeof traits !== 'object') {
    return {
      curiosity: 50,
      focus: 50,
      rhythm: 50,
      empathy: 50,
      creativity: 50
    };
  }
  
  const sanitized: Record<string, number> = {};
  for (const [key, value] of Object.entries(traits)) {
    if (typeof key === 'string' && typeof value === 'number' && !isNaN(value)) {
      sanitized[key] = Math.max(0, Math.min(100, value));
    }
  }
  
  return sanitized;
}

function sanitizeMutations(mutations: any): Array<{type: string; trigger: string; magnitude: number; timestamp: number}> {
  if (!Array.isArray(mutations)) return [];
  
  return mutations
    .filter(m => m && typeof m === 'object')
    .map(m => ({
      type: String(m.type || 'unknown'),
      trigger: String(m.trigger || 'unknown'),
      magnitude: Number(m.magnitude || 0),
      timestamp: Number(m.timestamp || Date.now())
    }))
    .slice(-10); // Garde seulement les 10 dernières mutations
}

function sanitizeSocialConnections(connections: any): Array<{id: string; type: string; strength: number}> {
  if (!Array.isArray(connections)) return [];
  
  return connections
    .filter(c => c && typeof c === 'object')
    .map(c => ({
      id: String(c.id || ''),
      type: String(c.type || 'unknown'),
      strength: Number(c.strength || 0)
    }))
    .slice(-20); // Limite à 20 connexions
}

function sanitizeMemoryFragments(fragments: any): Array<{id: string; content: string; timestamp: number}> {
  if (!Array.isArray(fragments)) return [];
  
  return fragments
    .filter(f => f && typeof f === 'object')
    .map(f => ({
      id: String(f.id || ''),
      content: String(f.content || '').slice(0, 500), // Limite la taille du contenu
      timestamp: Number(f.timestamp || Date.now())
    }))
    .slice(-50); // Garde seulement les 50 derniers fragments
}

export function sanitizeMessage(message: any): any {
  if (!message || typeof message !== 'object') {
    return message;
  }
  
  // Copie superficielle pour éviter la mutation
  const sanitized = { ...message };
  
  // Sanitize le payload spécifiquement
  if (sanitized.payload) {
    if (sanitized.payload.state) {
      sanitized.payload.state = sanitizeOrganismState(sanitized.payload.state);
    }
    
    // Nettoie les mutations si présentes
    if (sanitized.payload.mutations) {
      sanitized.payload.mutations = sanitizeMutations(sanitized.payload.mutations);
    }
  }
  
  return sanitized;
} 
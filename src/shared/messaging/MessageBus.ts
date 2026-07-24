// Centralisation des types de messages et de l'interface Message
export enum MessageType {
  PAGE_VISIT = 'PAGE_VISIT',
  SCROLL_EVENT = 'SCROLL_EVENT',
  ORGANISM_UPDATE = 'ORGANISM_UPDATE',
  ORGANISM_MUTATE = 'ORGANISM_MUTATE',
  ORGANISM_STATE_CHANGE = 'ORGANISM_STATE_CHANGE',
  WEBGL_INIT = 'WEBGL_INIT',
  WEBGL_ERROR = 'WEBGL_ERROR',
  WEBGL_INITIALIZED = 'WEBGL_INITIALIZED',
  PERFORMANCE_UPDATE = 'PERFORMANCE_UPDATE',
  GENERATE_INVITATION = 'GENERATE_INVITATION',
  INVITATION_GENERATED = 'INVITATION_GENERATED',
  CONSUME_INVITATION = 'CONSUME_INVITATION',
  INVITATION_CONSUMED = 'INVITATION_CONSUMED',
  CHECK_INVITATION = 'CHECK_INVITATION',
  INVITATION_CHECKED = 'INVITATION_CHECKED',
  MURMUR = 'MURMUR',
  GET_INVITER = 'GET_INVITER',
  INVITER_RESULT = 'INVITER_RESULT',
  GET_INVITEES = 'GET_INVITEES',
  INVITEES_RESULT = 'INVITEES_RESULT',
  GET_INVITATION_HISTORY = 'GET_INVITATION_HISTORY',
  INVITATION_HISTORY_RESULT = 'INVITATION_HISTORY_RESULT',
  INTERACTION_DETECTED = 'INTERACTION_DETECTED',
  // Signal d'attention (engagement/lecture/distraction) — métriques scalaires
  // uniquement, jamais de texte ni d'URL en clair (privacy-first).
  ATTENTION_EVENT = 'ATTENTION_EVENT',
  // --- Health checks et monitoring ---
  GET_HEALTH_METRICS = 'GET_HEALTH_METRICS',
  HEALTH_METRICS_RESPONSE = 'HEALTH_METRICS_RESPONSE',
  // --- Rituels collaboratifs ---
  REQUEST_SHARED_MUTATION = 'REQUEST_SHARED_MUTATION',
  SHARED_MUTATION_CODE = 'SHARED_MUTATION_CODE',
  ACCEPT_SHARED_MUTATION = 'ACCEPT_SHARED_MUTATION',
  SHARED_MUTATION_RESULT = 'SHARED_MUTATION_RESULT',
  COLLECTIVE_WAKE_REQUEST = 'COLLECTIVE_WAKE_REQUEST',
  COLLECTIVE_WAKE_RESULT = 'COLLECTIVE_WAKE_RESULT',
  // Sommeil analytique / Réveil Lucide
  DREAM_REPORT = 'DREAM_REPORT',
  GET_DREAM_REPORT = 'GET_DREAM_REPORT',
  RUN_DREAM_NOW = 'RUN_DREAM_NOW',
  // Chuchotement contextuel injecté dans la page (perception de structure invisible)
  WHISPER = 'WHISPER',
  // Signal de menace observé sur la page (alimente le Cortex)
  THREAT_SIGNAL = 'THREAT_SIGNAL',
  CONTEXTUAL_INVITATION = 'CONTEXTUAL_INVITATION',
  SECRET_RITUAL_TRIGGERED = 'SECRET_RITUAL_TRIGGERED',
  SECRET_CODE_ENTERED = 'SECRET_CODE_ENTERED',
  // Ajout pour la récupération de l'organisme depuis le popup
  GET_ORGANISM = 'GET_ORGANISM',
  // Messages pour la résonance DOM
  DOM_RESONANCE_DETECTED = 'DOM_RESONANCE_DETECTED',
  RESONANCE_UPDATE = 'RESONANCE_UPDATE',

  // Messages pour les rituels
  TRIGGER_RITUAL = 'TRIGGER_RITUAL',
  TRIGGER_DECODING_RITUAL = 'TRIGGER_DECODING_RITUAL',
  RITUAL_COMPLETED = 'RITUAL_COMPLETED',
  RITUAL_FAILED = 'RITUAL_FAILED',
  RITUAL_VISUAL_EFFECT = 'RITUAL_VISUAL_EFFECT',
  RITUAL_METRICS = 'RITUAL_METRICS',

  // Messages WebGL pour rituels
  WEBGL_RITUAL_EFFECT = 'WEBGL_RITUAL_EFFECT',
  WEBGL_RITUAL_EFFECT_END = 'WEBGL_RITUAL_EFFECT_END',

  // Messages P2P simplifiés
  PEER_ANNOUNCE = 'PEER_ANNOUNCE',
  PEER_PING = 'PEER_PING',
  PEER_PONG = 'PEER_PONG',
  P2P_RELAY_REQUEST = 'P2P_RELAY_REQUEST',
  P2P_RELAY_RESPONSE = 'P2P_RELAY_RESPONSE',

  // Messages content script
  ANALYZE_TRACKERS = 'ANALYZE_TRACKERS',
  INJECT_COUNTERMEASURE = 'INJECT_COUNTERMEASURE',
  EXTRACT_HIDDEN_ELEMENTS = 'EXTRACT_HIDDEN_ELEMENTS',

  // Cortex Engine messages
  CORTEX_SIGNAL = 'CORTEX_SIGNAL',
  CORTEX_STATE_CHANGE = 'CORTEX_STATE_CHANGE',
  CORTEX_THREAT_DETECTED = 'CORTEX_THREAT_DETECTED',
  CORTEX_METRICS_UPDATE = 'CORTEX_METRICS_UPDATE',
  CORTEX_HIBERNATION = 'CORTEX_HIBERNATION',
  CORTEX_RECOVERY = 'CORTEX_RECOVERY',
}

export interface Message {
  type: MessageType;
  payload?: unknown;
  target?: string;
  timestamp?: number;
  source?: string;
  id?: string;
}

export class MessageBus {
    constructor(_channel?: string) {}
    on(_type: MessageType, _handler: (message: MessageEvent | unknown) => void): void {}
    send(_message: MessageEvent | unknown): void {}
    subscribe(_type: MessageType, _handler: (message: MessageEvent | unknown) => void): void {
      this.on(_type, _handler);
    }
}

export default MessageBus; 
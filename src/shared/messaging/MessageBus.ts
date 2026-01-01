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
  CONTEXTUAL_INVITATION = 'CONTEXTUAL_INVITATION',
  SECRET_RITUAL_TRIGGERED = 'SECRET_RITUAL_TRIGGERED',
  SECRET_CODE_ENTERED = 'SECRET_CODE_ENTERED',
  // Ajout pour la récupération de l'organisme depuis le popup
  GET_ORGANISM = 'GET_ORGANISM',
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
// Squelette minimal pour lever les erreurs d'import
export enum MessageType {
  WEBGL_INIT = 'WEBGL_INIT',
  ORGANISM_RENDER = 'ORGANISM_RENDER',
  ORGANISM_MUTATE = 'ORGANISM_MUTATE',
  ORGANISM_UPDATE = 'ORGANISM_UPDATE'
}

export interface Message {
  type: MessageType;
  payload?: any;
  target?: string;
  timestamp?: number;
}
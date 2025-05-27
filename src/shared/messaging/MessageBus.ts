// Squelette minimal pour lever les erreurs d'import
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
}

export class MessageBus {
    constructor(channel?: string) {}
    on(type: MessageType, handler: (message: any) => void): void {}
    send(message: any): void {}
    subscribe(type: MessageType, handler: (message: any) => void): void {
      this.on(type, handler);
    }
}

export default MessageBus; 
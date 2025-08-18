// Types comportementaux minimaux pour lever les erreurs

/** Analyse comportementale retournée par le moteur */
export interface BehaviorAnalysis {
  score: number;
  pattern: string;
  details?: unknown;
}

/** Événement de navigation utilisateur */
export interface NavigationEvent {
  url: string;
  timestamp: number;
  type?: string;
}

/** Données de comportement utilisateur */
export interface UserBehavior {
  userId: string;
  events: NavigationEvent[];
}

/** Pattern comportemental détecté */
export interface BehaviorPattern {
  id: string;
  name: string;
  confidence: number;
}

/** SessionTracker factice (mock) */
export class SessionTracker {
  startSession(): void {}
  endSession(): void {}
  getSessionData(): any { return {}; }
}

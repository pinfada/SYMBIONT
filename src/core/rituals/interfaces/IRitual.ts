/**
 * IRitual.ts
 * Interface principale pour les rituels de décodage
 * Suit les principes SOLID et permet l'extensibilité
 */

import { OrganismState } from '@/shared/types/organism';

export enum RitualType {
  TEMPORAL_DEPHASING = 'TEMPORAL_DEPHASING',
  FREQUENCY_COMMUNION = 'FREQUENCY_COMMUNION',
  STRUCTURE_INSTINCT = 'STRUCTURE_INSTINCT'
}

export enum RitualStatus {
  IDLE = 'IDLE',
  TRIGGERED = 'TRIGGERED',
  EXECUTING = 'EXECUTING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export interface RitualTriggerCondition {
  type: 'THRESHOLD' | 'PATTERN' | 'COMPOUND';
  metric: string;
  operator: '>' | '<' | '==' | '>=' | '<=' | 'CONTAINS' | 'MATCHES';
  value: number | string | RegExp;
  cooldownMs?: number;
}

export interface RitualContext {
  organism: OrganismState;
  resonanceLevel: number;
  networkPressure: number;
  domOppression: number;
  frictionIndex: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface RitualEffect {
  type: 'VISUAL' | 'NETWORK' | 'DOM' | 'DATA' | 'ORGANISM';
  target: string;
  duration: number;
  intensity: number;
  reversible: boolean;
}

export interface RitualResult {
  success: boolean;
  status: RitualStatus;
  effects: RitualEffect[];
  metrics: {
    executionTime: number;
    resourcesUsed: number;
    impactScore: number;
  };
  message?: string;
  error?: Error;
}

export interface IRitual {
  // Identification
  readonly id: string;
  readonly type: RitualType;
  readonly name: string;
  readonly description: string;

  // Configuration
  readonly triggers: RitualTriggerCondition[];
  readonly priority: number;
  readonly maxExecutionsPerHour: number;
  readonly requiresUserConsent: boolean;

  // État
  status: RitualStatus;
  lastExecutionTime: number;
  executionCount: number;

  // Méthodes principales
  canTrigger(context: RitualContext): boolean;
  execute(context: RitualContext): Promise<RitualResult>;
  cancel(): Promise<void>;
  rollback(): Promise<void>;

  // Métriques et monitoring
  getMetrics(): RitualMetrics;
  getHealthStatus(): RitualHealth;
}

export interface RitualMetrics {
  successRate: number;
  averageExecutionTime: number;
  resourceConsumption: number;
  userBenefit: number;
  lastError?: Error;
}

export interface RitualHealth {
  isHealthy: boolean;
  issues: string[];
  recommendations: string[];
}

// Factory pattern pour création de rituels
export interface IRitualFactory {
  createRitual(type: RitualType, config?: Partial<IRitual>): IRitual;
  registerCustomRitual(ritual: IRitual): void;
  getRitual(id: string): IRitual | undefined;
}
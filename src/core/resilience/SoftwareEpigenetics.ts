/**
 * Épigénétique Logicielle
 *
 * Système de "silence" des gènes (fonctions) non-essentiels en cas
 * de crise de ressources détectée par le moniteur de santé.
 *
 * Inspiré de l'épigénétique biologique:
 * - Les "gènes" (fonctionnalités) peuvent être activés ou silencés
 * - Le "phénotype" (comportement) s'adapte à l'environnement
 * - Les modifications sont réversibles (contrairement aux mutations)
 */

import { logger } from '@/shared/utils/secureLogger';
import { backpressureController, BackpressureLevel } from '../metabolic/BackpressureController';
import { neuromodulation } from '../metabolic/Neuromodulation';

export type FeaturePriority = 'critical' | 'high' | 'medium' | 'low' | 'optional';

export interface FeatureGene {
  id: string;
  name: string;
  priority: FeaturePriority;
  isActive: boolean;
  isSilenced: boolean;
  silencedReason?: string;
  silencedAt?: number;
  activationCost: number;      // Coût en ressources (0-100)
  dependencies: string[];      // IDs des features dont celle-ci dépend
  lastActivation?: number;
  activationCount: number;
}

export interface EpigeneticProfile {
  activeGenes: string[];
  silencedGenes: string[];
  totalActivationCost: number;
  resourceBudget: number;
  adaptationLevel: BackpressureLevel;
}

export interface AdaptationRule {
  level: BackpressureLevel;
  maxPriority: FeaturePriority;
  maxTotalCost: number;
  description: string;
}

/**
 * Gestionnaire d'épigénétique logicielle
 */
export class SoftwareEpigeneticsManager {
  private genes: Map<string, FeatureGene> = new Map();
  private adaptationRules: AdaptationRule[];
  private currentProfile: EpigeneticProfile;
  private manualOverrides: Set<string> = new Set(); // Gènes forcés actifs

  constructor() {
    // Règles d'adaptation par niveau de pression
    this.adaptationRules = [
      {
        level: 'nominal',
        maxPriority: 'optional',
        maxTotalCost: 100,
        description: 'Toutes les fonctionnalités actives'
      },
      {
        level: 'elevated',
        maxPriority: 'low',
        maxTotalCost: 70,
        description: 'Fonctionnalités optionnelles désactivées'
      },
      {
        level: 'critical',
        maxPriority: 'medium',
        maxTotalCost: 40,
        description: 'Fonctionnalités basse priorité désactivées'
      },
      {
        level: 'emergency',
        maxPriority: 'high',
        maxTotalCost: 20,
        description: 'Mode survie - fonctionnalités critiques uniquement'
      }
    ];

    this.currentProfile = {
      activeGenes: [],
      silencedGenes: [],
      totalActivationCost: 0,
      resourceBudget: 100,
      adaptationLevel: 'nominal'
    };

    this.registerDefaultGenes();

    logger.info('[SoftwareEpigenetics] Initialized');
  }

  /**
   * Enregistre les gènes par défaut
   */
  private registerDefaultGenes(): void {
    // Fonctionnalités critiques (jamais désactivées)
    this.registerGene({
      id: 'core_neural_processing',
      name: 'Traitement Neural Core',
      priority: 'critical',
      activationCost: 10,
      dependencies: []
    });

    this.registerGene({
      id: 'core_storage',
      name: 'Stockage Essentiel',
      priority: 'critical',
      activationCost: 5,
      dependencies: []
    });

    this.registerGene({
      id: 'core_messaging',
      name: 'Messagerie Inter-Contextes',
      priority: 'critical',
      activationCost: 5,
      dependencies: []
    });

    // Fonctionnalités haute priorité
    this.registerGene({
      id: 'consciousness_tracking',
      name: 'Suivi de Conscience',
      priority: 'high',
      activationCost: 15,
      dependencies: ['core_neural_processing']
    });

    this.registerGene({
      id: 'behavior_analysis',
      name: 'Analyse Comportementale',
      priority: 'high',
      activationCost: 20,
      dependencies: ['core_neural_processing']
    });

    this.registerGene({
      id: 'webgl_rendering',
      name: 'Rendu WebGL',
      priority: 'high',
      activationCost: 25,
      dependencies: []
    });

    // Fonctionnalités priorité moyenne
    this.registerGene({
      id: 'pattern_detection',
      name: 'Détection de Patterns',
      priority: 'medium',
      activationCost: 15,
      dependencies: ['behavior_analysis']
    });

    this.registerGene({
      id: 'memory_consolidation',
      name: 'Consolidation Mémoire',
      priority: 'medium',
      activationCost: 20,
      dependencies: ['core_storage']
    });

    this.registerGene({
      id: 'social_features',
      name: 'Fonctionnalités Sociales',
      priority: 'medium',
      activationCost: 15,
      dependencies: ['core_messaging']
    });

    // Fonctionnalités basse priorité
    this.registerGene({
      id: 'advanced_analytics',
      name: 'Analytiques Avancées',
      priority: 'low',
      activationCost: 10,
      dependencies: ['pattern_detection']
    });

    this.registerGene({
      id: 'background_learning',
      name: 'Apprentissage Arrière-Plan',
      priority: 'low',
      activationCost: 15,
      dependencies: ['core_neural_processing']
    });

    this.registerGene({
      id: 'health_monitoring_detailed',
      name: 'Monitoring Santé Détaillé',
      priority: 'low',
      activationCost: 10,
      dependencies: []
    });

    // Fonctionnalités optionnelles
    this.registerGene({
      id: 'animations_complex',
      name: 'Animations Complexes',
      priority: 'optional',
      activationCost: 15,
      dependencies: ['webgl_rendering']
    });

    this.registerGene({
      id: 'telemetry',
      name: 'Télémétrie',
      priority: 'optional',
      activationCost: 5,
      dependencies: []
    });

    this.registerGene({
      id: 'experimental_features',
      name: 'Fonctionnalités Expérimentales',
      priority: 'optional',
      activationCost: 10,
      dependencies: []
    });
  }

  /**
   * Enregistre un nouveau gène
   */
  registerGene(config: Omit<FeatureGene, 'isActive' | 'isSilenced' | 'activationCount'>): void {
    const gene: FeatureGene = {
      ...config,
      isActive: true,
      isSilenced: false,
      activationCount: 0
    };

    this.genes.set(config.id, gene);
  }

  /**
   * Vérifie si une fonctionnalité est active
   */
  isFeatureActive(featureId: string): boolean {
    const gene = this.genes.get(featureId);
    if (!gene) {
      logger.warn('[SoftwareEpigenetics] Unknown feature', { featureId });
      return true; // Par défaut, autoriser les features inconnues
    }

    // Mettre à jour le compteur
    gene.activationCount++;
    gene.lastActivation = Date.now();

    return gene.isActive && !gene.isSilenced;
  }

  /**
   * Adapte le profil épigénétique au niveau de pression actuel
   */
  adapt(): EpigeneticProfile {
    const level = backpressureController.getLevel();
    const rule = this.adaptationRules.find(r => r.level === level) || this.adaptationRules[0];

    // Déterminer quels gènes peuvent être actifs
    const priorityOrder: FeaturePriority[] = ['critical', 'high', 'medium', 'low', 'optional'];
    const maxPriorityIndex = priorityOrder.indexOf(rule.maxPriority);

    const activeGenes: string[] = [];
    const silencedGenes: string[] = [];
    let totalCost = 0;

    // Trier les gènes par priorité (plus importante d'abord)
    const sortedGenes = Array.from(this.genes.values()).sort((a, b) => {
      return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
    });

    for (const gene of sortedGenes) {
      const priorityIndex = priorityOrder.indexOf(gene.priority);

      // Vérifier si le gène a un override manuel
      if (this.manualOverrides.has(gene.id)) {
        activeGenes.push(gene.id);
        totalCost += gene.activationCost;
        this.activateGene(gene.id);
        continue;
      }

      // Vérifier si les dépendances sont satisfaites
      const dependenciesSatisfied = gene.dependencies.every(
        dep => activeGenes.includes(dep)
      );

      if (!dependenciesSatisfied) {
        silencedGenes.push(gene.id);
        this.silenceGene(gene.id, 'Dependency not satisfied');
        continue;
      }

      // Vérifier la priorité et le budget
      if (priorityIndex <= maxPriorityIndex && totalCost + gene.activationCost <= rule.maxTotalCost) {
        activeGenes.push(gene.id);
        totalCost += gene.activationCost;
        this.activateGene(gene.id);
      } else {
        silencedGenes.push(gene.id);
        this.silenceGene(gene.id, `Adaptation level: ${level}`);
      }
    }

    this.currentProfile = {
      activeGenes,
      silencedGenes,
      totalActivationCost: totalCost,
      resourceBudget: rule.maxTotalCost,
      adaptationLevel: level
    };

    logger.info('[SoftwareEpigenetics] Adapted to level', {
      level,
      activeCount: activeGenes.length,
      silencedCount: silencedGenes.length,
      totalCost
    });

    // Notifier le système de neuromodulation
    if (level === 'emergency') {
      neuromodulation.processEvent('resource_crisis');
    } else if (silencedGenes.length > 0) {
      neuromodulation.processEvent('stress', silencedGenes.length / this.genes.size);
    }

    return this.currentProfile;
  }

  /**
   * Active un gène
   */
  private activateGene(geneId: string): void {
    const gene = this.genes.get(geneId);
    if (gene && gene.isSilenced) {
      gene.isSilenced = false;
      gene.isActive = true;
      delete gene.silencedReason;
      delete gene.silencedAt;

      logger.info('[SoftwareEpigenetics] Gene activated', { geneId });
    }
  }

  /**
   * Silence un gène
   */
  private silenceGene(geneId: string, reason: string): void {
    const gene = this.genes.get(geneId);
    if (gene && !gene.isSilenced) {
      gene.isSilenced = true;
      gene.isActive = false;
      gene.silencedReason = reason;
      gene.silencedAt = Date.now();

      logger.info('[SoftwareEpigenetics] Gene silenced', { geneId, reason });
    }
  }

  /**
   * Force l'activation d'un gène (override manuel)
   */
  forceActivate(geneId: string): boolean {
    const gene = this.genes.get(geneId);
    if (!gene) return false;

    this.manualOverrides.add(geneId);
    this.activateGene(geneId);

    return true;
  }

  /**
   * Retire le force d'activation
   */
  removeForceActivation(geneId: string): void {
    this.manualOverrides.delete(geneId);
    // Ré-adapter pour potentiellement silencer le gène
    this.adapt();
  }

  /**
   * Exécute une fonction conditionnellement à l'état du gène
   */
  executeIfActive<T>(
    featureId: string,
    fn: () => T,
    fallback?: T
  ): T | undefined {
    if (this.isFeatureActive(featureId)) {
      try {
        return fn();
      } catch (error) {
        logger.error('[SoftwareEpigenetics] Feature execution failed', {
          featureId,
          error
        });
        return fallback;
      }
    }
    return fallback;
  }

  /**
   * Exécute une fonction async conditionnellement
   */
  async executeIfActiveAsync<T>(
    featureId: string,
    fn: () => Promise<T>,
    fallback?: T
  ): Promise<T | undefined> {
    if (this.isFeatureActive(featureId)) {
      try {
        return await fn();
      } catch (error) {
        logger.error('[SoftwareEpigenetics] Feature async execution failed', {
          featureId,
          error
        });
        return fallback;
      }
    }
    return fallback;
  }

  /**
   * Retourne le profil épigénétique actuel
   */
  getProfile(): EpigeneticProfile {
    return { ...this.currentProfile };
  }

  /**
   * Retourne l'état d'un gène spécifique
   */
  getGeneState(geneId: string): FeatureGene | undefined {
    const gene = this.genes.get(geneId);
    return gene ? { ...gene } : undefined;
  }

  /**
   * Retourne tous les gènes
   */
  getAllGenes(): FeatureGene[] {
    return Array.from(this.genes.values()).map(g => ({ ...g }));
  }

  /**
   * Retourne les statistiques d'utilisation
   */
  getUsageStats(): {
    mostUsed: Array<{ id: string; count: number }>;
    neverUsed: string[];
    recentlyUsed: string[];
  } {
    const genes = Array.from(this.genes.values());
    const now = Date.now();
    const recentThreshold = 5 * 60 * 1000; // 5 minutes

    const mostUsed = genes
      .filter(g => g.activationCount > 0)
      .sort((a, b) => b.activationCount - a.activationCount)
      .slice(0, 10)
      .map(g => ({ id: g.id, count: g.activationCount }));

    const neverUsed = genes
      .filter(g => g.activationCount === 0)
      .map(g => g.id);

    const recentlyUsed = genes
      .filter(g => g.lastActivation && (now - g.lastActivation) < recentThreshold)
      .map(g => g.id);

    return { mostUsed, neverUsed, recentlyUsed };
  }

  /**
   * Crée un décorateur pour les features conditionnelles
   */
  createFeatureGuard(featureId: string): <T extends (...args: unknown[]) => unknown>(
    fn: T
  ) => T {
    return <T extends (...args: unknown[]) => unknown>(fn: T): T => {
      return ((...args: unknown[]) => {
        if (this.isFeatureActive(featureId)) {
          return fn(...args);
        }
        return undefined;
      }) as T;
    };
  }

  /**
   * Sérialise l'état
   */
  serialize(): {
    genes: Array<[string, FeatureGene]>;
    manualOverrides: string[];
    profile: EpigeneticProfile;
  } {
    return {
      genes: Array.from(this.genes.entries()),
      manualOverrides: Array.from(this.manualOverrides),
      profile: this.currentProfile
    };
  }

  /**
   * Restaure l'état
   */
  deserialize(state: {
    genes: Array<[string, FeatureGene]>;
    manualOverrides: string[];
    profile: EpigeneticProfile;
  }): void {
    // Restaurer les gènes enregistrés (fusionner avec les défauts)
    for (const [id, gene] of state.genes) {
      if (this.genes.has(id)) {
        const existing = this.genes.get(id)!;
        existing.activationCount = gene.activationCount;
        if (gene.lastActivation !== undefined) {
          existing.lastActivation = gene.lastActivation;
        }
      }
    }

    this.manualOverrides = new Set(state.manualOverrides);
    this.currentProfile = state.profile;
  }
}

// Export singleton
export const softwareEpigenetics = new SoftwareEpigeneticsManager();

// Helper pour créer des guards de feature inline
export function featureGuard<T>(
  featureId: string,
  fn: () => T,
  fallback?: T
): T | undefined {
  return softwareEpigenetics.executeIfActive(featureId, fn, fallback);
}

export async function featureGuardAsync<T>(
  featureId: string,
  fn: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  return softwareEpigenetics.executeIfActiveAsync(featureId, fn, fallback);
}

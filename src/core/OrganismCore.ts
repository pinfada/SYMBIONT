/**
 * OrganismCore refactorisé - Architecture hexagonale
 * Version simplifiée utilisant des services spécialisés
 */

import { OrganismState, OrganismTraits } from '../shared/types/organism';
import { IOrganismCore, OrganismJSON, ShaderParameters } from './interfaces/IOrganismCore';
import { errorHandler } from './utils/ErrorHandler';
import { TraitService, TraitUpdateEvent } from './services/TraitService';
import { EnergyService, EnergyEvent } from './services/EnergyService';
import { NeuralService, NeuralProcessingResult } from './services/NeuralService';
import { INeuralMesh } from './interfaces/INeuralMesh';
import RealMetricsService from './services/RealMetricsService';
import FeatureFlagService from './services/FeatureFlagService';
import { generateSecureUUID } from '../shared/utils/uuid';
import { PerformanceOptimizedRandom } from '../shared/utils/PerformanceOptimizedRandom';

export interface OrganismDependencies {
  neuralMesh: INeuralMesh;
  logger?: { debug: Function; info: Function; error: Function };
}

export class OrganismCore implements IOrganismCore {
  private readonly id: string;
  private readonly dna: string;
  private health: number = 100;
  private lastMutation: number = Date.now();
  
  // Services spécialisés (injection de dépendances)
  private readonly traitService: TraitService;
  private readonly energyService: EnergyService;
  private readonly neuralService: NeuralService;
  private readonly metricsService: RealMetricsService;
  // @ts-expect-error Service réservé pour usage futur
  private readonly featureFlags: FeatureFlagService;
  private readonly logger: { debug: Function; info: Function; error: Function } | undefined;

  constructor(
    dna: string, 
    initialTraits?: Partial<OrganismTraits>,
    dependencies?: OrganismDependencies
  ) {
    // Validation d'entrée
    const validation = this.validateInput(dna, initialTraits);
    if (!validation.isValid) {
      throw new Error(`OrganismCore creation failed: ${validation.errors.join(', ')}`);
    }

    this.id = generateSecureUUID();
    this.dna = dna;
    this.logger = dependencies?.logger;

    // Initialisation des services de base
    this.metricsService = RealMetricsService.getInstance();
    this.featureFlags = FeatureFlagService.getInstance();
    
    // Initialisation des services métier
    this.traitService = new TraitService(initialTraits);
    this.energyService = new EnergyService(100);
    
    // Service neural nécessite une dépendance externe
    if (dependencies?.neuralMesh) {
      this.neuralService = new NeuralService(dependencies.neuralMesh);
    } else {
      // Fallback pour compatibilité
      const { NeuralMesh } = require('./NeuralMesh');
      this.neuralService = new NeuralService(new NeuralMesh());
    }

    this.setupServiceListeners();
    this.logger?.debug('OrganismCore initialized', { id: this.id, dna: this.dna });
  }

  /**
   * Configuration des listeners entre services
   */
  private setupServiceListeners(): void {
    // Écoute les changements de traits pour ajuster l'énergie
    this.traitService.addTraitChangeListener((event: TraitUpdateEvent) => {
      this.onTraitChanged(event);
    
    return undefined;});

    // Écoute les événements d'énergie pour log
    this.energyService.addEnergyListener((event: EnergyEvent) => {
      if (event.type === 'consumption' && event.energyAfter < 10) {
        this.logger?.debug('Low energy warning', { energy: event.energyAfter });
      }
    });
  }

  /**
   * Gestionnaire de changement de traits
   */
  private onTraitChanged(event: TraitUpdateEvent): void {
    // Ajuste l'efficacité métabolique basée sur les traits
    const traits = this.traitService.getAllTraits();
    const efficiencyFactor = (traits.resilience + traits.adaptability) / 2;
    this.energyService.setEfficiency(efficiencyFactor);

    this.logger?.debug('Trait changed, metabolism adjusted', { 
      trait: event.traitName, 
      newValue: event.newValue,
      efficiency: efficiencyFactor 
    });
  }

  /**
   * Validation des entrées
   */
  private validateInput(dna: string, traits?: Partial<OrganismTraits>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!dna || typeof dna !== 'string') {
      errors.push('DNA must be a non-empty string');
    }

    if (dna && dna.length < 10) {
      errors.push('DNA must be at least 10 characters long');
    }

    if (traits) {
      Object.entries(traits).forEach(([key, value]) => {
        if (typeof value !== 'number' || value < 0 || value > 1) {
          errors.push(`Trait ${key} must be a number between 0 and 1`);
        }
      });
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Génère un ID unique
   */
  // generateId() supprimé - utilise generateSecureUUID() maintenant

  // =============================================================================
  // API PUBLIQUE - Interface IOrganismCore
  // =============================================================================

  getId(): string {
    return this.id;
  }

  getDNA(): string {
    return this.dna;
  }

  getTraits(): OrganismTraits {
    return this.traitService.getAllTraits();
  }

  updateTrait(name: keyof OrganismTraits, value: number): void {
    if (!this.energyService.consumeEnergy(1, `trait_update_${name}`)) {
      throw new Error('Insufficient energy to update trait');
    }

    this.traitService.updateTrait(name, value, 'manual_update');
    this.logger?.debug('Trait updated', { trait: name, value });
  }

  getEnergyLevel(): number {
    return this.energyService.getEnergyLevel();
  }

  getHealth(): number {
    return this.health;
  }

  /**
   * Évolution de l'organisme basée sur un stimulus
   */
  async evolve(stimulus: any): Promise<void> {
    const energyCost = 5;
    if (!this.energyService.consumeEnergy(energyCost, 'evolution')) {
      this.logger?.debug('Evolution skipped: insufficient energy');
      return;
    
    return undefined;}

    try {
      const currentTraits = this.traitService.getAllTraits();
      const result: NeuralProcessingResult = await this.neuralService.processStimulus(stimulus, currentTraits);

      if (result.success && Object.keys(result.adaptations).length > 0) {
        this.traitService.updateTraits(result.adaptations, 'evolution');
        this.lastMutation = Date.now();
        
        this.logger?.debug('Evolution successful', { 
          adaptations: result.adaptations,
          confidence: result.confidence 
        });
      }
    } catch (_error) {
      this.logger?.error('Evolution failed', _error);
      errorHandler.logSimpleError('OrganismCore', 'evolve', _error, 'error');
    }
  }

  /**
   * Apprentissage à partir de données comportementales
   */
  async learn(behaviorData: any): Promise<void> {
    const energyCost = 2;
    if (!this.energyService.consumeEnergy(energyCost, 'learning')) {
      return;
    
    return undefined;}

    const success = await this.neuralService.learn(behaviorData);
    if (success) {
      // Améliore légèrement la mémoire lors de l'apprentissage
      const currentMemory = this.traitService.getTrait('memory');
      this.traitService.updateTrait('memory', currentMemory + 0.01, 'learning');
    }

    this.logger?.debug('Learning completed', { success, data: behaviorData });
  }

  /**
   * Traitement d'un stimulus simple
   */
  processStimulus(stimulus: any): void {
    const energyCost = 1;
    if (!this.energyService.consumeEnergy(energyCost, 'stimulus_processing')) {
      return;
    
    return undefined;}

    // Traitement simplifié en arrière-plan
    this.neuralService.queuePattern({
      id: `pattern_${Date.now()}`,
      type: 'behavioral',
      data: stimulus,
      timestamp: Date.now(),
      confidence: 0.8
    });

    this.logger?.debug('Stimulus processed', { stimulus });
  }

  /**
   * Obtient l'état complet de l'organisme
   */
  getState(): OrganismState {
    const traits = this.traitService.getAllTraits();
    const energyStats = this.energyService.getEnergyStats();

    return {
      id: this.id,
      traits,
      energy: energyStats.current,
      maxEnergy: energyStats.max,
      health: this.health,
      dna: this.dna,
      lastMutation: this.lastMutation,
      balance: this.traitService.calculateBalance(),
      metabolismRate: energyStats.metabolismRate,
      age: Date.now() - parseInt(this.id.split('_')[1]) // Approximation basée sur l'ID
    };
  }

  /**
   * Génère les paramètres de shader pour le rendu visuel
   */
  generateShaderParameters(): ShaderParameters {
    const traits = this.traitService.getAllTraits();
    
    return {
      energy: this.energyService.getEnergyPercentage() / 100,
      health: this.health / 100,
      neuralActivity: this.neuralService.getNeuralActivity(),
      creativity: traits.creativity,
      focus: traits.focus,
      time: Date.now() / 1000,
      colorPrimary: [traits.creativity, traits.empathy, traits.intuition],
      colorSecondary: [traits.focus, traits.resilience, traits.adaptability],
      morphology: traits.adaptability,
      complexity: traits.creativity * traits.memory
    };
  }

  /**
   * Sérialisation pour sauvegarde
   */
  toJSON(): OrganismJSON {
    return {
      mesh: this.neuralService.saveState() || {},
      dna: this.dna,
      health: this.health,
      lastMutation: this.lastMutation,
      traits: this.traitService.toJSON() || { traits: this.traitService.getAllTraits(), history: [] },
      energy: this.energyService.toJSON() || { energy: 100, maxEnergy: 100, metabolismRate: 1, config: { efficiency: 1, baseConsumption: 0.1 }, history: [] },
      neural: this.neuralService.saveState(),
      timestamp: Date.now()
    };
  }

  /**
   * Restauration depuis JSON
   */
  fromJSON(data: OrganismJSON): void {
    if (data.traits && typeof data.traits === 'object') {
      this.traitService.fromJSON(data.traits as any);
    }
    
    if (data.energy && typeof data.energy === 'object') {
      this.energyService.fromJSON(data.energy as any);
    }
    
    if (data.neural) {
      this.neuralService.loadState(data.neural);
    }

    this.health = data.health || 100;
    this.lastMutation = data.lastMutation || Date.now();

    this.logger?.debug('State restored from JSON', { id: this.id });
  }

  /**
   * Nettoyage et libération des ressources
   */
  cleanup(): void {
    this.energyService.destroy();
    this.traitService.cleanup();
    this.neuralService.cleanup();
    
    this.logger?.debug('OrganismCore cleaned up', { id: this.id });
  }

  /**
   * Vérification de l'état de santé
   */
  healthCheck(): { healthy: boolean; issues: string[] } {
    const issues: string[] = [];

    if (this.health < 20) {
      issues.push('Low health');
    }

    if (this.energyService.getEnergyLevel() < 10) {
      issues.push('Low energy');
    }

    const neuralHealth = this.neuralService.healthCheck();
    if (!neuralHealth.healthy) {
      issues.push(...neuralHealth.issues);
    }

    return {
      healthy: issues.length === 0,
      issues
    };
  }

  // =============================================================================
  // MÉTHODES MANQUANTES POUR IOrganismCore
  // =============================================================================

  /**
   * Boot the organism
   */
  async boot(): Promise<void> {
    // Initialize neural mesh if needed
    try {
      await this.neuralService.initialize();
      this.logger?.debug('Organism booted successfully', { id: this.id });
    } catch (_error) {
      this.logger?.error('Failed to boot organism', { id: this.id, _error: _error });
      throw _error;
    }
  }

  /**
   * Hibernate the organism
   */
  async hibernate(): Promise<void> {
    try {
      this.energyService.setEfficiency(0.1); // Reduce energy consumption
      await this.neuralService.suspend();
      this.logger?.debug('Organism hibernated', { id: this.id });
    } catch (_error) {
      this.logger?.error('Failed to hibernate organism', { id: this.id, _error: _error });
      throw _error;
    }
  }

  /**
   * Update organism with delta time
   */
  update(deltaTime: number = 16.67): void {
    // Standard frame time processing
    const timeFactor = deltaTime / 16.67; // Normalize to 60fps
    
    // Update energy decay
    this.energyService.consumeEnergy(0.1 * timeFactor, 'metabolism');
    
    // Update neural processing
    this.neuralService.update(deltaTime);
    
    // Health regeneration if high energy
    if (this.energyService.getEnergyLevel() > 80) {
      this.health = Math.min(100, this.health + (0.1 * timeFactor));
    }
  }

  /**
   * Stimulate organism input
   */
  stimulate(inputId: string, value: number): void {
    this.neuralService.stimulate(inputId, value);
    
    // Consume energy for processing
    this.energyService.consumeEnergy(0.5, `stimulation_${inputId}`);
  }

  /**
   * Mutate organism with given rate
   */
  mutate(rate: number = 0.01): void {
    const traits = this.traitService.getAllTraits();
    const mutations: { [key: string]: number } = {};
    
    // Mutate each trait based on rate
    Object.keys(traits).forEach(traitName => {
      if (PerformanceOptimizedRandom.random() < rate) {
        const currentValue = traits[traitName as keyof OrganismTraits];
        const mutation = (PerformanceOptimizedRandom.random() - 0.5) * 0.1; // ±5% mutation
        const newValue = Math.max(0, Math.min(1, currentValue + mutation));
        mutations[traitName] = newValue;
      }
    });
    
    // Apply mutations
    if (Object.keys(mutations).length > 0) {
      this.traitService.updateTraits(mutations as Partial<OrganismTraits>, 'mutation');
      this.lastMutation = Date.now();
      this.logger?.debug('Mutation applied', { id: this.id, mutations });
    }
  }

  /**
   * Feed organism with energy
   */
  feed(amount: number = 10): void {
    this.energyService.addEnergy(amount);
    this.logger?.debug('Organism fed', { id: this.id, amount });
  }

  /**
   * Set traits (partial update)
   */
  setTraits(traits: Partial<OrganismTraits>): void {
    this.traitService.updateTraits(traits, 'external_update');
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics() {
    const neuralMetrics = this.neuralService.getPerformanceMetrics();
    
    return {
      cpu: await this.metricsService.getCPUUsage(),
      memory: await this.metricsService.getMemoryUsage(),
      neuralActivity: neuralMetrics?.neuralActivity || 0,
      connectionStrength: neuralMetrics?.connectionStrength || 0
    };
  }

  /**
   * Get shader parameters for WebGL rendering
   */
  getShaderParameters(): ShaderParameters {
    const traits = this.getTraits();
    const energy = this.energyService.getEnergyLevel();
    
    return {
      energy: energy / 100,
      health: this.health / 100,
      neuralActivity: this.neuralService.getNeuralActivity() || 0,
      creativity: traits.creativity,
      focus: traits.focus,
      time: Date.now() / 1000
    };
  }
}
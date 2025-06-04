import { OrganismState, OrganismTraits } from '../shared/types/organism';
import { INeuralMesh, PerformanceMetrics } from './interfaces/INeuralMesh';
import { IOrganismCore, OrganismJSON, ShaderParameters } from './interfaces/IOrganismCore';
import { DNAInterpreter, ValidationResult } from '../types/core';
import { errorHandler } from './utils/ErrorHandler';
import { MutationBatcher, BatchedMutation } from './utils/MutationBatcher';

export class OrganismCore implements IOrganismCore {
  private mesh: INeuralMesh;
  private dna: string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private interpreter: DNAInterpreter | null = null;
  private traits: OrganismTraits;
  private energy: number;
  private health: number;
  private lastMutation: number;
  private metabolismRate: number;
  private mutationBatcher: MutationBatcher;
  private logger?: { debug: Function; info: Function; error: Function }; // Logger optionnel
  private id: string = Math.random().toString(36).substr(2, 9); // ID unique
  private neuralMesh?: INeuralMesh; // Référence pour boot
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private isBooted: boolean = false; // État boot

  constructor(dna: string, traits?: Partial<OrganismTraits>, createMesh?: () => INeuralMesh) {
    // Validation d'entrée stricte avec ErrorHandler
    const validation = this.validateInput(dna, traits);
    if (!validation.isValid) {
      throw new Error(`OrganismCore creation failed: ${validation.errors.join(', ')}`);
    }

    this.dna = dna;
    
    // Utilisation de l'injection de dépendances
    if (createMesh) {
      this.mesh = createMesh();
      this.neuralMesh = this.mesh; // Initialise la référence pour boot()
    } else {
      // Fallback pour compatibilité - import dynamique
      const { NeuralMesh } = require('./NeuralMesh');
      this.mesh = new NeuralMesh();
      this.neuralMesh = this.mesh; // Initialise la référence pour boot()
    }
    
    this.traits = {
      curiosity: 0.5,
      focus: 0.5,
      rhythm: 0.5,
      empathy: 0.5,
      creativity: 0.5,
      energy: 0.5,
      harmony: 0.5,
      wisdom: 0.1,
      ...traits
    };
    this.energy = 1.0;
    this.health = 1.0;
    this.lastMutation = Date.now();
    this.metabolismRate = 0.01;
    
    // Initialise le système de batching des mutations
    this.mutationBatcher = new MutationBatcher(
      this.processBatchedMutation.bind(this),
      {
        debounceMs: 100, // 100ms debounce pour les mutations
        maxBatchSize: 5,
        maxWaitTimeMs: 500,
        combinationStrategy: 'weighted'
      }
    );
    
    this.initializeNeuralNetwork().catch(error => {
      errorHandler.logSimpleError('OrganismCore', 'constructor', error, 'error');
    });
  }

  /**
   * Valide les paramètres d'entrée avec ErrorHandler
   */
  private validateInput(dna: string, traits?: Partial<OrganismTraits>): ValidationResult {
    // Validation DNA - vérification de base
    const dnaValidation = errorHandler.validateType(
      dna, 'string', { required: true, min: 10, pattern: /^[ATCG]+$/i }, 
      'dna', 'OrganismCore', 'validateInput'
    );
    
    if (!dnaValidation.isValid) {
      return dnaValidation;
    }

    // Validation supplémentaire DNA - caractères valides seulement
    if (!/^[ATCG]+$/i.test(dna)) {
      return {
        isValid: false,
        errors: ['DNA must contain only valid nucleotide characters (A, T, C, G)'],
        warnings: [],
        context: {
          component: 'OrganismCore',
          method: 'validateInput',
          timestamp: Date.now(),
          severity: 'error',
          details: { fieldName: 'dna', invalidCharacters: dna.replace(/[ATCG]/gi, '') }
        }
      };
    }

    // Validation traits
    if (traits) {
      for (const [key, value] of Object.entries(traits)) {
        const traitValidation = errorHandler.validateType(
          value, 'number', { required: true, min: 0, max: 1 },
          `trait.${key}`, 'OrganismCore', 'validateInput'
        );
        
        if (!traitValidation.isValid) {
          return traitValidation;
        }
      }
    }

    return { isValid: true, errors: [], warnings: [] };
  }

  /**
   * Initialise le réseau neuronal avec gestion d'erreurs robuste
   */
  private async initializeNeuralNetwork(): Promise<void> {
    return errorHandler.withRetry(
      async () => {
        await this.mesh.initialize();
        
        // Configure network based on traits
        this.mesh.stimulate('sensory_input', this.traits.curiosity);
        this.mesh.stimulate('memory_input', this.traits.focus);
      },
      {
        maxRetries: 3,
        backoffMs: 100,
        shouldRetry: (error, attempt) => attempt < 3
      },
      { component: 'OrganismCore', method: 'initializeNeuralNetwork' }
    );
  }

  /**
   * Met à jour l'état de l'organisme (appelé périodiquement)
   */
  public update(deltaTime: number = 1): void {
    errorHandler.safeExecute(
      () => {
        // Validation des paramètres
        const validation = errorHandler.validateType(
          deltaTime, 'number', { required: true, min: 0.001, max: 1000 },
          'deltaTime', 'OrganismCore', 'update'
        );
        
        if (!validation.isValid) {
          throw new Error(`Invalid deltaTime: ${validation.errors.join(', ')}`);
        }

        // Neural processing
        this.mesh.propagate();
        
        // Energy management
        this.updateEnergy(deltaTime);
        
        // Health management
        this.updateHealth();
        
        // Trait evolution based on neural activity
        this.evolveTraits();
      },
      undefined, // No fallback for update
      { component: 'OrganismCore', method: 'update' }
    );
  }

  /**
   * Met à jour l'énergie basée sur l'activité neurale
   */
  private updateEnergy(deltaTime: number): void {
    errorHandler.safeExecute(
      () => {
        const neuralActivity = this.mesh.getNeuralActivity();
        const energyCost = neuralActivity * this.metabolismRate * deltaTime;
        
        this.energy = Math.max(0, Math.min(1, this.energy - energyCost));
        
        // Low energy affects health
        if (this.energy < 0.2) {
          this.health *= 0.999;
        }
      },
      undefined,
      { component: 'OrganismCore', method: 'updateEnergy' }
    );
  }

  /**
   * Met à jour la santé basée sur les conditions actuelles
   */
  private updateHealth(): void {
    errorHandler.safeExecute(
      () => {
        // Health recovery when energy is high
        if (this.energy > 0.8) {
          this.health = Math.min(1, this.health + 0.001);
        }
        
        // Ensure health doesn't drop below 0
        this.health = Math.max(0, this.health);
      },
      undefined,
      { component: 'OrganismCore', method: 'updateHealth' }
    );
  }

  /**
   * Fait évoluer les traits basés sur l'activité neurale
   */
  private evolveTraits(): void {
    errorHandler.safeExecute(
      () => {
        const activity = this.mesh.getNeuralActivity();
        const connectionStrength = this.mesh.getConnectionStrength();
        
        // Subtle trait evolution
        const evolutionRate = 0.001;
        
        this.traits.focus += (activity - 0.5) * evolutionRate;
        this.traits.creativity += (connectionStrength - 0.5) * evolutionRate;
        
        // Clamp traits to valid range
        Object.keys(this.traits).forEach(key => {
          const typedKey = key as keyof OrganismTraits;
          this.traits[typedKey] = Math.max(0, Math.min(1, this.traits[typedKey]));
        });
      },
      undefined,
      { component: 'OrganismCore', method: 'evolveTraits' }
    );
  }

  /**
   * Stimule le réseau (ex : perception sensorielle)
   */
  public stimulate(inputId: string, value: number): void {
    errorHandler.safeExecute(
      () => {
        // Validation des paramètres avec ErrorHandler
        const inputValidation = errorHandler.validateType(
          inputId, 'string', { required: true },
          'inputId', 'OrganismCore', 'stimulate'
        );
        
        const valueValidation = errorHandler.validateType(
          value, 'number', { required: true },
          'value', 'OrganismCore', 'stimulate'
        );

        if (!inputValidation.isValid || !valueValidation.isValid) {
          throw new Error('Invalid stimulate parameters');
        }

        this.mesh.stimulate(inputId, value);
      },
      undefined,
      { component: 'OrganismCore', method: 'stimulate' }
    );
  }

  /**
   * Traite une mutation batchée
   */
  private async processBatchedMutation(batch: BatchedMutation): Promise<void> {
    return errorHandler.safeExecuteAsync(
      async () => {
        // Applique la mutation au réseau neuronal
        await this.mesh.mutate(batch.combinedRate);
        
        // Applique des mutations aux traits basées sur le batch
        const traitMutationRate = batch.combinedRate * 0.5; // Moins agressif pour les traits
        
        Object.keys(this.traits).forEach(key => {
          if (Math.random() < traitMutationRate) {
            const mutation = (Math.random() - 0.5) * 0.1 * batch.combinedRate;
            const typedKey = key as keyof OrganismTraits;
            this.traits[typedKey] = Math.max(0, Math.min(1, 
              this.traits[typedKey] + mutation));
          }
        });
        
        this.lastMutation = Date.now();
        
        errorHandler.logSimpleError('OrganismCore', 'processBatchedMutation', 
          `Processed batched mutation: rate=${batch.combinedRate.toFixed(3)}, requests=${batch.requestCount}`, 'info');
      },
      undefined,
      { component: 'OrganismCore', method: 'processBatchedMutation' }
    );
  }

  /**
   * Applique une mutation (neural et potentiellement ADN) - Version optimisée avec batching
   */
  public mutate(rate: number = 0.05): void {
    errorHandler.safeExecute(
      () => {
        // Validation du taux de mutation
        const validation = errorHandler.validateType(
          rate, 'number', { required: true, min: 0, max: 1 },
          'rate', 'OrganismCore', 'mutate'
        );
        
        if (!validation.isValid) {
          throw new Error(`Invalid mutation rate: ${validation.errors.join(', ')}`);
        }

        // Détermine la priorité basée sur le taux de mutation
        let priority: 'low' | 'normal' | 'high' = 'normal';
        if (rate > 0.3) priority = 'high';
        else if (rate < 0.01) priority = 'low';

        // Ajoute la mutation au batch au lieu de l'exécuter immédiatement
        const mutationId = this.mutationBatcher.addMutation(rate, priority);
        
        errorHandler.logSimpleError('OrganismCore', 'mutate', 
          `Queued mutation: id=${mutationId}, rate=${rate}, priority=${priority}`, 'debug');
      },
      undefined,
      { component: 'OrganismCore', method: 'mutate' }
    );
  }

  /**
   * Force l'application immédiate de toutes les mutations en attente
   */
  public async flushMutations(): Promise<void> {
    return errorHandler.safeExecuteAsync(
      async () => {
        await this.mutationBatcher.flushBatch();
      },
      undefined,
      { component: 'OrganismCore', method: 'flushMutations' }
    );
  }

  /**
   * Nourrit l'organisme pour restaurer l'énergie
   */
  public feed(amount: number = 0.3): void {
    errorHandler.safeExecute(
      () => {
        const validation = errorHandler.validateType(
          amount, 'number', { required: true, min: 0, max: 1 },
          'amount', 'OrganismCore', 'feed'
        );
        
        if (!validation.isValid) {
          throw new Error(`Invalid feed amount: ${validation.errors.join(', ')}`);
        }
        
        this.energy = Math.min(1, this.energy + amount);
      },
      undefined,
      { component: 'OrganismCore', method: 'feed' }
    );
  }

  /**
   * Récupère les traits courants
   */
  public getTraits(): OrganismTraits {
    return { ...this.traits };
  }

  /**
   * Définit de nouveaux traits
   */
  public setTraits(traits: Partial<OrganismTraits>): void {
    errorHandler.safeExecute(
      () => {
        const validation = this.validateInput(this.dna, traits);
        if (!validation.isValid) {
          throw new Error(`Invalid traits: ${validation.errors.join(', ')}`);
        }

        // On fusionne en s'assurant que chaque champ est bien un nombre
        Object.keys(traits).forEach(key => {
          const value = traits[key as keyof OrganismTraits];
          if (typeof value === 'number' && !isNaN(value)) {
            this.traits[key as keyof OrganismTraits] = value;
          }
        });
      },
      undefined,
      { component: 'OrganismCore', method: 'setTraits' }
    );
  }

  /**
   * Récupère l'état global de l'organisme
   */
  public getState(): OrganismState {
    return {
      id: 'core',
      generation: 1,
      health: this.health,
      energy: this.energy,
      traits: this.getTraits(),
      visualDNA: this.dna,
      lastMutation: this.lastMutation,
      mutations: [],
      createdAt: Date.now(),
      dna: this.dna,
      birthTime: Date.now(),
      socialConnections: [],
      memoryFragments: []
    };
  }

  /**
   * Récupère les métriques de performance - Version étendue avec mutations
   */
  public async getPerformanceMetrics(): Promise<PerformanceMetrics & { 
    neuralActivity: number;
    connectionStrength: number;
    mutationStats: any;
  }> {
    try {
      const baseMetrics = await this.measurePerformance();
      
      return {
        ...baseMetrics,
        neuralActivity: this.calculateNeuralActivity(),
        connectionStrength: this.calculateConnectionStrength(),
        mutationStats: this.mutationBatcher.getStatistics()
      };
    } catch (err) {
      this.logger?.error('Failed to get performance metrics', { organismId: this.id, err });
      
      return {
        cpu: 0,
        memory: 0,
        neuralActivity: 0,
        connectionStrength: 0,
        mutationStats: this.mutationBatcher.getStatistics()
      };
    }
  }

  /**
   * Export JSON typé pour debug/visualisation
   */
  public toJSON(): OrganismJSON {
    return {
      mesh: this.mesh.toJSON(),
      traits: this.traits,
      energy: this.energy,
      health: this.health,
      dna: this.dna,
      timestamp: Date.now()
    };
  }

  /**
   * Récupère les paramètres shaders courants (pour WebGL)
   */
  public getShaderParameters(): ShaderParameters {
    // Return shader parameters based on current organism state
    return {
      energy: this.energy,
      health: this.health,
      neuralActivity: this.mesh.getNeuralActivity(),
      creativity: this.traits.creativity,
      focus: this.traits.focus,
      time: Date.now() / 1000
    };
  }

  /**
   * Initialise l'organisme
   */
  public async boot(): Promise<void> {
    try {
      this.logger?.debug('Starting organism boot sequence', this.id);
      
      // Initialize neural mesh
      if (!this.neuralMesh) {
        throw new Error('Neural mesh not provided');
      }
      
      // Add basic neural network structure
      this.neuralMesh.addNode('sensory_input', 'input');
      this.neuralMesh.addNode('memory_input', 'input');
      this.neuralMesh.addNode('decision_output', 'output');
      this.neuralMesh.addNode('emotion_output', 'output');
      
      // Connect inputs to outputs
      this.neuralMesh.addConnection('sensory_input', 'decision_output', 0.5);
      this.neuralMesh.addConnection('memory_input', 'emotion_output', 0.3);
      
      this.isBooted = true;
      this.logger?.info('Organism boot completed successfully', this.id);
    } catch (err) {
      this.logger?.error('Failed to boot organism', { organismId: this.id, err });
      errorHandler.logSimpleError('OrganismCore', 'boot', err instanceof Error ? err.message : 'Boot failed', 'error');
      throw err;
    }
  }

  /**
   * Met l'organisme en hibernation - Version étendue avec nettoyage du batcher
   */
  public async hibernate(): Promise<void> {
    return errorHandler.safeExecuteAsync(
      async () => {
        // Traite les mutations en attente avant hibernation
        await this.mutationBatcher.flushBatch();
        
        // Nettoie le batcher
        this.mutationBatcher.dispose();
        
        await this.mesh.suspend();
        
        console.log('Organism core hibernating...');
      },
      undefined,
      { component: 'OrganismCore', method: 'hibernate' }
    );
  }

  /**
   * Mesure les performances de base
   */
  private async measurePerformance(): Promise<PerformanceMetrics> {
    try {
      const cpuUsage = await this.mesh.getCPUUsage();
      const memoryUsage = await this.mesh.getMemoryUsage();
      
      return {
        cpu: cpuUsage,
        memory: memoryUsage,
        neuralActivity: this.calculateNeuralActivity(),
        connectionStrength: this.calculateConnectionStrength()
      };
    } catch (error) {
      return {
        cpu: 0,
        memory: 0,
        neuralActivity: 0,
        connectionStrength: 0
      };
    }
  }

  /**
   * Calcule l'activité neurale
   */
  private calculateNeuralActivity(): number {
    try {
      return this.mesh.getNeuralActivity();
    } catch (error) {
      return 0;
    }
  }

  /**
   * Calcule la force de connexion
   */
  private calculateConnectionStrength(): number {
    try {
      return this.mesh.getConnectionStrength();
    } catch (error) {
      return 0;
    }
  }
}
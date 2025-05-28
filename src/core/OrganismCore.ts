import { OrganismState, OrganismTraits } from '../shared/types/organism';
import { NeuralMesh } from "./NeuralMesh";

// Types manquants (à placer ici ou à importer si déjà définis ailleurs)
type PerformanceMetrics = {
  cpu: number;
  memory: number;
  neuralActivity: number;
  connectionStrength: number;
};

type OrganismJSON = {
  mesh: any;
  traits: OrganismTraits;
  energy: number;
  health: number;
  dna: string;
  timestamp: number;
};

type ShaderParameters = {
  energy: number;
  health: number;
  neuralActivity: number;
  creativity: number;
  focus: number;
  time: number;
};

export class OrganismCore {
  private mesh: NeuralMesh;
  private dna: string;
  private interpreter: any; // DNAInterpreter - type would be imported
  private traits: OrganismTraits;
  private energy: number;
  private health: number;
  private lastMutation: number;
  private metabolismRate: number;

  constructor(dna: string, traits?: Partial<OrganismTraits>) {
    this.dna = dna;
    // this.interpreter = new DNAInterpreter(dna);
    this.mesh = new NeuralMesh();
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
    
    this.initializeNeuralNetwork();
  }

  /**
   * Initialise le réseau neuronal avec les traits de l'organisme
   */
  private async initializeNeuralNetwork(): Promise<void> {
    await this.mesh.initialize();
    
    // Configure network based on traits
    this.mesh.stimulate('sensory_input', this.traits.curiosity);
    this.mesh.stimulate('memory_input', this.traits.focus);
  }

  /**
   * Met à jour l'état de l'organisme (appelé périodiquement)
   */
  public update(deltaTime: number = 1): void {
    // Neural processing
    this.mesh.propagate();
    
    // Energy management
    this.updateEnergy(deltaTime);
    
    // Health management
    this.updateHealth();
    
    // Trait evolution based on neural activity
    this.evolveTraits();
  }

  /**
   * Met à jour l'énergie basée sur l'activité neurale
   */
  private updateEnergy(deltaTime: number): void {
    const neuralActivity = this.mesh.getNeuralActivity();
    const energyCost = neuralActivity * this.metabolismRate * deltaTime;
    
    this.energy = Math.max(0, Math.min(1, this.energy - energyCost));
    
    // Low energy affects health
    if (this.energy < 0.2) {
      this.health *= 0.999;
    }
  }

  /**
   * Met à jour la santé basée sur les conditions actuelles
   */
  private updateHealth(): void {
    // Health recovery when energy is high
    if (this.energy > 0.8) {
      this.health = Math.min(1, this.health + 0.001);
    }
    
    // Ensure health doesn't drop below 0
    this.health = Math.max(0, this.health);
  }

  /**
   * Fait évoluer les traits basés sur l'activité neurale
   */
  private evolveTraits(): void {
    const activity = this.mesh.getNeuralActivity();
    const connectionStrength = this.mesh.getConnectionStrength();
    
    // Subtle trait evolution
    const evolutionRate = 0.001;
    
    this.traits.focus += (activity - 0.5) * evolutionRate;
    this.traits.creativity += (connectionStrength - 0.5) * evolutionRate;
    
    // Clamp traits to valid range
    Object.keys(this.traits).forEach(key => {
      this.traits[key as keyof OrganismTraits] = Math.max(0, Math.min(1, this.traits[key as keyof OrganismTraits]));
    });
  }

  /**
   * Stimule le réseau (ex : perception sensorielle)
   */
  public stimulate(inputId: string, value: number): void {
    this.mesh.stimulate(inputId, value);
  }

  /**
   * Applique une mutation (neural et potentiellement ADN)
   */
  public mutate(rate: number = 0.05): void {
    this.mesh.mutate(rate);
    
    // Mutate traits slightly
    Object.keys(this.traits).forEach(key => {
      if (Math.random() < rate) {
        const mutation = (Math.random() - 0.5) * 0.1;
        this.traits[key as keyof OrganismTraits] = Math.max(0, Math.min(1, 
          this.traits[key as keyof OrganismTraits] + mutation));
      }
    });
    
    this.lastMutation = Date.now();
  }

  /**
   * Nourrit l'organisme pour restaurer l'énergie
   */
  public feed(amount: number = 0.3): void {
    this.energy = Math.min(1, this.energy + amount);
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
    // On fusionne en s'assurant que chaque champ est bien un nombre
    Object.keys(traits).forEach(key => {
      const value = traits[key as keyof OrganismTraits];
      if (typeof value === 'number' && !isNaN(value)) {
        this.traits[key as keyof OrganismTraits] = value;
      }
    });
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
    };
  }

  /**
   * Récupère les métriques de performance
   */
  public async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    return {
      cpu: await this.mesh.getCPUUsage(),
      memory: await this.mesh.getMemoryUsage(),
      neuralActivity: this.mesh.getNeuralActivity(),
      connectionStrength: this.mesh.getConnectionStrength()
    };
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
    await this.initializeNeuralNetwork();
    console.log('Organism core booted successfully');
  }

  /**
   * Met l'organisme en hibernation
   */
  public async hibernate(): Promise<void> {
    // Save state or perform cleanup
    console.log('Organism core hibernating...');
  }
}
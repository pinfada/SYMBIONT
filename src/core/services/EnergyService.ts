/**
 * EnergyService - Gestion de l'énergie et métabolisme
 * Part du refactoring d'OrganismCore selon l'architecture hexagonale
 */

export interface EnergyEvent {
  type: 'consumption' | 'regeneration' | 'boost' | 'drain';
  amount: number;
  source: string;
  timestamp: number;
  energyBefore: number;
  energyAfter: number;
}

export interface MetabolismConfig {
  baseRegenRate: number;  // Taux de régénération de base
  maxEnergy: number;      // Énergie maximale
  decayRate: number;      // Taux de dégradation naturelle
  efficiencyFactor: number; // Facteur d'efficacité métabolique
}

export class EnergyService {
  private energy: number;
  private maxEnergy: number;
  private metabolismRate: number;
  private config: MetabolismConfig;
  private history: EnergyEvent[] = [];
  private listeners: ((event: EnergyEvent) => void)[] = [];
  private regenerationTimer: NodeJS.Timeout | null = null;

  constructor(initialEnergy = 100, config?: Partial<MetabolismConfig>) {
    this.config = {
      baseRegenRate: 1,     // 1 point par seconde
      maxEnergy: 100,       // Maximum 100
      decayRate: 0.1,       // 0.1 point par seconde
      efficiencyFactor: 1,  // Efficacité normale
      ...config
    };

    this.maxEnergy = this.config.maxEnergy;
    this.energy = Math.min(initialEnergy, this.maxEnergy);
    this.metabolismRate = this.config.baseRegenRate;
    
    this.startMetabolism();
  }

  /**
   * Démarre le processus métabolique automatique
   */
  private startMetabolism(): void {
    if (this.regenerationTimer) return;

    this.regenerationTimer = setInterval(() => {
      this.passiveRegeneration();
    }, 1000); // Toutes les secondes
  }

  /**
   * Arrête le processus métabolique
   */
  stopMetabolism(): void {
    if (this.regenerationTimer) {
      clearInterval(this.regenerationTimer);
      this.regenerationTimer = null;
    }
  }

  /**
   * Régénération passive d'énergie
   */
  private passiveRegeneration(): void {
    const netRegen = this.metabolismRate * this.config.efficiencyFactor - this.config.decayRate;
    
    if (netRegen > 0 && this.energy < this.maxEnergy) {
      const oldEnergy = this.energy;
      this.energy = Math.min(this.maxEnergy, this.energy + netRegen);
      
      this.recordEvent({
        type: 'regeneration',
        amount: this.energy - oldEnergy,
        source: 'passive_metabolism',
        timestamp: Date.now(),
        energyBefore: oldEnergy,
        energyAfter: this.energy
      });
    } else if (netRegen < 0) {
      const oldEnergy = this.energy;
      this.energy = Math.max(0, this.energy + netRegen);
      
      this.recordEvent({
        type: 'drain',
        amount: Math.abs(netRegen),
        source: 'natural_decay',
        timestamp: Date.now(),
        energyBefore: oldEnergy,
        energyAfter: this.energy
      });
    }
  }

  /**
   * Consomme de l'énergie
   */
  consumeEnergy(amount: number, source = 'unknown'): boolean {
    if (amount <= 0) return true;
    if (this.energy < amount) return false;

    const oldEnergy = this.energy;
    this.energy -= amount;

    this.recordEvent({
      type: 'consumption',
      amount,
      source,
      timestamp: Date.now(),
      energyBefore: oldEnergy,
      energyAfter: this.energy
    });

    return true;
  }

  /**
   * Tente de consommer de l'énergie (même si insuffisante)
   */
  forceConsumeEnergy(amount: number, source = 'forced'): number {
    const oldEnergy = this.energy;
    const actualConsumption = Math.min(amount, this.energy);
    this.energy -= actualConsumption;

    this.recordEvent({
      type: 'consumption',
      amount: actualConsumption,
      source,
      timestamp: Date.now(),
      energyBefore: oldEnergy,
      energyAfter: this.energy
    });

    return actualConsumption;
  }

  /**
   * Ajoute de l'énergie (boost)
   */
  addEnergy(amount: number, source = 'boost'): void {
    if (amount <= 0) return;

    const oldEnergy = this.energy;
    this.energy = Math.min(this.maxEnergy, this.energy + amount);

    this.recordEvent({
      type: 'boost',
      amount: this.energy - oldEnergy,
      source,
      timestamp: Date.now(),
      energyBefore: oldEnergy,
      energyAfter: this.energy
    });
  }

  /**
   * Régénération manuelle d'énergie
   */
  regenerateEnergy(amount?: number): void {
    const regenAmount = amount || this.metabolismRate;
    this.addEnergy(regenAmount, 'manual_regeneration');
  }

  /**
   * Obtient le niveau d'énergie actuel
   */
  getEnergyLevel(): number {
    return this.energy;
  }

  /**
   * Obtient le niveau d'énergie en pourcentage
   */
  getEnergyPercentage(): number {
    return (this.energy / this.maxEnergy) * 100;
  }

  /**
   * Obtient l'énergie maximale
   */
  getMaxEnergy(): number {
    return this.maxEnergy;
  }

  /**
   * Vérifie si l'organisme a assez d'énergie
   */
  hasEnergy(amount: number): boolean {
    return this.energy >= amount;
  }

  /**
   * Vérifie si l'organisme est épuisé
   */
  isExhausted(): boolean {
    return this.energy === 0;
  }

  /**
   * Vérifie si l'organisme est à pleine énergie
   */
  isFullEnergy(): boolean {
    return this.energy === this.maxEnergy;
  }

  /**
   * Met à jour le taux de métabolisme
   */
  setMetabolismRate(rate: number): void {
    this.metabolismRate = Math.max(0, rate);
  }

  /**
   * Ajuste l'efficacité métabolique
   */
  setEfficiency(factor: number): void {
    this.config.efficiencyFactor = Math.max(0.1, Math.min(2, factor));
  }

  /**
   * Augmente l'énergie maximale
   */
  increaseMaxEnergy(amount: number): void {
    this.maxEnergy += amount;
    this.config.maxEnergy = this.maxEnergy;
  }

  /**
   * Enregistre un événement d'énergie
   */
  private recordEvent(event: EnergyEvent): void {
    this.history.push(event);
    
    // Limite l'historique pour éviter la consommation mémoire
    if (this.history.length > 1000) {
      this.history.splice(0, 100); // Supprime les 100 plus anciens
    }

    // Notifie les listeners
    this.listeners.forEach(listener => listener(event));
  }

  /**
   * Obtient l'historique d'énergie
   */
  getEnergyHistory(limit = 50): EnergyEvent[] {
    return this.history.slice(-limit);
  }

  /**
   * Obtient les statistiques d'énergie
   */
  getEnergyStats(): {
    current: number;
    max: number;
    percentage: number;
    metabolismRate: number;
    efficiency: number;
    totalConsumed: number;
    totalRegenerated: number;
  } {
    const consumptionEvents = this.history.filter(e => e.type === 'consumption');
    const regenerationEvents = this.history.filter(e => e.type === 'regeneration' || e.type === 'boost');

    const totalConsumed = consumptionEvents.reduce((sum, e) => sum + e.amount, 0);
    const totalRegenerated = regenerationEvents.reduce((sum, e) => sum + e.amount, 0);

    return {
      current: this.energy,
      max: this.maxEnergy,
      percentage: this.getEnergyPercentage(),
      metabolismRate: this.metabolismRate,
      efficiency: this.config.efficiencyFactor,
      totalConsumed,
      totalRegenerated
    };
  }

  /**
   * Ajoute un listener pour les événements d'énergie
   */
  addEnergyListener(listener: (event: EnergyEvent) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Supprime un listener
   */
  removeEnergyListener(listener: (event: EnergyEvent) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Nettoyage de l'historique ancien
   */
  cleanup(maxAge = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;
    this.history = this.history.filter(event => event.timestamp > cutoff);
  }

  /**
   * Sérialisation pour sauvegarde
   */
  toJSON(): {
    energy: number;
    maxEnergy: number;
    metabolismRate: number;
    config: MetabolismConfig;
    history: EnergyEvent[];
  } {
    return {
      energy: this.energy,
      maxEnergy: this.maxEnergy,
      metabolismRate: this.metabolismRate,
      config: { ...this.config },
      history: [...this.history]
    };
  }

  /**
   * Restauration depuis JSON
   */
  fromJSON(data: {
    energy: number;
    maxEnergy: number;
    metabolismRate: number;
    config: MetabolismConfig;
    history: EnergyEvent[];
  }): void {
    this.energy = data.energy;
    this.maxEnergy = data.maxEnergy;
    this.metabolismRate = data.metabolismRate;
    this.config = { ...data.config };
    this.history = [...data.history];
  }

  /**
   * Nettoyage lors de la destruction
   */
  destroy(): void {
    this.stopMetabolism();
    this.listeners = [];
    this.history = [];
  }
}
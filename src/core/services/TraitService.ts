/**
 * TraitService - Gestion des traits d'organisme
 * Part du refactoring d'OrganismCore selon l'architecture hexagonale
 */

import { OrganismTraits } from '../../shared/types/organism';

export interface TraitUpdateEvent {
  traitName: keyof OrganismTraits;
  oldValue: number;
  newValue: number;
  timestamp: number;
}

export interface TraitHistory {
  trait: keyof OrganismTraits;
  value: number;
  timestamp: number;
  trigger: string;
}

export class TraitService {
  private traits: OrganismTraits;
  private history: TraitHistory[] = [];
  private listeners: ((event: TraitUpdateEvent) => void)[] = [];

  constructor(initialTraits?: Partial<OrganismTraits>) {
    this.traits = {
      curiosity: 0.5,
      focus: 0.5,
      rhythm: 0.5,
      empathy: 0.5,
      creativity: 0.5,
      memory: 0.5,
      intuition: 0.5,
      resilience: 0.5,
      adaptability: 0.5,
      collaboration: 0.5,
      ...initialTraits
    };
  }

  /**
   * Met à jour un trait spécifique
   */
  updateTrait(name: keyof OrganismTraits, value: number, trigger = 'manual'): void {
    const oldValue = this.traits[name];
    const clampedValue = Math.max(0, Math.min(1, value));
    
    this.traits[name] = clampedValue;
    
    // Enregistrement dans l'historique
    this.history.push({
      trait: name,
      value: clampedValue,
      timestamp: Date.now(),
      trigger
    });

    // Notification des listeners
    const event: TraitUpdateEvent = {
      traitName: name,
      oldValue,
      newValue: clampedValue,
      timestamp: Date.now()
    };
    
    this.listeners.forEach(listener => listener(event));
  }

  /**
   * Met à jour plusieurs traits simultanément
   */
  updateTraits(updates: Partial<OrganismTraits>, trigger = 'batch'): void {
    Object.entries(updates).forEach(([key, value]) => {
      if (typeof value === 'number') {
        this.updateTrait(key as keyof OrganismTraits, value, trigger);
      }
    });
  }

  /**
   * Obtient la valeur d'un trait
   */
  getTrait(name: keyof OrganismTraits): number {
    return this.traits[name];
  }

  /**
   * Obtient tous les traits
   */
  getAllTraits(): OrganismTraits {
    return { ...this.traits };
  }

  /**
   * Obtient l'historique d'un trait
   */
  getTraitHistory(name: keyof OrganismTraits): TraitHistory[] {
    return this.history.filter(entry => entry.trait === name);
  }

  /**
   * Obtient l'historique complet limité
   */
  getFullHistory(limit = 100): TraitHistory[] {
    return this.history.slice(-limit);
  }

  /**
   * Normalise tous les traits (les ramène dans [0,1])
   */
  normalizeTraits(): void {
    Object.keys(this.traits).forEach(key => {
      const traitKey = key as keyof OrganismTraits;
      const value = this.traits[traitKey];
      if (value < 0 || value > 1) {
        this.updateTrait(traitKey, Math.max(0, Math.min(1, value)), 'normalization');
      }
    });
  }

  /**
   * Calcule l'équilibre général des traits
   */
  calculateBalance(): number {
    const values = Object.values(this.traits);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    // Plus la variance est faible, plus l'équilibre est bon
    return Math.max(0, 1 - variance);
  }

  /**
   * Ajoute un listener pour les changements de traits
   */
  addTraitChangeListener(listener: (event: TraitUpdateEvent) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Supprime un listener
   */
  removeTraitChangeListener(listener: (event: TraitUpdateEvent) => void): void {
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
    this.history = this.history.filter(entry => entry.timestamp > cutoff);
  }

  /**
   * Sérialisation pour sauvegarde
   */
  toJSON(): { traits: OrganismTraits; history: TraitHistory[] } {
    return {
      traits: { ...this.traits },
      history: [...this.history]
    };
  }

  /**
   * Restauration depuis JSON
   */
  fromJSON(data: { traits: OrganismTraits; history: TraitHistory[] }): void {
    this.traits = { ...data.traits };
    this.history = [...data.history];
  }
}
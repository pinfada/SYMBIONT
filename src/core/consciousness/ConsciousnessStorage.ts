/**
 * ConsciousnessStorage - Système de persistance de l'état de conscience
 * Sauvegarde et restaure l'état neurochimique et les mémoires
 */

import { logger } from '@shared/utils/secureLogger';
import type { NeuroChemistry } from './NeuroCore';
import type { MemoryTrace } from './CircadianRhythm';

// État complet de la conscience à persister
export interface ConsciousnessState {
  // État neurochimique
  chemistry: NeuroChemistry;
  temperature: number;

  // Mémoires et apprentissage (compatible avec MemoryTrace de CircadianRhythm)
  memories: MemoryTrace[];
  thoughtHistory: string[]; // Hashes des dernières pensées

  // Cycle circadien
  lastSleepTime: number;
  currentPhase: string;
  totalWakeTime: number;

  // Statistiques d'évolution
  totalThoughts: number;
  totalDreams: number;
  totalInteractions: number;

  // ADN et personnalité
  dna: string;
  personality: {
    empathy: number;
    curiosity: number;
    creativity: number;
    introversion: number;
  };

  // Dernière mise à jour
  lastUpdate: number;
  version: string;
}

export class ConsciousnessStorage {
  private readonly STORAGE_KEY = 'symbiont_consciousness';
  private readonly SAVE_INTERVAL = 60000; // Sauvegarde toutes les minutes
  private readonly MAX_MEMORIES = 100;
  private readonly MAX_THOUGHT_HISTORY = 50;

  private saveTimer: number | null = null;
  private state: ConsciousnessState;

  constructor() {
    this.state = this.getDefaultState();
    this.loadState();
    this.startAutoSave();
  }

  /**
   * État par défaut de la conscience
   */
  private getDefaultState(): ConsciousnessState {
    return {
      chemistry: {
        adrenaline: 0.1,
        dopamine: 0.3,
        serotonin: 0.4,
        cortisol: 0.2,
        oxytocin: 0.2,
        gaba: 0.5,
        acetylcholine: 0.4,
        melatonin: 0.1
      },
      temperature: 0.7,
      memories: [],
      thoughtHistory: [],
      lastSleepTime: Date.now(),
      currentPhase: 'awake',
      totalWakeTime: 0,
      totalThoughts: 0,
      totalDreams: 0,
      totalInteractions: 0,
      dna: this.generateDefaultDNA(),
      personality: {
        empathy: 0.5,
        curiosity: 0.7,
        creativity: 0.6,
        introversion: 0.4
      },
      lastUpdate: Date.now(),
      version: '1.0.0'
    };
  }

  /**
   * Génère un ADN par défaut unique
   */
  private generateDefaultDNA(): string {
    let dna = '';
    for (let i = 0; i < 64; i++) {
      dna += Math.floor(Math.random() * 16).toString(16);
    }
    return dna;
  }

  /**
   * Charge l'état depuis le storage
   */
  private async loadState(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEY);

      if (result[this.STORAGE_KEY]) {
        const saved = result[this.STORAGE_KEY] as ConsciousnessState;

        // Vérifier la compatibilité de version
        if (this.isCompatibleVersion(saved.version)) {
          this.state = this.mergeStates(this.state, saved);

          // Calculer le temps écoulé depuis la dernière session
          const timeSinceLastUpdate = Date.now() - saved.lastUpdate;
          this.processOfflineTime(timeSinceLastUpdate);

          logger.info('Consciousness state restored from storage', {
            memoriesCount: this.state.memories.length,
            totalThoughts: this.state.totalThoughts
          });
        } else {
          logger.warn('Incompatible consciousness version, starting fresh');
        }
      } else {
        logger.info('No previous consciousness state found, starting fresh');
        await this.saveState(); // Sauvegarder l'état initial
      }
    } catch (error) {
      logger.error('Failed to load consciousness state:', error);
    }
  }

  /**
   * Sauvegarde l'état dans le storage
   */
  public async saveState(): Promise<void> {
    try {
      // Nettoyer les données avant sauvegarde
      this.cleanupBeforeSave();

      // Mettre à jour le timestamp
      this.state.lastUpdate = Date.now();

      await chrome.storage.local.set({
        [this.STORAGE_KEY]: this.state
      });

      logger.debug('Consciousness state saved');
    } catch (error) {
      logger.error('Failed to save consciousness state:', error);
    }
  }

  /**
   * Nettoie les données avant sauvegarde
   */
  private cleanupBeforeSave(): void {
    // Limiter le nombre de mémoires
    if (this.state.memories.length > this.MAX_MEMORIES) {
      // Trier par importance (charge émotionnelle + renforcement)
      this.state.memories.sort((a, b) => {
        const scoreA = a.emotionalCharge + (a.reinforced ? 0.5 : 0);
        const scoreB = b.emotionalCharge + (b.reinforced ? 0.5 : 0);
        return scoreB - scoreA;
      });

      // Garder seulement les plus importantes
      this.state.memories = this.state.memories.slice(0, this.MAX_MEMORIES);
    }

    // Limiter l'historique des pensées
    if (this.state.thoughtHistory.length > this.MAX_THOUGHT_HISTORY) {
      this.state.thoughtHistory = this.state.thoughtHistory.slice(-this.MAX_THOUGHT_HISTORY);
    }
  }

  /**
   * Démarre la sauvegarde automatique
   */
  private startAutoSave(): void {
    this.saveTimer = window.setInterval(() => {
      this.saveState();
    }, this.SAVE_INTERVAL);
  }

  /**
   * Arrête la sauvegarde automatique
   */
  private stopAutoSave(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
  }

  /**
   * Vérifie la compatibilité de version
   */
  private isCompatibleVersion(version: string): boolean {
    const [major] = version.split('.');
    const [currentMajor] = this.state.version.split('.');
    return major === currentMajor;
  }

  /**
   * Fusionne l'état par défaut avec l'état chargé
   */
  private mergeStates(defaultState: ConsciousnessState, savedState: ConsciousnessState): ConsciousnessState {
    return {
      ...defaultState,
      ...savedState,
      // S'assurer que les nouvelles propriétés existent
      chemistry: { ...defaultState.chemistry, ...savedState.chemistry },
      personality: { ...defaultState.personality, ...savedState.personality }
    };
  }

  /**
   * Traite le temps passé hors ligne
   */
  private processOfflineTime(milliseconds: number): void {
    const hours = milliseconds / (1000 * 60 * 60);

    if (hours < 1) {
      // Moins d'une heure : légère fatigue
      this.state.chemistry.cortisol = Math.min(1, this.state.chemistry.cortisol + 0.1);
    } else if (hours < 8) {
      // 1-8 heures : sommeil normal
      this.state.chemistry.melatonin = 0.1;
      this.state.chemistry.cortisol = 0.2;
      this.state.chemistry.serotonin = Math.min(1, this.state.chemistry.serotonin + 0.2);
      this.state.totalDreams += Math.floor(hours / 2);
    } else {
      // Plus de 8 heures : hibernation
      this.state.chemistry = this.getDefaultState().chemistry;
      this.state.memories = this.state.memories.filter(m => m.reinforced); // Garder seulement les mémoires renforcées
      logger.info(`Organism awakened from hibernation (${hours.toFixed(1)} hours)`);
    }
  }

  // Méthodes publiques pour mettre à jour l'état

  /**
   * Met à jour la chimie neuronale
   */
  public updateChemistry(chemistry: Partial<NeuroChemistry>): void {
    this.state.chemistry = { ...this.state.chemistry, ...chemistry };
  }

  /**
   * Met à jour la température
   */
  public updateTemperature(temperature: number): void {
    this.state.temperature = temperature;
  }

  /**
   * Ajoute une mémoire
   */
  public addMemory(memory: MemoryTrace): void {
    this.state.memories.push(memory);
  }

  /**
   * Ajoute un hash de pensée à l'historique
   */
  public addThoughtHash(hash: string): void {
    this.state.thoughtHistory.push(hash);
    this.state.totalThoughts++;
  }

  /**
   * Met à jour le cycle circadien
   */
  public updateCircadian(phase: string, lastSleepTime?: number): void {
    this.state.currentPhase = phase;
    if (lastSleepTime) {
      this.state.lastSleepTime = lastSleepTime;
    }

    if (phase === 'awake') {
      this.state.totalWakeTime += Date.now() - this.state.lastUpdate;
    }
  }

  /**
   * Incrémente le compteur d'interactions
   */
  public incrementInteractions(): void {
    this.state.totalInteractions++;
  }

  /**
   * Incrémente le compteur de rêves
   */
  public incrementDreams(): void {
    this.state.totalDreams++;
  }

  /**
   * Obtient l'état actuel
   */
  public getState(): ConsciousnessState {
    return { ...this.state };
  }

  /**
   * Obtient seulement la chimie
   */
  public getChemistry(): NeuroChemistry {
    return { ...this.state.chemistry };
  }

  /**
   * Obtient seulement les mémoires
   */
  public getMemories(): MemoryTrace[] {
    return [...this.state.memories];
  }

  /**
   * Obtient l'ADN
   */
  public getDNA(): string {
    return this.state.dna;
  }

  /**
   * Obtient la personnalité
   */
  public getPersonality(): typeof this.state.personality {
    return { ...this.state.personality };
  }

  /**
   * Évolue la personnalité basée sur l'expérience
   */
  public evolvePersonality(trait: keyof typeof this.state.personality, delta: number): void {
    const current = this.state.personality[trait];
    this.state.personality[trait] = Math.max(0, Math.min(1, current + delta));

    logger.info(`Personality evolved: ${trait} ${delta > 0 ? '+' : ''}${delta.toFixed(3)}`);
  }

  /**
   * Mute l'ADN (évolution)
   */
  public mutateDNA(position: number): void {
    if (position < 0 || position >= this.state.dna.length) return;

    const chars = this.state.dna.split('');
    const currentValue = parseInt(chars[position], 16);
    const newValue = (currentValue + Math.floor(Math.random() * 3) - 1 + 16) % 16;
    chars[position] = newValue.toString(16);

    this.state.dna = chars.join('');

    logger.info(`DNA mutated at position ${position}`);
  }

  /**
   * Réinitialise l'état (nouveau cycle de vie)
   */
  public reset(): void {
    this.stopAutoSave();
    this.state = this.getDefaultState();
    this.saveState();
    this.startAutoSave();

    logger.info('Consciousness reset to default state');
  }

  /**
   * Nettoie les ressources
   */
  public destroy(): void {
    this.stopAutoSave();
    this.saveState(); // Dernière sauvegarde
  }
}
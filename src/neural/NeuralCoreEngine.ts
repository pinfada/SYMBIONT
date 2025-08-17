import { OrganismMemoryBank } from '../background/OrganismMemoryBank'
import { HebbieanLearningSystem } from './HebbieanLearningSystem'
import { BehaviorPredictor } from '../behavioral/core/BehaviorPredictor'
import { GeneticMutator } from './GeneticMutator'
import { OrganismState, BehaviorPattern, Mutation, PageContext, ActionPrediction } from '../shared/types/organism'
import { errorHandler } from '../core/utils/ErrorHandler'
import { SecureRandom } from '../shared/utils/secureRandom';
import { SecureLogger } from '@shared/utils/secureLogger';

export class NeuralCoreEngine {
  private organisms: Map<string, OrganismState>
  private hebbian: HebbieanLearningSystem
  private predictor: BehaviorPredictor
  private mutator: GeneticMutator
  private memoryBank: OrganismMemoryBank
  private initialized: boolean = false

  constructor(memoryBank: OrganismMemoryBank) {
    this.memoryBank = memoryBank
    this.organisms = new Map()
    this.hebbian = new HebbieanLearningSystem()
    this.predictor = new BehaviorPredictor()
    this.mutator = new GeneticMutator()
    this.initialize()
  }

  private async initialize(): Promise<void> {
    try {
      // Charger les organismes depuis la mémoire (utiliser la méthode existante)
      // Note: Comme retrieveOrganisms n'existe pas, on va créer une logique alternative
      this.initialized = true
      SecureLogger.info(`🧠 NeuralCoreEngine initialisé`)
    } catch (error) {
      errorHandler.logSimpleError('NeuralCoreEngine', 'initialize', error, 'warning')
      this.initialized = true // Continue même en cas d'erreur
    }
  }

  async createOrganism(userId: string): Promise<OrganismState> {
    try {
      // Générer un ADN unique basé sur l'ID utilisateur et un timestamp
      const dna = this.generateDNA(userId)
      
      // Créer un nouvel organisme avec des traits aléatoires mais équilibrés
      const organism: OrganismState = {
        id: userId,
        dna,
        generation: 1,
        health: 1.0,
        energy: 1.0,
        consciousness: 0.5,
        traits: {
          curiosity: 0.4 + SecureRandom.random() * 0.2,      // 0.4-0.6
          focus: 0.4 + SecureRandom.random() * 0.2,          // 0.4-0.6
          rhythm: 0.4 + SecureRandom.random() * 0.2,         // 0.4-0.6
          empathy: 0.4 + SecureRandom.random() * 0.2,        // 0.4-0.6
          creativity: 0.4 + SecureRandom.random() * 0.2,     // 0.4-0.6
          resilience: 0.4 + SecureRandom.random() * 0.2,     // 0.4-0.6
          adaptability: 0.4 + SecureRandom.random() * 0.2,   // 0.4-0.6
          memory: 0.4 + SecureRandom.random() * 0.2,         // 0.4-0.6
          intuition: 0.1 + SecureRandom.random() * 0.1       // 0.1-0.2 (plus rare)
        },
        mutations: [],
        socialConnections: [],
        memoryFragments: [],
        birthTime: Date.now(),
        lastMutation: null,
        createdAt: Date.now()
      }

      // Sauvegarder dans la mémoire (utiliser la méthode existante)
      this.organisms.set(userId, organism)
      await this.memoryBank.saveOrganismState(userId, organism)

      SecureLogger.info(`🌱 Nouvel organisme créé pour ${userId}`)
      return organism
    } catch (error) {
      errorHandler.logSimpleError('NeuralCoreEngine', 'createOrganism', error, 'error')
      throw error
    }
  }

  async evolveOrganism(id: string, behaviorData: BehaviorPattern[]): Promise<Mutation[]> {
    try {
      const organism = this.organisms.get(id)
      if (!organism) {
        // Essayer de charger depuis la mémoire
        const history = await this.memoryBank.loadOrganismHistory(id)
        if (history.states.length > 0) {
          const loadedOrganism = history.states[0]
          this.organisms.set(id, loadedOrganism)
          return this.evolveOrganism(id, behaviorData) // Retry
        }
        throw new Error(`Organisme ${id} non trouvé`)
      }

      // Analyser les patterns de comportement avec le système Hebbien
      const learningResult = await this.hebbian.updateWeights(behaviorData)
      const mutations: Mutation[] = []
      
      // Mutation de traits basée sur l'activité
      for (const pattern of behaviorData) {
        // Analyser l'intensité d'interaction (timeSpent + interactions)
        const intensity = (pattern.timeSpent / 60000) + (pattern.interactions * 0.1) // Normaliser
        if (intensity > 0.7) { // Pattern intense
          const mutation = this.mutator.generateMutation('curiosity', 'high_activity')
          if (mutation) {
            mutations.push(mutation)
          }
        }
      }

      // Mutation basée sur l'apprentissage Hebbien
      if (learningResult.newPatterns.length > 0) {
        const patternMutation = this.mutator.generateMutation('focus', 'pattern_learning')
        if (patternMutation) {
          mutations.push(patternMutation)
        }
      }

      // Mutation aléatoire occasionnelle (1% de chance)
      if (SecureRandom.random() < 0.01) {
        const randomMutation = this.mutator.generateMutation('energy', 'random')
        if (randomMutation) {
          mutations.push(randomMutation)
        }
      }

      // Appliquer les mutations à l'organisme
      for (const mutation of mutations) {
        this.applyMutation(organism, mutation)
      }

      // Mettre à jour l'organisme
      organism.lastMutation = Date.now()
      if (!organism.mutations) {
        organism.mutations = [];
      }
      organism.mutations.push(...mutations)
      this.organisms.set(id, organism)
      
      // Sauvegarder
      await this.memoryBank.saveOrganismState(id, organism)

      SecureLogger.info(`🧬 ${mutations.length} mutations appliquées à l'organisme ${id}`)
      return mutations
    } catch (error) {
      errorHandler.logSimpleError('NeuralCoreEngine', 'evolveOrganism', error, 'error')
      return []
    }
  }

  async predictNextAction(id: string, context: PageContext): Promise<ActionPrediction> {
    try {
      const organism = this.organisms.get(id)
      if (!organism) {
        throw new Error(`Organisme ${id} non trouvé`)
      }

      // Utiliser le prédicteur comportemental (méthode existante)
      const prediction = this.predictor.predictNextAction(organism, context)
      
      // Enrichir avec les traits de l'organisme
      const enrichedPrediction: ActionPrediction = {
        action: prediction.action || 'browse',
        confidence: this.calculateConfidence(organism, context),
        alternatives: this.generateSuggestions(organism, context),
        reasoning: `Basé sur les traits: curiosité=${organism.traits.curiosity.toFixed(2)}, focus=${organism.traits.focus.toFixed(2)}`
      }

      SecureLogger.info(`🔮 Prédiction générée pour ${id}: ${enrichedPrediction.action}`)
      return enrichedPrediction
    } catch (error) {
      errorHandler.logSimpleError('NeuralCoreEngine', 'predictNextAction', error, 'error')
      
      // Prédiction fallback
      return {
        action: 'browse',
        confidence: 0.3,
        alternatives: ['browse', 'search'],
        reasoning: 'Fallback prediction due to error'
      }
    }
  }

  // Méthodes utilitaires privées
  private generateDNA(userId: string): string {
    let hash = this.simpleHash(userId + Date.now())
    const genes = ['A', 'T', 'G', 'C']
    let dna = 'SYM'
    
    for (let i = 0; i < 16; i++) {
      dna += genes[hash % 4]
      hash = Math.floor(hash / 4)
    }
    
    return dna
  }

  private simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  private applyMutation(organism: OrganismState, mutation: Mutation): void {
    // Appliquer la mutation basée sur le trait
    if (organism.traits[mutation.trait]) {
      const currentValue = organism.traits[mutation.trait]
      const newValue = Math.max(0, Math.min(1, currentValue + mutation.delta))
      organism.traits[mutation.trait] = newValue
    }
  }

  // @ts-expect-error Paramètre réservé pour usage futur
  private calculateConfidence(organism: OrganismState, context: PageContext): number {
    // Base confidence sur l'expérience (nombre de mutations = expérience)
    const mutationsLength = organism.mutations ? organism.mutations.length : 0;
    const experienceBonus = Math.min(0.3, mutationsLength * 0.01)
    
    // Bonus pour les traits pertinents
    const focusBonus = organism.traits.focus * 0.2
    const wisdomBonus = (organism.traits.wisdom || 0.1) * 0.3
    
    return Math.min(0.95, 0.4 + experienceBonus + focusBonus + wisdomBonus)
  }

  // @ts-expect-error Paramètre réservé pour usage futur
  private generateSuggestions(organism: OrganismState, context: PageContext): string[] {
    const suggestions = ['browse']
    
    if (organism.traits.curiosity > 0.6) {
      suggestions.push('explore', 'discover')
    }
    if (organism.traits.focus > 0.7) {
      suggestions.push('focus', 'deep_read')
    }
    if (organism.traits.creativity > 0.6) {
      suggestions.push('create', 'imagine')
    }
    
    return suggestions.slice(0, 3) // Limiter à 3 suggestions
  }

  // Méthodes publiques pour l'accès aux organismes
  getOrganism(id: string): OrganismState | undefined {
    return this.organisms.get(id)
  }

  async loadOrganism(id: string): Promise<OrganismState | null> {
    try {
      const history = await this.memoryBank.loadOrganismHistory(id)
      if (history.states.length > 0) {
        const organism = history.states[0]
        this.organisms.set(id, organism)
        return organism
      }
      return null
    } catch (error) {
      errorHandler.logSimpleError('NeuralCoreEngine', 'loadOrganism', error, 'error')
      return null
    }
  }

  getAllOrganisms(): OrganismState[] {
    return Array.from(this.organisms.values())
  }

  async isInitialized(): Promise<boolean> {
    return this.initialized
  }
} 
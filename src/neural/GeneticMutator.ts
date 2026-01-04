import { OrganismState, Mutation } from '../shared/types/organism'
import { SecureRandom } from '../shared/utils/secureRandom';

export class GeneticMutator {
  private mutationProbability: number;
  private traitWeights: Record<string, number>;
  private environmentalPressure: number;

  constructor(mutationProbability = 0.05, traitWeights: Record<string, number> = {}, environmentalPressure = 1) {
    this.mutationProbability = mutationProbability;
    this.traitWeights = traitWeights;
    this.environmentalPressure = environmentalPressure;
  }

  // Calcule la probabilité de mutation (peut être enrichi)
  calculateMutationProbability(organism: OrganismState): number {
    let base = this.mutationProbability * this.environmentalPressure;
    // Influence des traits (ex : curiosité favorise la mutation)
    if (organism.traits.curiosity > 0.7) base *= 1.2;
    if (organism.traits.focus < 0.3) base *= 0.8;
    return Math.min(1, Math.max(0, base));
  }

  // Génère une mutation sur un trait ou le DNA
  generateMutation(trait: string, trigger?: any): Mutation {
    const delta = (SecureRandom.random() - 0.5) * 0.2; // variation [-0.1, +0.1]
    return { trait, delta, reason: trigger || 'genetic' };
  }

  // Applique la mutation à l'organisme et historise
  applyMutation(organism: OrganismState, mutation: Mutation): OrganismState {
    if (mutation.trait === 'dna') {
      // Mutation du DNA (remplacement aléatoire d'un caractère)
      const chars = organism.dna.split('');
      const idx = Math.floor(SecureRandom.random() * chars.length);
      chars[idx] = String.fromCharCode(33 + Math.floor(SecureRandom.random() * 94));
      organism.dna = chars.join('');
    } else {
      // Mutation d'un trait
      organism.traits[mutation.trait] = Math.max(0, Math.min(1, (organism.traits[mutation.trait] ?? 0.5) + mutation.delta));
    }
    organism.mutations = organism.mutations || [];
    organism.mutations.push({ ...mutation, timestamp: Date.now() });
    return organism;
  }
} 
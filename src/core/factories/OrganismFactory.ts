// Factory pattern pour résoudre les dépendances circulaires

import { INeuralMesh } from '../interfaces/INeuralMesh';
import { IOrganismCore } from '../interfaces/IOrganismCore';
import { OrganismTraits } from '../../shared/types/organism';

export interface OrganismDependencies {
  createNeuralMesh: () => INeuralMesh;
}

export class OrganismFactory {
  private static dependencies: OrganismDependencies | null = null;
  private neuralMeshInstance: INeuralMesh | null = null;

  static setDependencies(deps: OrganismDependencies): void {
    this.dependencies = deps;
  }

  static createOrganism(dna: string, traits?: Partial<OrganismTraits>): IOrganismCore {
    if (!this.dependencies) {
      throw new Error('OrganismFactory dependencies not set. Call setDependencies() first.');
    }

    // Import dynamique pour éviter la circularité
    const { OrganismCore } = require('../OrganismCore');
    return new OrganismCore(dna, traits, this.dependencies.createNeuralMesh);
  }

  static createNeuralMesh(): INeuralMesh {
    // Import dynamique pour éviter la circularité
    const { NeuralMesh } = require('../NeuralMesh');
    return new NeuralMesh();
  }

  // Méthode d'instance pour obtenir le NeuralMesh (singleton lazy).
  // On l'initialise dès la création : sans initialize(), le réseau reste
  // sans nœuds ni connexions et propagate()/adaptToResonance() n'opèrent
  // sur rien. L'initialisation crée le réseau par défaut (capteurs → sorties).
  async getNeuralMesh(): Promise<INeuralMesh> {
    if (!this.neuralMeshInstance) {
      const mesh = OrganismFactory.createNeuralMesh();
      try {
        await mesh.initialize();
      } catch (error) {
        // On garde l'instance même si l'init échoue (mode dégradé)
        console.warn('[OrganismFactory] NeuralMesh initialize failed:', error);
      }
      this.neuralMeshInstance = mesh;
    }
    return this.neuralMeshInstance;
  }
} 
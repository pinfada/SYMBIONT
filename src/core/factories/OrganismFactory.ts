// Factory pattern pour résoudre les dépendances circulaires

import { INeuralMesh } from '../interfaces/INeuralMesh';
import { IOrganismCore } from '../interfaces/IOrganismCore';
import { OrganismTraits } from '../../shared/types/organism';

export interface OrganismDependencies {
  createNeuralMesh: () => INeuralMesh;
}

export class OrganismFactory {
  private static dependencies: OrganismDependencies | null = null;

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
} 
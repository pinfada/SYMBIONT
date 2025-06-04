import { INeuralMesh } from '../interfaces/INeuralMesh';
import { IOrganismCore } from '../interfaces/IOrganismCore';
import { OrganismTraits } from '../../shared/types/organism';
export interface OrganismDependencies {
    createNeuralMesh: () => INeuralMesh;
}
export declare class OrganismFactory {
    private static dependencies;
    static setDependencies(deps: OrganismDependencies): void;
    static createOrganism(dna: string, traits?: Partial<OrganismTraits>): IOrganismCore;
    static createNeuralMesh(): INeuralMesh;
}
//# sourceMappingURL=OrganismFactory.d.ts.map
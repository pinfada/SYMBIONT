import React from 'react';
import { OrganismState } from '@shared/types/organism';
export interface OrganismContextType {
    organism: OrganismState | null;
    isLoading: boolean;
}
export declare const OrganismContext: React.Context<OrganismContextType | null>;
export declare const useOrganism: () => OrganismContextType;
export declare const useWebGL: () => {
    isSupported: boolean | null;
    initWebGL: (canvas: HTMLCanvasElement, organism: OrganismState) => Promise<() => void>;
    engine: any;
};
//# sourceMappingURL=useOrganism.d.ts.map
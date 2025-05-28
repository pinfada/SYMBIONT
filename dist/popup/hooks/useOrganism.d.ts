import React, { ReactNode } from 'react';
import { OrganismState } from '@shared/types/organism';
export interface OrganismContextType {
    organism: OrganismState | null;
    isLoading: boolean;
}
export declare const OrganismContext: React.Context<OrganismContextType | null>;
export declare const useOrganism: () => OrganismContextType;
export declare function OrganismProvider({ children }: {
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=useOrganism.d.ts.map
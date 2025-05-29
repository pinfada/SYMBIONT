import { OrganismState, OrganismHistory, TimeSpan, ConsolidationResult } from '../shared/types/organism';
import { SecurityManager } from './SecurityManager';
export declare class OrganismMemoryBank {
    private security;
    constructor(security: SecurityManager);
    private getKey;
    saveOrganismState(id: string, state: OrganismState): Promise<void>;
    loadOrganismHistory(id: string): Promise<OrganismHistory>;
    consolidateMemories(timespan: TimeSpan): Promise<ConsolidationResult>;
    optimizeStorage(): Promise<void>;
    logPerformance(msg: string): void;
}
//# sourceMappingURL=OrganismMemoryBank.d.ts.map
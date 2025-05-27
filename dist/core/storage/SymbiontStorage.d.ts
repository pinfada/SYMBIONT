import { OrganismState, OrganismMutation } from '@shared/types/organism';
interface BehaviorData {
    url: string;
    visitCount: number;
    totalTime: number;
    scrollDepth: number;
    lastVisit: number;
    interactions: Array<{
        type: string;
        timestamp: number;
        data: any;
    }>;
}
export declare class SymbiontStorage {
    private db;
    private readonly DB_NAME;
    private readonly DB_VERSION;
    initialize(): Promise<void>;
    getOrganism(): Promise<OrganismState | null>;
    saveOrganism(organism: OrganismState): Promise<void>;
    getBehavior(url: string): Promise<BehaviorData | null>;
    saveBehavior(behavior: BehaviorData): Promise<void>;
    addMutation(mutation: OrganismMutation): Promise<void>;
    getRecentMutations(limit?: number): Promise<OrganismMutation[]>;
    getSetting<T>(key: string, defaultValue: T): Promise<T>;
    setSetting<T>(key: string, value: T): Promise<void>;
}
export {};

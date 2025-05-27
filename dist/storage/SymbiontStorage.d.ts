export declare class SymbiontStorage {
    initialize(): Promise<void>;
    getOrganism(): Promise<any>;
    saveOrganism(org: any): Promise<void>;
    getBehavior(url: string): Promise<any>;
    saveBehavior(behavior: any): Promise<void>;
    addMutation(mutation: any): Promise<void>;
    getRecentMutations(count: number): Promise<any[]>;
    static getInstance(): SymbiontStorage;
    getBehaviorPatterns(): Promise<any[]>;
    getRecentActivity(ms: number): Promise<any[]>;
    getSetting(key: string): Promise<any>;
    setSetting(key: string, value: any): Promise<void>;
}
export default SymbiontStorage;

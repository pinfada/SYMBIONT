import { OrganismState, OrganismMutation } from '../../shared/types/organism';
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
    getOrganism(id?: string): Promise<OrganismState | null>;
    saveOrganism(organism: OrganismState): Promise<void>;
    getBehavior(url: string): Promise<BehaviorData | null>;
    saveBehavior(behavior: BehaviorData): Promise<void>;
    addMutation(mutation: OrganismMutation & {
        timestamp?: number;
    }): Promise<void>;
    getRecentMutations(limit?: number): Promise<OrganismMutation[]>;
    getSetting<T>(key: string, defaultValue: T): Promise<T>;
    setSetting<T>(key: string, value: T): Promise<void>;
    addInvitation(invitation: any): Promise<void>;
    updateInvitation(invitation: any): Promise<void>;
    getInvitation(code: string): Promise<any | null>;
    getAllInvitations(): Promise<any[]>;
    /**
     * Retourne la liste des comportements triés par nombre de visites (visitCount) puis date de dernière visite (lastVisit)
     */
    getBehaviorPatterns(): Promise<BehaviorData[]>;
    /**
     * Retourne les interactions récentes sur une période donnée (en ms, par défaut 24h)
     */
    getRecentActivity(periodMs?: number): Promise<any[]>;
    /**
     * Nettoie les anciennes données pour optimiser l'espace
     */
    cleanup(retentionDays?: number): Promise<void>;
    /**
     * Ferme la connexion à la base de données
     */
    close(): void;
}
export {};
//# sourceMappingURL=SymbiontStorage.d.ts.map
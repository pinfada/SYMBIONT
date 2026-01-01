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
        data: unknown;
    }>;
}
/**
 * Singleton instance management - ensures only one connection per context type
 */
declare class StorageInstanceManager {
    private static instances;
    static getInstance(contextType: string): SymbiontStorage | null;
    static registerInstance(contextType: string, instance: SymbiontStorage): void;
    static removeInstance(contextType: string): void;
    static closeAll(): void;
}
export declare class SymbiontStorage {
    private db;
    private readonly DB_NAME;
    private readonly DB_VERSION;
    private readonly OPERATION_TIMEOUT;
    private readonly MAX_STORAGE_SIZE_MB;
    private quotaWarningIssued;
    private broadcastChannel;
    private contextId;
    private contextType;
    private isClosing;
    private readonly isPlaywrightContext;
    private initializationPromise;
    private heartbeatInterval;
    constructor();
    /**
     * Heartbeat mechanism to detect and cleanup orphaned connections
     */
    private startHeartbeat;
    /**
     * Detects if code is running in Playwright automated test environment
     * Uses User-Agent as the most reliable detection method
     */
    private detectPlaywrightContext;
    /**
     * Identifies the type of context this code is running in
     */
    private getContextType;
    /**
     * Sets up cross-context communication to coordinate database access
     */
    private setupBroadcastChannel;
    /**
     * Requests all other contexts to close their database connections
     */
    private requestOtherContextsToClose;
    /**
     * Pings other contexts to see who has the database open
     * Also detects orphaned connections (contexts that don't respond)
     */
    private pingOtherContexts;
    /**
     * Wraps a promise with a timeout to prevent indefinite hanging
     */
    private withTimeout;
    initialize(): Promise<void>;
    private performInitialization;
    private attemptInitialize;
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
     * Vérifie le quota de stockage et alerte si nécessaire
     */
    private checkStorageQuota;
    /**
     * Obtient les statistiques de stockage
     */
    getStorageStats(): Promise<{
        usageInMB: number;
        quotaInMB: number;
        usagePercent: number;
        needsCleanup: boolean;
    }>;
    /**
     * Ferme la connexion à la base de données
     */
    close(): void;
    /**
     * Tente de forcer la fermeture de la base de données en supprimant et recréant
     * Utilisé en dernier recours quand la base est bloquée par une autre connexion
     */
    private forceCloseDatabase;
    /**
     * Méthode statique pour nettoyer TOUTES les connexions IndexedDB
     * Utilisé par les tests Playwright pour cleanup complet
     */
    static forceCloseAllConnections(dbName?: string): Promise<void>;
}
export { StorageInstanceManager };
//# sourceMappingURL=SymbiontStorage.d.ts.map
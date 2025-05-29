declare class PersistentServiceWorker {
    private static instance;
    private isAlive;
    private heartbeatInterval;
    private connectionHealth;
    private lastHeartbeat;
    constructor();
    private setupSelfHealing;
    private sendHeartbeat;
    private checkConnectionHealth;
    private reinitialize;
    private saveEmergencyState;
    private performMaintenance;
    private setupPeriodicMaintenance;
    private setupEmergencyProtocols;
}
export declare const persistentServiceWorker: PersistentServiceWorker;
export {};
//# sourceMappingURL=persistent-service-worker.d.ts.map
export declare class PersistentServiceWorker {
    private static _instance;
    private isAlive;
    private _heartbeatInterval;
    private _connectionHealth;
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
    private startHeartbeat;
}
export declare const persistentServiceWorker: PersistentServiceWorker;
//# sourceMappingURL=persistent-service-worker.d.ts.map
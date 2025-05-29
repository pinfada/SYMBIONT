export declare class PredictiveHealthMonitor {
    private healthMetrics;
    private onAlert;
    private modeConservateur;
    private modeOffline;
    constructor(onAlert?: (msg: string) => void);
    private setupContinuousMonitoring;
    private collectMetrics;
    private detectAnomalies;
    private predictIssues;
    private takePreventiveActions;
    getCurrentMode(): 'normal' | 'conservateur' | 'offline';
    logError(): void;
    private alert;
    private logAction;
}
//# sourceMappingURL=predictive-health-monitor.d.ts.map
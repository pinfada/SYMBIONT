export declare class BasicHealthMonitor {
    private metrics;
    private alertCallback;
    private lastAlerts;
    private alertCooldown;
    constructor(alertCallback?: (msg: string) => void);
    private setupMonitoring;
    private collectMetrics;
    private checkHealth;
    logError(): void;
    private alert;
}
//# sourceMappingURL=basic-health-monitor.d.ts.map
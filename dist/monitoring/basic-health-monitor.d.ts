export declare class BasicHealthMonitor {
    private metrics;
    private alertCallback;
    constructor(alertCallback?: (msg: string) => void);
    private setupMonitoring;
    private collectMetrics;
    private checkHealth;
    logError(): void;
    private alert;
}
//# sourceMappingURL=basic-health-monitor.d.ts.map
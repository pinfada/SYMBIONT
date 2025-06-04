type Message = {
    type: string;
    payload: any;
};
type SendResult = {
    success: boolean;
    queued?: boolean;
    error?: any;
};
export declare class ResilientMessageBus {
    private connectionState;
    private messageQueue;
    private failureStrategies;
    private circuitBreaker;
    private failureQueue;
    private isConnected;
    private connectionAttempts;
    constructor();
    private setupFailureStrategies;
    send(message: Message): Promise<SendResult>;
    private simulateSend;
    private getBackoff;
    private wait;
    private cacheOrganismState;
    private queueForLaterSync;
    private processLocally;
    private _attemptConnection;
    private _processMessage;
}
export {};
//# sourceMappingURL=resilient-message-bus.d.ts.map
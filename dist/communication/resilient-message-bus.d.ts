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
    constructor();
    private setupFailureStrategies;
    send(message: Message): Promise<SendResult>;
    private simulateSend;
    private getBackoff;
    private wait;
    private cacheOrganismState;
    private queueForLaterSync;
    private processLocally;
}
export {};
//# sourceMappingURL=resilient-message-bus.d.ts.map
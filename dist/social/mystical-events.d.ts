export declare class MysticalEvents {
    private channel;
    private peerId;
    constructor();
    triggerMysticalEvent(eventId: string, payload: any): void;
    propagateToCommunity(eventId: string, payload: any): void;
    applySpecialEffect(effect: string): void;
    private handleMessage;
}
//# sourceMappingURL=mystical-events.d.ts.map
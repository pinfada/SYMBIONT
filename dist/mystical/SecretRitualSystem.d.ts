import { MysticalEvent, RitualTrigger, ExecutionContext, SecretResult } from '../shared/types/mystical';
export declare class SecretRitualSystem {
    private ritualTriggers;
    private secretCodes;
    private mysticalEvents;
    constructor();
    detectRitualTrigger(interactions: any[]): RitualTrigger | null;
    executeSecret(code: string, context: ExecutionContext): SecretResult | null;
    generateMysticalEvent(probability: number): MysticalEvent | null;
}
//# sourceMappingURL=SecretRitualSystem.d.ts.map
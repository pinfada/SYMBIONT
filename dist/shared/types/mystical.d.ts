export interface RitualCondition {
    trigger: (interactions: unknown[]) => boolean;
    effect: () => Promise<unknown>;
    rarity: number;
}
export type SecretFunction = (context: ExecutionContext) => Promise<SecretResult>;
export interface MysticalEvent {
    name: string;
    description: string;
    effects: any;
    rarity: string;
}
export interface RitualTrigger {
    name: string;
    effect: any;
    timestamp: number;
    rarity: number;
}
export interface ExecutionContext {
    [key: string]: any;
}
export interface SecretResult {
    name: string;
    description: string;
    effects: any;
    duration: number | 'Infinity';
    unlockMessage?: string;
}
//# sourceMappingURL=mystical.d.ts.map
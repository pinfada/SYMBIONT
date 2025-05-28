import type { ScrollPattern } from '../index';
export declare class ScrollTracker {
    on(event: string, handler: (data: any) => void): void;
    detectPattern(): ScrollPattern;
    stop(): void;
}

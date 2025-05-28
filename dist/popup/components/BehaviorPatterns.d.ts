import React from 'react';
interface Pattern {
    id: string;
    type: string;
    confidence: number;
    lastSeen: number;
    description: string;
}
interface BehaviorPatternsProps {
    data: Pattern[];
}
export declare const BehaviorPatterns: React.FC<BehaviorPatternsProps>;
export {};
//# sourceMappingURL=BehaviorPatterns.d.ts.map
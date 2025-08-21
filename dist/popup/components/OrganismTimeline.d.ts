import React from 'react';
interface TimelineEvent {
    type: 'mutation' | 'transmission' | 'activation' | 'consciousness' | 'energy';
    date: number;
    description: string;
    details?: unknown;
    id?: string;
    metadata?: Record<string, unknown>;
}
interface OrganismTimelineProps {
    events: TimelineEvent[];
}
export declare const OrganismTimeline: React.FC<OrganismTimelineProps>;
export {};
//# sourceMappingURL=OrganismTimeline.d.ts.map
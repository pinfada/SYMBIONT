import React from 'react';
interface TimelineEvent {
    type: 'mutation' | 'transmission' | 'activation';
    date: number;
    description: string;
    details?: any;
}
interface OrganismTimelineProps {
    events: TimelineEvent[];
}
export declare const OrganismTimeline: React.FC<OrganismTimelineProps>;
export {};

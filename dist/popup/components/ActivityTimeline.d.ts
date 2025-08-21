import React from 'react';
interface Activity {
    id: string;
    type: string;
    timestamp: number;
    duration?: number;
    url?: string;
    data?: unknown;
}
interface ActivityTimelineProps {
    data: Activity[];
}
export declare const ActivityTimeline: React.FC<ActivityTimelineProps>;
export {};
//# sourceMappingURL=ActivityTimeline.d.ts.map
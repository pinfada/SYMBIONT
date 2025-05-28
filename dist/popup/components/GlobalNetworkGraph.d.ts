import React from 'react';
interface NetworkNode {
    id: string;
    generation: number;
    x: number;
    y: number;
}
interface NetworkLink {
    source: string;
    target: string;
}
interface GlobalNetworkGraphProps {
    nodes?: NetworkNode[];
    links?: NetworkLink[];
}
export declare const GlobalNetworkGraph: React.FC<GlobalNetworkGraphProps>;
export {};
//# sourceMappingURL=GlobalNetworkGraph.d.ts.map
import { ReactNode } from 'react';
interface Network {
    nodes: any[];
    links: any[];
}
interface InviteParams {
    source: string;
    target: string;
    traits: any;
}
interface FusionParams {
    type: string;
    participants: string[];
    result: string;
    traits: any;
}
interface NetworkContextType {
    network: Network;
    loading: boolean;
    error: string | null;
    wsConnected: boolean;
    actionStatus: 'idle' | 'loading' | 'success' | 'error';
    invite: (params: InviteParams) => Promise<void>;
    fusion: (params: FusionParams) => Promise<void>;
}
export declare function NetworkProvider({ children }: {
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function useNetwork(): NetworkContextType;
export {};
//# sourceMappingURL=NetworkContext.d.ts.map
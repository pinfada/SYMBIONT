import './webgl/OrganismRenderer';
import './webgl/OrganismController';
export interface NavigationChange {
    type: 'pushstate' | 'replacestate' | 'popstate' | 'hashchange';
    url: string;
    timestamp: number;
}
export type ScrollPattern = 'fast_scan' | 'deep_read' | 'search' | 'skim' | 'unknown';
declare global {
    interface Window {
        __SYMBIONT_CONTENT_SCRIPT_LOADED__: boolean;
    }
}
//# sourceMappingURL=index.d.ts.map
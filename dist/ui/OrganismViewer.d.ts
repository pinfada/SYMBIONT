import React from 'react';
import { OrganismTraits, PerformanceMetrics } from '../types';
/**
 * OrganismViewer - Composant React pour visualisation WebGL de l'organisme
 * Props :
 *   - dna : code ADN de l'organisme
 *   - traits : traits comportementaux (optionnel)
 *   - width, height : dimensions du canvas
 *   - onMetrics : callback pour recevoir les métriques de performance
 */
interface OrganismViewerProps {
    dna: string;
    traits?: OrganismTraits;
    width?: number;
    height?: number;
    onMetrics?: (metrics: PerformanceMetrics) => void;
}
export declare const OrganismViewer: React.FC<OrganismViewerProps>;
export {};

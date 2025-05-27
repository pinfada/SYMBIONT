import React from 'react';
import { OrganismTraits } from '../types';
/**
 * TraitsRadarChart - Radar chart SVG pour visualiser les traits de l'organisme
 * Props :
 *   - traits : valeurs des traits (OrganismTraits)
 *   - labels : labels personnalisés (optionnel)
 *   - size : taille du chart (défaut 180)
 *   - color : couleur principale (défaut #00e0ff)
 */
interface TraitsRadarChartProps {
    traits: OrganismTraits;
    labels?: string[];
    size?: number;
    color?: string;
}
export declare const TraitsRadarChart: React.FC<TraitsRadarChartProps>;
export {};

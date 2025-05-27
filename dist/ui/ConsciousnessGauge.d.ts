import React from 'react';
/**
 * ConsciousnessGauge - Jauge de conscience (score 0-1)
 * Props :
 *   - value : niveau de conscience (0 à 1)
 *   - label : texte optionnel
 *   - size : diamètre en px (défaut 80)
 *   - color : couleur principale (défaut #00e0ff)
 */
interface ConsciousnessGaugeProps {
    value: number;
    label?: string;
    size?: number;
    color?: string;
}
export declare const ConsciousnessGauge: React.FC<ConsciousnessGaugeProps>;
export {};

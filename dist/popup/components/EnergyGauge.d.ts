import React from 'react';
interface EnergyGaugeProps {
    /** Niveau d'énergie actuel (0-100) */
    currentEnergy: number;
    /** Énergie maximale */
    maxEnergy: number;
    /** Taux de métabolisme (optionnel) */
    metabolismRate?: number;
    /** État de l'énergie (optionnel) */
    status?: 'low' | 'normal' | 'high';
}
export declare const EnergyGauge: React.FC<EnergyGaugeProps>;
export default EnergyGauge;
//# sourceMappingURL=EnergyGauge.d.ts.map
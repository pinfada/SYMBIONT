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

const DEFAULT_LABELS = [
  'Curiosité', 'Focus', 'Rythme', 'Empathie',
  'Créativité', 'Énergie', 'Harmonie', 'Sagesse'
];

export const TraitsRadarChart: React.FC<TraitsRadarChartProps> = ({
  traits,
  labels = DEFAULT_LABELS,
  size = 180,
  color = '#00e0ff'
}) => {
  const values = [
    traits.curiosity,
    traits.focus,
    traits.rhythm,
    traits.empathy,
    traits.creativity,
    traits.energy,
    traits.harmony,
    traits.wisdom
  ];
  const N = values.length;
  const center = size / 2;
  const radius = size / 2 - 18;
  // Points du polygone
  const points = values.map((v, i) => {
    const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
    const r = radius * v;
    return [center + Math.cos(angle) * r, center + Math.sin(angle) * r];
  });
  const polygon = points.map(p => p.join(',')).join(' ');

  return (
    <div style={{ display: 'inline-block', position: 'relative' }}>
      <svg width={size} height={size}>
        {/* Axes */}
        {values.map((_, i) => {
          const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={center + Math.cos(angle) * radius}
              y2={center + Math.sin(angle) * radius}
              stroke="#444"
              strokeWidth={1}
            />
          );
        })}
        {/* Polygone */}
        <polygon
          points={polygon}
          fill={color}
          fillOpacity={0.18}
          stroke={color}
          strokeWidth={2.5}
          style={{ transition: 'all 0.7s cubic-bezier(.4,2,.3,1)' }}
        />
        {/* Labels */}
        {labels.map((label, i) => {
          const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
          const x = center + Math.cos(angle) * (radius + 14);
          const y = center + Math.sin(angle) * (radius + 14);
          return (
            <text
              key={label}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={size * 0.11}
              fill="#aaa"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}; 
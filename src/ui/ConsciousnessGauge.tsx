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

export const ConsciousnessGauge: React.FC<ConsciousnessGaugeProps> = ({
  value,
  label = 'Conscience',
  size = 80,
  color = '#00e0ff'
}) => {
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, value));
  const offset = circumference * (1 - progress);

  return (
    <div style={{ display: 'inline-block', textAlign: 'center' }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#222"
          strokeWidth={8}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={8}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(.4,2,.3,1)' }}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.22}
          fill="#fff"
          fontWeight={600}
        >
          {(progress * 100).toFixed(0)}%
        </text>
      </svg>
      <div style={{ color: '#aaa', fontSize: size * 0.18, marginTop: 4 }}>{label}</div>
    </div>
  );
}; 
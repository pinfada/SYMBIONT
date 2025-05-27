// src/popup/components/TraitsRadarChart.tsx
import React, { useMemo } from 'react';

interface TraitsRadarChartProps {
  traits: {
    curiosity: number;
    focus: number;
    rhythm: number;
    empathy: number;
    creativity: number;
  };
}

export const TraitsRadarChart: React.FC<TraitsRadarChartProps> = ({ traits }) => {
  const data = useMemo(() => [
    { label: 'Curiosity', value: traits.curiosity },
    { label: 'Focus', value: traits.focus },
    { label: 'Rhythm', value: traits.rhythm },
    { label: 'Empathy', value: traits.empathy },
    { label: 'Creativity', value: traits.creativity }
  ], [traits]);
  
  const size = 200;
  const center = size / 2;
  const radius = size * 0.35;
  
  // Calcul des points du radar
  const points = data.map((item, index) => {
    const angle = (index * 2 * Math.PI) / data.length - Math.PI / 2;
    const value = item.value * radius;
    
    return {
      x: center + value * Math.cos(angle),
      y: center + value * Math.sin(angle),
      labelX: center + (radius + 20) * Math.cos(angle),
      labelY: center + (radius + 20) * Math.sin(angle)
    };
  });
  
  // Création du tracé
  const pathData = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ') + ' Z';
  
  return (
    <div className="traits-radar">
      <svg viewBox={`0 0 ${size} ${size}`} className="radar-chart">
        {/* Grille de fond */}
        {[0.2, 0.4, 0.6, 0.8, 1].map(level => (
          <circle
            key={level}
            cx={center}
            cy={center}
            r={radius * level}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="1"
            opacity="0.3"
          />
        ))}
        
        {/* Axes */}
        {data.map((item, index) => {
          const angle = (index * 2 * Math.PI) / data.length - Math.PI / 2;
          const x2 = center + radius * Math.cos(angle);
          const y2 = center + radius * Math.sin(angle);
          
          return (
            <g key={item.label}>
              <line
                x1={center}
                y1={center}
                x2={x2}
                y2={y2}
                stroke="var(--color-border)"
                strokeWidth="1"
                opacity="0.3"
              />
              <text
                x={points[index].labelX}
                y={points[index].labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                className="radar-label"
                fill="var(--color-text-dim)"
                fontSize="12"
              >
                {item.label}
              </text>
            </g>
          );
        })}
        
        {/* Zone de données */}
        <path
          d={pathData}
          fill="var(--color-primary)"
          fillOpacity="0.2"
          stroke="var(--color-primary)"
          strokeWidth="2"
        />
        
        {/* Points */}
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="var(--color-primary)"
            stroke="var(--color-background)"
            strokeWidth="1"
          />
        ))}
      </svg>
    </div>
  );
};
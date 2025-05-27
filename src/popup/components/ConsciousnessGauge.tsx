// src/popup/components/ConsciousnessGauge.tsx
import React from 'react';

interface ConsciousnessGaugeProps {
  value: number; // 0-1
}

export const ConsciousnessGauge: React.FC<ConsciousnessGaugeProps> = ({ value }) => {
  const percentage = Math.round(value * 100);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value * circumference);
  
  return (
    <div className="consciousness-gauge">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--color-surface-light)"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--color-consciousness)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: 'stroke-dashoffset 0.5s ease',
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%'
          }}
        />
      </svg>
      <div className="consciousness-gauge__value">
        <span className="consciousness-gauge__number">{percentage}</span>
        <span className="consciousness-gauge__label">Consciousness</span>
      </div>
    </div>
  );
};
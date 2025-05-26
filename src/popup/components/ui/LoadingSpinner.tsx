// src/popup/components/ui/LoadingSpinner.tsx
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color
}) => {
  return (
    <div 
      className={`loading-spinner loading-spinner--${size}`}
      style={color ? { borderTopColor: color } : undefined}
      data-testid="loading-spinner"
    />
  );
};
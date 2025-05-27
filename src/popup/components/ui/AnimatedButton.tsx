
// src/popup/components/ui/AnimatedButton.tsx
import React, { ButtonHTMLAttributes, useState } from 'react';

interface AnimatedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  onClick,
  ...props
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || isAnimating) return;
    
    setIsAnimating(true);
    
    // Animation effect
    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
    
    if (onClick) {
      onClick(e);
    }
  };
  
  return (
    <button
      className={`
        animated-button 
        animated-button--${variant} 
        animated-button--${size}
        ${isAnimating ? 'animated-button--animating' : ''}
        ${loading ? 'animated-button--loading' : ''}
      `}
      onClick={handleClick}
      disabled={loading || props.disabled}
      {...props}
    >
      <span className="animated-button__content">
        {loading ? (
          <span className="animated-button__spinner"></span>
        ) : (
          children
        )}
      </span>
    </button>
  );
};
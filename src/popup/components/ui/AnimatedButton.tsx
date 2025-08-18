// src/popup/components/ui/AnimatedButton.tsx
import React, { ButtonHTMLAttributes, useState, useRef, useEffect } from 'react';

interface AnimatedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'quantum' | 'neural';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  glowing?: boolean;
  ripple?: boolean;
  icon?: string;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  glowing = false,
  ripple = true,
  icon,
  onClick,
  ...props
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [ripples, setRipples] = useState<Array<{id: number, x: number, y: number}>>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rippleId = useRef(0);
  
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || isAnimating) return;
    
    setIsAnimating(true);
    
    // Create ripple effect
    if (ripple && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const newRipple = {
        id: rippleId.current++,
        x,
        y
      };
      
      setRipples(prev => [...prev, newRipple]);
      
      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id));
      }, 600);
    }
    
    // Button animation
    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
    
    if (onClick) {
      onClick(e);
    }
  };
  
  // Enhanced button classes
  const buttonClasses = [
    'symbiont-btn',
    `symbiont-btn--${variant}`,
    `symbiont-btn--${size}`,
    isAnimating && 'symbiont-btn--animating',
    loading && 'symbiont-btn--loading',
    glowing && 'symbiont-btn--glowing',
    props.disabled && 'symbiont-btn--disabled'
  ].filter(Boolean).join(' ');
  
  useEffect(() => {
    // Inject styles if not already present
    if (typeof document !== 'undefined' && !document.getElementById('symbiont-btn-styles')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'symbiont-btn-styles';
      styleElement.textContent = enhancedButtonStyles;
      document.head.appendChild(styleElement);
    }
  }, []);
  
  return (
    <button
      ref={buttonRef}
      className={buttonClasses}
      onClick={handleClick}
      disabled={loading || props.disabled}
      {...props}
    >
      {/* Background effects */}
      <div className="symbiont-btn__bg"></div>
      <div className="symbiont-btn__border"></div>
      
      {/* Ripple effects */}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="symbiont-btn__ripple"
          style={{
            left: ripple.x,
            top: ripple.y
          }}
        />
      ))}
      
      {/* Content */}
      <span className="symbiont-btn__content">
        {loading ? (
          <span className="symbiont-btn__spinner">
            <span className="spinner-ring"></span>
            <span className="spinner-ring"></span>
            <span className="spinner-ring"></span>
          </span>
        ) : (
          <>
            {icon && <span className="symbiont-btn__icon">{icon}</span>}
            <span className="symbiont-btn__text">{children}</span>
          </>
        )}
      </span>
      
      {/* Glow effect */}
      {glowing && <div className="symbiont-btn__glow"></div>}
    </button>
  );
};

const enhancedButtonStyles = `
/* === ENHANCED SYMBIONT BUTTON SYSTEM === */

.symbiont-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  border: none;
  outline: none;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: center;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

/* Background and border layers */
.symbiont-btn__bg {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1;
}

.symbiont-btn__border {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  border: 1px solid transparent;
  background: linear-gradient(135deg, transparent, rgba(255,255,255,0.1), transparent) border-box;
  mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  transition: all 0.3s ease;
  z-index: 2;
}

/* Content layer */
.symbiont-btn__content {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  z-index: 3;
  transition: all 0.3s ease;
}

.symbiont-btn__icon {
  font-size: 1.1em;
  line-height: 1;
}

.symbiont-btn__text {
  line-height: 1;
  white-space: nowrap;
}

/* Size variants */
.symbiont-btn--sm {
  padding: 8px 16px;
  font-size: 13px;
  border-radius: 8px;
  height: 36px;
  min-width: 80px;
}

.symbiont-btn--md {
  padding: 12px 24px;
  font-size: 14px;
  border-radius: 10px;
  height: 44px;
  min-width: 100px;
}

.symbiont-btn--lg {
  padding: 16px 32px;
  font-size: 16px;
  border-radius: 12px;
  height: 52px;
  min-width: 120px;
}

/* Primary variant */
.symbiont-btn--primary {
  color: #ffffff;
}

.symbiont-btn--primary .symbiont-btn__bg {
  background: linear-gradient(135deg, #00e0ff 0%, #4fc3f7 50%, #9c6ade 100%);
  box-shadow: 0 4px 16px rgba(0, 224, 255, 0.3);
}

.symbiont-btn--primary:hover .symbiont-btn__bg {
  background: linear-gradient(135deg, #4fc3f7 0%, #9c6ade 50%, #e785c1 100%);
  box-shadow: 0 8px 32px rgba(0, 224, 255, 0.4);
  transform: translateY(-1px);
}

.symbiont-btn--primary:hover {
  transform: translateY(-2px) scale(1.02);
}

/* Secondary variant */
.symbiont-btn--secondary {
  color: #00e0ff;
}

.symbiont-btn--secondary .symbiont-btn__bg {
  background: rgba(0, 224, 255, 0.1);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 224, 255, 0.3);
}

.symbiont-btn--secondary:hover .symbiont-btn__bg {
  background: rgba(0, 224, 255, 0.2);
  border-color: rgba(0, 224, 255, 0.5);
}

.symbiont-btn--secondary:hover {
  transform: translateY(-1px) scale(1.01);
  color: #4fc3f7;
}

/* Ghost variant */
.symbiont-btn--ghost {
  color: #94a3b8;
}

.symbiont-btn--ghost .symbiont-btn__bg {
  background: transparent;
}

.symbiont-btn--ghost:hover {
  color: #f1f5f9;
}

.symbiont-btn--ghost:hover .symbiont-btn__bg {
  background: rgba(255, 255, 255, 0.05);
}

/* Quantum variant */
.symbiont-btn--quantum {
  color: #ffffff;
}

.symbiont-btn--quantum .symbiont-btn__bg {
  background: linear-gradient(135deg, #8a2be2 0%, #4b0082 50%, #663399 100%);
  box-shadow: 0 4px 16px rgba(138, 43, 226, 0.4);
}

.symbiont-btn--quantum:hover .symbiont-btn__bg {
  background: linear-gradient(135deg, #9932cc 0%, #8a2be2 50%, #4b0082 100%);
  box-shadow: 0 8px 32px rgba(138, 43, 226, 0.6);
}

.symbiont-btn--quantum:hover {
  transform: translateY(-2px) scale(1.02);
}

/* Neural variant */
.symbiont-btn--neural {
  color: #ffffff;
}

.symbiont-btn--neural .symbiont-btn__bg {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%);
  box-shadow: 0 4px 16px rgba(34, 197, 94, 0.3);
}

.symbiont-btn--neural:hover .symbiont-btn__bg {
  background: linear-gradient(135deg, #34d399 0%, #22c55e 50%, #16a34a 100%);
  box-shadow: 0 8px 32px rgba(34, 197, 94, 0.4);
}

/* Loading state */
.symbiont-btn--loading {
  pointer-events: none;
}

.symbiont-btn--loading .symbiont-btn__content {
  opacity: 0.7;
}

.symbiont-btn__spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.spinner-ring {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: spinnerBounce 1.4s ease-in-out infinite both;
}

.spinner-ring:nth-child(1) { animation-delay: -0.32s; }
.spinner-ring:nth-child(2) { animation-delay: -0.16s; }

@keyframes spinnerBounce {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Animation states */
.symbiont-btn--animating {
  transform: scale(0.98);
}

.symbiont-btn--animating .symbiont-btn__bg {
  transform: scale(1.02);
}

/* Disabled state */
.symbiont-btn--disabled {
  pointer-events: none;
  opacity: 0.5;
  transform: none !important;
}

.symbiont-btn--disabled .symbiont-btn__bg {
  background: #4b5563 !important;
  box-shadow: none !important;
}

/* Glowing effect */
.symbiont-btn--glowing .symbiont-btn__glow {
  position: absolute;
  inset: -2px;
  background: inherit;
  border-radius: inherit;
  filter: blur(6px);
  opacity: 0.7;
  z-index: 0;
  animation: pulseGlow 2s ease-in-out infinite;
}

@keyframes pulseGlow {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
}

/* Ripple effect */
.symbiont-btn__ripple {
  position: absolute;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  animation: rippleExpand 0.6s ease-out;
  pointer-events: none;
  z-index: 1;
}

@keyframes rippleExpand {
  to {
    width: 300px;
    height: 300px;
    opacity: 0;
  }
}

/* Focus states */
.symbiont-btn:focus-visible {
  outline: 2px solid #00e0ff;
  outline-offset: 2px;
}

/* Enhanced hover effects */
.symbiont-btn:hover .symbiont-btn__border {
  background: linear-gradient(135deg, 
    rgba(0, 224, 255, 0.3), 
    rgba(255, 255, 255, 0.2), 
    rgba(156, 106, 222, 0.3)) border-box;
}

/* Responsive adjustments */
@media (max-width: 480px) {
  .symbiont-btn--lg {
    padding: 14px 28px;
    font-size: 15px;
    height: 48px;
  }
  
  .symbiont-btn--md {
    padding: 10px 20px;
    font-size: 13px;
    height: 40px;
  }
}
`;
// src/popup/components/ui/FoldablePanel.tsx
import React, { useState } from 'react';

interface FoldablePanelProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export const FoldablePanel: React.FC<FoldablePanelProps> = ({
  title,
  children,
  defaultOpen = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className={`foldable-panel ${className} ${isOpen ? 'foldable-panel--open' : ''}`}>
      <button 
        className="foldable-panel__header"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="foldable-panel__title">{title}</h3>
        <span className="foldable-panel__icon">
          {isOpen ? '▼' : '►'}
        </span>
      </button>
      
      <div className="foldable-panel__content">
        {children}
      </div>
    </div>
  );
};
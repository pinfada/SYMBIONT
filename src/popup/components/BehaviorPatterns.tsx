// src/popup/components/BehaviorPatterns.tsx
import React from 'react';

interface Pattern {
  id: string;
  type: string;
  confidence: number;
  lastSeen: number;
  description: string;
}

interface BehaviorPatternsProps {
  data: Pattern[];
}

export const BehaviorPatterns: React.FC<BehaviorPatternsProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="behavior-patterns--empty">
        <p>No behavior patterns detected yet</p>
      </div>
    );
  }
  
  return (
    <div className="behavior-patterns">
      <ul className="behavior-list">
        {data.map(pattern => (
          <li key={pattern.id} className="behavior-item">
            <div className="behavior-item__header">
              <span className={`behavior-type behavior-type--${pattern.type}`}>
                {pattern.type}
              </span>
              <span className="behavior-confidence">
                {Math.round(pattern.confidence * 100)}%
              </span>
            </div>
            <p className="behavior-description">{pattern.description}</p>
            <div className="behavior-timestamp">
              {formatTimestamp(pattern.lastSeen)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

const formatTimestamp = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60 * 1000) {
    return 'just now';
  } else if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
};
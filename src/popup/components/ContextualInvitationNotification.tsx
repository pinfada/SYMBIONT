import React, { useState, useEffect } from 'react';
import { SecureRandom } from '@shared/utils/secureRandom';

interface ContextualInvitationProps {
  context?: string;
  onAccept?: () => void;
  onDismiss?: () => void;
}

export const ContextualInvitationNotification: React.FC<ContextualInvitationProps> = ({
  context,
  onAccept,
  onDismiss
}) => {
  const [visible, setVisible] = useState(false);
  const [code, setCode] = useState<string>('');

  useEffect(() => {
    if (context) {
      setVisible(true);
      setCode(SecureRandom.random().toString(36).substr(2, 9).toUpperCase());
    }
  }, [context]);

  const handleAccept = () => {
    if (onAccept) {
      onAccept();
    }
    setVisible(false);
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="contextual-invitation-notification" style={{ 
      zIndex: 1000, 
      position: 'fixed', 
      left: 0, 
      right: 0, 
      top: 32, 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center', 
      pointerEvents: 'none' 
    }}>
      <div className="murmur-notification" style={{ 
        fontWeight: 600, 
        fontSize: 18, 
        maxWidth: 480, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: 18, 
        borderRadius: 16, 
        boxShadow: '0 2px 12px #00e0ff44',
        backgroundColor: '#232946',
        color: '#fff',
        pointerEvents: 'auto'
      }}>
        {context || 'Événement contextuel détecté'}
      </div>
      
      <div style={{ 
        marginTop: 10, 
        fontSize: 16, 
        display: 'flex', 
        alignItems: 'center',
        color: '#fff',
        pointerEvents: 'auto'
      }}>
        <span>Code : {code}</span>
      </div>
      
      <div style={{ 
        marginTop: 12, 
        display: 'flex', 
        gap: '8px',
        pointerEvents: 'auto'
      }}>
        <button 
          onClick={handleAccept}
          style={{
            padding: '8px 16px',
            backgroundColor: '#00e0ff',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Accepter
        </button>
        <button 
          onClick={handleDismiss}
          style={{
            padding: '8px 16px',
            backgroundColor: '#666',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Ignorer
        </button>
      </div>
    </div>
  );
}; 
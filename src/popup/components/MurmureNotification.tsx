import React, { useEffect, useState } from 'react';
import { useMessaging } from '../hooks/useMessaging';
import { MessageType } from '@shared/messaging/MessageBus';

export const MurmureNotification: React.FC = () => {
  const messaging = useMessaging();
  const [murmur, setMurmur] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (msg: any) => {
      setMurmur(msg.payload.text);
      setVisible(true);
      setTimeout(() => setVisible(false), 6000);
    };
    messaging.subscribe(MessageType.MURMUR, handler);
    // Pas de désabonnement explicite (hook gère le cycle de vie)
  }, [messaging]);

  if (!visible || !murmur) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 32,
      right: 32,
      background: 'rgba(0,0,0,0.92)',
      color: '#00e0ff',
      padding: '18px 32px',
      borderRadius: 12,
      fontSize: 18,
      fontWeight: 600,
      boxShadow: '0 2px 16px #000a',
      zIndex: 9999,
      maxWidth: 400
    }}>
      <span style={{ marginRight: 12, fontSize: 22 }}>💭</span>
      {murmur}
    </div>
  );
}; 
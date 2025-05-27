import React, { useState } from 'react';
import { useMessaging } from '../hooks/useMessaging';
import { MessageType } from '../../shared/messaging/MessageBus';

export const SecretRitualInput: React.FC = () => {
  const messaging = useMessaging();
  const [code, setCode] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length >= 4) {
      messaging.send(MessageType.SECRET_CODE_ENTERED, { code });
      setFeedback('Rituel secret tenté… Un murmure rare pourrait se manifester.');
      setTimeout(() => setFeedback(null), 8000);
      setCode('');
    }
  };

  return (
    <div className="secret-ritual-input">
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16 }}>
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="Code secret…"
          style={{ padding: 8, borderRadius: 6, border: '1px solid #333', fontSize: 16, letterSpacing: 2 }}
        />
        <button type="submit" style={{ padding: '8px 16px', borderRadius: 6, background: '#00e0ff', color: '#181c22', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
          Tenter
        </button>
      </form>
      {feedback && <div className="murmur-notification" style={{ marginTop: 8 }}>{feedback}</div>}
    </div>
  );
}; 
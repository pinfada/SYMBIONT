import React, { useEffect, useState } from 'react';
import { useMessaging } from '../hooks/useMessaging';
import { MessageType } from '../../shared/messaging/MessageBus';

export const SecretRitualNotification: React.FC = () => {
  const messaging = useMessaging();
  const [visible, setVisible] = useState(false);
  const [effect, setEffect] = useState<string>('');
  const [code, setCode] = useState<string>('');

  useEffect(() => {
    messaging.subscribe(MessageType.SECRET_RITUAL_TRIGGERED, (msg: { payload: { code: string; effect: string } }) => {
      setCode(msg.payload.code);
      setEffect(msg.payload.effect);
      setVisible(true);
      setTimeout(() => setVisible(false), 10000);
    });
    // eslint-disable-next-line
  }, []);

  if (!visible) return null;

  let effectText = '';
  if (effect === 'mutation_unique') effectText = `Le code secret « ${code} » a déclenché une mutation unique !`;
  else effectText = `Un rituel secret a été accompli !`;

  return (
    <div className="secret-ritual-notification">
      <div className="murmur-notification" style={{ fontWeight: 600, fontSize: 18, color: '#ff4b6e' }}>
        {effectText}
      </div>
    </div>
  );
}; 
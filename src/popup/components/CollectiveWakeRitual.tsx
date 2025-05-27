import React, { useState, useEffect, useRef } from 'react';
import { useMessaging } from '../hooks/useMessaging';
import { MessageType } from '../../shared/messaging/MessageBus';
import { CollectiveWakeResult } from '../../shared/types/rituals';
import { Murmur } from '../../shared/types/murmur';

export const CollectiveWakeRitual: React.FC<{ userId: string }> = ({ userId }) => {
  const messaging = useMessaging();
  const [status, setStatus] = useState<'idle' | 'waiting' | 'done'>('idle');
  const [participants, setParticipants] = useState<string[]>([]);
  const [triggeredAt, setTriggeredAt] = useState<number | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  const handleWake = () => {
    setStatus('waiting');
    messaging.send(MessageType.COLLECTIVE_WAKE_REQUEST, { userId });
    messaging.subscribe(MessageType.COLLECTIVE_WAKE_RESULT, (msg: { payload: CollectiveWakeResult }) => {
      setParticipants(msg.payload.participants);
      setTriggeredAt(msg.payload.triggeredAt);
      setStatus('done');
    });
  };

  useEffect(() => {
    if (status === 'done') {
      // Murmure spécial après réveil collectif
      const murmure: Murmur = {
        text: 'Un écho vibrant parcourt tous les symbionts. Réveil collectif accompli !',
        timestamp: Date.now(),
        context: 'collective-wake',
        pattern: 'collective',
      };
      messaging.send(MessageType.MURMUR, murmure);
      // Effet visuel (halo)
      if (sectionRef.current) {
        sectionRef.current.classList.add('halo-effect');
        setTimeout(() => sectionRef.current && sectionRef.current.classList.remove('halo-effect'), 2000);
      }
    }
    // eslint-disable-next-line
  }, [status]);

  return (
    <div className="collective-wake-ritual" ref={sectionRef}>
      {status === 'idle' && (
        <>
          <h3>Rituel de réveil collectif</h3>
          <p>Participez à un réveil synchronisé avec d'autres symbionts.</p>
          <button onClick={handleWake}>Participer</button>
        </>
      )}
      {status === 'waiting' && (
        <div>
          <p>En attente d'autres participants…</p>
          <div className="murmur-notification">Un murmure circule dans la communauté…</div>
        </div>
      )}
      {status === 'done' && (
        <div>
          <h4>Réveil collectif !</h4>
          <p>{participants.length} symbionts se sont éveillés ensemble.</p>
          <div className="murmur-notification">Un écho vibrant parcourt tous les organismes…</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
            {triggeredAt && new Date(triggeredAt).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}; 
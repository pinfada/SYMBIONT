import React, { useState, useRef } from 'react';
import { addRitual, getRituals } from '../../shared/ritualsApi';
import { PluginManager, Plugin } from '../../core/PluginManager';

export const CollectiveWakeRitual: React.FC<{ userId: string }> = ({ userId }) => {
  const [status, setStatus] = useState<'idle' | 'waiting' | 'done'>('idle');
  const [participants, setParticipants] = useState<string[]>([]);
  const [triggeredAt, setTriggeredAt] = useState<number | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  const handleWake = async () => {
    setStatus('waiting');
    const wakeId = 'wake-' + Date.now();
    try {
      await addRitual({ _id: wakeId, type: 'collective-wake', userId, timestamp: Date.now() });
      // Récupérer tous les participants du jour
      const rituals = await getRituals();
      const today = new Date().toISOString().slice(0, 10);
      const wakes = rituals.filter(r => r.type === 'collective-wake' && new Date(r.timestamp as string | number | Date).toISOString().slice(0, 10) === today);
      setParticipants(wakes.map(w => w.userId as string).filter(Boolean));
      setTriggeredAt(Date.now());
      setStatus('done');
    } catch {
      setStatus('idle');
    }
  };

  return (
    <div className="collective-wake-ritual" ref={sectionRef}>
      {status === 'idle' && (
        <>
          <h3>Rituel de réveil collectif</h3>
          <p>Participez à un réveil synchronisé avec d'autres symbionts.</p>
          <button onClick={handleWake} aria-label="Participer au réveil collectif">Participer</button>
        </>
      )}
      {status === 'waiting' && (
        <div>
          <p>En attente d'autres participants…</p>
          <div className="murmur-notification" role="status" aria-live="polite">Un murmure circule dans la communauté…</div>
        </div>
      )}
      {status === 'done' && (
        <div>
          <h4>Réveil collectif !</h4>
          <p>{participants.length} symbionts se sont éveillés ensemble.</p>
          <div className="murmur-notification" role="status" aria-live="polite">Un écho vibrant parcourt tous les organismes…</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
            {triggeredAt && new Date(triggeredAt).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
};

const CollectiveWakeRitualPlugin: Plugin = {
  id: 'collective-wake',
  type: 'ritual',
  name: 'Réveil collectif',
  description: 'Synchronisation de plusieurs symbionts pour un rituel collectif.',
  component: CollectiveWakeRitual
};
PluginManager.register(CollectiveWakeRitualPlugin);
export default CollectiveWakeRitualPlugin; 
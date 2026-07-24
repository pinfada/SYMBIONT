import React, { useEffect, useState } from 'react';
import { useMessaging } from '../hooks/useMessaging';
import { MessageType } from '@shared/messaging/MessageBus';

interface FeltState {
  consciousness: number; // 0..1
  climate: number;       // 0..1 hostilité perçue
  neuralActivity: number; // 0..1
  mood: 'calme' | 'serein' | 'attentif' | 'vigilant' | string;
  timestamp: number;
}

const MOODS: Record<string, { label: string; icon: string; color: string; note: string }> = {
  calme:    { label: 'Au calme',        icon: '🌿', color: '#7cffb2', note: 'Environnement paisible, rien à signaler.' },
  serein:   { label: 'Serein & éveillé', icon: '🌤️', color: '#00e0ff', note: 'Engagement profond perçu, l’organisme s’ouvre.' },
  attentif: { label: 'Attentif',        icon: '👁️', color: '#ffb700', note: 'Quelques signaux de structure invisible perçus.' },
  vigilant: { label: 'Vigilant',        icon: '🛡️', color: '#ff4b6e', note: 'Environnement hostile ressenti : l’organisme se durcit.' },
};

/**
 * État ressenti — face visible et PASSIVE des effets du système nerveux :
 * conscience, climat perçu (hostilité de l'environnement) et activité neuronale.
 * L'organisme reflète seul ce qu'il ressent ; aucune action requise.
 */
const FeltStatePanel: React.FC = () => {
  const messaging = useMessaging();
  const [state, setState] = useState<FeltState | null>(null);

  useEffect(() => {
    const handler = (message: any) => {
      if (message?.payload) setState(message.payload as FeltState);
    };
    messaging.subscribe(MessageType.FELT_STATE, handler);
    messaging.send(MessageType.GET_FELT_STATE, {});
    return () => messaging.unsubscribe(MessageType.FELT_STATE, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mood = (state && MOODS[state.mood]) || MOODS.calme;
  const pct = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 100);

  const Bar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8899a6', marginBottom: 3 }}>
        <span>{label}</span><span>{pct(value)}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: '#0d1117', overflow: 'hidden' }}>
        <div style={{ width: `${pct(value)}%`, height: '100%', background: color, transition: 'width .4s' }} />
      </div>
    </div>
  );

  return (
    <div
      data-testid="felt-state-panel"
      style={{
        border: `1px solid ${mood.color}44`, borderLeft: `3px solid ${mood.color}`,
        borderRadius: 8, padding: 12, background: '#161b22', margin: '0 0 12px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>{mood.icon}</span>
        <span style={{ color: mood.color, fontWeight: 700, fontSize: 14 }}>{mood.label}</span>
      </div>
      <p style={{ fontSize: 12, color: '#8899a6', margin: '6px 0 2px', lineHeight: 1.5 }}>
        {state ? mood.note : 'Lecture de l’état ressenti…'}
      </p>

      {state && (
        <>
          <Bar label="Conscience" value={state.consciousness} color="#00e0ff" />
          <Bar label="Climat perçu (hostilité)" value={state.climate} color={mood.color} />
          <Bar label="Activité neuronale" value={state.neuralActivity} color="#a78bfa" />
        </>
      )}
    </div>
  );
};

export default FeltStatePanel;

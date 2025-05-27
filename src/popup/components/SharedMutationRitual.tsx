import React, { useState, useEffect } from 'react';
import { useMessaging } from '../hooks/useMessaging';
import { MessageType } from '../../shared/messaging/MessageBus';
import { SharedMutationRequest, AcceptSharedMutation, SharedMutationResult } from '../../shared/types/rituals';
import { Murmur } from '../../shared/types/murmur';

export const SharedMutationRitual: React.FC<{ userId: string; traits: Record<string, number> }> = ({ userId, traits }) => {
  const messaging = useMessaging();
  const [step, setStep] = useState<'init' | 'waiting' | 'enter' | 'result'>('init');
  const [code, setCode] = useState('');
  const [sharedCode, setSharedCode] = useState<string | null>(null);
  const [result, setResult] = useState<SharedMutationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initiateur : demande un code
  const handleInitiate = () => {
    messaging.send(MessageType.REQUEST_SHARED_MUTATION, { initiatorId: userId, traits });
    messaging.subscribe(MessageType.SHARED_MUTATION_CODE, (msg: any) => {
      setSharedCode(msg.payload.code);
      setStep('waiting');
    });
    messaging.subscribe(MessageType.SHARED_MUTATION_RESULT, (msg: any) => {
      if (msg.payload.error) setError(msg.payload.error);
      else setResult(msg.payload);
      setStep('result');
    });
  };

  // Receveur : saisit le code et fusionne
  const handleAccept = () => {
    messaging.send(MessageType.ACCEPT_SHARED_MUTATION, { code, receiverId: userId, traits });
    messaging.subscribe(MessageType.SHARED_MUTATION_RESULT, (msg: any) => {
      if (msg.payload.error) setError(msg.payload.error);
      else setResult(msg.payload);
      setStep('result');
    });
  };

  useEffect(() => {
    if (result) {
      // Murmure spécial après fusion
      const murmure: Murmur = {
        text: 'Deux organismes se sont liés. Une nouvelle harmonie émerge…',
        timestamp: Date.now(),
        context: 'shared-mutation',
        pattern: 'fusion',
      };
      messaging.send(MessageType.MURMUR, murmure);
    }
    // eslint-disable-next-line
  }, [result]);

  return (
    <div className="shared-mutation-ritual">
      {step === 'init' && (
        <>
          <h3>Rituel de mutation partagée</h3>
          <button onClick={handleInitiate}>Initier une fusion</button>
          <button onClick={() => setStep('enter')}>J'ai reçu un code</button>
        </>
      )}
      {step === 'waiting' && sharedCode && (
        <div>
          <p>Partagez ce code avec un autre utilisateur pour fusionner vos organismes :</p>
          <div className="code-badge" style={{ fontSize: 24 }}>{sharedCode}</div>
          <p>En attente de la fusion...</p>
        </div>
      )}
      {step === 'enter' && (
        <form onSubmit={e => { e.preventDefault(); handleAccept(); }}>
          <label htmlFor="shared-code">Code de fusion</label>
          <input id="shared-code" value={code} onChange={e => setCode(e.target.value.toUpperCase())} />
          <button type="submit">Fusionner</button>
        </form>
      )}
      {step === 'result' && result && (
        <div>
          <h4>Fusion réussie !</h4>
          <p>Traits fusionnés :</p>
          <ul>
            {Object.entries(result.mergedTraits).map(([k, v]) => (
              <li key={k}><b>{k}</b> : {v.toFixed(2)}</li>
            ))}
          </ul>
          <div className="murmur-notification">Deux organismes se sont liés. Une nouvelle harmonie émerge…</div>
        </div>
      )}
      {step === 'result' && error && (
        <div className="error-message">{error}</div>
      )}
    </div>
  );
}; 
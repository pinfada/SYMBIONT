import React, { useState } from 'react';
import { useMessaging } from '../hooks/useMessaging';
import { MessageType } from '@shared/messaging/MessageBus';

export const InvitationLanding: React.FC<{ onActivated?: () => void }> = ({ onActivated }) => {
  const messaging = useMessaging();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [symbolicLink, setSymbolicLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = () => {
    setStatus('checking');
    setError(null);
    messaging.send(MessageType.CHECK_INVITATION, { code });
    // Attendre la réponse du background
    messaging.subscribe(MessageType.INVITATION_CHECKED, (msg: any) => {
      if (msg.payload.valid) {
        // Consommer l'invitation
        const receiverId = crypto.randomUUID();
        messaging.send(MessageType.CONSUME_INVITATION, { code, receiverId });
        // Attendre la confirmation
        messaging.subscribe(MessageType.INVITATION_CONSUMED, (msg2: any) => {
          if (msg2.payload && msg2.payload.symbolicLink) {
            setSymbolicLink(msg2.payload.symbolicLink);
            setStatus('success');
            if (onActivated) onActivated();
          } else {
            setError("Erreur lors de la consommation de l'invitation.");
            setStatus('error');
          }
        });
      } else {
        setError('Code invalide ou déjà utilisé.');
        setStatus('error');
      }
    });
  };

  return (
    <div style={{ maxWidth: 400, margin: '40px auto', padding: 32, background: '#181c22', borderRadius: 12, boxShadow: '0 2px 12px #0008', color: '#fff' }}>
      <h2 style={{ color: '#00e0ff', marginBottom: 16 }}>Activation par invitation</h2>
      <p>Entrez votre code d'invitation pour activer votre organisme SYMBIONT.</p>
      <input
        type="text"
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase())}
        placeholder="Code d'invitation"
        style={{ width: '100%', padding: 12, borderRadius: 6, border: '1px solid #333', margin: '16px 0', fontSize: 18, textAlign: 'center', letterSpacing: 2 }}
        disabled={status === 'checking' || status === 'success'}
      />
      <button
        onClick={handleCheck}
        disabled={!code || status === 'checking' || status === 'success'}
        style={{ width: '100%', padding: 12, borderRadius: 6, background: '#00e0ff', color: '#111', fontWeight: 700, fontSize: 18, border: 'none', cursor: 'pointer' }}
      >
        Valider
      </button>
      {status === 'checking' && <p style={{ color: '#00e0ff', marginTop: 16 }}>Vérification en cours...</p>}
      {status === 'success' && symbolicLink && (
        <div style={{ marginTop: 24, padding: 16, background: symbolicLink, borderRadius: 8, color: '#111', fontWeight: 700 }}>
          Invitation acceptée !<br />
          <span style={{ fontSize: 24 }}>Lien symbolique : {symbolicLink}</span>
        </div>
      )}
      {status === 'error' && error && <p style={{ color: '#ff4b6e', marginTop: 16 }}>{error}</p>}
    </div>
  );
}; 
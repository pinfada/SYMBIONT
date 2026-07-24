import React, { useEffect, useRef, useState } from 'react';
import { useMessaging } from '../hooks/useMessaging';
import { MessageType } from '@shared/messaging/MessageBus';
import { generateSecureUUID } from '@shared/utils/uuid';

interface InvitationStepProps {
  onActivated: () => void;
}

/**
 * Étape d'onboarding : validation d'un code d'invitation via le
 * vrai InvitationService du background (CHECK_INVITATION puis
 * CONSUME_INVITATION), avec timeout si le background ne répond pas.
 */
export const InvitationStep: React.FC<InvitationStepProps> = ({ onActivated }) => {
  const messaging = useMessaging();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const failWith = (message: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setError(message);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) return;

    setLoading(true);
    setError(null);

    // Sécurité : si le background ne répond pas, sortir de l'état loading
    timeoutRef.current = setTimeout(() => {
      failWith('Le service d’invitation ne répond pas. Réessayez.');
    }, 5000);

    messaging.subscribe(MessageType.INVITATION_CHECKED, (msg: any) => {
      if (!msg.payload?.valid) {
        failWith('Code d’invitation invalide ou déjà utilisé.');
        return;
      }

      const receiverId = generateSecureUUID();
      messaging.send(MessageType.CONSUME_INVITATION, { code: trimmedCode, receiverId });
      messaging.subscribe(MessageType.INVITATION_CONSUMED, (msg2: any) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        // Le background renvoie l'invitation consommée en cas de succès,
        // ou { error } en cas d'échec.
        if (msg2.payload && !msg2.payload.error) {
          setLoading(false);
          onActivated();
        } else {
          failWith(msg2.payload?.error || 'Erreur lors de l’activation de l’invitation.');
        }
      });
    });

    messaging.send(MessageType.CHECK_INVITATION, { code: trimmedCode });
  };

  return (
    <section className="onboarding-step">
      <h3>Rituel d’invitation</h3>
      <form onSubmit={handleSubmit}>
        <label htmlFor="invitation-code">Code d’invitation</label>
        <input
          id="invitation-code"
          type="text"
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="Entrez votre code..."
          disabled={loading}
        />
        <button type="submit" disabled={loading || !code.trim()}>
          {loading ? 'Vérification...' : 'Activer'}
        </button>
        {error && <div className="error-message">{error}</div>}
      </form>
    </section>
  );
};

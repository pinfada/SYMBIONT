import React, { useState } from 'react';

interface InvitationStepProps {
  onActivated: () => void;
}

export const InvitationStep: React.FC<InvitationStepProps> = ({ onActivated }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // Simulation de validation (à remplacer par appel réel au service d'invitation)
    setTimeout(() => {
      if (code.trim().length >= 6) {
        onActivated();
      } else {
        setError('Code d’invitation invalide.');
      }
      setLoading(false);
    }, 800);
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
import React, { useState } from 'react';
import { getRituals } from '../../shared/ritualsApi';
import { PluginManager, Plugin } from '../../core/PluginManager';

export const SecretRitualInput: React.FC = () => {
  const [code, setCode] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length >= 4) {
      // Vérifier le code secret côté backend
      const rituals = await getRituals();
      const found = rituals.find(r => r._id === code && r.type === 'secret');
      if (found) {
        setFeedback('Code secret valide ! Un murmure rare se manifeste.');
      } else {
        setFeedback('Code inconnu ou expiré.');
      }
      setTimeout(() => setFeedback(null), 8000);
      setCode('');
    }
  };

  return (
    <div className="secret-ritual-input">
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16 }}>
        <label htmlFor="secret-code-input">Code secret</label>
        <input
          id="secret-code-input"
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="Code secret…"
          style={{ padding: 8, borderRadius: 6, border: '1px solid #333', fontSize: 16, letterSpacing: 2, outline: '2px solid #00e0ff' }}
          aria-label="Code secret"
        />
        <button type="submit" style={{ padding: '8px 16px', borderRadius: 6, background: '#00e0ff', color: '#181c22', fontWeight: 700, border: 'none', cursor: 'pointer' }} aria-label="Tenter le code secret">
          Tenter
        </button>
      </form>
      {feedback && <div className="murmur-notification" style={{ marginTop: 8 }} role="status" aria-live="polite">{feedback}</div>}
    </div>
  );
};

const SecretRitualInputPlugin: Plugin = {
  id: 'secret-ritual',
  type: 'ritual',
  name: 'Rituel secret',
  description: 'Déclenche un effet spécial via un code secret.',
  component: SecretRitualInput
};
PluginManager.register(SecretRitualInputPlugin);
export default SecretRitualInputPlugin; 
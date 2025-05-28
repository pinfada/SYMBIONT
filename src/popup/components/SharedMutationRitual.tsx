import React, { useState } from 'react';
import { addRitual, getRituals } from '../../shared/ritualsApi';
import { PluginManager, Plugin } from '../../core/PluginManager';

export const SharedMutationRitual: React.FC<{ userId: string; traits: Record<string, number> }> = ({ userId, traits }) => {
  const [step, setStep] = useState<'init' | 'waiting' | 'enter' | 'result'>('init');
  const [code, setCode] = useState('');
  const [sharedCode, setSharedCode] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Générer un code aléatoire pour la fusion
  function generateCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
  }

  // Initiateur : demande un code
  const handleInitiate = async () => {
    const fusionCode = generateCode();
    setSharedCode(fusionCode);
    setStep('waiting');
    try {
      await addRitual({ _id: fusionCode, type: 'fusion', initiatorId: userId, traits, status: 'waiting' });
    } catch (e) {
      setError('Erreur lors de la création du rituel.');
      setStep('init');
    }
  };

  // Receveur : saisit le code et fusionne
  const handleAccept = async () => {
    setStep('waiting');
    try {
      const rituals = await getRituals();
      const ritual = rituals.find(r => r._id === code && r.type === 'fusion');
      if (!ritual) {
        setError('Code de fusion invalide.');
        setStep('enter');
        return;
      }
      // Fusionner les traits (exemple simple)
      const mergedTraits = { ...ritual.traits };
      Object.keys(traits).forEach(k => {
        mergedTraits[k] = ((mergedTraits[k] || 0) + (traits[k] || 0)) / 2;
      });
      setResult({ initiatorId: ritual.initiatorId, receiverId: userId, mergedTraits, timestamp: Date.now() });
      setStep('result');
    } catch (e) {
      setError('Erreur lors de la validation du code.');
      setStep('enter');
    }
  };

  return (
    <div className="shared-mutation-ritual">
      {step === 'init' && (
        <>
          <h3>Rituel de mutation partagée</h3>
          <button onClick={handleInitiate} aria-label="Initier une fusion">Initier une fusion</button>
          <button onClick={() => setStep('enter')} aria-label="J'ai reçu un code">J'ai reçu un code</button>
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
          <input id="shared-code" value={code} onChange={e => setCode(e.target.value.toUpperCase())} style={{outline:'2px solid #00e0ff'}} aria-label="Code de fusion" />
          <button type="submit" aria-label="Fusionner">Fusionner</button>
        </form>
      )}
      {step === 'result' && result && (
        <div>
          <h4>Fusion réussie !</h4>
          <p>Traits fusionnés :</p>
          <ul>
            {Object.entries(result.mergedTraits).map(([k, v]) => (
              <li key={k}><b>{k}</b> : {(v as number).toFixed(2)}</li>
            ))}
          </ul>
          <div className="murmur-notification" role="status" aria-live="polite">Deux organismes se sont liés. Une nouvelle harmonie émerge…</div>
        </div>
      )}
      {step === 'result' && error && (
        <div className="error-message" role="alert">{error}</div>
      )}
    </div>
  );
};

const SharedMutationRitualPlugin: Plugin = {
  id: 'shared-mutation',
  type: 'ritual',
  name: 'Mutation partagée',
  description: 'Fusionner les traits de deux organismes via un code.',
  component: SharedMutationRitual
};
PluginManager.register(SharedMutationRitualPlugin);
export default SharedMutationRitualPlugin; 
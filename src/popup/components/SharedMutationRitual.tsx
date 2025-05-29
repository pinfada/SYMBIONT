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
    <div className="shared-mutation-ritual p-6 bg-white rounded-xl shadow-lg max-w-md mx-auto mt-8">
      {step === 'init' && (
        <>
          <h3 className="text-xl font-bold mb-4 text-[#00e0ff]">Rituel de mutation partagée</h3>
          <div className="flex gap-4 mb-2">
            <button onClick={handleInitiate} className="bg-[#00e0ff] text-[#181c22] rounded-lg px-5 py-2 font-bold cursor-pointer" aria-label="Initier une fusion">Initier une fusion</button>
            <button onClick={() => setStep('enter')} className="bg-[#b388ff] text-white rounded-lg px-5 py-2 font-bold cursor-pointer" aria-label="J'ai reçu un code">J'ai reçu un code</button>
          </div>
        </>
      )}
      {step === 'waiting' && sharedCode && (
        <div className="text-center">
          <p className="mb-2">Partagez ce code avec un autre utilisateur pour fusionner vos organismes :</p>
          <div className="code-badge text-2xl font-mono bg-[#eaf6fa] rounded-lg px-4 py-2 inline-block mb-2">{sharedCode}</div>
          <p className="text-[#888]">En attente de la fusion...</p>
        </div>
      )}
      {step === 'enter' && (
        <form onSubmit={e => { e.preventDefault(); handleAccept(); }} className="flex flex-col gap-3">
          <label htmlFor="shared-code" className="font-semibold">Code de fusion</label>
          <input id="shared-code" value={code} onChange={e => setCode(e.target.value.toUpperCase())} className="outline-[#00e0ff] border border-[#eaf6fa] rounded-md px-3 py-2 text-lg" aria-label="Code de fusion" />
          <button type="submit" className="bg-[#00e0ff] text-[#181c22] rounded-lg px-5 py-2 font-bold cursor-pointer" aria-label="Fusionner">Fusionner</button>
        </form>
      )}
      {step === 'result' && result && (
        typeof result === 'string' ? (
          <div className="text-[#ff4b6e] font-bold mt-4">
            Résultat de mutation chiffré reçu.<br/>
            Veuillez le déchiffrer via l'outil RGPD ou contacter le support.
          </div>
        ) : (
          <div>
            <h4 className="text-lg font-bold mb-2 text-[#00e0ff]">Fusion réussie !</h4>
            <p className="mb-2">Traits fusionnés :</p>
            <ul className="list-disc ml-6 mb-3">
              {Object.entries(result.mergedTraits).map(([k, v]) => (
                <li key={k}><b>{k}</b> : {(v as number).toFixed(2)}</li>
              ))}
            </ul>
            <div className="murmur-notification bg-[#eaf6fa] text-[#232946] rounded-md px-4 py-2 mt-2" role="status" aria-live="polite">Deux organismes se sont liés. Une nouvelle harmonie émerge…</div>
          </div>
        )
      )}
      {step === 'result' && error && (
        <div className="error-message text-[#ff4b6e] font-bold mt-3" role="alert">{error}</div>
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
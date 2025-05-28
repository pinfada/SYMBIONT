import React, { useState } from 'react';
import { getContextualMurmure } from '../../shared/NarrationService';

const steps = [
  'intro',
  'permissions',
  'invitation',
  'customize',
  'activation',
  'guidedTour'
];

const COLORS = ['#00e0ff', '#ff4b6e', '#ffb700', '#7cffb2', '#b388ff'];
const AVATARS = ['🌱', '🦋', '🧬', '🌟', '🪐'];

export const OnboardingWizard: React.FC<{ onFinish?: () => void }> = ({ onFinish }) => {
  const [step, setStep] = useState(0);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const context = { hour: new Date().getHours(), firstLogin: step === 0 };
  const murmure = getContextualMurmure(context, steps[step]);

  function handleValidateInvite() {
    if (!inviteCode.trim()) {
      setInviteError('Veuillez entrer un code.');
      return;
    }
    setInviteError(null);
    setStep(3); // Passe à l'étape personnalisation
  }

  function handlePrev() {
    if (step > 0) setStep(step - 1);
  }
  function handleSkip() {
    setStep(steps.length - 1);
  }

  return (
    <div className="onboarding-wizard" style={{ minHeight: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'all 0.6s cubic-bezier(.4,0,.2,1)' }}>
      {step === 0 && (
        <>
          <h2>Bienvenue dans SYMBIONT</h2>
          <div style={{ margin: '18px 0', color: '#00e0ff', fontStyle: 'italic' }}>{murmure}</div>
          <button onClick={() => setStep(1)} style={{ marginTop: 24 }}>Commencer</button>
          <button onClick={handleSkip} style={{ marginTop: 12, background: 'none', color: '#888', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>Passer l&lsquoonboarding</button>
        </>
      )}
      {step === 1 && (
        <>
          <h2>Permissions</h2>
          <div style={{ margin: '18px 0', color: '#00e0ff', fontStyle: 'italic' }}>{murmure}</div>
          <div>SYMBIONT a besoin de stocker vos préférences et d&lsquoafficher des notifications immersives.</div>
          <button onClick={() => setStep(2)} style={{ marginTop: 24 }}>Continuer</button>
          <button onClick={handlePrev} style={{ marginTop: 12, background: 'none', color: '#888', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>Précédent</button>
        </>
      )}
      {step === 2 && (
        <>
          <h2>Rituel d&lsquoinvitation</h2>
          <div style={{ margin: '18px 0', color: '#00e0ff', fontStyle: 'italic' }}>{murmure}</div>
          <div>Entrez votre code d&lsquoinvitation pour activer votre organisme.</div>
          <input
            type="text"
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value)}
            placeholder="Code d'invitation"
            style={{ marginTop: 16, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #00e0ff', fontSize: 16, minWidth: 180 }}
            autoFocus
          />
          {inviteError && <div style={{ color: '#ff4b6e', marginTop: 8 }}>{inviteError}</div>}
          <button
            onClick={handleValidateInvite}
            style={{ marginTop: 24 }}
            disabled={!inviteCode.trim()}
          >Valider</button>
          <button onClick={handlePrev} style={{ marginTop: 12, background: 'none', color: '#888', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>Précédent</button>
        </>
      )}
      {step === 3 && (
        <>
          <h2>Personnalisation rapide</h2>
          <div style={{ margin: '18px 0', color: '#00e0ff', fontStyle: 'italic' }}>{murmure}</div>
          <div style={{ marginBottom: 12 }}>Choisissez votre couleur :</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
            {COLORS.map(c => (
              <button key={c} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: color === c ? '3px solid #fff' : '2px solid #888', cursor: 'pointer' }} onClick={()=>setColor(c)} aria-label={`Choisir la couleur ${c}`}></button>
            ))}
          </div>
          <div style={{ marginBottom: 12 }}>Choisissez votre avatar :</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
            {AVATARS.map(a => (
              <button key={a} style={{ fontSize: 28, background: avatar === a ? '#00e0ff33' : 'transparent', border: avatar === a ? '2px solid #00e0ff' : '2px solid transparent', borderRadius: 8, cursor: 'pointer' }} onClick={()=>setAvatar(a)} aria-label={`Choisir l'avatar ${a}`}>{a}</button>
            ))}
          </div>
          <button onClick={() => setStep(4)} style={{ marginTop: 18 }}>Valider</button>
          <button onClick={handlePrev} style={{ marginTop: 12, background: 'none', color: '#888', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>Précédent</button>
        </>
      )}
      {step === 4 && (
        <>
          <h2>Activation</h2>
          <div style={{ margin: '18px 0', color: '#00e0ff', fontStyle: 'italic' }}>{murmure}</div>
          <div>Votre organisme est activé ! Personnalisez-le pour commencer l&lsquoaventure.</div>
          <div style={{ margin: '18px 0' }}>
            <span style={{ fontSize: 28, color }}>{avatar}</span>
            <span style={{ marginLeft: 12, color }}>{color}</span>
          </div>
          <button onClick={() => setStep(5)} style={{ marginTop: 24 }}>Découvrir</button>
        </>
      )}
      {step === 5 && (
        <>
          <h2>Découverte guidée</h2>
          <div style={{ margin: '18px 0', color: '#00e0ff', fontStyle: 'italic' }}>{murmure}</div>
          <div>Explorez le réseau, les rituels, la timeline et la personnalisation.</div>
          <button onClick={onFinish} style={{ marginTop: 24 }}>Terminer</button>
        </>
      )}
    </div>
  );
}; 
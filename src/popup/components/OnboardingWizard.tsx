import React, { useState } from 'react';
import { getContextualMurmure } from '../../shared/NarrationService';
import { InvitationStep } from './InvitationStep';

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
  const [color, setColor] = useState(COLORS[0]);
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const context = { hour: new Date().getHours(), firstLogin: step === 0 };
  const murmure = getContextualMurmure(context, steps[step]);

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
          <div style={{ margin: '18px 0', color: '#00e0ff', fontStyle: 'italic' }}>{murmure}</div>
          {/* Validation réelle via le service d'invitation du background */}
          <InvitationStep onActivated={() => setStep(3)} />
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
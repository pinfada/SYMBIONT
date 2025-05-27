import React, { useState } from 'react';
import { InvitationStep } from './InvitationStep';
import { Murmur } from '../../shared/types/murmur';

const steps = [
  'intro',
  'permissions',
  'invitation',
  'confirmation',
] as const;

type Step = typeof steps[number];

export const OnboardingScreen: React.FC = () => {
  const [step, setStep] = useState<Step>('intro');
  const [murmur, setMurmur] = useState<Murmur | null>(null);

  const handleNext = () => {
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  };

  // Simuler un murmure à la fin de l'onboarding
  const handleActivation = () => {
    setStep('confirmation');
    setMurmur({
      text: 'Bienvenue, symbiont. Un nouveau cycle commence...',
      timestamp: Date.now(),
      context: 'onboarding',
    });
  };

  return (
    <div className="onboarding-screen">
      {step === 'intro' && (
        <section className="onboarding-step">
          <h2>Bienvenue dans SYMBIONT</h2>
          <p>Un organisme numérique vivant, évolutif, anonyme et poétique.</p>
          <button onClick={handleNext}>Commencer</button>
        </section>
      )}
      {step === 'permissions' && (
        <section className="onboarding-step">
          <h3>Permissions requises</h3>
          <ul>
            <li>Accès aux onglets : pour observer les motifs de navigation</li>
            <li>Accès à tous les sites : pour permettre à l'organisme d'évoluer</li>
            <li>Stockage local : pour garder votre organisme sur votre machine</li>
            <li>Aucune donnée personnelle n'est collectée ou transmise</li>
          </ul>
          <button onClick={handleNext}>J'accepte</button>
        </section>
      )}
      {step === 'invitation' && (
        <InvitationStep onActivated={handleActivation} />
      )}
      {step === 'confirmation' && (
        <section className="onboarding-step">
          <h3>Activation réussie !</h3>
          <p>Votre organisme est maintenant éveillé.</p>
          {murmur && (
            <div className="murmur-notification">
              <em>{murmur.text}</em>
            </div>
          )}
        </section>
      )}
    </div>
  );
}; 
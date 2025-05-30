import React, { useState, useEffect } from 'react';

const steps = [
  {
    title: "Présentation rapide de l'interface",
    content: "Découvrez les principales fonctionnalités de l'interface SYMBIONT."
  },
  {
    title: "Connexion à votre réseau",
    content: "Connectez-vous à votre réseau pour activer la synchronisation."
  },
  {
    title: "Activation des modules intelligents",
    content: "Activez les modules d'intelligence adaptative pour une expérience optimale."
  },
  {
    title: "Accès au dashboard",
    content: "Accédez à votre dashboard personnalisé pour suivre l'évolution de votre organisme."
  }
];

const ONBOARDING_KEY = 'symbiont_onboarding';

const OnboardingPanel: React.FC<{ onFinish?: () => void }> = ({ onFinish }) => {
  // Initialisation depuis le localStorage
  const persisted = (() => {
    try {
      return JSON.parse(localStorage.getItem(ONBOARDING_KEY) || '{}');
    } catch {
      return {};
    }
  })();

  const [step, setStep] = useState<number>(persisted.step ?? 0);
  const [started, setStarted] = useState<boolean>(persisted.started ?? false);

  // Persiste à chaque changement
  useEffect(() => {
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify({ step, started }));
  }, [step, started]);

  const next = () => setStep(s => Math.min(s + 1, steps.length - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));
  const finish = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    onFinish && onFinish();
  };

  if (!started) {
    return (
      <div data-testid="onboarding-panel">
        <h2 data-testid="onboarding-title">Bienvenue sur SYMBIONT</h2>
        <p className="mb-4">Découvrez comment tirer le meilleur parti de votre organisme numérique.</p>
        <button data-testid="onboarding-start" onClick={() => setStarted(true)} style={{ marginTop: 24, padding: '10px 32px', fontSize: 18, borderRadius: 8, background: '#00e0ff', color: '#fff', fontWeight: 600 }}>Commencer</button>
      </div>
    );
  }

  return (
    <div data-testid="onboarding-panel">
      <h2 data-testid="onboarding-title">Bienvenue sur SYMBIONT</h2>
      <h3 data-testid="onboarding-step-title">{steps[step].title}</h3>
      <p data-testid="onboarding-step-content">{steps[step].content}</p>
      <div style={{ marginTop: 20 }}>
        <button data-testid="onboarding-prev" onClick={prev} disabled={step === 0}>Précédent</button>
        {step < steps.length - 1 ? (
          <button data-testid="onboarding-next" onClick={next} style={{ marginLeft: 10 }}>Suivant</button>
        ) : (
          <button data-testid="onboarding-finish" onClick={finish} style={{ marginLeft: 10 }}>Terminer</button>
        )}
      </div>
      <div style={{ marginTop: 10, color: '#888' }}>
        Étape {step + 1} / {steps.length}
      </div>
    </div>
  );
};

export default OnboardingPanel; 
import React from 'react';

const OnboardingPanel: React.FC = () => (
  <div data-testid="onboarding-panel">
    <h2>Bienvenue sur SYMBIONT</h2>
    <p>Ce module vous guide à travers les premières étapes pour découvrir l'extension et ses fonctionnalités principales.</p>
    <ol>
      <li>Présentation rapide de l'interface</li>
      <li>Connexion à votre réseau</li>
      <li>Activation des modules intelligents</li>
      <li>Accès au dashboard</li>
    </ol>
    <p>Commencez votre aventure !</p>
  </div>
);

export default OnboardingPanel; 
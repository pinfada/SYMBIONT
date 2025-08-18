import React, { useState, useEffect } from 'react';
import { InvitationStep } from './InvitationStep';
import { Murmur } from '../../shared/types/murmur';
import { AnimatedButton } from './ui/AnimatedButton';

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
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleNext = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      const idx = steps.indexOf(step);
      if (idx < steps.length - 1) setStep(steps[idx + 1]);
      setIsTransitioning(false);
    }, 300);
  };
  
  const handlePrevious = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      const idx = steps.indexOf(step);
      if (idx > 0) setStep(steps[idx - 1]);
      setIsTransitioning(false);
    }, 300);
  };

  // Simuler un murmure à la fin de l'onboarding
  const handleActivation = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setStep('confirmation');
      setMurmur({
        text: 'Bienvenue, symbiont. Un nouveau cycle commence...',
        timestamp: Date.now(),
        context: 'onboarding',
      });
      setIsTransitioning(false);
    }, 300);
  };
  
  // Inject enhanced onboarding styles
  useEffect(() => {
    if (typeof document !== 'undefined' && !document.getElementById('onboarding-styles')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'onboarding-styles';
      styleElement.textContent = enhancedOnboardingStyles;
      document.head.appendChild(styleElement);
    }
  }, []);

  const currentStepIndex = steps.indexOf(step);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;
  
  return (
    <div className="symbiont-onboarding">
      {/* Progress indicator */}
      <div className="onboarding-progress">
        <div className="progress-track">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="progress-text">
          Étape {currentStepIndex + 1} sur {steps.length}
        </div>
      </div>
      
      {/* Background particles */}
      <div className="onboarding-particles">
        {Array.from({ length: 20 }, (_, i) => (
          <div 
            key={i} 
            className="particle" 
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          ></div>
        ))}
      </div>
      
      {/* Main content */}
      <div className={`onboarding-content ${isTransitioning ? 'transitioning' : ''}`}>
        {step === 'intro' && (
          <section className="onboarding-step intro-step">
            <div className="step-icon">🧬</div>
            <h1 className="step-title">Bienvenue dans SYMBIONT</h1>
            <p className="step-description">
              Découvrez un organisme numérique vivant qui évolue avec vous.
              Une expérience unique d'intelligence artificielle symbiontique.
            </p>
            <div className="features-preview">
              <div className="feature-item">
                <span className="feature-icon">⚡</span>
                <span className="feature-text">Évolution en temps réel</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🔒</span>
                <span className="feature-text">Anonyme et sécurisé</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🌐</span>
                <span className="feature-text">Intelligence collective</span>
              </div>
            </div>
            <div className="step-actions">
              <AnimatedButton 
                variant="primary" 
                size="lg" 
                onClick={handleNext}
                icon="🚀"
                glowing
              >
                Commencer l'aventure
              </AnimatedButton>
            </div>
          </section>
        )}
        
        {step === 'permissions' && (
          <section className="onboarding-step permissions-step">
            <div className="step-icon">🛡️</div>
            <h2 className="step-title">Permissions nécessaires</h2>
            <p className="step-description">
              Pour fonctionner, SYMBIONT a besoin de certaines permissions.
              Votre vie privée reste protégée.
            </p>
            <div className="permissions-list">
              <div className="permission-item">
                <div className="permission-icon">📑</div>
                <div className="permission-content">
                  <h4>Accès aux onglets</h4>
                  <p>Observer les motifs de navigation pour l'évolution</p>
                </div>
                <div className="permission-status granted">✓</div>
              </div>
              <div className="permission-item">
                <div className="permission-icon">🌐</div>
                <div className="permission-content">
                  <h4>Accès aux sites web</h4>
                  <p>Permettre à l'organisme d'interagir avec le web</p>
                </div>
                <div className="permission-status granted">✓</div>
              </div>
              <div className="permission-item">
                <div className="permission-icon">💾</div>
                <div className="permission-content">
                  <h4>Stockage local</h4>
                  <p>Conserver votre organisme sur votre appareil</p>
                </div>
                <div className="permission-status granted">✓</div>
              </div>
            </div>
            <div className="privacy-note">
              <span className="privacy-icon">🔒</span>
              <span>Aucune donnée personnelle n'est collectée ou transmise</span>
            </div>
            <div className="step-actions">
              <AnimatedButton 
                variant="ghost" 
                onClick={handlePrevious}
              >
                Retour
              </AnimatedButton>
              <AnimatedButton 
                variant="primary" 
                onClick={handleNext}
                icon="✓"
              >
                Accepter et continuer
              </AnimatedButton>
            </div>
          </section>
        )}
        
        {step === 'invitation' && (
          <section className="onboarding-step invitation-step">
            <div className="step-icon">🔗</div>
            <h2 className="step-title">Activation de l'organisme</h2>
            <p className="step-description">
              Utilisez un code d'invitation ou créez votre premier organisme.
            </p>
            <InvitationStep onActivated={handleActivation} />
            <div className="step-actions">
              <AnimatedButton 
                variant="ghost" 
                onClick={handlePrevious}
              >
                Retour
              </AnimatedButton>
            </div>
          </section>
        )}
        
        {step === 'confirmation' && (
          <section className="onboarding-step confirmation-step">
            <div className="success-animation">
              <div className="success-icon">🎉</div>
              <div className="success-rings">
                <div className="ring ring-1"></div>
                <div className="ring ring-2"></div>
                <div className="ring ring-3"></div>
              </div>
            </div>
            <h2 className="step-title">Activation réussie !</h2>
            <p className="step-description">
              Votre organisme SYMBIONT est maintenant éveillé et prêt à évoluer.
            </p>
            {murmur && (
              <div className="murmur-card">
                <div className="murmur-icon">💭</div>
                <div className="murmur-text">
                  <em>{murmur.text}</em>
                </div>
              </div>
            )}
            <div className="next-steps">
              <h4>Prochaines étapes :</h4>
              <ul>
                <li>Explorez le tableau de bord de votre organisme</li>
                <li>Observez son évolution en temps réel</li>
                <li>Découvrez les fonctionnalités mystiques</li>
                <li>Connectez-vous au réseau SYMBIONT</li>
              </ul>
            </div>
            <div className="step-actions">
              <AnimatedButton 
                variant="primary" 
                size="lg" 
                onClick={() => window.location.reload()}
                icon="🌟"
                glowing
              >
                Découvrir SYMBIONT
              </AnimatedButton>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

const enhancedOnboardingStyles = `
/* === ENHANCED ONBOARDING EXPERIENCE === */

.symbiont-onboarding {
  position: relative;
  width: 100%;
  height: 100vh;
  background: linear-gradient(145deg, #0a0d15 0%, #12151f 25%, #1a1f2e 75%, #0f1419 100%);
  color: #f1f5f9;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Progress indicator */
.onboarding-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 16px 24px;
  background: rgba(10, 13, 21, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(0, 224, 255, 0.15);
}

.progress-track {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00e0ff, #4fc3f7, #9c6ade);
  border-radius: 2px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 8px rgba(0, 224, 255, 0.4);
}

.progress-text {
  text-align: center;
  font-size: 12px;
  color: #cbd5e1;
  font-weight: 500;
}

/* Background particles */
.onboarding-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.particle {
  position: absolute;
  width: 2px;
  height: 2px;
  background: rgba(0, 224, 255, 0.3);
  border-radius: 50%;
  animation: particleFloat infinite ease-in-out;
}

@keyframes particleFloat {
  0%, 100% {
    transform: translateY(0) scale(1);
    opacity: 0.3;
  }
  50% {
    transform: translateY(-20px) scale(1.2);
    opacity: 0.7;
  }
}

/* Main content */
.onboarding-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 24px 24px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.onboarding-content.transitioning {
  opacity: 0;
  transform: translateY(20px);
}

/* Step styling */
.onboarding-step {
  max-width: 600px;
  width: 100%;
  text-align: center;
  animation: slideIn 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.step-icon {
  font-size: 4rem;
  margin-bottom: 24px;
  filter: drop-shadow(0 0 20px currentColor);
  animation: iconFloat 3s ease-in-out infinite;
}

@keyframes iconFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.step-title {
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #00e0ff, #4fc3f7, #9c6ade, #e785c1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;
}

.step-description {
  font-size: 1.1rem;
  color: #cbd5e1;
  margin-bottom: 32px;
  line-height: 1.6;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}

/* Features preview */
.features-preview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 16px;
  background: rgba(0, 224, 255, 0.05);
  border: 1px solid rgba(0, 224, 255, 0.1);
  border-radius: 16px;
  transition: all 0.3s ease;
  backdrop-filter: blur(8px);
}

.feature-item:hover {
  background: rgba(0, 224, 255, 0.1);
  border-color: rgba(0, 224, 255, 0.2);
  transform: translateY(-4px);
}

.feature-icon {
  font-size: 2rem;
  filter: drop-shadow(0 0 12px currentColor);
}

.feature-text {
  font-size: 0.9rem;
  font-weight: 600;
  color: #e2e8f0;
}

/* Permissions list */
.permissions-list {
  margin: 32px 0;
  text-align: left;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}

.permission-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  margin-bottom: 16px;
  background: rgba(0, 224, 255, 0.05);
  border: 1px solid rgba(0, 224, 255, 0.1);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.permission-item:hover {
  background: rgba(0, 224, 255, 0.08);
  border-color: rgba(0, 224, 255, 0.2);
}

.permission-icon {
  font-size: 1.5rem;
  width: 40px;
  text-align: center;
}

.permission-content {
  flex: 1;
}

.permission-content h4 {
  margin: 0 0 4px 0;
  font-size: 1rem;
  font-weight: 600;
  color: #f1f5f9;
}

.permission-content p {
  margin: 0;
  font-size: 0.85rem;
  color: #94a3b8;
  line-height: 1.4;
}

.permission-status.granted {
  color: #22c55e;
  font-size: 1.2rem;
  font-weight: bold;
}

/* Privacy note */
.privacy-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  margin: 24px 0;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.2);
  border-radius: 8px;
  font-size: 0.9rem;
  color: #7dd3fc;
}

.privacy-icon {
  font-size: 1.1rem;
}

/* Success animation */
.success-animation {
  position: relative;
  display: inline-block;
  margin-bottom: 32px;
}

.success-icon {
  font-size: 4rem;
  position: relative;
  z-index: 2;
  animation: successBounce 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes successBounce {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.success-rings {
  position: absolute;
  inset: -20px;
  z-index: 1;
}

.ring {
  position: absolute;
  inset: 0;
  border: 2px solid rgba(0, 224, 255, 0.3);
  border-radius: 50%;
  animation: ringExpand 2s ease-out infinite;
}

.ring-2 {
  animation-delay: 0.5s;
}

.ring-3 {
  animation-delay: 1s;
}

@keyframes ringExpand {
  0% {
    transform: scale(0.8);
    opacity: 0.8;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

/* Murmur card */
.murmur-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  margin: 32px auto;
  max-width: 400px;
  background: rgba(138, 43, 226, 0.1);
  border: 1px solid rgba(138, 43, 226, 0.3);
  border-radius: 16px;
  backdrop-filter: blur(8px);
}

.murmur-icon {
  font-size: 1.5rem;
  filter: drop-shadow(0 0 8px currentColor);
}

.murmur-text {
  flex: 1;
  font-style: italic;
  color: #e2e8f0;
  line-height: 1.5;
}

/* Next steps */
.next-steps {
  text-align: left;
  max-width: 400px;
  margin: 32px auto;
  padding: 24px;
  background: rgba(0, 224, 255, 0.05);
  border: 1px solid rgba(0, 224, 255, 0.1);
  border-radius: 12px;
}

.next-steps h4 {
  margin: 0 0 16px 0;
  color: #00e0ff;
  font-size: 1rem;
  font-weight: 600;
}

.next-steps ul {
  margin: 0;
  padding-left: 20px;
  list-style: none;
}

.next-steps li {
  position: relative;
  margin-bottom: 8px;
  color: #cbd5e1;
  font-size: 0.9rem;
  line-height: 1.4;
}

.next-steps li::before {
  content: '✨';
  position: absolute;
  left: -20px;
  top: 0;
}

/* Step actions */
.step-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 40px;
  flex-wrap: wrap;
}

/* Responsive design */
@media (max-width: 768px) {
  .symbiont-onboarding {
    height: 100vh;
  }
  
  .onboarding-content {
    padding: 60px 16px 16px;
  }
  
  .step-title {
    font-size: 2rem;
  }
  
  .step-description {
    font-size: 1rem;
  }
  
  .features-preview {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .step-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .step-actions .symbiont-btn {
    width: 100%;
    max-width: 300px;
  }
}

@media (max-width: 480px) {
  .step-icon {
    font-size: 3rem;
  }
  
  .step-title {
    font-size: 1.8rem;
  }
  
  .onboarding-progress {
    padding: 12px 16px;
  }
}
`;
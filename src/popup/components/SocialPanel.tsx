import React, { useState, useEffect } from 'react';
import { SecureRandom } from '../shared/utils/secureRandom';
import { SecureLogger } from '../shared/utils/secureLogger';

interface InviteData {
  code: string;
  expiresAt: number;
  maxUses: number;
  used: number;
}

interface ContactData {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'away';
  generation: number;
  lastActive: number;
}

const SocialPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'invite' | 'onboard' | 'contacts' | 'share'>('invite');
  const [inviteCode, setInviteCode] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<InviteData | null>(null);
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [shareLink, setShareLink] = useState('');

  // Génération d'un code d'invitation
  const generateInvite = () => {
    const code = SecureRandom.random().toString(36).substring(2, 10).toUpperCase();
    const invite: InviteData = {
      code,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 jours
      maxUses: 5,
      used: 0
    };
    setGeneratedInvite(invite);
    
    // Sauvegarde locale
    try {
      localStorage.setItem('symbiont_invite_' + code, JSON.stringify(invite));
    } catch (e) {
      SecureLogger.warn('Impossible de sauvegarder l\'invitation');
    }
  };

  // Acceptation d'une invitation
  const acceptInvite = () => {
    if (!inviteCode.trim()) return;
    
    try {
      const stored = localStorage.getItem('symbiont_invite_' + inviteCode);
      if (stored) {
        const invite = JSON.parse(stored);
        if (invite.expiresAt > Date.now() && invite.used < invite.maxUses) {
          setAccepted(true);
          invite.used += 1;
          localStorage.setItem('symbiont_invite_' + inviteCode, JSON.stringify(invite));
          
          // Ajouter à la liste des contacts
          const newContact: ContactData = {
            id: 'invited_' + Date.now(),
            name: 'Nouvel Organisme',
            status: 'online',
            generation: 1,
            lastActive: Date.now()
          };
          setContacts(prev => [...prev, newContact]);
        }
      }
    } catch (e) {
      SecureLogger.warn('Erreur lors de l\'acceptation de l\'invitation');
    }
  };

  // Copier le code d'invitation
  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      // Feedback visuel
    }).catch(() => {
      // Fallback pour les navigateurs non compatibles
      const textArea = document.createElement('textarea');
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    });
  };

  // Génération du lien de partage
  const generateShareLink = () => {
    const link = `https://symbiont.app/join?ref=${Date.now().toString(36)}`;
    setShareLink(link);
  };

  // Données de contact mockées
  useEffect(() => {
    const mockContacts: ContactData[] = [
      { id: '1', name: 'Alpha-001', status: 'online', generation: 3, lastActive: Date.now() - 300000 },
      { id: '2', name: 'Beta-X42', status: 'away', generation: 2, lastActive: Date.now() - 1800000 },
      { id: '3', name: 'Gamma-789', status: 'offline', generation: 4, lastActive: Date.now() - 86400000 }
    ];
    setContacts(mockContacts);
  }, []);

  const renderInviteTab = () => (
    <div className="social-tab-content">
      <div className="invite-section">
        <h3>🎯 Générer une Invitation</h3>
        <p>Créez un code d'invitation pour permettre à d'autres de rejoindre votre lignée.</p>
        
        <button 
          className="btn-primary" 
          onClick={generateInvite}
          disabled={!!generatedInvite}
        >
          {generatedInvite ? 'Code Généré' : 'Générer Code'}
        </button>

        {generatedInvite && (
          <div className="invite-card">
            <div className="invite-code-display">
              <span className="invite-code">{generatedInvite.code}</span>
              <button 
                className="btn-copy" 
                onClick={() => copyInviteCode(generatedInvite.code)}
                title="Copier le code"
              >
                📋
              </button>
            </div>
            <div className="invite-details">
              <span>Expire le: {new Date(generatedInvite.expiresAt).toLocaleDateString()}</span>
              <span>Utilisations: {generatedInvite.used}/{generatedInvite.maxUses}</span>
            </div>
          </div>
        )}
      </div>

      <div className="accept-section">
        <h3>🔗 Accepter une Invitation</h3>
        <p>Entrez un code d'invitation pour rejoindre une lignée existante.</p>
        
        <div className="input-group">
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="CODE D'INVITATION"
            className="invite-input"
            maxLength={8}
          />
          <button 
            className="btn-secondary" 
            onClick={acceptInvite}
            disabled={!inviteCode.trim() || accepted}
          >
            Accepter
          </button>
        </div>

        {accepted && (
          <div className="success-message">
            ✅ Invitation acceptée ! Votre organisme évolue...
          </div>
        )}
      </div>
    </div>
  );

  const renderOnboardTab = () => (
    <div className="social-tab-content">
      <div className="onboarding-section">
        <h3>🌱 Guide de Démarrage</h3>
        <div className="onboarding-steps">
          {[
            { title: 'Comprendre SYMBIONT', desc: 'Votre organisme digital évolue en continu' },
            { title: 'Explorer le Réseau', desc: 'Connectez-vous avec d\'autres organismes' },
            { title: 'Participer aux Rituels', desc: 'Évoluez grâce aux expériences collectives' },
            { title: 'Inviter des Amis', desc: 'Agrandissez votre lignée génétique' }
          ].map((step, index) => (
            <div 
              key={index}
              className={`onboard-step ${index <= onboardingStep ? 'completed' : ''}`}
              onClick={() => setOnboardingStep(index)}
            >
              <div className="step-indicator">
                {index <= onboardingStep ? '✓' : index + 1}
              </div>
              <div className="step-content">
                <h4>{step.title}</h4>
                <p>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="onboard-actions">
          <button 
            className="btn-primary"
            onClick={() => setOnboardingStep(Math.min(3, onboardingStep + 1))}
            disabled={onboardingStep >= 3}
          >
            {onboardingStep >= 3 ? 'Terminé !' : 'Étape Suivante'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderContactsTab = () => (
    <div className="social-tab-content">
      <div className="contacts-section">
        <h3>👥 Contacts Symbiont</h3>
        <div className="contacts-list">
          {contacts.map(contact => (
            <div key={contact.id} className="contact-card">
              <div className="contact-avatar">
                <div className={`status-indicator ${contact.status}`}></div>
                🧬
              </div>
              <div className="contact-info">
                <h4>{contact.name}</h4>
                <span className="contact-generation">Génération {contact.generation}</span>
                <span className="contact-activity">
                  {contact.status === 'online' ? 'En ligne' : 
                   contact.status === 'away' ? 'Absent' : 
                   `Vu ${Math.floor((Date.now() - contact.lastActive) / 60000)}min`}
                </span>
              </div>
              <div className="contact-actions">
                <button className="btn-small">💬</button>
                <button className="btn-small">🔗</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderShareTab = () => (
    <div className="social-tab-content">
      <div className="share-section">
        <h3>🚀 Partager SYMBIONT</h3>
        <p>Aidez SYMBIONT à grandir en partageant l'expérience !</p>
        
        <button 
          className="btn-primary" 
          onClick={generateShareLink}
        >
          Générer Lien de Partage
        </button>

        {shareLink && (
          <div className="share-link-card">
            <div className="share-link-display">
              <input 
                type="text" 
                value={shareLink} 
                readOnly 
                className="share-link-input"
              />
              <button 
                className="btn-copy" 
                onClick={() => copyInviteCode(shareLink)}
                title="Copier le lien"
              >
                📋
              </button>
            </div>
          </div>
        )}

        <div className="share-social">
          <h4>Partager sur:</h4>
          <div className="social-buttons">
            <button className="social-btn twitter">🐦 Twitter</button>
            <button className="social-btn discord">💬 Discord</button>
            <button className="social-btn reddit">🤖 Reddit</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="social-panel">
      {/* Navigation des sous-onglets */}
      <div className="social-nav">
        {[
          { key: 'invite', label: 'Invitations', icon: '🎯' },
          { key: 'onboard', label: 'Guide', icon: '🌱' },
          { key: 'contacts', label: 'Contacts', icon: '👥' },
          { key: 'share', label: 'Partager', icon: '🚀' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`social-nav-btn ${activeTab === tab.key ? 'active' : ''}`}
          >
            <span className="social-nav-icon">{tab.icon}</span>
            <span className="social-nav-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Contenu des onglets */}
      <div className="social-content">
        {activeTab === 'invite' && renderInviteTab()}
        {activeTab === 'onboard' && renderOnboardTab()}
        {activeTab === 'contacts' && renderContactsTab()}
        {activeTab === 'share' && renderShareTab()}
      </div>
    </div>
  );
};

export default SocialPanel; 
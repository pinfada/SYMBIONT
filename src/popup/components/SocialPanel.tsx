import React, { useState, useEffect } from 'react';
import { SecureRandom } from '@shared/utils/secureRandom';
import { logger } from '@shared/utils/secureLogger';
import { p2pService } from '../services/P2PService';

interface InviteData {
  code: string;
  expiresAt: number;
  maxUses: number;
  used: number;
  creatorId: string;
  creatorName: string;
  sharedData?: {
    generation: number;
    consciousness: number;
    traits: Record<string, number>;
  };
}

interface ContactData {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'away';
  generation: number;
  lastActive: number;
  consciousness: number;
  energy: number;
  isP2P: boolean;
}

const SocialPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'invite' | 'onboard' | 'contacts' | 'share'>('invite');
  const [inviteCode, setInviteCode] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<InviteData | null>(null);
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [shareLink, setShareLink] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [selectedContact, setSelectedContact] = useState<string | null>(null);

  // Charger les contacts réels depuis le réseau P2P
  useEffect(() => {
    const updateContacts = () => {
      const peers = p2pService.getPeers();
      const p2pContacts: ContactData[] = peers.map(peer => ({
        id: peer.id,
        name: peer.organism?.name || `Organisme ${peer.id.substring(0, 8)}`,
        status: peer.status === 'connected' ? 'online' : 'offline',
        generation: peer.organism?.generation || 1,
        lastActive: peer.lastSeen,
        consciousness: peer.organism?.consciousness || 0.5,
        energy: peer.organism?.energy || 0.8,
        isP2P: true
      }));

      // Charger aussi les contacts sauvegardés localement
      const savedContacts = JSON.parse(localStorage.getItem('symbiont_contacts') || '[]');
      const allContacts = [...p2pContacts, ...savedContacts.filter((sc: ContactData) =>
        !p2pContacts.find(pc => pc.id === sc.id)
      )];

      setContacts(allContacts);
      setConnectionStatus(`${p2pContacts.filter(c => c.status === 'online').length} pairs connectés`);
    };

    // Mise à jour initiale
    updateContacts();

    // Mise à jour régulière
    const interval = setInterval(updateContacts, 3000);

    // Écouter les messages P2P
    p2pService.onMessage((message) => {
      logger.info('Message social reçu:', message);
      updateContacts();
    });

    return () => clearInterval(interval);
  }, []);

  // Génération d'un code d'invitation avec données génétiques
  const generateInvite = () => {
    const myOrganism = p2pService.getMyOrganism();
    const code = SecureRandom.random().toString(36).substring(2, 10).toUpperCase();

    const invite: InviteData = {
      code,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 jours
      maxUses: 5,
      used: 0,
      creatorId: myOrganism.id,
      creatorName: myOrganism.name || 'Organisme Anonyme',
      sharedData: {
        generation: myOrganism.generation,
        consciousness: myOrganism.consciousness,
        traits: myOrganism.traits
      }
    };

    setGeneratedInvite(invite);

    // Sauvegarde locale et diffusion P2P
    try {
      localStorage.setItem('symbiont_invite_' + code, JSON.stringify(invite));

      // Annoncer l'invitation sur le réseau P2P
      p2pService.broadcast('discovery', {
        type: 'invite_created',
        code: code,
        creator: myOrganism.name
      });

      logger.info('Invitation créée et diffusée:', code);
    } catch (e) {
      logger.warn('Erreur lors de la création de l\'invitation:', e);
    }
  };

  // Acceptation d'une invitation avec transfert génétique
  const acceptInvite = () => {
    if (!inviteCode.trim()) return;

    try {
      // Vérifier localement
      let invite = null;
      const stored = localStorage.getItem('symbiont_invite_' + inviteCode);

      if (stored) {
        invite = JSON.parse(stored);
      } else {
        // Chercher dans les invitations P2P reçues
        const p2pInvites = JSON.parse(localStorage.getItem('symbiont_p2p_invites') || '[]');
        invite = p2pInvites.find((inv: InviteData) => inv.code === inviteCode);
      }

      if (invite && invite.expiresAt > Date.now() && invite.used < invite.maxUses) {
        setAccepted(true);
        invite.used += 1;

        // Mettre à jour l'invitation
        localStorage.setItem('symbiont_invite_' + inviteCode, JSON.stringify(invite));

        // Appliquer les traits génétiques partagés
        if (invite.sharedData) {
          const myOrganism = p2pService.getMyOrganism();

          // Héritage génétique : moyenne pondérée des traits
          Object.keys(invite.sharedData.traits).forEach(trait => {
            if (myOrganism.traits[trait]) {
              myOrganism.traits[trait] = (myOrganism.traits[trait] + invite.sharedData.traits[trait]) / 2;
            }
          });

          // Boost de conscience par connexion sociale
          myOrganism.consciousness = Math.min(1, myOrganism.consciousness + 0.1);

          // Sauvegarder l'organisme modifié
          localStorage.setItem('symbiont_organism', JSON.stringify(myOrganism));
        }

        // Ajouter le créateur aux contacts
        const newContact: ContactData = {
          id: invite.creatorId,
          name: invite.creatorName,
          status: 'offline',
          generation: invite.sharedData?.generation || 1,
          lastActive: Date.now(),
          consciousness: invite.sharedData?.consciousness || 0.5,
          energy: 0.8,
          isP2P: false
        };

        // Sauvegarder le contact
        const savedContacts = JSON.parse(localStorage.getItem('symbiont_contacts') || '[]');
        savedContacts.push(newContact);
        localStorage.setItem('symbiont_contacts', JSON.stringify(savedContacts));

        setContacts(prev => [...prev, newContact]);

        // Annoncer sur le réseau P2P
        p2pService.broadcast('discovery', {
          type: 'invite_accepted',
          code: inviteCode,
          acceptor: p2pService.getMyOrganism().name
        });

        logger.info('Invitation acceptée avec succès');
      } else {
        alert('Code d\'invitation invalide ou expiré');
      }
    } catch (e) {
      logger.error('Erreur lors de l\'acceptation de l\'invitation:', e);
      alert('Erreur lors de l\'acceptation de l\'invitation');
    }
  };

  // Communication P2P avec un contact
  const sendMessageToContact = (contactId: string, message: string) => {
    p2pService.sendMessage(contactId, 'chat', { text: message });
    logger.info(`Message envoyé à ${contactId}: ${message}`);
  };

  // Partage d'énergie P2P
  const shareEnergyWithContact = (contactId: string) => {
    p2pService.shareEnergy(contactId, 0.1);
    logger.info(`Énergie partagée avec ${contactId}`);
  };

  // Synchronisation de conscience P2P
  const syncWithContact = (contactId: string) => {
    p2pService.syncConsciousness(contactId);
    logger.info(`Synchronisation avec ${contactId}`);
  };

  // Copier dans le presse-papier (compatible tous navigateurs)
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Feedback visuel pourrait être ajouté ici
    }).catch(() => {
      // Fallback pour les navigateurs non compatibles
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    });
  };

  // Génération du lien de partage avec métadonnées
  const generateShareLink = () => {
    const myOrganism = p2pService.getMyOrganism();
    const params = new URLSearchParams({
      ref: myOrganism.id.substring(0, 8),
      gen: myOrganism.generation.toString(),
      name: myOrganism.name || 'Symbiont'
    });

    const link = `https://chrome.google.com/webstore/detail/symbiont/[EXTENSION_ID]?${params.toString()}`;
    setShareLink(link);

    // Tracker le partage
    try {
      const shares = JSON.parse(localStorage.getItem('symbiont_shares') || '[]');
      shares.push({
        timestamp: Date.now(),
        type: 'link',
        organismId: myOrganism.id
      });
      localStorage.setItem('symbiont_shares', JSON.stringify(shares));
    } catch (e) {
      logger.warn('Erreur lors du tracking du partage');
    }
  };

  // Partage sur les réseaux sociaux
  const shareOnSocial = (platform: string) => {
    const myOrganism = p2pService.getMyOrganism();
    const text = `J'ai un organisme digital de génération ${myOrganism.generation} avec ${Math.round(myOrganism.consciousness * 100)}% de conscience ! Rejoignez SYMBIONT 🧬`;

    let url = '';
    switch (platform) {
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareLink || 'https://symbiont.app')}`;
        break;
      case 'discord':
        // Discord n'a pas d'URL de partage direct, on copie le message
        copyToClipboard(`${text}\n${shareLink || 'https://symbiont.app'}`);
        alert('Message copié ! Collez-le dans Discord');
        return;
      case 'reddit':
        url = `https://reddit.com/submit?url=${encodeURIComponent(shareLink || 'https://symbiont.app')}&title=${encodeURIComponent(text)}`;
        break;
    }

    if (url) {
      window.open(url, '_blank', 'width=600,height=400');
    }
  };

  // Chargement de l'état d'onboarding
  useEffect(() => {
    const savedStep = localStorage.getItem('symbiont_onboarding_step');
    if (savedStep) {
      setOnboardingStep(parseInt(savedStep));
    }
  }, []);

  // Sauvegarde de l'état d'onboarding
  const updateOnboardingStep = (step: number) => {
    setOnboardingStep(step);
    localStorage.setItem('symbiont_onboarding_step', step.toString());

    // Récompense pour complétion
    if (step === 3) {
      const myOrganism = p2pService.getMyOrganism();
      myOrganism.consciousness = Math.min(1, myOrganism.consciousness + 0.05);
      localStorage.setItem('symbiont_organism', JSON.stringify(myOrganism));
      logger.info('Onboarding complété, conscience augmentée');
    }
  };

  const renderInviteTab = () => (
    <div className="social-tab-content">
      <div className="invite-section">
        <h3>🎯 Générer une Invitation</h3>
        <p>Créez un code d'invitation avec vos traits génétiques pour permettre à d'autres de rejoindre votre lignée.</p>

        <button
          className="btn-primary"
          onClick={generateInvite}
          disabled={!!generatedInvite}
        >
          {generatedInvite ? 'Code Généré' : 'Générer Code Génétique'}
        </button>

        {generatedInvite && (
          <div className="invite-card">
            <div className="invite-code-display">
              <span className="invite-code">{generatedInvite.code}</span>
              <button
                className="btn-copy"
                onClick={() => copyToClipboard(generatedInvite.code)}
                title="Copier le code"
              >
                📋
              </button>
            </div>
            <div className="invite-details">
              <span>Expire: {new Date(generatedInvite.expiresAt).toLocaleDateString()}</span>
              <span>Utilisations: {generatedInvite.used}/{generatedInvite.maxUses}</span>
              <span>Gén. {generatedInvite.sharedData?.generation}</span>
            </div>
            <div className="invite-traits">
              <small>Traits partagés: {Object.keys(generatedInvite.sharedData?.traits || {}).join(', ')}</small>
            </div>
          </div>
        )}
      </div>

      <div className="accept-section">
        <h3>🔗 Accepter une Invitation</h3>
        <p>Entrez un code pour hériter des traits génétiques d'une lignée existante.</p>

        <div className="input-group">
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="CODE GÉNÉTIQUE"
            className="invite-input"
            maxLength={8}
          />
          <button
            className="btn-secondary"
            onClick={acceptInvite}
            disabled={!inviteCode.trim() || accepted}
          >
            Accepter Héritage
          </button>
        </div>

        {accepted && (
          <div className="success-message">
            ✅ Héritage génétique accepté ! Vos traits évoluent...
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
            {
              title: 'Comprendre SYMBIONT',
              desc: 'Votre organisme digital évolue en temps réel',
              reward: '+5% conscience'
            },
            {
              title: 'Explorer le Réseau P2P',
              desc: 'Connectez-vous directement avec d\'autres organismes',
              reward: 'Découverte P2P'
            },
            {
              title: 'Participer aux Rituels',
              desc: 'Évoluez grâce aux expériences collectives',
              reward: '+1 mutation'
            },
            {
              title: 'Inviter des Amis',
              desc: 'Partagez vos traits génétiques',
              reward: 'Lignée créée'
            }
          ].map((step, index) => (
            <div
              key={index}
              className={`onboard-step ${index <= onboardingStep ? 'completed' : ''}`}
              onClick={() => updateOnboardingStep(index)}
            >
              <div className="step-indicator">
                {index <= onboardingStep ? '✓' : index + 1}
              </div>
              <div className="step-content">
                <h4>{step.title}</h4>
                <p>{step.desc}</p>
                {index <= onboardingStep && (
                  <small className="step-reward">🎁 {step.reward}</small>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="onboard-actions">
          <button
            className="btn-primary"
            onClick={() => updateOnboardingStep(Math.min(3, onboardingStep + 1))}
            disabled={onboardingStep >= 3}
          >
            {onboardingStep >= 3 ? 'Terminé ! 🎉' : 'Étape Suivante'}
          </button>
        </div>

        {onboardingStep >= 3 && (
          <div className="onboard-complete">
            <p>🏆 Félicitations ! Vous maîtrisez SYMBIONT.</p>
            <p>Votre conscience a été augmentée de 5%.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderContactsTab = () => (
    <div className="social-tab-content">
      <div className="contacts-section">
        <h3>👥 Réseau Social P2P</h3>
        <div className="connection-status">
          {connectionStatus && <span>🌐 {connectionStatus}</span>}
        </div>

        <div className="contacts-list">
          {contacts.length === 0 ? (
            <div className="no-contacts">
              <p>Aucun contact pour le moment.</p>
              <p>Invitez des amis ou attendez la découverte P2P automatique.</p>
            </div>
          ) : (
            contacts.map(contact => (
              <div
                key={contact.id}
                className={`contact-card ${selectedContact === contact.id ? 'selected' : ''}`}
                onClick={() => setSelectedContact(contact.id)}
              >
                <div className="contact-avatar">
                  <div className={`status-indicator ${contact.status}`}></div>
                  {contact.isP2P ? '🌐' : '🧬'}
                </div>
                <div className="contact-info">
                  <h4>{contact.name}</h4>
                  <span className="contact-generation">Gén. {contact.generation}</span>
                  <span className="contact-stats">
                    🧠 {Math.round(contact.consciousness * 100)}% |
                    ⚡ {Math.round(contact.energy * 100)}%
                  </span>
                  <span className="contact-activity">
                    {contact.status === 'online' ? '🟢 En ligne' :
                     contact.status === 'away' ? '🟡 Absent' :
                     `⚫ Vu il y a ${Math.floor((Date.now() - contact.lastActive) / 60000)}min`}
                  </span>
                </div>
                <div className="contact-actions">
                  {contact.isP2P && contact.status === 'online' && (
                    <>
                      <button
                        className="btn-small"
                        onClick={(e) => {
                          e.stopPropagation();
                          sendMessageToContact(contact.id, 'Salut !');
                        }}
                        title="Envoyer message"
                      >
                        💬
                      </button>
                      <button
                        className="btn-small"
                        onClick={(e) => {
                          e.stopPropagation();
                          shareEnergyWithContact(contact.id);
                        }}
                        title="Partager énergie"
                      >
                        ⚡
                      </button>
                      <button
                        className="btn-small"
                        onClick={(e) => {
                          e.stopPropagation();
                          syncWithContact(contact.id);
                        }}
                        title="Synchroniser conscience"
                      >
                        🧠
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderShareTab = () => (
    <div className="social-tab-content">
      <div className="share-section">
        <h3>🚀 Partager SYMBIONT</h3>
        <p>Aidez le réseau à grandir en partageant votre expérience unique !</p>

        <div className="share-stats">
          <p>Votre organisme : Génération {p2pService.getMyOrganism().generation}</p>
          <p>Conscience : {Math.round(p2pService.getMyOrganism().consciousness * 100)}%</p>
        </div>

        <button
          className="btn-primary"
          onClick={generateShareLink}
        >
          Générer Lien Personnel
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
                onClick={() => copyToClipboard(shareLink)}
                title="Copier le lien"
              >
                📋
              </button>
            </div>
            <small>Ce lien contient votre signature génétique</small>
          </div>
        )}

        <div className="share-social">
          <h4>Partager sur:</h4>
          <div className="social-buttons">
            <button
              className="social-btn twitter"
              onClick={() => shareOnSocial('twitter')}
            >
              🐦 Twitter
            </button>
            <button
              className="social-btn discord"
              onClick={() => shareOnSocial('discord')}
            >
              💬 Discord
            </button>
            <button
              className="social-btn reddit"
              onClick={() => shareOnSocial('reddit')}
            >
              🤖 Reddit
            </button>
          </div>
        </div>

        <div className="share-achievements">
          <h4>🏆 Récompenses de Partage</h4>
          <ul>
            <li>1 partage = +2% conscience</li>
            <li>5 partages = Mutation rare</li>
            <li>10 partages = Titre "Ambassadeur"</li>
          </ul>
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
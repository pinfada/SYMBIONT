import React, { useState, useEffect } from 'react';
import { SecureRandom } from '@shared/utils/secureRandom';
import { logger } from '@shared/utils/secureLogger';
import { p2pService } from '../services/P2PService';
import { cryptoService } from '../services/CryptoService';
import { organismStateManager } from '@shared/services/OrganismStateManager';
import { encodeInvite, decodeInvite, isExpired, shortCode, InvitePayload } from '@shared/services/InviteCode';

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
  displayName?: string; // Nom anonyme généré
  status: 'online' | 'offline' | 'away';
  generation: number;
  lastActive: number;
  consciousness: number;
  energy: number;
  isP2P: boolean;
  hasEncryption?: boolean; // Indique si on a échangé les clés
}

const SocialPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'invite' | 'onboard' | 'contacts' | 'share'>('invite');
  const [inviteCode, setInviteCode] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<InviteData | null>(null);
  const [generatedToken, setGeneratedToken] = useState('');
  const [tokenCopied, setTokenCopied] = useState(false);
  const [acceptStatus, setAcceptStatus] = useState<{ type: 'idle' | 'success' | 'error'; msg: string }>({ type: 'idle', msg: '' });
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [shareLink, setShareLink] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [selectedContact, setSelectedContact] = useState<string | null>(null);

  // Charger les contacts réels depuis le réseau P2P
  useEffect(() => {
    const updateContacts = () => {
      const peers = p2pService.getPeers();
      const p2pContacts: ContactData[] = peers.map(peer => {
        // Utiliser les informations du pair incluant le nom anonyme et le statut de chiffrement
        const peerInfo = p2pService.getPeerInfo(peer.id);
        const displayName = peerInfo?.displayName || cryptoService.generateAnonymousName(peer.id);
        const hasEncryption = peerInfo?.hasEncryption === true;

        return {
          id: peer.id,
          name: peer.organism?.name || `Organisme ${peer.id.substring(0, 8)}`,
          displayName: displayName,
          status: peer.status === 'connected' ? 'online' : 'offline',
          generation: peer.organism?.generation || 1,
          lastActive: peer.lastSeen,
          consciousness: peer.organism?.consciousness || 0.5,
          energy: peer.organism?.energy || 0.8,
          isP2P: true,
          hasEncryption: hasEncryption
        };
      });

      // Charger aussi les contacts sauvegardés localement
      const savedContacts = JSON.parse(localStorage.getItem('symbiont_contacts') || '[]');
      const allContacts = [...p2pContacts, ...savedContacts.filter((sc: ContactData) =>
        !p2pContacts.find(pc => pc.id === sc.id)
      )];

      setContacts(allContacts);
      const onlinePeers = p2pContacts.filter(c => c.status === 'online');
      const encryptedPeers = onlinePeers.filter(c => c.hasEncryption);
      const statusText = `${onlinePeers.length} pairs connectés`;
      const encryptedText = encryptedPeers.length > 0 ? ` (${encryptedPeers.length} 🔐)` : '';
      setConnectionStatus(statusText + encryptedText);
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

  // Génération d'un code d'invitation AUTO-PORTEUR : la charge génétique est
  // encodée dans le token lui-même, donc utilisable sur une autre installation
  // par simple copier-coller (aucun serveur, aucun pair connecté requis).
  const generateInvite = () => {
    const myOrganism = p2pService.getMyOrganism();
    const code = shortCode(SecureRandom.random());
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 jours

    const payload: InvitePayload = {
      v: 1,
      code,
      creatorId: myOrganism.id,
      creatorName: myOrganism.name || 'Organisme Anonyme',
      generation: myOrganism.generation,
      consciousness: myOrganism.consciousness,
      traits: myOrganism.traits,
      expiresAt,
    };

    const token = encodeInvite(payload);
    setGeneratedToken(token);
    setTokenCopied(false);

    const invite: InviteData = {
      code,
      expiresAt,
      maxUses: 5,
      used: 0,
      creatorId: payload.creatorId,
      creatorName: payload.creatorName,
      sharedData: {
        generation: payload.generation,
        consciousness: payload.consciousness,
        traits: payload.traits,
      },
    };
    setGeneratedInvite(invite);

    // Trace locale (repli même-navigateur) + diffusion P2P best-effort
    try {
      localStorage.setItem('symbiont_invite_' + code, JSON.stringify(invite));
      p2pService.broadcast('discovery', { type: 'invite_created', code, creator: payload.creatorName });
      logger.info('Invitation créée:', code);
    } catch (e) {
      logger.warn('Erreur lors de la création de l\'invitation:', e);
    }
  };

  // Acceptation d'une invitation : décode le token auto-porteur (cross-install)
  // ou, à défaut, retrouve un code court connu de ce navigateur.
  const acceptInvite = () => {
    const raw = inviteCode.trim();
    if (!raw) return;
    setAcceptStatus({ type: 'idle', msg: '' });

    let shared: { generation: number; consciousness: number; traits: Record<string, number> } | null = null;
    let creatorId = '';
    let creatorName = '';
    let refCode = raw;

    // 1) Token auto-porteur — fonctionne même sur une installation vierge
    const payload = decodeInvite(raw);
    if (payload) {
      if (isExpired(payload, Date.now())) {
        setAcceptStatus({ type: 'error', msg: '⏳ Ce code d\'invitation a expiré.' });
        return;
      }
      shared = { generation: payload.generation, consciousness: payload.consciousness, traits: payload.traits };
      creatorId = payload.creatorId;
      creatorName = payload.creatorName;
      refCode = payload.code;
    } else {
      // 2) Repli : code court présent dans CE navigateur (ou reçu en P2P)
      try {
        const key = raw.toUpperCase();
        let invite: InviteData | undefined;
        const stored = localStorage.getItem('symbiont_invite_' + key);
        if (stored) invite = JSON.parse(stored) as InviteData;
        else {
          const p2p: InviteData[] = JSON.parse(localStorage.getItem('symbiont_p2p_invites') || '[]');
          invite = p2p.find((i) => i.code === key);
        }
        if (invite && invite.expiresAt > Date.now() && invite.sharedData) {
          shared = invite.sharedData;
          creatorId = invite.creatorId;
          creatorName = invite.creatorName;
          refCode = invite.code;
        }
      } catch (e) {
        logger.warn('Repli code court échoué', e);
      }
    }

    if (!shared) {
      setAcceptStatus({ type: 'error', msg: '❌ Code invalide, expiré ou incomplet.' });
      return;
    }

    // Appliquer l'héritage génétique à l'organisme persistant
    try {
      const myOrganism = p2pService.getMyOrganism();
      Object.keys(shared.traits).forEach((trait) => {
        if (myOrganism.traits[trait] !== undefined) {
          myOrganism.traits[trait] = (myOrganism.traits[trait] + shared!.traits[trait]) / 2;
        }
      });
      myOrganism.consciousness = Math.min(1, myOrganism.consciousness + 0.1);
      localStorage.setItem('symbiont_organism', JSON.stringify(myOrganism));
    } catch (e) {
      logger.warn('Application des traits échouée', e);
    }

    // Retour visuel immédiat sur la créature affichée (+10% conscience, humeur heureuse)
    try {
      const s = organismStateManager.getState();
      void organismStateManager.updateState({
        consciousness: Math.min(100, s.consciousness + 10),
        mood: 'happy',
      });
    } catch { /* état visible indisponible : héritage appliqué quand même */ }

    // Ajouter le créateur aux contacts
    const newContact: ContactData = {
      id: creatorId || 'unknown',
      name: creatorName || 'Lignée inconnue',
      status: 'offline',
      generation: shared.generation || 1,
      lastActive: Date.now(),
      consciousness: shared.consciousness || 0.5,
      energy: 0.8,
      isP2P: false,
    };
    try {
      const savedContacts = JSON.parse(localStorage.getItem('symbiont_contacts') || '[]');
      savedContacts.push(newContact);
      localStorage.setItem('symbiont_contacts', JSON.stringify(savedContacts));
    } catch { /* stockage plein : contact non persisté */ }
    setContacts((prev) => [...prev, newContact]);

    setAccepted(true);
    setAcceptStatus({
      type: 'success',
      msg: `✅ Héritage de « ${creatorName || 'une lignée'} » accepté ! Conscience +10 %.`,
    });
    p2pService.broadcast('discovery', { type: 'invite_accepted', code: refCode, acceptor: p2pService.getMyOrganism().name });
    logger.info('Invitation acceptée', { refCode });
  };

  // Communication P2P avec un contact
  const sendMessageToContact = async (contactId: string, message: string) => {
    await p2pService.sendMessage(contactId, 'chat', { text: message });
    logger.info(`Message envoyé à ${contactId}: ${message}`);

    // Afficher une notification
    const contact = contacts.find(c => c.id === contactId);
    const isEncrypted = p2pService.isPeerEncrypted(contactId);
    const encryptedIcon = isEncrypted ? ' 🔐' : '';
    alert(`💬${encryptedIcon} Message envoyé à ${contact?.displayName || contact?.name || 'l\'organisme'}: "${message}"`);
  };

  // Partage d'énergie P2P
  const shareEnergyWithContact = async (contactId: string) => {
    const myOrganism = p2pService.getMyOrganism();
    if (myOrganism.energy < 0.1) {
      alert('⚠️ Énergie insuffisante pour partager (minimum 10% requis)');
      return;
    }

    await p2pService.shareEnergy(contactId, 0.1);
    logger.info(`Énergie partagée avec ${contactId}`);

    // Afficher une notification et mettre à jour l'affichage
    const contact = contacts.find(c => c.id === contactId);
    const isEncrypted = p2pService.isPeerEncrypted(contactId);
    const encryptedIcon = isEncrypted ? ' 🔐' : '';
    alert(`⚡${encryptedIcon} Vous avez partagé 10% d'énergie avec ${contact?.displayName || contact?.name || 'l\'organisme'}!\nVotre énergie: ${Math.round((myOrganism.energy - 0.1) * 100)}%`);

    // Forcer le refresh des données
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  // Synchronisation de conscience P2P
  const syncWithContact = async (contactId: string) => {
    const myOrganism = p2pService.getMyOrganism();
    const contact = contacts.find(c => c.id === contactId);

    await p2pService.syncConsciousness(contactId);
    logger.info(`Synchronisation avec ${contactId}`);

    // Calculer la nouvelle conscience moyenne
    const avgConsciousness = contact ? (myOrganism.consciousness + contact.consciousness) / 2 : myOrganism.consciousness;

    // Afficher une notification
    const isEncrypted = p2pService.isPeerEncrypted(contactId);
    const encryptedIcon = isEncrypted ? ' 🔐' : '';
    alert(`🧠${encryptedIcon} Conscience synchronisée avec ${contact?.displayName || contact?.name || 'l\'organisme'}!\nNouvelle conscience: ${Math.round(avgConsciousness * 100)}%`);

    // Forcer le refresh des données
    setTimeout(() => {
      window.location.reload();
    }, 1500);
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
        >
          {generatedInvite ? 'Régénérer un Code' : 'Générer Code Génétique'}
        </button>

        {generatedInvite && (
          <div className="invite-card">
            <div style={{ fontSize: 12, color: '#8899a6', marginBottom: 6 }}>
              Référence <strong style={{ color: '#00e0ff' }}>{generatedInvite.code}</strong> — partagez le code complet ci-dessous :
            </div>
            <div style={{
              display: 'flex', gap: 8, alignItems: 'stretch',
            }}>
              <code style={{
                flex: 1, minWidth: 0, background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(0,224,255,0.25)',
                borderRadius: 8, padding: '8px 10px', fontSize: 11, color: '#cfe9f2',
                wordBreak: 'break-all', maxHeight: 76, overflow: 'auto', lineHeight: 1.4,
              }}>{generatedToken}</code>
              <button
                className="btn-copy"
                onClick={() => {
                  copyToClipboard(generatedToken);
                  setTokenCopied(true);
                  setTimeout(() => setTokenCopied(false), 1800);
                }}
                title="Copier le code complet"
                style={{ whiteSpace: 'nowrap' }}
              >
                {tokenCopied ? '✅ Copié' : '📋 Copier'}
              </button>
            </div>
            <div className="invite-details" style={{ marginTop: 8 }}>
              <span>Expire: {new Date(generatedInvite.expiresAt).toLocaleDateString()}</span>
              <span>Gén. {generatedInvite.sharedData?.generation}</span>
            </div>
            <div className="invite-traits">
              <small>Traits transmis : {Object.keys(generatedInvite.sharedData?.traits || {}).join(', ')}</small>
            </div>
          </div>
        )}
      </div>

      <div className="accept-section">
        <h3>🔗 Accepter une Invitation</h3>
        <p>Entrez un code pour hériter des traits génétiques d'une lignée existante.</p>

        <div className="input-group">
          <textarea
            value={inviteCode}
            onChange={(e) => { setInviteCode(e.target.value); setAcceptStatus({ type: 'idle', msg: '' }); setAccepted(false); }}
            placeholder="Collez ici le code reçu (SYMB1-…)"
            className="invite-input"
            rows={2}
            style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 12, width: '100%' }}
          />
          <button
            className="btn-secondary"
            onClick={acceptInvite}
            disabled={!inviteCode.trim()}
          >
            Accepter Héritage
          </button>
        </div>

        {acceptStatus.type !== 'idle' && (
          <div
            className={acceptStatus.type === 'success' ? 'success-message' : 'error-message'}
            style={{
              marginTop: 10, padding: '10px 12px', borderRadius: 8, fontSize: 13,
              background: acceptStatus.type === 'success' ? 'rgba(46,230,166,0.12)' : 'rgba(239,68,68,0.12)',
              border: `1px solid ${acceptStatus.type === 'success' ? '#2ee6a6' : '#ef4444'}`,
              color: acceptStatus.type === 'success' ? '#2ee6a6' : '#ef4444',
            }}
          >
            {acceptStatus.msg}
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
                  <h4>
                    {contact.displayName || contact.name}
                    {contact.hasEncryption && <span title="Messages chiffrés de bout en bout"> 🔐</span>}
                  </h4>
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
                          const message = prompt(`Message pour ${contact.name}:`, 'Salut ! Comment vas-tu ?');
                          if (message) {
                            sendMessageToContact(contact.id, message);
                          }
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
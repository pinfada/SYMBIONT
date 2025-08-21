import React, { useState, useEffect } from 'react';
import { useOrganism } from '../hooks/useOrganism';
import { logger } from '@shared/utils/secureLogger';

interface Ritual {
  id: string;
  name: string;
  description: string;
  type: 'individual' | 'collective' | 'secret';
  icon: string;
  cost: number;
  cooldown: number; // en millisecondes
  effects: {
    consciousness?: number;
    energy?: number;
    mutations?: number;
    traits?: Partial<Record<string, number>>;
  };
  requirements?: {
    minConsciousness?: number;
    minGeneration?: number;
    secretCode?: string;
  };
}

interface RitualSession {
  ritualId: string;
  startTime: number;
  duration: number;
  progress: number;
  completed: boolean;
}

interface RitualHistory {
  ritualId: string;
  completedAt: number;
  effects: unknown;
}

const AVAILABLE_RITUALS: Ritual[] = [
  {
    id: 'meditation',
    name: 'Méditation Quantique',
    description: 'Augmente la conscience par la contemplation des motifs fractals',
    type: 'individual',
    icon: '🧘‍♀️',
    cost: 10,
    cooldown: 5 * 60 * 1000, // 5 minutes
    effects: { consciousness: 0.1, energy: -0.05 },
    requirements: { minConsciousness: 0.2 }
  },
  {
    id: 'mutation_ritual',
    name: 'Rituel de Mutation',
    description: 'Force une mutation contrôlée de votre organisme',
    type: 'individual',
    icon: '🧬',
    cost: 25,
    cooldown: 30 * 60 * 1000, // 30 minutes
    effects: { mutations: 1, energy: -0.2 },
    requirements: { minGeneration: 2 }
  },
  {
    id: 'energy_harvest',
    name: 'Collecte d\'Énergie',
    description: 'Puise dans les flux cosmiques pour restaurer votre énergie',
    type: 'individual',
    icon: '⚡',
    cost: 5,
    cooldown: 2 * 60 * 1000, // 2 minutes
    effects: { energy: 0.3 },
    requirements: {}
  },
  {
    id: 'collective_awakening',
    name: 'Éveil Collectif',
    description: 'Synchronise avec d\'autres organismes pour un éveil de conscience',
    type: 'collective',
    icon: '🌟',
    cost: 50,
    cooldown: 2 * 60 * 60 * 1000, // 2 heures
    effects: { consciousness: 0.25, traits: { empathy: 0.1, creativity: 0.1 } },
    requirements: { minConsciousness: 0.5 }
  },
  {
    id: 'symbiosis_secret',
    name: 'Pacte de Symbiose',
    description: 'Rituel secret qui lie deux organismes dans une évolution partagée',
    type: 'secret',
    icon: '🔮',
    cost: 100,
    cooldown: 24 * 60 * 60 * 1000, // 24 heures
    effects: { consciousness: 0.5, traits: { empathy: 0.3, creativity: 0.2 } },
    requirements: { minGeneration: 3, secretCode: 'SYMBIOSIS' }
  },
  {
    id: 'neural_sync',
    name: 'Synchronisation Neurale',
    description: 'Aligne vos patterns neuronaux avec la fréquence universelle',
    type: 'individual',
    icon: '🧠',
    cost: 30,
    cooldown: 45 * 60 * 1000, // 45 minutes
    effects: { consciousness: 0.15, traits: { focus: 0.15, curiosity: 0.1 } },
    requirements: { minConsciousness: 0.4 }
  }
];

const MysticalPanel: React.FC = () => {
  const { organism } = useOrganism();
  const [activeTab, setActiveTab] = useState<'rituals' | 'active' | 'history' | 'secrets'>('rituals');
  const [secretCode, setSecretCode] = useState('');
  const [showSecretInput, setShowSecretInput] = useState(false);
  const [currentSession, setCurrentSession] = useState<RitualSession | null>(null);
  const [ritualHistory, setRitualHistory] = useState<RitualHistory[]>([]);
  const [ritualCooldowns, setRitualCooldowns] = useState<Record<string, number>>({});
  const [notifications, setNotifications] = useState<string[]>([]);

  // Charger l'historique et les cooldowns depuis le localStorage
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('symbiont_ritual_history');
      if (savedHistory) {
        setRitualHistory(JSON.parse(savedHistory));
      }
      
      const savedCooldowns = localStorage.getItem('symbiont_ritual_cooldowns');
      if (savedCooldowns) {
        setRitualCooldowns(JSON.parse(savedCooldowns));
      }
    } catch (_e) {
      logger.warn('Erreur lors du chargement de l\'historique des rituels');
    }
  }, []);

  // Mettre à jour les cooldowns en temps réel
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRitualCooldowns(prev => {
        const updated = { ...prev };
        let hasChanges = false;
        
        Object.keys(updated).forEach(ritualId => {
          if (updated[ritualId] <= now) {
            delete updated[ritualId];
            hasChanges = true;
            addNotification(`Le rituel ${AVAILABLE_RITUALS.find(r => r.id === ritualId)?.name} est à nouveau disponible !`);
          }
        });
        
        if (hasChanges) {
          localStorage.setItem('symbiont_ritual_cooldowns', JSON.stringify(updated));
        }
        
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Progression de la session active
  useEffect(() => {
    if (!currentSession || currentSession.completed) return;

    const interval = setInterval(() => {
      setCurrentSession(prev => {
        if (!prev) return null;
        
        const elapsed = Date.now() - prev.startTime;
        const progress = Math.min(1, elapsed / prev.duration);
        
        if (progress >= 1) {
          completeRitual(prev.ritualId);
          return { ...prev, progress: 1, completed: true };
        }
        
        return { ...prev, progress };
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentSession]);

  const addNotification = (message: string) => {
    setNotifications(prev => [...prev, message]);
    setTimeout(() => {
      setNotifications(prev => prev.slice(1));
    }, 4000);
  };

  const canPerformRitual = (ritual: Ritual): { canPerform: boolean; reason?: string } => {
    if (!organism) return { canPerform: false, reason: 'Organisme non trouvé' };
    
    // Vérifier le cooldown
    if (ritualCooldowns[ritual.id] && ritualCooldowns[ritual.id] > Date.now()) {
      const remainingMs = ritualCooldowns[ritual.id] - Date.now();
      const remainingMin = Math.ceil(remainingMs / (60 * 1000));
      return { canPerform: false, reason: `Cooldown: ${remainingMin}min restantes` };
    }
    
    // Vérifier l'énergie
    if ((organism.energy || 0) * 100 < ritual.cost) {
      return { canPerform: false, reason: 'Énergie insuffisante' };
    }
    
    // Vérifier les prérequis
    if (ritual.requirements) {
      if (ritual.requirements.minConsciousness && (organism.consciousness || 0) < ritual.requirements.minConsciousness) {
        return { canPerform: false, reason: `Conscience minimum: ${(ritual.requirements.minConsciousness * 100).toFixed(0)}%` };
      }
      
      if (ritual.requirements.minGeneration && (organism.generation || 1) < ritual.requirements.minGeneration) {
        return { canPerform: false, reason: `Génération minimum: ${ritual.requirements.minGeneration}` };
      }
      
      if (ritual.requirements.secretCode) {
        return { canPerform: false, reason: 'Code secret requis' };
      }
    }
    
    return { canPerform: true };
  };

  const startRitual = (ritual: Ritual, providedSecretCode?: string) => {
    const check = canPerformRitual(ritual);
    if (!check.canPerform) {
      addNotification(`Impossible: ${check.reason}`);
      return;
    }
    
    // Vérifier le code secret si nécessaire
    if (ritual.requirements?.secretCode) {
      if (providedSecretCode !== ritual.requirements.secretCode) {
        addNotification('Code secret incorrect !');
        return;
      }
    }
    
    // Démarrer la session
    const duration = ritual.type === 'collective' ? 60000 : 30000; // 1min ou 30s
    const session: RitualSession = {
      ritualId: ritual.id,
      startTime: Date.now(),
      duration,
      progress: 0,
      completed: false
    };
    
    setCurrentSession(session);
    addNotification(`Rituel "${ritual.name}" commencé !`);
    
    // Consommer l'énergie immédiatement
    if (organism) {
      const updatedOrganism = {
        ...organism,
        energy: Math.max(0, (organism.energy || 0) - ritual.cost / 100)
      };
      localStorage.setItem('symbiont_organism', JSON.stringify(updatedOrganism));
    }
  };

  const completeRitual = (ritualId: string) => {
    const ritual = AVAILABLE_RITUALS.find(r => r.id === ritualId);
    if (!ritual || !organism) return;
    
    // Appliquer les effets
    const updatedOrganism = { ...organism };
    
    if (ritual.effects.consciousness) {
      updatedOrganism.consciousness = Math.min(1, (organism.consciousness || 0) + ritual.effects.consciousness);
    }
    
    if (ritual.effects.energy) {
      updatedOrganism.energy = Math.max(0, Math.min(1, (organism.energy || 0) + ritual.effects.energy));
    }
    
    if (ritual.effects.mutations) {
      // Ajouter des mutations (simulé)
      const newMutation = {
        id: `ritual_${Date.now()}`,
        type: 'ritual' as const,
        timestamp: Date.now(),
        effect: `Mutation induite par ${ritual.name}`,
        magnitude: 0.1
      };
      updatedOrganism.mutations = [...(organism.mutations || []), newMutation];
    }
    
    if (ritual.effects.traits) {
      Object.entries(ritual.effects.traits).forEach(([trait, bonus]) => {
        if (updatedOrganism.traits[trait] !== undefined && bonus !== undefined) {
          updatedOrganism.traits[trait] = Math.min(1, updatedOrganism.traits[trait] + bonus);
        }
      });
    }
    
    // Sauvegarder l'organisme modifié
    localStorage.setItem('symbiont_organism', JSON.stringify(updatedOrganism));
    
    // Ajouter au cooldown
    const newCooldowns = {
      ...ritualCooldowns,
      [ritualId]: Date.now() + ritual.cooldown
    };
    setRitualCooldowns(newCooldowns);
    localStorage.setItem('symbiont_ritual_cooldowns', JSON.stringify(newCooldowns));
    
    // Ajouter à l'historique
    const historyEntry: RitualHistory = {
      ritualId,
      completedAt: Date.now(),
      effects: ritual.effects
    };
    const newHistory = [historyEntry, ...ritualHistory].slice(0, 50); // Garder les 50 derniers
    setRitualHistory(newHistory);
    localStorage.setItem('symbiont_ritual_history', JSON.stringify(newHistory));
    
    addNotification(`Rituel "${ritual.name}" terminé ! Effets appliqués.`);
    setCurrentSession(null);
  };

  const handleSecretRitual = (ritual: Ritual) => {
    if (ritual.requirements?.secretCode) {
      setShowSecretInput(true);
    } else {
      startRitual(ritual);
    }
  };

  const submitSecretCode = () => {
    const secretRituals = AVAILABLE_RITUALS.filter(r => r.requirements?.secretCode);
    const matchingRitual = secretRituals.find(r => r.requirements?.secretCode === secretCode.toUpperCase());
    
    if (matchingRitual) {
      startRitual(matchingRitual, secretCode.toUpperCase());
      setSecretCode('');
      setShowSecretInput(false);
    } else {
      addNotification('Code secret inconnu...');
    }
  };

  const renderRitualsTab = () => (
    <div className="rituals-grid">
      {AVAILABLE_RITUALS.map(ritual => {
        const check = canPerformRitual(ritual);
        const isOnCooldown = ritualCooldowns[ritual.id] && ritualCooldowns[ritual.id] > Date.now();
        const cooldownMs = isOnCooldown ? ritualCooldowns[ritual.id] - Date.now() : 0;
        
        return (
          <div 
            key={ritual.id} 
            className={`ritual-card ${!check.canPerform ? 'disabled' : ''} ${ritual.type}`}
          >
            <div className="ritual-header">
              <span className="ritual-icon">{ritual.icon}</span>
              <h4 className="ritual-name">{ritual.name}</h4>
              <span className="ritual-type">{ritual.type}</span>
            </div>
            
            <p className="ritual-description">{ritual.description}</p>
            
            <div className="ritual-stats">
              <div className="stat">
                <span className="label">Coût:</span>
                <span className="value">{ritual.cost} énergie</span>
              </div>
              <div className="stat">
                <span className="label">Cooldown:</span>
                <span className="value">{Math.round(ritual.cooldown / 60000)}min</span>
              </div>
            </div>
            
            {ritual.effects && (
              <div className="ritual-effects">
                <h5>Effets:</h5>
                <ul>
                  {ritual.effects.consciousness && <li>+{(ritual.effects.consciousness * 100).toFixed(0)}% conscience</li>}
                  {ritual.effects.energy && <li>{ritual.effects.energy > 0 ? '+' : ''}{(ritual.effects.energy * 100).toFixed(0)}% énergie</li>}
                  {ritual.effects.mutations && <li>+{ritual.effects.mutations} mutation(s)</li>}
                                     {ritual.effects.traits && Object.entries(ritual.effects.traits).map(([trait, value]) => (
                     <li key={trait}>+{((value || 0) * 100).toFixed(0)}% {trait}</li>
                   ))}
                </ul>
              </div>
            )}
            
            {isOnCooldown && (
              <div className="cooldown-display">
                <span>⏳ {Math.ceil(cooldownMs / 60000)}min restantes</span>
              </div>
            )}
            
            {!check.canPerform && !isOnCooldown && (
              <div className="requirement-warning">
                ⚠️ {check.reason}
              </div>
            )}
            
            <button 
              className="ritual-button"
              onClick={() => ritual.type === 'secret' ? handleSecretRitual(ritual) : startRitual(ritual)}
              disabled={!check.canPerform}
            >
              {ritual.type === 'secret' ? 'Entrer Code' : 'Commencer'}
            </button>
          </div>
        );
      })}
    </div>
  );

  const renderActiveTab = () => (
    <div className="active-session">
      {currentSession ? (
        <div className="session-display">
          <h3>🔮 Rituel en cours</h3>
          <div className="ritual-info">
            <span className="ritual-icon">
              {AVAILABLE_RITUALS.find(r => r.id === currentSession.ritualId)?.icon}
            </span>
            <h4>{AVAILABLE_RITUALS.find(r => r.id === currentSession.ritualId)?.name}</h4>
          </div>
          
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${currentSession.progress * 100}%` }}
              ></div>
            </div>
            <span className="progress-text">
              {(currentSession.progress * 100).toFixed(0)}%
            </span>
          </div>
          
          <div className="session-effects">
            <p>✨ Concentrez-vous sur les flux énergétiques...</p>
            <div className="energy-waves">
              <div className="wave"></div>
              <div className="wave"></div>
              <div className="wave"></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="no-session">
          <h3>Aucun rituel actif</h3>
          <p>Commencez un rituel pour voir la progression ici.</p>
          <button onClick={() => setActiveTab('rituals')} className="btn-primary">
            Voir les rituels
          </button>
        </div>
      )}
    </div>
  );

  const renderHistoryTab = () => (
    <div className="ritual-history">
      <h3>📜 Historique des Rituels</h3>
      {ritualHistory.length === 0 ? (
        <p>Aucun rituel accompli pour le moment.</p>
      ) : (
        <div className="history-list">
          {ritualHistory.map((entry, index) => {
            const ritual = AVAILABLE_RITUALS.find(r => r.id === entry.ritualId);
            return (
              <div key={index} className="history-entry">
                <div className="entry-header">
                  <span className="ritual-icon">{ritual?.icon}</span>
                  <h4>{ritual?.name}</h4>
                  <span className="completion-date">
                    {new Date(entry.completedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="entry-effects">
                                     {Object.entries(entry.effects as Record<string, unknown>).map(([key, value]) => (
                     <span key={key} className="effect-tag">
                       {key}: {typeof value === 'number' ? (value > 0 ? '+' : '') + (value * 100).toFixed(0) + '%' : String(value)}
                     </span>
                   ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderSecretsTab = () => (
    <div className="secrets-section">
      <h3>🔮 Rituels Secrets</h3>
      <p>Certains rituels ne peuvent être activés qu'avec des codes secrets spéciaux...</p>
      
      <div className="secret-input-section">
        <input
          type="text"
          value={secretCode}
          onChange={(e) => setSecretCode(e.target.value.toUpperCase())}
          placeholder="ENTREZ LE CODE SECRET"
          className="secret-input"
          maxLength={20}
        />
        <button 
          onClick={submitSecretCode}
          className="btn-secret"
          disabled={!secretCode.trim()}
        >
          Révéler
        </button>
      </div>
      
      <div className="hints-section">
        <h4>💡 Indices</h4>
        <ul className="hint-list">
          <li>🤝 L'union fait la force...</li>
          <li>🧬 La vie s'épanouit par la coopération</li>
          <li>🌱 Deux organismes peuvent ne faire qu'un</li>
        </ul>
      </div>
      
      <div className="discovered-secrets">
        <h4>🏆 Secrets Découverts</h4>
        {AVAILABLE_RITUALS.filter(r => r.type === 'secret').map(ritual => {
          const discovered = ritualHistory.some(h => h.ritualId === ritual.id);
          return (
            <div key={ritual.id} className={`secret-ritual ${discovered ? 'discovered' : 'hidden'}`}>
              <span>{discovered ? ritual.icon : '❓'}</span>
              <span>{discovered ? ritual.name : '???'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (!organism) {
    return (
      <div className="mystical-panel loading">
        <h3>🔮 Initialisation des flux mystiques...</h3>
      </div>
    );
  }

  return (
    <div className="mystical-panel">
      {/* Notifications */}
      <div className="notifications">
        {notifications.map((notification, index) => (
          <div key={index} className="notification">
            {notification}
          </div>
        ))}
      </div>

      {/* Modal pour code secret */}
      {showSecretInput && (
        <div className="secret-modal">
          <div className="modal-content">
            <h3>🔮 Code Secret Requis</h3>
            <input
              type="text"
              value={secretCode}
              onChange={(e) => setSecretCode(e.target.value.toUpperCase())}
              placeholder="ENTREZ LE CODE"
              className="secret-input"
              autoFocus
            />
            <div className="modal-buttons">
              <button onClick={submitSecretCode} className="btn-primary">
                Confirmer
              </button>
              <button 
                onClick={() => { setShowSecretInput(false); setSecretCode(''); }}
                className="btn-secondary"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="mystical-nav">
        {[
          { key: 'rituals', label: 'Rituels', icon: '🔮' },
          { key: 'active', label: 'Actif', icon: '⚡' },
          { key: 'history', label: 'Historique', icon: '📜' },
          { key: 'secrets', label: 'Secrets', icon: '🗝️' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`mystical-nav-btn ${activeTab === tab.key ? 'active' : ''}`}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span className="nav-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div className="mystical-content">
        {activeTab === 'rituals' && renderRitualsTab()}
        {activeTab === 'active' && renderActiveTab()}
        {activeTab === 'history' && renderHistoryTab()}
        {activeTab === 'secrets' && renderSecretsTab()}
      </div>
    </div>
  );
};

export default MysticalPanel; 
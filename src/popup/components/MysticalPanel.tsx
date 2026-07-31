import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useOrganism } from '../hooks/useOrganism';
import { logger } from '@shared/utils/secureLogger';
import { useMurmurDeduplication, type MurmurAction } from '../hooks/useMurmurDeduplication';
import { SecureRandom } from '@/shared/utils/secureRandom';
import { organismStateManager } from '@shared/services/OrganismStateManager';
import type {
  HiddenElementData,
  HiddenElementsResponse,
  CategorizedElements
} from '@/types/hiddenElements';

// Fait réagir l'organisme VISIBLE (organismStateManager, échelle 0-100) à un
// rituel, pour un retour visuel immédiat sur la créature. Les effets des
// rituels sont en échelle 0-1 → conversion ×100.
function reactVisibleOrganism(patch: {
  energyDelta?: number;          // en points 0-100
  consciousnessDelta?: number;   // en points 0-100
  mood?: 'happy' | 'curious' | 'excited' | 'meditating' | 'hungry' | 'tired';
}): void {
  try {
    const s = organismStateManager.getState();
    const next: Partial<Pick<typeof s, 'energy' | 'consciousness' | 'mood'>> = {};
    if (patch.energyDelta !== undefined) {
      next.energy = Math.max(0, Math.min(100, s.energy + patch.energyDelta));
    }
    if (patch.consciousnessDelta !== undefined) {
      next.consciousness = Math.max(0, Math.min(100, s.consciousness + patch.consciousnessDelta));
    }
    if (patch.mood) next.mood = patch.mood;
    void organismStateManager.updateState(next);
  } catch {
    /* organismStateManager indisponible : le rituel fonctionne quand même */
  }
}

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
    id: 'vision-spectrale',
    name: 'Vision Spectrale',
    description: 'Révèle les éléments cachés et les flux invisibles du DOM',
    type: 'individual',
    icon: '👁️',
    cost: 10,
    cooldown: 3 * 60 * 1000, // 3 minutes
    effects: {
      consciousness: 0.05,
      traits: { intuition: 0.1, awareness: 0.05 }
    },
    requirements: { minConsciousness: 0.1 }
  },
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
  const [murmurs, setMurmurs] = useState<Array<{
    message: string;
    type: 'info' | 'warning' | 'critical';
    timestamp: number;
    suggestedAction?: MurmurAction;  // Type strict, no 'any'
  }>>([]);

  // Ref pour éviter les race conditions sur Vision Spectrale
  const visionSpectraleInProgress = useRef<boolean>(false);
  const componentMounted = useRef<boolean>(true);

  // Hook de déduplication des murmures
  const { processMurmur, cleanupCache, getDeduplicationStats } = useMurmurDeduplication();

  /**
   * Ajoute un murmure mystique avec déduplication intelligente
   * @param message - Message à afficher
   * @param type - Type de murmure selon l'intensité
   */
  const addMurmur = useCallback((message: string, type: 'info' | 'warning' | 'critical' = 'info') => {
    // Traiter le murmure avec déduplication
    const dedupedMurmur = processMurmur(message, type);

    // Si le murmure est supprimé par déduplication, ne pas l'afficher
    if (!dedupedMurmur) {
      return;
    }

    // Si une action est suggérée, l'ajouter au murmure
    const murmur: {
      message: string;
      type: 'info' | 'warning' | 'critical';
      timestamp: number;
      suggestedAction?: MurmurAction;
    } = {
      message: dedupedMurmur.message,
      type: dedupedMurmur.type,
      timestamp: dedupedMurmur.timestamp
    };

    // Ajouter suggestedAction seulement si défini
    if (dedupedMurmur.suggestedAction) {
      murmur.suggestedAction = dedupedMurmur.suggestedAction;
    }

    setMurmurs(prev => {
      const updated = [...prev, murmur];
      // Garder seulement les 5 derniers murmures
      return updated.slice(-5);
    });

    // Auto-suppression après un délai variable selon l'importance
    const displayDuration = type === 'critical' ? 10000 : type === 'warning' ? 8000 : 6000;

    setTimeout(() => {
      setMurmurs(prev => prev.filter(m => m.timestamp !== murmur.timestamp));
    }, displayDuration);

    // Log les statistiques de déduplication de temps en temps (SecureRandom)
    if (SecureRandom.random() < 0.1) { // 10% de chance
      const stats = getDeduplicationStats();
      logger.debug('Murmur deduplication stats', stats);
    }
  }, [processMurmur, getDeduplicationStats]);

  // Nettoyer le cache de déduplication périodiquement
  useEffect(() => {
    const intervalId = setInterval(() => {
      cleanupCache();
    }, 60000); // Toutes les minutes

    return () => {
      clearInterval(intervalId);
    };
  }, [cleanupCache]);

  // Cleanup on unmount pour éviter les memory leaks
  useEffect(() => {
    componentMounted.current = true;

    return () => {
      componentMounted.current = false;
      visionSpectraleInProgress.current = false;
    };
  }, []);

  // Écouter les messages de résonance DOM (Phase 1.1)
  useEffect(() => {
    const handleResonanceMessage = (message: any) => {
      if (message.type === 'DOM_RESONANCE_DETECTED') {
        const { resonance, state } = message.payload;

        // Convertir l'état de résonance en type de murmure
        let murmurType: 'info' | 'warning' | 'critical' = 'info';
        let murmurMessage = '';

        switch (state.level) {
          case 'quiet':
            // Ne pas afficher de murmure pour un état calme
            return;
          case 'normal':
            murmurType = 'info';
            murmurMessage = `🌊 Légère friction détectée (${(resonance * 100).toFixed(0)}%)`;
            break;
          case 'active':
            murmurType = 'warning';
            murmurMessage = `⚡ Friction significative: ${state.description}`;
            break;
          case 'critical':
            murmurType = 'critical';
            murmurMessage = `🔥 Friction critique! ${state.description}`;
            break;
        }

        if (murmurMessage) {
          addMurmur(murmurMessage, murmurType);

          // Log pour monitoring
          logger.debug('DOM Resonance murmur', {
            resonance,
            level: state.level,
            message: murmurMessage
          });
        }
      }
    };

    // Écouter les messages du content script
    chrome.runtime.onMessage.addListener(handleResonanceMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleResonanceMessage);
    };
  }, [addMurmur]);

  // Validation sécurisée des données localStorage
  const validateRitualHistory = (data: unknown): RitualHistory[] => {
    if (!Array.isArray(data)) return [];

    return data.filter(item => {
      return item &&
        typeof item === 'object' &&
        typeof item.ritualId === 'string' &&
        typeof item.completedAt === 'number' &&
        item.completedAt > 0 &&
        item.completedAt < Date.now() + 86400000; // Max 1 jour dans le futur
    }).slice(0, 100); // Limite à 100 entrées max
  };

  const validateRitualCooldowns = (data: unknown): Record<string, number> => {
    if (!data || typeof data !== 'object') return {};

    const result: Record<string, number> = {};
    const now = Date.now();
    const maxCooldown = now + (7 * 24 * 60 * 60 * 1000); // Max 7 jours

    Object.entries(data).forEach(([key, value]) => {
      if (typeof key === 'string' &&
          typeof value === 'number' &&
          value > now &&
          value < maxCooldown &&
          AVAILABLE_RITUALS.some(r => r.id === key)) {
        result[key] = value;
      }
    });

    return result;
  };

  // Charger l'historique et les cooldowns depuis le localStorage avec validation stricte
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('symbiont_ritual_history');
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        const validated = validateRitualHistory(parsed);
        setRitualHistory(validated);

        if (validated.length !== parsed.length) {
          logger.warn('Ritual history data validation removed invalid entries', {
            original: parsed.length,
            validated: validated.length
          });
        }
      }

      const savedCooldowns = localStorage.getItem('symbiont_ritual_cooldowns');
      if (savedCooldowns) {
        const parsed = JSON.parse(savedCooldowns);
        const validated = validateRitualCooldowns(parsed);
        setRitualCooldowns(validated);

        if (Object.keys(validated).length !== Object.keys(parsed).length) {
          logger.warn('Ritual cooldowns validation removed invalid entries');
        }
      }
    } catch (error) {
      logger.error('Failed to load ritual data from localStorage', {
        error: error instanceof Error ? error.message : String(error)
      });
      // Continuer avec des valeurs par défaut
      setRitualHistory([]);
      setRitualCooldowns({});
    }
  }, []);

  // Mettre à jour les cooldowns en temps réel avec protection contre les race conditions
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    let isMounted = true;

    const updateCooldowns = () => {
      if (!isMounted) return;

      const now = Date.now();
      setRitualCooldowns(prev => {
        if (!isMounted) return prev;

        const updated = { ...prev };
        let hasChanges = false;

        Object.keys(updated).forEach(ritualId => {
          if (updated[ritualId] <= now) {
            delete updated[ritualId];
            hasChanges = true;
            // Éviter d'appeler addNotification si le composant est démonté
            if (isMounted) {
              const ritual = AVAILABLE_RITUALS.find(r => r.id === ritualId);
              if (ritual) {
                addNotification(`Le rituel ${ritual.name} est à nouveau disponible !`);
              }
            }
          }
        });

        if (hasChanges && isMounted) {
          try {
            localStorage.setItem('symbiont_ritual_cooldowns', JSON.stringify(updated));
          } catch (error) {
            logger.error('Failed to save ritual cooldowns', { error });
          }
        }

        return updated;
      });
    };

    intervalId = setInterval(updateCooldowns, 1000);

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
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

  const startRitual = async (ritual: Ritual, providedSecretCode?: string) => {
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

    // Gestion spéciale pour Vision Spectrale (Phase 1.2)
    if (ritual.id === 'vision-spectrale') {
      // Vérifier qu'un scan n'est pas déjà en cours (race condition)
      if (visionSpectraleInProgress.current) {
        addNotification('⚠️ Un scan est déjà en cours...');
        return;
      }

      visionSpectraleInProgress.current = true;

      try {
        // Envoyer message au content script pour extraire les éléments cachés
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab?.id) {
          throw new Error('No active tab found');
        }

        // Utiliser sendMessage avec callback pour récupérer la réponse
        chrome.tabs.sendMessage<any, HiddenElementsResponse>(
          tab.id,
          {
            type: 'EXTRACT_HIDDEN_ELEMENTS',
            payload: {
              depth: 100, // Profondeur de scan maximale
              includeZIndex: true // Inclure la détection z-index négatif
            }
          },
          (response) => {
            // Reset flag
            visionSpectraleInProgress.current = false;

            // Check si le composant est toujours monté (memory leak prevention)
            if (!componentMounted.current) {
              return;
            }

            // Gestion des erreurs Chrome
            if (chrome.runtime.lastError) {
              logger.error('Vision Spectrale communication error', {
                error: chrome.runtime.lastError.message
              });
              addMurmur('⚠️ Impossible de scanner cette page (restrictions de sécurité)', 'warning');
              return;
            }

            // Validation de la réponse avec types stricts
            if (!response || !Array.isArray(response.hiddenElements)) {
              addMurmur('🔍 Scan terminé - Aucune anomalie détectée', 'info');
              return;
            }

            const { hiddenElements, stats } = response;

            // Afficher les résultats dans les murmures
            if (hiddenElements.length === 0) {
              addMurmur('✅ Aucun élément caché détecté - Zone propre', 'info');
              return;
            }

            addMurmur(`🔍 ${hiddenElements.length} éléments cachés détectés!`, 'warning');

            // Catégorisation performante (single pass)
            const categorized = categorizeHiddenElements(hiddenElements);

            // Messages détaillés sur les découvertes
            if (categorized.trackers.length > 0) {
              addMurmur(
                `⚠️ ${categorized.trackers.length} scripts/trackers invisibles actifs`,
                'warning'
              );

              // Log les domaines des trackers (avec sanitization)
              const uniqueHosts = new Set<string>();

              for (const tracker of categorized.trackers) {
                if (tracker.src) {
                  try {
                    const url = new URL(tracker.src);
                    const sanitizedHost = sanitizeHostname(url.hostname);

                    if (!uniqueHosts.has(sanitizedHost)) {
                      uniqueHosts.add(sanitizedHost);

                      // Limite à 5 domaines pour ne pas spammer
                      if (uniqueHosts.size <= 5) {
                        addMurmur(`📡 Tracker: ${sanitizedHost}`, 'info');
                      }
                    }
                  } catch (err) {
                    // URL invalide, ignorer silencieusement
                    logger.debug('Invalid tracker URL', { src: tracker.src });
                  }
                }
              }

              if (uniqueHosts.size > 5) {
                addMurmur(`... et ${uniqueHosts.size - 5} autres domaines`, 'info');
              }
            }

            if (categorized.pixels.length > 0) {
              addMurmur(
                `👁️ ${categorized.pixels.length} pixels de tracking détectés`,
                'warning'
              );
            }

            if (categorized.zIndexNegative.length > 0) {
              addMurmur(
                `🕵️ ${categorized.zIndexNegative.length} éléments avec z-index négatif`,
                'critical'
              );
            }

            // Si beaucoup d'éléments cachés, suggérer une protection
            if (hiddenElements.length > 10) {
              addMurmur(
                `🛡️ Surveillance intensive détectée! Activation de contre-mesures recommandée`,
                'critical'
              );
            }

            // Log les statistiques (avec validation)
            if (stats && typeof stats === 'object') {
              logger.info('Vision Spectrale results', {
                hiddenCount: hiddenElements.length,
                trackers: categorized.trackers.length,
                pixels: categorized.pixels.length,
                zIndexNegative: categorized.zIndexNegative.length,
                scanTime: stats.scanTime || 0,
                depth: stats.depth || 0
              });
            }
          }
        );

        // Log pour traçabilité
        logger.info('Vision Spectrale ritual initiated', {
          tabId: tab.id,
          url: tab.url?.slice(0, 100) // Limite URL length
        });

        addNotification('👁️ Vision Spectrale activée - Scan en cours...');
        addMurmur('Les voiles du DOM se dissipent...', 'info');

      } catch (error) {
        // Le scan DOM peut échouer (page protégée chrome://, popup, aucun
        // content script). Ce n'est PAS bloquant : le rituel se poursuit et
        // applique ses effets — la révélation du DOM est un bonus, pas un
        // prérequis. Pas de return ici.
        visionSpectraleInProgress.current = false;

        logger.warn('Vision Spectrale: scan DOM indisponible, le rituel continue', {
          error: error instanceof Error ? error.message : String(error)
        });

        addMurmur('🔍 Scan indisponible sur cette page — rituel poursuivi', 'info');
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

    // Retour visuel : la créature consomme son énergie et passe en état excité
    reactVisibleOrganism({ energyDelta: -ritual.cost, mood: 'excited' });
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

    // Retour visuel : appliquer les effets sur la créature visible
    reactVisibleOrganism({
      consciousnessDelta: (ritual.effects.consciousness ?? 0) * 100,
      energyDelta: (ritual.effects.energy ?? 0) * 100,
      mood: 'happy',
    });

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

  /**
   * Categorise les éléments cachés de manière performante (single pass)
   * Complexity: O(n) avec validation de types stricte
   */
  const categorizeHiddenElements = useCallback((
    elements: HiddenElementData[]
  ): CategorizedElements => {
    const result: CategorizedElements = {
      trackers: [],
      pixels: [],
      zIndexNegative: [],
      other: []
    };

    // Single pass au lieu de 3 filter()
    for (const el of elements) {
      // Validation des types
      if (!el || typeof el !== 'object') continue;

      // Détection tracker
      if (
        el.tag === 'SCRIPT' ||
        el.tag === 'IFRAME' ||
        (el.id && el.id.includes('track'))
      ) {
        result.trackers.push(el);
      }
      // Détection pixel
      else if (
        (el.width === 1 && el.height === 1) ||
        (el.classes && el.classes.includes('pixel'))
      ) {
        result.pixels.push(el);
      }
      // Détection z-index négatif
      else if (el.styles?.zIndex) {
        try {
          const zIndex = parseInt(el.styles.zIndex, 10);
          if (!isNaN(zIndex) && zIndex < 0) {
            result.zIndexNegative.push(el);
          } else {
            result.other.push(el);
          }
        } catch {
          result.other.push(el);
        }
      } else {
        result.other.push(el);
      }
    }

    return result;
  }, []);

  /**
   * Sanitize hostname pour éviter XSS
   */
  const sanitizeHostname = useCallback((hostname: string): string => {
    // Remove caractères dangereux
    return hostname
      .replace(/[<>\"'&]/g, '')
      .slice(0, 100); // Limite de longueur
  }, []);

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
        const isActive = currentSession?.ritualId === ritual.id && !currentSession.completed;
        const sessionBusy = !!currentSession && !currentSession.completed;
        const activeProgress = isActive ? Math.round(currentSession!.progress * 100) : 0;

        return (
          <div
            key={ritual.id}
            className={`ritual-card ${!check.canPerform ? 'disabled' : ''} ${ritual.type} ${isActive ? 'active-ritual' : ''}`}
            style={isActive ? {
              borderColor: '#00e0ff',
              boxShadow: '0 0 0 1px #00e0ff, 0 0 24px rgba(0, 224, 255, 0.35)',
              transition: 'box-shadow 0.3s ease',
            } : undefined}
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
            
            {isActive && (
              <div className="ritual-progress-inline" style={{ margin: '10px 0' }}>
                <div style={{
                  height: 6, borderRadius: 3, background: 'rgba(0, 224, 255, 0.15)', overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${activeProgress}%`, height: '100%',
                    background: 'linear-gradient(90deg, #00e0ff, #4fc3f7)',
                    transition: 'width 0.3s linear',
                  }} />
                </div>
                <span style={{ fontSize: 11, color: '#00e0ff' }}>🔮 Rituel en cours… {activeProgress}%</span>
              </div>
            )}

            {isOnCooldown && !isActive && (
              <div className="cooldown-display">
                <span>⏳ {Math.ceil(cooldownMs / 60000)}min restantes</span>
              </div>
            )}

            {!check.canPerform && !isOnCooldown && !isActive && (
              <div className="requirement-warning">
                ⚠️ {check.reason}
              </div>
            )}

            <button
              className="ritual-button"
              onClick={() => ritual.type === 'secret' ? handleSecretRitual(ritual) : startRitual(ritual)}
              disabled={!check.canPerform || sessionBusy}
            >
              {isActive
                ? `⏳ En cours… ${activeProgress}%`
                : sessionBusy
                  ? 'Un rituel est déjà actif'
                  : ritual.type === 'secret' ? 'Entrer Code' : 'Commencer'}
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
      {/* Murmures mystiques (Phase 1.1 - Feedback de résonance DOM) */}
      {murmurs.length > 0 && (
        <div className="murmurs-container">
          <div className="murmurs-header">🔮 Murmures de l'Ombre</div>
          {murmurs.map((murmur) => (
            <div
              key={murmur.timestamp}
              className={`murmur murmur-${murmur.type}`}
              style={{
                animation: 'fadeInOut 6s ease-in-out',
                opacity: 0.9
              }}
            >
              <div className="murmur-content">
                <span className="murmur-message">{murmur.message}</span>
                {murmur.suggestedAction && (
                  <div className="murmur-action">
                    <button
                      className="murmur-action-btn"
                      onClick={() => {
                        // Secure null check
                        if (!murmur.suggestedAction) return;

                        const ritual = AVAILABLE_RITUALS.find(r => r.id === murmur.suggestedAction!.ritualId);
                        if (ritual) {
                          const check = canPerformRitual(ritual);
                          if (check.canPerform) {
                            startRitual(ritual);
                            addNotification(`✨ ${murmur.suggestedAction.reason}`);
                          } else {
                            addNotification(`❌ ${check.reason}`);
                          }
                        } else {
                          logger.warn('[MysticalPanel] Suggested ritual not found', {
                            ritualId: murmur.suggestedAction.ritualId
                          });
                        }
                      }}
                      title={murmur.suggestedAction.reason}
                    >
                      → {murmur.suggestedAction.ritualName}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { OrganismState } from '@shared/types/organism';
import { logger } from '@shared/utils/secureLogger';
import { MessageBus } from '@/core/messaging/MessageBus';
import { MessageType } from '@shared/messaging/MessageBus';

export interface OrganismContextType {
  organism: OrganismState | null;
  isLoading: boolean;
}

export const OrganismContext = createContext<OrganismContextType | null>(null);

export const useOrganism = (): OrganismContextType => {
  const context = useContext(OrganismContext);
  if (!context) {
    throw new Error('useOrganism must be used within OrganismProvider');
  }
  return context;
};

export function OrganismProvider({ children }: { children: ReactNode }) {
  const [organism, setOrganism] = useState<OrganismState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [messageBus] = useState(() => new MessageBus('popup'));

  useEffect(() => {
    const load = async () => {
      try {
        // Petit délai pour éviter le blocage initial
        await new Promise(resolve => setTimeout(resolve, 50));

        // D'abord essayer de récupérer depuis le background service
        let organismFromBackground: OrganismState | null = null;

        try {
          // Envoyer une demande au background service pour récupérer l'organisme
          await messageBus.send({
            type: MessageType.GET_ORGANISM,
            payload: {}
          });

          // Écouter la réponse du background avec timeout
          organismFromBackground = await new Promise<OrganismState | null>((resolve) => {
            const timeoutId = setTimeout(() => {
              logger.warn('Timeout waiting for organism from background');
              resolve(null);
            }, 3000); // 3 secondes de timeout

            const handler = (message: any) => {
              if (message.type === MessageType.ORGANISM_UPDATE && message.payload?.state) {
                clearTimeout(timeoutId);
                messageBus.off(MessageType.ORGANISM_UPDATE, handler);
                resolve(message.payload.state);
              }
            };

            messageBus.on(MessageType.ORGANISM_UPDATE, handler);
          });
        } catch (bgError) {
          logger.warn('Failed to get organism from background:', bgError);
        }

        if (organismFromBackground) {
          setOrganism(organismFromBackground);
          // Sauvegarder dans localStorage pour cache local
          localStorage.setItem('symbiont_organism', JSON.stringify(organismFromBackground));
          logger.info('Organism loaded from background service');
          return;
        }

        // Fallback: essayer de charger depuis localStorage
        const raw = localStorage.getItem('symbiont_organism');
        if (raw) {
          try {
            const organismData = JSON.parse(raw);
            setOrganism(organismData);
            logger.info('Organism loaded from localStorage cache');
            return;
          } catch (parseError) {
            logger.warn('Failed to parse organism data:', parseError);
          }
        }

        // Si pas de données, créer un organisme par défaut temporaire
        const now = Date.now();
        const defaultOrganism = {
            // Propriétés requises par OrganismState
            id: 'default-organism',
            generation: 1,
            dna: 'MOCKDNA123456789ABCDEF',
            traits: {
              curiosity: 0.5,
              focus: 0.5,
              rhythm: 0.5,
              empathy: 0.5,
              creativity: 0.5,
              resilience: 0.5,
              adaptability: 0.5,
              memory: 0.5,
              intuition: 0.5
            },
            birthTime: now,
            lastMutation: null,
            mutations: [],
            socialConnections: [],
            memoryFragments: [],
            // Propriétés optionnelles
            health: 1,
            energy: 0.8,
            consciousness: 0.5,
            createdAt: now,
            visualDNA: 'MOCKDNA123456789ABCDEF'
        };

        // Sauvegarder l'organisme par défaut dans localStorage
        localStorage.setItem('symbiont_organism', JSON.stringify(defaultOrganism));
        setOrganism(defaultOrganism);
        logger.info('Default organism created and saved');

      } catch (error) {
        logger.error('Error loading organism:', error);
        // En cas d'erreur, créer quand même un organisme par défaut
        const fallbackOrganism = {
          id: 'fallback-organism',
          generation: 1,
          dna: 'FALLBACK123456789ABCDEF',
          traits: {
            curiosity: 0.5, focus: 0.5, rhythm: 0.5, empathy: 0.5, creativity: 0.5,
            resilience: 0.5, adaptability: 0.5, memory: 0.5, intuition: 0.5
          },
          birthTime: Date.now(),
          lastMutation: null,
          mutations: [],
          socialConnections: [],
          memoryFragments: [],
          health: 1,
          energy: 0.8,
          consciousness: 0.5,
          createdAt: Date.now(),
          visualDNA: 'FALLBACK123456789ABCDEF'
        };
        setOrganism(fallbackOrganism);
      } finally {
        setIsLoading(false);
      }
    };

    load();

    // Écouter les mises à jour de l'organisme depuis le background
    const handleOrganismUpdate = (message: any) => {
      if (message.payload?.state) {
        setOrganism(message.payload.state);
        // Mettre à jour le cache localStorage
        localStorage.setItem('symbiont_organism', JSON.stringify(message.payload.state));
        logger.debug('Organism updated from background');
      }
    };

    messageBus.on(MessageType.ORGANISM_UPDATE, handleOrganismUpdate);

    // Cleanup
    return () => {
      messageBus.off(MessageType.ORGANISM_UPDATE, handleOrganismUpdate);
    };
  }, [messageBus]);
  return (
    <OrganismContext.Provider value={{ organism, isLoading }}>
      {children}
    </OrganismContext.Provider>
  );
} 
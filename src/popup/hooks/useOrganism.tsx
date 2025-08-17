import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { OrganismState } from '@shared/types/organism';

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

  useEffect(() => {
    const load = async () => {
      try {
        // Prévoir l'utilisation de SymbiontStorage si besoin
        // const storage = new SymbiontStorage();
        // await storage.initialize();
        const raw = localStorage.getItem('symbiont_organism');
        if (raw) {
          setOrganism(JSON.parse(raw));
        } else {
          // Créer un organisme par défaut plus complet
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
          
          // Sauvegarder l'organisme par défaut
          localStorage.setItem('symbiont_organism', JSON.stringify(defaultOrganism));
          setOrganism(defaultOrganism);
        }
      } catch {
        setOrganism(null);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);
  return (
    <OrganismContext.Provider value={{ organism, isLoading }}>
      {children}
    </OrganismContext.Provider>
  );
} 
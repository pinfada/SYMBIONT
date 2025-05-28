import React, { useContext, createContext, useState, useEffect, ReactNode } from 'react';
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
        const raw = localStorage.getItem('symbiont_organism');
        if (raw) {
          setOrganism(JSON.parse(raw));
        } else {
          setOrganism({
            health: 1,
            energy: 1,
            consciousness: 0.5,
            traits: { curiosity: 0.5, focus: 0.5, rhythm: 0.5, empathy: 0.5, creativity: 0.5 },
            generation: 1,
            dna: 'MOCKDNA',
            mutations: [],
            createdAt: Date.now()
          } as any);
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
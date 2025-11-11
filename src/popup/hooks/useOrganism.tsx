import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { OrganismState } from '@shared/types/organism';
import { logger } from '@shared/utils/secureLogger';

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
        // Chargement différé pour éviter le blocage initial
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Utiliser le stockage chiffré sécurisé
        try {
          const { SymbiontEncryption } = await import('@shared/utils/encryption');
          const encryptedData = localStorage.getItem('symbiont_organism_encrypted');
          
          if (encryptedData) {
            const decrypted = await SymbiontEncryption.decryptObject(encryptedData);
            setOrganism(decrypted as OrganismState);
          } else {
            // Fallback vers ancien format non chiffré (migration)
            const raw = localStorage.getItem('symbiont_organism');
            if (raw) {
              const organismData = JSON.parse(raw);
              setOrganism(organismData);
              
              // Migrer vers format chiffré
              const encrypted = await SymbiontEncryption.encryptObject(organismData);
              localStorage.setItem('symbiont_organism_encrypted', encrypted);
              localStorage.removeItem('symbiont_organism'); // Supprimer ancien format
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
          
              // Sauvegarder l'organisme par défaut de façon chiffrée
              const encrypted = await SymbiontEncryption.encryptObject(defaultOrganism);
              localStorage.setItem('symbiont_organism_encrypted', encrypted);
              setOrganism(defaultOrganism);
            }
          }
        } catch (encryptionError) {
          logger.error('Encryption error during organism loading', encryptionError);
          // Fallback vers un organisme par défaut si le déchiffrement échoue
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
            energy: 80,
            consciousness: 0.5,
            createdAt: Date.now(),
            visualDNA: 'FALLBACK123456789ABCDEF'
          };
          setOrganism(fallbackOrganism);
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
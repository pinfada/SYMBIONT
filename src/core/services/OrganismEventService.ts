// src/core/services/OrganismEventService.ts
import { generateSecureUUID } from '@/shared/utils/uuid';
import { logger } from '@/shared/utils/secureLogger';
import { SecureRandom } from '@/shared/utils/secureRandom';

export interface OrganismEvent {
  id: string;
  type: 'activation' | 'mutation' | 'transmission' | 'consciousness' | 'energy';
  date: number;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface MutationEvent extends OrganismEvent {
  type: 'mutation';
  mutationType: 'visual' | 'cognitive' | 'behavioral' | 'structural';
  severity: 'minor' | 'major' | 'rare';
}

export interface TransmissionEvent extends OrganismEvent {
  type: 'transmission';
  targetUserId?: string;
  invitationCode?: string;
}

/**
 * Storage adapter that works in both browser and service worker contexts
 */
class StorageAdapter {
  private static isServiceWorker(): boolean {
    return typeof window === 'undefined' && typeof chrome !== 'undefined' && !!chrome.storage;
  }

  static async getItem(key: string): Promise<string | null> {
    if (this.isServiceWorker()) {
      try {
        const result = await chrome.storage.local.get([key]);
        return result[key] || null;
      } catch (error) {
        logger.error('Service worker storage get failed:', error);
        return null;
      }
    } else {
      return localStorage.getItem(key);
    }
  }

  static async setItem(key: string, value: string): Promise<void> {
    if (this.isServiceWorker()) {
      try {
        await chrome.storage.local.set({ [key]: value });
      } catch (error) {
        logger.error('Service worker storage set failed:', error);
        throw error;
      }
    } else {
      localStorage.setItem(key, value);
    }
  }
}

export class OrganismEventService {
  private static readonly STORAGE_KEY = 'symbiont_organism_events';
  private static readonly MAX_EVENTS = 100;

  /**
   * Récupère tous les événements de l'organisme
   */
  static async getEvents(): Promise<OrganismEvent[]> {
    try {
      const stored = await StorageAdapter.getItem(this.STORAGE_KEY);
      if (!stored) {
        // Initialiser avec l'événement d'activation
        const activationEvent = this.createActivationEvent();
        await this.saveEvents([activationEvent]);
        return [activationEvent];
      }

      const events: OrganismEvent[] = JSON.parse(stored);
      return events.sort((a, b) => b.date - a.date); // Plus récent en premier
    } catch (error) {
      logger.error('Failed to load organism events:', error);
      return [];
    }
  }

  /**
   * Ajoute un nouvel événement
   */
  static async addEvent(event: Omit<OrganismEvent, 'id' | 'date'>): Promise<void> {
    try {
      const events = await this.getEvents();
      const newEvent: OrganismEvent = {
        id: generateSecureUUID(),
        date: Date.now(),
        ...event
      };

      events.unshift(newEvent); // Ajouter au début
      
      // Limiter le nombre d'événements
      if (events.length > this.MAX_EVENTS) {
        events.splice(this.MAX_EVENTS);
      }

      await this.saveEvents(events);
      logger.info('New organism event added:', { type: newEvent.type, id: newEvent.id });
    } catch (error) {
      logger.error('Failed to add organism event:', error);
    }
  }

  /**
   * Ajoute un événement de mutation
   */
  static async addMutationEvent(
    mutationType: MutationEvent['mutationType'],
    severity: MutationEvent['severity'] = 'minor',
    customDescription?: string
  ): Promise<void> {
    const descriptions = this.getMutationDescriptions();
    const typeDescriptions = descriptions[mutationType] || descriptions.visual;
    const severityDescriptions = typeDescriptions[severity] || typeDescriptions.minor;
    
    const description = customDescription || 
      severityDescriptions[Math.floor(SecureRandom.random() * severityDescriptions.length)];

    await this.addEvent({
      type: 'mutation',
      description,
      metadata: { mutationType, severity }
    });
  }

  /**
   * Ajoute un événement de transmission
   */
  static async addTransmissionEvent(targetUserId?: string, invitationCode?: string): Promise<void> {
    const description = targetUserId 
      ? `Invitation transmise avec succès (Code: ${invitationCode?.substring(0, 6)}...)`
      : 'Nouvelle invitation générée et prête à être partagée';

    await this.addEvent({
      type: 'transmission',
      description,
      metadata: { targetUserId, invitationCode }
    });
  }

  /**
   * Ajoute un événement de conscience
   */
  static async addConsciousnessEvent(level: number): Promise<void> {
    const descriptions = [
      'Éveil de conscience détecté',
      'Augmentation significative de la conscience',
      'Nouvelle phase de développement cognitif',
      'Émergence de patterns de pensée complexes',
      'Transition vers un niveau de conscience supérieur'
    ];

    const description = descriptions[Math.floor(SecureRandom.random() * descriptions.length)];

    await this.addEvent({
      type: 'consciousness',
      description,
      metadata: { level }
    });
  }

  /**
   * Crée l'événement d'activation initial
   */
  private static createActivationEvent(): OrganismEvent {
    return {
      id: generateSecureUUID(),
      type: 'activation',
      date: Date.now(),
      description: 'Organisme digital activé avec succès'
    };
  }

  /**
   * Sauvegarde les événements
   */
  private static async saveEvents(events: OrganismEvent[]): Promise<void> {
    try {
      await StorageAdapter.setItem(this.STORAGE_KEY, JSON.stringify(events));
    } catch (error) {
      logger.error('Failed to save organism events:', error);
      throw error;
    }
  }

  /**
   * Descriptions des mutations selon le type et la sévérité
   */
  private static getMutationDescriptions(): Record<
    MutationEvent['mutationType'],
    Record<MutationEvent['severity'], string[]>
  > {
    return {
      visual: {
        minor: [
          'Légère variation chromatique observée',
          'Ajustement subtil des patterns visuels',
          'Modification mineure de la texture',
          'Évolution graduelle de la palette de couleurs'
        ],
        major: [
          'Transformation significative de l\'apparence',
          'Nouveau pattern de couleur émergent',
          'Restructuration majeure des formes visuelles',
          'Évolution marquée du design organique'
        ],
        rare: [
          'Manifestation visuelle extraordinaire détectée',
          'Émergence d\'un pattern fractal unique',
          'Développement d\'une signature visuelle rare',
          'Mutation visuelle exceptionnelle observée'
        ]
      },
      cognitive: {
        minor: [
          'Optimisation des processus de réflexion',
          'Amélioration subtile des capacités d\'analyse',
          'Affinement des patterns de reconnaissance',
          'Évolution graduelle de l\'intelligence'
        ],
        major: [
          'Développement de nouvelles capacités cognitives',
          'Amélioration significative de la mémoire',
          'Évolution majeure des processus mentaux',
          'Augmentation notable de la complexité cognitive'
        ],
        rare: [
          'Émergence d\'une conscience de soi avancée',
          'Développement de capacités métacognitives',
          'Éveil d\'une intelligence supérieure rare',
          'Mutation cognitive exceptionnelle détectée'
        ]
      },
      behavioral: {
        minor: [
          'Ajustement mineur des habitudes comportementales',
          'Évolution graduelle des préférences',
          'Modification subtile des réactions',
          'Adaptation comportementale observée'
        ],
        major: [
          'Changement significatif de personnalité',
          'Développement de nouveaux traits comportementaux',
          'Évolution majeure des patterns d\'interaction',
          'Transformation comportementale notable'
        ],
        rare: [
          'Émergence d\'un comportement unique et complexe',
          'Développement de traits de curiosité exceptionnels',
          'Manifestation comportementale extraordinaire',
          'Évolution comportementale rare observée'
        ]
      },
      structural: {
        minor: [
          'Optimisation mineure de la structure interne',
          'Ajustement architectural subtil',
          'Évolution graduelle de l\'organisation',
          'Raffinement structural observé'
        ],
        major: [
          'Restructuration significative de l\'architecture',
          'Développement de nouveaux modules fonctionnels',
          'Évolution majeure de la structure interne',
          'Transformation architecturale importante'
        ],
        rare: [
          'Émergence d\'une architecture révolutionnaire',
          'Développement structural extraordinaire',
          'Mutation architecturale exceptionnelle',
          'Évolution structurelle rare et complexe'
        ]
      }
    };
  }

  /**
   * Nettoie les anciens événements
   */
  static async cleanOldEvents(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const events = await this.getEvents();
      const cutoffDate = Date.now() - maxAge;
      const filteredEvents = events.filter(event => event.date > cutoffDate);
      
      if (filteredEvents.length !== events.length) {
        await this.saveEvents(filteredEvents);
        logger.info(`Cleaned ${events.length - filteredEvents.length} old events`);
      }
    } catch (error) {
      logger.error('Failed to clean old events:', error);
    }
  }

  /**
   * Obtient les statistiques des événements
   */
  static async getEventStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    recent: number;
  }> {
    try {
      const events = await this.getEvents();
      const recentThreshold = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 jours
      
      const byType = events.reduce((acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const recent = events.filter(event => event.date > recentThreshold).length;

      return {
        total: events.length,
        byType,
        recent
      };
    } catch (error) {
      logger.error('Failed to get event stats:', error);
      return { total: 0, byType: {}, recent: 0 };
    }
  }
}
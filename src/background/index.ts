// src/background/index.ts
// Point d'entrée Service Worker (Neural Core)
import { MessageBus } from '../core/messaging/MessageBus';
import { MessageType } from '../shared/messaging/MessageBus';
import { SymbiontStorage } from '../core/storage/SymbiontStorage';
// import { NavigationObserver } from '../content/observers/NavigationObserver'; // Déplacé vers content script
import { OrganismState, OrganismMutation } from '../shared/types/organism';
import { InvitationService } from './services/InvitationService';
import { MurmureService } from './services/MurmureService';
import { PatternDetector, SequenceEvent } from '../core/PatternDetector';
import { SecurityManager } from './SecurityManager';
import { OrganismFactory } from '../core/factories/OrganismFactory';
import { generateUUID } from '../shared/utils/uuid';
import { logger } from '@shared/utils/secureLogger';

// --- Ajout des modules résilients ---
import { ResilientMessageBus } from '../communication/resilient-message-bus';
import { HybridStorageManager } from '../storage/hybrid-storage-manager';
import { BasicHealthMonitor } from '../monitoring/basic-health-monitor';

// --- Instanciation des modules sociaux (Phase 3) ---
import { DistributedOrganismNetwork } from '../social/distributed-organism-network';
import { CollectiveIntelligence } from '../social/collective-intelligence';
import { SocialResilience } from '../social/social-resilience';
import { MysticalEvents } from '../social/mystical-events';

// --- Instanciation des modules résilients ---
import { SecureRandom } from '../shared/utils/secureRandom';
export const hybridStorage = new HybridStorageManager();
export const resilientBus = new ResilientMessageBus();
export const healthMonitor = new BasicHealthMonitor(async (msg) => {
  // Log des anomalies dans le stockage hybride
  await hybridStorage.store('symbiont_health_alert_' + Date.now(), { msg, timestamp: Date.now() });
});

// --- Exemple d'utilisation du ResilientMessageBus ---
(async () => {
  const message = {
    type: 'ORGANISM_UPDATE',
    payload: { state: { id: 'demo', traits: { focus: 1 } }, timestamp: Date.now() }
  };
  const result = await resilientBus.send(message);
  if (!result.success) {
    logger.warn('Message ORGANISM_UPDATE fallback, voir la queue persistante.');
  }
})();

// Utilitaires pour chrome.storage.local (asynchrone)
async function getStorage(key: string): Promise<any> {
  // Utilise le stockage hybride pour la récupération
  return await hybridStorage.retrieve(key);
}

async function setStorage(key: string, value: any): Promise<void> {
  // Utilise le stockage hybride pour la persistance
  await hybridStorage.store(key, value);
}

// --- Singleton pour accès global à BackgroundService ---
let _backgroundServiceInstance: BackgroundService | null = null;

class BackgroundService {
  private messageBus: MessageBus;
  private storage: SymbiontStorage;
  // NavigationObserver déplacé vers content script
  // private _navigationObserver: NavigationObserver;
  public organism: OrganismState | null = null;
  private invitationService: InvitationService;
  private murmureService: MurmureService;
  private activated: boolean = false;
  private events: SequenceEvent[] = [];
  private collectiveThresholds = [10, 50, 100, 250, 500];
  private reachedThresholds: number[] = [];
  private security: SecurityManager = new SecurityManager();
  // @ts-expect-error Factory réservée pour usage futur
  private _organismFactory: OrganismFactory;

  constructor() {
    this.messageBus = new MessageBus('background');
    this.storage = new SymbiontStorage();
    // NavigationObserver supprimé du service worker
    this.invitationService = new InvitationService(this.storage);
    this.murmureService = new MurmureService();
    this._organismFactory = new OrganismFactory();
    // Récupère les seuils déjà atteints (persistance locale)
    getStorage('symbiont_collective_thresholds').then((saved) => {
      this.reachedThresholds = saved ? JSON.parse(saved) : [];
      this.initialize();
    });
  }

  private async initialize(): Promise<void> {
    try {
      // Initialize storage
      await this.storage.initialize();
      // Vérifier l'état d'activation (stocké en localStorage ou IndexedDB si besoin)
      this.activated = (await getStorage('symbiont_activated')) === 'true';
      // Load or create organism UNIQUEMENT si activé
      if (this.activated) {
        this.organism = await this.storage.getOrganism();
        if (!this.organism) {
          this.organism = this.createNewOrganism();
          await this.storage.saveOrganism(this.organism);
        }
      } else {
        this.organism = null;
      }
      
      // Setup message handlers
      this.setupMessageHandlers();
      
      // Start periodic tasks
      this.startPeriodicTasks();
      
      logger.info('Background service initialized');
    } catch (error) {
      logger.error('Failed to initialize background service:', error);
    }
  }

  private createNewOrganism(): OrganismState {
    const visualDNA = this.generateVisualDNA();
    return {
      id: generateUUID(),
      generation: 1,
      health: 100,
      energy: 100,
      traits: {
        curiosity: SecureRandom.random() * 100,
        focus: SecureRandom.random() * 100,
        rhythm: SecureRandom.random() * 100,
        empathy: SecureRandom.random() * 100,
        creativity: SecureRandom.random() * 100,
        resilience: SecureRandom.random() * 100,
        adaptability: SecureRandom.random() * 100,
        memory: SecureRandom.random() * 100,
        intuition: SecureRandom.random() * 100,
      },
      visualDNA,
      lastMutation: Date.now(),
      mutations: [],
      createdAt: Date.now(),
      dna: visualDNA,
      birthTime: Date.now(),
      socialConnections: [],
      memoryFragments: []
    };
  }

  private generateVisualDNA(): string {
    // Generate a unique visual DNA string
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(SecureRandom.random() * chars.length));
    }
    return result;
  }

  private setupMessageHandlers(): void {
    // Handle page visits
    this.messageBus.on(MessageType.PAGE_VISIT, async (message: any) => {
      const { url, title } = message.payload;
      
      // Update behavior data
      const behavior = await this.storage.getBehavior(url) || {
        url,
        visitCount: 0,
        totalTime: 0,
        scrollDepth: 0,
        lastVisit: Date.now(),
        interactions: [],
      };
      
      behavior.visitCount++;
      behavior.lastVisit = Date.now();
      
      await this.storage.saveBehavior(behavior);
      
      // Enregistre l'événement dans l'historique
      this.events.push({ type: 'visit', timestamp: Date.now(), url });
      
      // Update organism based on behavior
      this.updateOrganismTraits(url, title);
      this.analyzeContextualPatterns();
    });

    // Handle scroll events
    this.messageBus.on(MessageType.SCROLL_EVENT, async (message: any) => {
      const { url, scrollDepth } = message.payload;
      
      const behavior = await this.storage.getBehavior(url);
      if (behavior) {
        behavior.scrollDepth = Math.max(behavior.scrollDepth, scrollDepth);
        await this.storage.saveBehavior(behavior);
      }
      
      // Enregistre l'événement dans l'historique
      this.events.push({ type: 'scroll', timestamp: Date.now(), url });
      this.analyzeContextualPatterns();
    });

    // Handler pour interactions utilisateur (à brancher si non existant)
    this.messageBus.on(MessageType.INTERACTION_DETECTED, (message: any) => {
      const { type, timestamp, target, data } = message.payload;
      this.events.push({ type, timestamp, target, ...data });
      this.analyzeContextualPatterns();
    });

    // Invitation: génération
    this.messageBus.on(MessageType.GENERATE_INVITATION, async (message: any) => {
      const { donorId } = message.payload;
      const rawInvitation = await this.invitationService.generateInvitation(donorId);
      // Adaptation à l'interface partagée
      const invitation: import('../shared/types/invitation').Invitation = {
        code: rawInvitation.code,
        createdAt: rawInvitation.createdAt,
        consumed: rawInvitation.used ?? false,
        inviter: rawInvitation.donorId,
        ...(rawInvitation.usedAt && { consumedAt: rawInvitation.usedAt }),
        ...(rawInvitation.receiverId && { invitee: rawInvitation.receiverId })
      };
      let encryptedPayload: import('../shared/types/invitation').Invitation | string = invitation;
      try {
        encryptedPayload = await this.security.encryptSensitiveData(invitation);
      } catch (e) {
        // fallback : en clair si erreur
        encryptedPayload = invitation;
      }
      await resilientBus.send({
        type: MessageType.INVITATION_GENERATED,
        payload: encryptedPayload
      });
    });

    // Invitation: validation/consommation
    this.messageBus.on(MessageType.CONSUME_INVITATION, async (message: any) => {
      const { code, receiverId, role } = message.payload;
      // Contrôle d'accès : seul un utilisateur authentifié peut consommer une invitation
      if (!this.security.validateDataAccess({ userId: receiverId, resource: code, role }, 'user')) {
        resilientBus.send({
          type: MessageType.INVITATION_CONSUMED,
          payload: { error: 'Accès refusé.' }
        });
        return;
      }
      const invitation = await this.invitationService.consumeInvitation(code, receiverId);
      if (invitation) {
        this.activated = true;
        await setStorage('symbiont_activated', 'true');
        // Créer l'organisme à l'activation
        if (!this.organism) {
          this.organism = this.createNewOrganism();
          await this.storage.saveOrganism(this.organism);
        }
      }
      resilientBus.send({
        type: MessageType.INVITATION_CONSUMED,
        payload: invitation
      });
    });

    // Invitation: vérification
    this.messageBus.on(MessageType.CHECK_INVITATION, async (message: any) => {
      const { code } = message.payload;
      const valid = await this.invitationService.isValid(code);
      resilientBus.send({
        type: MessageType.INVITATION_CHECKED,
        payload: { code, valid }
      });
    });

    // --- Handlers pour la lignée et l'historique d'invitation ---
    this.messageBus.on(MessageType.GET_INVITER, async (message: any) => {
      const { userId } = message.payload;
      // Recherche de l'invitation où receiverId === userId
      const all = await this.invitationService.getAllInvitations();
      const inviter = all.find(inv => inv.receiverId === userId);
      resilientBus.send({
        type: MessageType.INVITER_RESULT,
        payload: inviter || null
      });
    });

    this.messageBus.on(MessageType.GET_INVITEES, async (message: any) => {
      const { userId } = message.payload;
      // Recherche des invitations où donorId === userId
      const all = await this.invitationService.getAllInvitations();
      const invitees = all.filter(inv => inv.donorId === userId);
      resilientBus.send({
        type: MessageType.INVITEES_RESULT,
        payload: invitees
      });
    });

    this.messageBus.on(MessageType.GET_INVITATION_HISTORY, async (message: any) => {
      const { userId } = message.payload;
      // Historique = invitations reçues ou envoyées
      const all = await this.invitationService.getAllInvitations();
      const history = [
        ...all.filter(inv => inv.receiverId === userId).map(inv => ({ ...inv, type: 'reçue' })),
        ...all.filter(inv => inv.donorId === userId).map(inv => ({ ...inv, type: 'envoyée' }))
      ];
      resilientBus.send({
        type: MessageType.INVITATION_HISTORY_RESULT,
        payload: history
      });
    });

    // --- Rituel de mutation partagée ---
    const sharedMutationSessions: Map<string, { initiatorId: string; traits: Record<string, number>; expiresAt: number }> = new Map();

    this.messageBus.on(MessageType.REQUEST_SHARED_MUTATION, (message: any) => {
      const { initiatorId, traits } = message.payload;
      const code = SecureRandom.random().toString(36).substr(2, 6).toUpperCase();
      const expiresAt = Date.now() + 1000 * 60 * 5; // 5 min
      sharedMutationSessions.set(code, { initiatorId, traits, expiresAt });
      resilientBus.send({
        type: MessageType.SHARED_MUTATION_CODE,
        payload: { code, initiatorId, expiresAt }
      });
    });

    this.messageBus.on(MessageType.ACCEPT_SHARED_MUTATION, async (message: any) => {
      const { code, receiverId, traits, role } = message.payload;
      // Contrôle d'accès : seul un utilisateur authentifié peut accepter une mutation partagée
      if (!this.security.validateDataAccess({ userId: receiverId, resource: code, role }, 'user')) {
        resilientBus.send({
          type: MessageType.SHARED_MUTATION_RESULT,
          payload: { error: 'Accès refusé.' }
        });
        return;
      }
      const session = sharedMutationSessions.get(code);
      if (!session || session.expiresAt < Date.now()) {
        resilientBus.send({
          type: MessageType.SHARED_MUTATION_RESULT,
          payload: { error: 'Code expiré ou invalide.' }
        });
        return;
      }
      // Fusionner les traits (moyenne)
      const mergedTraits: Record<string, number> = { ...session.traits };
      for (const key of Object.keys(traits)) {
        mergedTraits[key] = (mergedTraits[key] ?? 0 + traits[key] ?? 0) / 2;
      }
      sharedMutationSessions.delete(code);
      let resultPayload: import('../shared/types/rituals').SharedMutationResult | string = {
        initiatorId: session.initiatorId,
        receiverId,
        mergedTraits,
        timestamp: Date.now()
      };
      try {
        resultPayload = await this.security.encryptSensitiveData(resultPayload);
      } catch (e) {
        // fallback : en clair si erreur
      }
      resilientBus.send({
        type: MessageType.SHARED_MUTATION_RESULT,
        payload: resultPayload
      });
    });

    // --- Rituel de réveil collectif (simple, local) ---
    const collectiveWakeParticipants: Set<string> = new Set();
    let collectiveWakeTimeout: NodeJS.Timeout | null = null;

    this.messageBus.on(MessageType.COLLECTIVE_WAKE_REQUEST, (message: any) => {
      const { userId } = message.payload;
      collectiveWakeParticipants.add(userId);
      if (!collectiveWakeTimeout) {
        collectiveWakeTimeout = setTimeout(() => {
          resilientBus.send({
            type: MessageType.COLLECTIVE_WAKE_RESULT,
            payload: {
              participants: Array.from(collectiveWakeParticipants),
              triggeredAt: Date.now()
            }
          });
          collectiveWakeParticipants.clear();
          collectiveWakeTimeout = null;
        }, 10000); // 10 secondes pour simuler un réveil collectif
      }
    });

    // --- Transmission contextuelle ---
    const triggerContextualInvitation = async (context: string) => {
      const userId = (await getStorage('symbiont_user_id')) || 'unknown';
      const invitation = await this.invitationService.generateInvitation(userId);
      await resilientBus.send({
        type: MessageType.CONTEXTUAL_INVITATION,
        payload: { invitation, context }
      });
    };

    // Détection mutation rare (ex : cognitive)
    const originalGenerateMutation = this.generateMutation.bind(this);
    this.generateMutation = () => {
      const mutation = originalGenerateMutation();
      if (mutation.type === 'cognitive') {
        triggerContextualInvitation('mutation_cognitive');
      }
      return mutation;
    };

    // Détection seuil de traits (ex : curiosité > 90)
    const originalUpdateOrganismTraits = this.updateOrganismTraits.bind(this);
    this.updateOrganismTraits = async (url: string, title: string) => {
      await originalUpdateOrganismTraits(url, title);
      if (this.organism && this.organism.traits.curiosity > 90) {
        await triggerContextualInvitation('curiosity_threshold');
      }
    };

    // Détection longue inactivité (ex : 30 min sans interaction)
    let lastActivity = Date.now();
    chrome.idle.onStateChanged.addListener((state) => {
      if (state === 'idle') {
        lastActivity = Date.now();
      } else if (state === 'active' && Date.now() - lastActivity > 1000 * 60 * 30) {
        triggerContextualInvitation('long_inactivity');
      }
    });

    // --- Rituels secrets ---
    const SECRET_CODES = ['SYMBIOSE', 'AWAKEN', 'ECHO'];
    this.messageBus.on(MessageType.SECRET_CODE_ENTERED, (message: any) => {
      const { code } = message.payload;
      if (SECRET_CODES.includes(code.toUpperCase())) {
        // Déclencher un effet spécial (ex : mutation unique)
        resilientBus.send({
          type: MessageType.SECRET_RITUAL_TRIGGERED,
          payload: { code, effect: 'mutation_unique', timestamp: Date.now() }
        });
      }
    });
  }

  private async updateOrganismTraits(url: string, title: string): Promise<void> {
    if (!this.organism) return;
    
    // Simple trait evolution based on content type
    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();
    
    // Creativity boost from technical/creative sites
    if (urlLower.includes('github') || urlLower.includes('stackoverflow') || 
        urlLower.includes('codepen') || urlLower.includes('dribbble')) {
      this.organism.traits.creativity += 0.5;
    }
    
    // Focus boost from documentation/learning sites
    if (urlLower.includes('docs') || urlLower.includes('wiki') || 
        urlLower.includes('tutorial') || titleLower.includes('guide')) {
      this.organism.traits.focus += 0.3;
    }
    
    // Empathy boost from social/communication sites
    if (urlLower.includes('twitter') || urlLower.includes('linkedin') || 
        urlLower.includes('facebook') || urlLower.includes('reddit')) {
      this.organism.traits.empathy += 0.4;
    }
    
    // Curiosity boost from exploration
    const domain = new URL(url).hostname;
    const isNewDomain = !(await this.hasVisitedDomain(domain));
    if (isNewDomain) {
      this.organism.traits.curiosity += 1.0;
    }
    
    // Normalize traits (keep between 0-100)
    if (!this.organism) return;
    const traits = this.organism.traits;
    if (!traits) return;
    Object.keys(traits).forEach(trait => {
      traits[trait as keyof typeof traits] = 
        Math.max(0, Math.min(100, traits[trait as keyof typeof traits]));
    });
    
    // Check for mutations
    await this.checkForMutations();
    
    // Save updated organism
    await this.storage.saveOrganism(this.organism);
    
    // Détection de pattern simple
    let pattern: string = 'default';
    // Exemples de détection naïve (à affiner)
    if (await this.isLoop(url)) pattern = 'loop';
    else if (await this.isIdle()) pattern = 'idle';
    else if (await this.isExploration(url)) pattern = 'exploration';
    else if (await this.isRoutine(url)) pattern = 'routine';
    // Broadcast update
    if (!this.organism) return;
    const org = this.organism;
    await resilientBus.send({
      type: MessageType.ORGANISM_UPDATE,
      payload: {
        state: org,
        mutations: await this.storage.getRecentMutations(5),
      },
    });
    // Générer et envoyer un murmure contextuel
    const murmure = this.murmureService.generateMurmur(pattern);
    await resilientBus.send({
      type: MessageType.MURMUR,
      payload: { text: murmure, pattern, timestamp: Date.now() }
    });
  }

  private async hasVisitedDomain(domain: string): Promise<boolean> {
    // Check if we've visited this domain before
    const tabs = await chrome.tabs.query({});
    return tabs.some(tab => tab.url && new URL(tab.url).hostname === domain);
  }

  private async checkForMutations(): Promise<void> {
    if (!this.organism) return;
    const org = this.organism;
    const now = Date.now();
    const timeSinceLastMutation = now - (org.lastMutation ?? 0);
    // Mutation probability increases with time
    const mutationProbability = Math.min(0.5, timeSinceLastMutation / (1000 * 60 * 60)); // Max 50% after 1 hour
    if (SecureRandom.random() < mutationProbability) {
      const mutation = this.generateMutation();
      await this.storage.addMutation(mutation);
      org.lastMutation = now;
      // Apply mutation effects
      this.applyMutation(mutation);
    }
  }

  private generateMutation(): OrganismMutation {
    const types: Array<'visual' | 'behavioral' | 'cognitive'> = ['visual', 'behavioral', 'cognitive'];
    const type = types[Math.floor(SecureRandom.random() * types.length)];
    return {
      type,
      trigger: this.getMutationTrigger(type),
      magnitude: SecureRandom.random() * 0.5 + 0.1, // 0.1 to 0.6
      timestamp: Date.now(),
    } as OrganismMutation;
  }

  private getMutationTrigger(type: 'visual' | 'behavioral' | 'cognitive'): string {
    const triggers = {
      visual: ['color_shift', 'pattern_change', 'size_fluctuation', 'opacity_variation'],
      behavioral: ['navigation_speed', 'content_preference', 'interaction_pattern'],
      cognitive: ['memory_retention', 'pattern_recognition', 'association_strength'],
    };
    
    const typeTriggers = triggers[type];
    return typeTriggers[Math.floor(SecureRandom.random() * typeTriggers.length)];
  }

  private applyMutation(mutation: OrganismMutation): void {
    if (!this.organism) return;
    switch (mutation.type) {
      case 'visual':
        // Modify visual DNA
        this.organism.visualDNA = this.mutateVisualDNA(this.organism.visualDNA ?? '', mutation.magnitude);
        break;
      case 'behavioral': {
        // Adjust traits based on mutation
        const traitKeys = Object.keys(this.organism.traits) as Array<keyof typeof this.organism.traits>;
        const randomTrait = traitKeys[Math.floor(SecureRandom.random() * traitKeys.length)];
        this.organism.traits[randomTrait] += (SecureRandom.random() - 0.5) * mutation.magnitude * 20;
        break;
      }
      case 'cognitive': {
        // Affect multiple traits slightly
        if (!this.organism) return;
        const traits = this.organism.traits;
        if (!traits) return;
        Object.keys(traits).forEach(trait => {
          traits[trait as keyof typeof traits] += (SecureRandom.random() - 0.5) * mutation.magnitude * 5;
        });
        break;
      }
    }
  }

  private mutateVisualDNA(dna: string, magnitude: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const numChanges = Math.floor(dna.length * magnitude);
    const newDNA = dna.split('');
    
    for (let i = 0; i < numChanges; i++) {
      const position = Math.floor(SecureRandom.random() * dna.length);
      newDNA[position] = chars.charAt(Math.floor(SecureRandom.random() * chars.length));
    }
    
    return newDNA.join('');
  }

  private startPeriodicTasks(): void {
    // Health decay - organism needs attention
    setInterval(() => {
      if (this.organism && (this.organism.health ?? 0) > 0) {
        this.organism.health = Math.max(0, (this.organism.health ?? 0) - 0.1);
        this.organism.energy = Math.max(0, (this.organism.energy ?? 0) - 0.05);
      }
    }, 1000 * 60); // Every minute

    // Periodic sync
    setInterval(async () => {
      if (this.organism) {
        await this.storage.saveOrganism(this.organism);
        await resilientBus.send({
          type: MessageType.ORGANISM_UPDATE,
          payload: {
            state: this.organism,
            mutations: await this.storage.getRecentMutations(5),
          },
        });
      }
    }, 1000 * 30); // Every 30 seconds
  }

  // Détection naïve de patterns (à améliorer)
  private async isLoop(url: string): Promise<boolean> {
    // Si l'utilisateur visite la même URL plus de 3 fois en 10 minutes
    const behavior = await this.storage.getBehavior(url);
    return !!behavior && behavior.visitCount >= 3;
  }
  private async isIdle(): Promise<boolean> {
    // Si aucune interaction depuis plus de 10 minutes (exemple)
    // À implémenter selon la collecte d'activité réelle
    return false;
  }
  private async isExploration(url: string): Promise<boolean> {
    // Si le domaine est nouveau ou rarement visité
    const behavior = await this.storage.getBehavior(url);
    return !!behavior && behavior.visitCount <= 1;
  }
  private async isRoutine(url: string): Promise<boolean> {
    // Si le site est visité tous les jours (exemple naïf)
    const behavior = await this.storage.getBehavior(url);
    if (!behavior) return false;
    const now = Date.now();
    return (now - behavior.lastVisit) < 1000 * 60 * 60 * 24 * 2; // Visité il y a moins de 2 jours
  }

  /**
   * Analyse les patterns contextuels dans l'historique d'événements et déclenche une invitation si nécessaire
   */
  private async analyzeContextualPatterns(): Promise<void> {
    const now = Date.now();
    // On ne garde que les événements des 30 dernières minutes
    this.events = this.events.filter(e => now - e.timestamp < 1000 * 60 * 30);
    // Détection de burst d'activité (ex: 5 actions en <10s)
    const bursts = PatternDetector.detectBurst(this.events, 10000, 5);
    if (bursts.length > 0) {
      this.triggerContextualInvitation('burst_activity');
      return;
    }
    // Détection de cycles temporels (ex: actions régulières)
    const cycles = PatternDetector.detectTemporalPattern(this.events, 60000, 0.15);
    if (cycles.length > 0) {
      this.triggerContextualInvitation('temporal_cycle');
      return;
    }
    // Détection d'alternance navigation/scroll
    const alternances = PatternDetector.detectAlternance(this.events, 'visit', 'scroll', 6);
    if (alternances.length > 0) {
      this.triggerContextualInvitation('alternance_nav_scroll');
      return;
    }
    // Détection de répétition d'un même type d'action
    const repetitions = PatternDetector.detectRepetition(this.events, 7);
    if (repetitions.length > 0) {
      this.triggerContextualInvitation('repetition_action');
      return;
    }
    // Déclenchement collectif : seuil global d'invitations
    this.checkCollectiveThreshold();
  }

  /**
   * Vérifie si un seuil collectif de propagation est atteint et déclenche une invitation spéciale si besoin
   */
  private async checkCollectiveThreshold() {
    const allInvitations = await this.invitationService.getAllInvitations();
    const total = allInvitations.length;
    for (const threshold of this.collectiveThresholds) {
      if (total >= threshold && !this.reachedThresholds.includes(threshold)) {
        this.reachedThresholds.push(threshold);
        await setStorage('symbiont_collective_thresholds', JSON.stringify(this.reachedThresholds));
        this.triggerContextualInvitation('collective_threshold_' + threshold);
        break;
      }
    }
  }

  /**
   * Déclenche une invitation contextuelle avancée
   */
  private async triggerContextualInvitation(context: string) {
    const userId = (await getStorage('symbiont_user_id')) || 'unknown';
    const invitation = await this.invitationService.generateInvitation(userId);
    await resilientBus.send({
      type: MessageType.CONTEXTUAL_INVITATION,
      payload: { invitation, context }
    });
  }
}

// Démarrage effectif du service worker
_backgroundServiceInstance = new BackgroundService();

// Garde la référence pour éviter le garbage collection
(globalThis as any)._backgroundService = _backgroundServiceInstance;

// Export for testing
export { BackgroundService };

// --- Instanciation des modules sociaux (Phase 3) ---
export const distributedNetwork = new DistributedOrganismNetwork();
export const collectiveIntelligence = new CollectiveIntelligence();
export const socialResilience = new SocialResilience();
export const mysticalEvents = new MysticalEvents();

// --- Hooks d'intégration (après instanciation des modules) ---
// Note: Fonctions réservées pour usage futur, hooks d'intégration sociale
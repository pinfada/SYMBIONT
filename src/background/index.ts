// src/background/index.ts
// Point d'entrée Service Worker (Neural Core)
import { MessageBus } from '@shared/messaging/MessageBus';
import { SymbiontStorage } from '@storage/SymbiontStorage';
import { NavigationObserver } from '@shared/observers/NavigationObserver';
import { MessageType } from '@shared/types/messages';
import { OrganismState } from '@shared/types/organism';

class BackgroundService {
  private messageBus: MessageBus;
  private storage: SymbiontStorage;
  private navigationObserver: NavigationObserver;
  private organism: OrganismState | null = null;

  constructor() {
    this.messageBus = new MessageBus('background');
    this.storage = new SymbiontStorage();
    this.navigationObserver = new NavigationObserver(this.messageBus);
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Initialize storage
      await this.storage.initialize();
      
      // Load or create organism
      this.organism = await this.storage.getOrganism();
      if (!this.organism) {
        this.organism = this.createNewOrganism();
        await this.storage.saveOrganism(this.organism);
      }
      
      // Setup message handlers
      this.setupMessageHandlers();
      
      // Start periodic tasks
      this.startPeriodicTasks();
      
      console.log('Background service initialized');
    } catch (error) {
      console.error('Failed to initialize background service:', error);
    }
  }

  private createNewOrganism(): OrganismState {
    return {
      id: crypto.randomUUID(),
      generation: 1,
      health: 100,
      energy: 100,
      traits: {
        curiosity: Math.random() * 100,
        focus: Math.random() * 100,
        rhythm: Math.random() * 100,
        empathy: Math.random() * 100,
        creativity: Math.random() * 100,
      },
      visualDNA: this.generateVisualDNA(),
      lastMutation: Date.now(),
    };
  }

  private generateVisualDNA(): string {
    // Generate a unique visual DNA string
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private setupMessageHandlers(): void {
    // Handle page visits
    this.messageBus.on(MessageType.PAGE_VISIT, async (message) => {
      const { url, title } = message.payload;
      
      // Update behavior data
      let behavior = await this.storage.getBehavior(url) || {
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
      
      // Update organism based on behavior
      this.updateOrganismTraits(url, title);
    });

    // Handle scroll events
    this.messageBus.on(MessageType.SCROLL_EVENT, async (message) => {
      const { url, scrollDepth } = message.payload;
      
      const behavior = await this.storage.getBehavior(url);
      if (behavior) {
        behavior.scrollDepth = Math.max(behavior.scrollDepth, scrollDepth);
        await this.storage.saveBehavior(behavior);
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
    Object.keys(this.organism.traits).forEach(trait => {
      this.organism.traits[trait as keyof typeof this.organism.traits] = 
        Math.max(0, Math.min(100, this.organism.traits[trait as keyof typeof this.organism.traits]));
    });
    
    // Check for mutations
    await this.checkForMutations();
    
    // Save updated organism
    await this.storage.saveOrganism(this.organism);
    
    // Broadcast update
    this.messageBus.send({
      type: MessageType.ORGANISM_UPDATE,
      payload: {
        state: this.organism,
        mutations: await this.storage.getRecentMutations(5),
      },
    });
  }

  private async hasVisitedDomain(domain: string): Promise<boolean> {
    // Check if we've visited this domain before
    const tabs = await chrome.tabs.query({});
    return tabs.some(tab => tab.url && new URL(tab.url).hostname === domain);
  }

  private async checkForMutations(): Promise<void> {
    if (!this.organism) return;
    
    const now = Date.now();
    const timeSinceLastMutation = now - this.organism.lastMutation;
    
    // Mutation probability increases with time
    const mutationProbability = Math.min(0.5, timeSinceLastMutation / (1000 * 60 * 60)); // Max 50% after 1 hour
    
    if (Math.random() < mutationProbability) {
      const mutation = this.generateMutation();
      await this.storage.addMutation(mutation);
      
      this.organism.lastMutation = now;
      
      // Apply mutation effects
      this.applyMutation(mutation);
    }
  }

  private generateMutation(): OrganismMutation {
    const types: Array<'visual' | 'behavioral' | 'cognitive'> = ['visual', 'behavioral', 'cognitive'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    return {
      type,
      trigger: this.getMutationTrigger(type),
      magnitude: Math.random() * 0.5 + 0.1, // 0.1 to 0.6
      timestamp: Date.now(),
    };
  }

  private getMutationTrigger(type: 'visual' | 'behavioral' | 'cognitive'): string {
    const triggers = {
      visual: ['color_shift', 'pattern_change', 'size_fluctuation', 'opacity_variation'],
      behavioral: ['navigation_speed', 'content_preference', 'interaction_pattern'],
      cognitive: ['memory_retention', 'pattern_recognition', 'association_strength'],
    };
    
    const typeTriggers = triggers[type];
    return typeTriggers[Math.floor(Math.random() * typeTriggers.length)];
  }

  private applyMutation(mutation: OrganismMutation): void {
    if (!this.organism) return;
    
    switch (mutation.type) {
      case 'visual':
        // Modify visual DNA
        this.organism.visualDNA = this.mutateVisualDNA(this.organism.visualDNA, mutation.magnitude);
        break;
      
      case 'behavioral':
        // Adjust traits based on mutation
        const traitKeys = Object.keys(this.organism.traits) as Array<keyof typeof this.organism.traits>;
        const randomTrait = traitKeys[Math.floor(Math.random() * traitKeys.length)];
        this.organism.traits[randomTrait] += (Math.random() - 0.5) * mutation.magnitude * 20;
        break;
      
      case 'cognitive':
        // Affect multiple traits slightly
        Object.keys(this.organism.traits).forEach(trait => {
          this.organism.traits[trait as keyof typeof this.organism.traits] += 
            (Math.random() - 0.5) * mutation.magnitude * 5;
        });
        break;
    }
  }

  private mutateVisualDNA(dna: string, magnitude: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const numChanges = Math.floor(dna.length * magnitude);
    let newDNA = dna.split('');
    
    for (let i = 0; i < numChanges; i++) {
      const position = Math.floor(Math.random() * dna.length);
      newDNA[position] = chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return newDNA.join('');
  }

  private startPeriodicTasks(): void {
    // Health decay - organism needs attention
    setInterval(() => {
      if (this.organism && this.organism.health > 0) {
        this.organism.health = Math.max(0, this.organism.health - 0.1);
        this.organism.energy = Math.max(0, this.organism.energy - 0.05);
      }
    }, 1000 * 60); // Every minute

    // Periodic sync
    setInterval(async () => {
      if (this.organism) {
        await this.storage.saveOrganism(this.organism);
        
        this.messageBus.send({
          type: MessageType.ORGANISM_UPDATE,
          payload: {
            state: this.organism,
            mutations: await this.storage.getRecentMutations(5),
          },
        });
      }
    }, 1000 * 30); // Every 30 seconds
  }
}

// Initialize the background service
const backgroundService = new BackgroundService();

// Export for testing
export { BackgroundService };
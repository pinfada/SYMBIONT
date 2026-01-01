// Service de gestion du réseau SYMBIONT avec simulation P2P locale
import { SecureRandom } from '@shared/utils/secureRandom';
import { generateSecureUUID } from '@shared/utils/uuid';

export interface NetworkOrganism {
  id: string;
  name: string;
  generation: number;
  health: number;
  energy: number;
  consciousness: number;
  mutations: number;
  dna: string;
  createdAt: number;
  lastSeen: number;
  position: { x: number; y: number; z: number };
  connections: string[];
  traits: {
    empathy: number;
    creativity: number;
    curiosity: number;
    focus: number;
    resilience: number;
  };
  status: 'active' | 'dormant' | 'evolving';
  messageCount: number;
}

export interface NetworkMessage {
  id: string;
  from: string;
  to: string;
  type: 'greeting' | 'energy_share' | 'mutation_exchange' | 'consciousness_sync';
  content: string;
  timestamp: number;
  data?: unknown;
}

export interface NetworkEvent {
  id: string;
  type: 'organism_joined' | 'organism_left' | 'mutation_wave' | 'collective_evolution';
  timestamp: number;
  participants: string[];
  description: string;
  effects?: {
    globalConsciousness?: number;
    mutations?: number;
    connections?: number;
  };
}

class NetworkService {
  private static instance: NetworkService;
  private organisms: Map<string, NetworkOrganism> = new Map();
  private messages: NetworkMessage[] = [];
  private events: NetworkEvent[] = [];
  private myOrganismId: string;
  private simulationInterval?: NodeJS.Timeout;

  private constructor() {
    this.myOrganismId = this.getMyOrganismId();
    this.initializeNetwork();
    this.startNetworkSimulation();
  }

  static getInstance(): NetworkService {
    if (!this.instance) {
      this.instance = new NetworkService();
    }
    return this.instance;
  }

  private getMyOrganismId(): string {
    // Récupérer ou créer un ID unique pour cet organisme
    let id = localStorage.getItem('symbiont_organism_id');
    if (!id) {
      id = generateSecureUUID();
      localStorage.setItem('symbiont_organism_id', id);
    }
    return id;
  }

  private initializeNetwork() {
    // Charger le réseau sauvegardé ou créer un nouveau
    const savedNetwork = localStorage.getItem('symbiont_network_state');

    if (savedNetwork) {
      try {
        const data = JSON.parse(savedNetwork);
        this.organisms = new Map(data.organisms);
        this.messages = data.messages || [];
        this.events = data.events || [];
      } catch {
        this.createInitialNetwork();
      }
    } else {
      this.createInitialNetwork();
    }

    // S'assurer que notre organisme est dans le réseau
    this.ensureMyOrganismExists();
  }

  private createInitialNetwork() {
    // Créer un réseau initial avec plusieurs organismes simulés

    // Notre organisme
    this.ensureMyOrganismExists();

    // Générer 15-25 organismes supplémentaires
    const count = 15 + Math.floor(SecureRandom.random() * 10);

    for (let i = 0; i < count; i++) {
      const organism = this.generateOrganism();
      this.organisms.set(organism.id, organism);
    }

    // Créer des connexions initiales
    this.generateConnections();

    // Générer un historique d'événements
    this.generateInitialEvents();

    // Sauvegarder
    this.saveNetworkState();
  }

  private ensureMyOrganismExists() {
    if (!this.organisms.has(this.myOrganismId)) {
      // Récupérer les données de notre organisme
      const savedOrganism = localStorage.getItem('symbiont_organism');
      let organismData: any = {};

      if (savedOrganism) {
        try {
          organismData = JSON.parse(savedOrganism);
        } catch {}
      }

      const myOrganism: NetworkOrganism = {
        id: this.myOrganismId,
        name: 'Vous',
        generation: organismData.generation || 1,
        health: organismData.health || 1,
        energy: organismData.energy || 0.8,
        consciousness: organismData.consciousness || 0.5,
        mutations: organismData.mutations?.length || 0,
        dna: organismData.dna || this.generateDNA(),
        createdAt: organismData.createdAt || Date.now(),
        lastSeen: Date.now(),
        position: { x: 0, y: 0, z: 0 },
        connections: [],
        traits: organismData.traits || {
          empathy: 0.5,
          creativity: 0.5,
          curiosity: 0.5,
          focus: 0.5,
          resilience: 0.5
        },
        status: 'active',
        messageCount: 0
      };

      this.organisms.set(this.myOrganismId, myOrganism);
    }
  }

  private generateOrganism(): NetworkOrganism {
    const names = [
      'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta',
      'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi',
      'Rho', 'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega',
      'Nexus', 'Flux', 'Quantum', 'Synth', 'Echo', 'Prism', 'Void'
    ];

    const id = generateSecureUUID();
    const generation = Math.floor(SecureRandom.random() * 5) + 1;
    const age = Math.floor(SecureRandom.random() * 30) * 24 * 60 * 60 * 1000; // 0-30 jours

    return {
      id,
      name: names[Math.floor(SecureRandom.random() * names.length)] + '-' + id.substring(0, 4),
      generation,
      health: 0.5 + SecureRandom.random() * 0.5,
      energy: 0.3 + SecureRandom.random() * 0.7,
      consciousness: 0.1 + SecureRandom.random() * 0.9,
      mutations: Math.floor(SecureRandom.random() * generation * 3),
      dna: this.generateDNA(),
      createdAt: Date.now() - age,
      lastSeen: Date.now() - Math.floor(SecureRandom.random() * 3600000), // Vu il y a 0-60min
      position: {
        x: (SecureRandom.random() - 0.5) * 500,
        y: (SecureRandom.random() - 0.5) * 500,
        z: (SecureRandom.random() - 0.5) * 100
      },
      connections: [],
      traits: {
        empathy: SecureRandom.random(),
        creativity: SecureRandom.random(),
        curiosity: SecureRandom.random(),
        focus: SecureRandom.random(),
        resilience: SecureRandom.random()
      },
      status: SecureRandom.random() > 0.7 ? 'dormant' : 'active',
      messageCount: Math.floor(SecureRandom.random() * 50)
    };
  }

  private generateDNA(): string {
    const bases = ['A', 'T', 'G', 'C'];
    let dna = '';
    for (let i = 0; i < 64; i++) {
      dna += bases[Math.floor(SecureRandom.random() * 4)];
    }
    return dna;
  }

  private generateConnections() {
    const organisms = Array.from(this.organisms.values());

    organisms.forEach(organism => {
      // Chaque organisme a 1-5 connexions
      const connectionCount = Math.floor(SecureRandom.random() * 4) + 1;
      const possibleConnections = organisms
        .filter(o => o.id !== organism.id && !organism.connections.includes(o.id))
        .map(o => o.id);

      for (let i = 0; i < connectionCount && possibleConnections.length > 0; i++) {
        const index = Math.floor(SecureRandom.random() * possibleConnections.length);
        const targetId = possibleConnections[index];

        // Connexion bidirectionnelle
        organism.connections.push(targetId);
        const target = this.organisms.get(targetId);
        if (target && !target.connections.includes(organism.id)) {
          target.connections.push(organism.id);
        }

        possibleConnections.splice(index, 1);
      }
    });
  }

  private generateInitialEvents() {
    const eventTypes: NetworkEvent['type'][] = [
      'organism_joined', 'organism_left', 'mutation_wave', 'collective_evolution'
    ];

    const now = Date.now();

    // Générer 10-20 événements récents
    const count = 10 + Math.floor(SecureRandom.random() * 10);

    for (let i = 0; i < count; i++) {
      const type = eventTypes[Math.floor(SecureRandom.random() * eventTypes.length)];
      const timeAgo = Math.floor(SecureRandom.random() * 24 * 60 * 60 * 1000); // 0-24h
      const organisms = Array.from(this.organisms.keys());
      const participantCount = Math.floor(SecureRandom.random() * 5) + 1;
      const participants: string[] = [];

      for (let j = 0; j < participantCount && j < organisms.length; j++) {
        const idx = Math.floor(SecureRandom.random() * organisms.length);
        if (!participants.includes(organisms[idx])) {
          participants.push(organisms[idx]);
        }
      }

      const event: NetworkEvent = {
        id: generateSecureUUID(),
        type,
        timestamp: now - timeAgo,
        participants,
        description: this.generateEventDescription(type, participants.length)
      };

      if (type === 'mutation_wave' || type === 'collective_evolution') {
        event.effects = {
          globalConsciousness: SecureRandom.random() * 0.1,
          mutations: Math.floor(SecureRandom.random() * 3) + 1,
          connections: Math.floor(SecureRandom.random() * 5)
        };
      }

      this.events.push(event);
    }

    this.events.sort((a, b) => b.timestamp - a.timestamp);
  }

  private generateEventDescription(type: NetworkEvent['type'], participantCount: number): string {
    switch(type) {
      case 'organism_joined':
        return `Un nouvel organisme a rejoint le réseau`;
      case 'organism_left':
        return `Un organisme est entré en dormance`;
      case 'mutation_wave':
        return `Vague de mutation affectant ${participantCount} organismes`;
      case 'collective_evolution':
        return `Évolution collective impliquant ${participantCount} organismes`;
      default:
        return 'Événement réseau';
    }
  }

  private startNetworkSimulation() {
    // Simulation temps réel du réseau
    this.simulationInterval = setInterval(() => {
      this.simulateNetworkActivity();
    }, 5000); // Toutes les 5 secondes
  }

  private simulateNetworkActivity() {
    const now = Date.now();
    const organisms = Array.from(this.organisms.values());

    // 1. Mettre à jour les positions (dérive lente)
    organisms.forEach(org => {
      if (org.id !== this.myOrganismId && org.status === 'active') {
        org.position.x += (SecureRandom.random() - 0.5) * 10;
        org.position.y += (SecureRandom.random() - 0.5) * 10;
        org.position.z += (SecureRandom.random() - 0.5) * 2;
        org.lastSeen = now;
      }
    });

    // 2. Simuler des messages (30% de chance)
    if (SecureRandom.random() < 0.3) {
      const sender = organisms[Math.floor(SecureRandom.random() * organisms.length)];
      const receiver = organisms[Math.floor(SecureRandom.random() * organisms.length)];

      if (sender.id !== receiver.id) {
        const messageTypes: NetworkMessage['type'][] = [
          'greeting', 'energy_share', 'mutation_exchange', 'consciousness_sync'
        ];

        const message: NetworkMessage = {
          id: generateSecureUUID(),
          from: sender.id,
          to: receiver.id,
          type: messageTypes[Math.floor(SecureRandom.random() * messageTypes.length)],
          content: this.generateMessageContent(sender.name, receiver.name),
          timestamp: now
        };

        this.messages.push(message);
        sender.messageCount++;
        receiver.messageCount++;

        // Garder seulement les 100 derniers messages
        if (this.messages.length > 100) {
          this.messages = this.messages.slice(-100);
        }
      }
    }

    // 3. Événements occasionnels (10% de chance)
    if (SecureRandom.random() < 0.1) {
      const eventType = SecureRandom.random() < 0.5 ? 'organism_joined' : 'mutation_wave';

      if (eventType === 'organism_joined') {
        // Ajouter un nouvel organisme
        const newOrganism = this.generateOrganism();
        this.organisms.set(newOrganism.id, newOrganism);

        // Créer quelques connexions
        const existingOrgs = organisms.slice(0, 3);
        existingOrgs.forEach(org => {
          newOrganism.connections.push(org.id);
          org.connections.push(newOrganism.id);
        });

        this.events.push({
          id: generateSecureUUID(),
          type: 'organism_joined',
          timestamp: now,
          participants: [newOrganism.id],
          description: `${newOrganism.name} a rejoint le réseau`
        });
      } else {
        // Vague de mutation
        const affected = organisms
          .filter(() => SecureRandom.random() < 0.3)
          .slice(0, 5);

        affected.forEach(org => {
          org.mutations++;
          org.consciousness = Math.min(1, org.consciousness + 0.05);
        });

        if (affected.length > 0) {
          this.events.push({
            id: generateSecureUUID(),
            type: 'mutation_wave',
            timestamp: now,
            participants: affected.map(o => o.id),
            description: `Vague de mutation affectant ${affected.length} organismes`,
            effects: {
              globalConsciousness: 0.05,
              mutations: affected.length
            }
          });
        }
      }
    }

    // 4. Mettre à jour les statuts
    organisms.forEach(org => {
      if (org.id !== this.myOrganismId) {
        const timeSinceLastSeen = now - org.lastSeen;
        if (timeSinceLastSeen > 300000) { // 5 minutes
          org.status = 'dormant';
        } else if (org.mutations > 5 && SecureRandom.random() < 0.1) {
          org.status = 'evolving';
        } else {
          org.status = 'active';
        }
      }
    });

    // Sauvegarder l'état
    this.saveNetworkState();
  }

  private generateMessageContent(from: string, to: string): string {
    const templates = [
      `${from} partage de l'énergie avec ${to}`,
      `Synchronisation de conscience entre ${from} et ${to}`,
      `${from} transmet une mutation à ${to}`,
      `Échange de patterns neuronaux initié`,
      `Signal de résonance harmonique détecté`,
      `Fusion partielle des flux énergétiques`
    ];
    return templates[Math.floor(SecureRandom.random() * templates.length)];
  }

  private saveNetworkState() {
    const state = {
      organisms: Array.from(this.organisms.entries()),
      messages: this.messages.slice(-100),
      events: this.events.slice(-50),
      lastUpdate: Date.now()
    };
    localStorage.setItem('symbiont_network_state', JSON.stringify(state));
  }

  // === API PUBLIQUE ===

  getNetworkData(): {
    nodes: NetworkOrganism[];
    links: Array<{ source: string; target: string; strength: number }>;
    stats: {
      totalOrganisms: number;
      activeOrganisms: number;
      totalConnections: number;
      averageConsciousness: number;
      totalMutations: number;
      networkAge: number;
    };
  } {
    const nodes = Array.from(this.organisms.values());
    const links: Array<{ source: string; target: string; strength: number }> = [];
    const processedPairs = new Set<string>();

    // Créer les liens uniques
    nodes.forEach(node => {
      node.connections.forEach(targetId => {
        const pairKey = [node.id, targetId].sort().join('-');
        if (!processedPairs.has(pairKey)) {
          processedPairs.add(pairKey);
          const target = this.organisms.get(targetId);
          if (target) {
            // Force du lien basée sur la similarité de conscience
            const strength = 1 - Math.abs(node.consciousness - target.consciousness);
            links.push({ source: node.id, target: targetId, strength });
          }
        }
      });
    });

    // Calculer les statistiques
    const activeOrganisms = nodes.filter(n => n.status === 'active').length;
    const totalConsciousness = nodes.reduce((sum, n) => sum + n.consciousness, 0);
    const totalMutations = nodes.reduce((sum, n) => sum + n.mutations, 0);
    const oldestOrganism = nodes.reduce((oldest, n) =>
      n.createdAt < oldest.createdAt ? n : oldest, nodes[0]);

    return {
      nodes,
      links,
      stats: {
        totalOrganisms: nodes.length,
        activeOrganisms,
        totalConnections: links.length,
        averageConsciousness: totalConsciousness / nodes.length,
        totalMutations,
        networkAge: Date.now() - (oldestOrganism?.createdAt || Date.now())
      }
    };
  }

  getMyOrganism(): NetworkOrganism | undefined {
    return this.organisms.get(this.myOrganismId);
  }

  getRecentMessages(limit: number = 20): NetworkMessage[] {
    return this.messages.slice(-limit).reverse();
  }

  getRecentEvents(limit: number = 10): NetworkEvent[] {
    return this.events.slice(0, limit);
  }

  sendMessage(toId: string, type: NetworkMessage['type'], content?: string): void {
    const from = this.organisms.get(this.myOrganismId);
    const to = this.organisms.get(toId);

    if (from && to) {
      const message: NetworkMessage = {
        id: generateSecureUUID(),
        from: this.myOrganismId,
        to: toId,
        type,
        content: content || this.generateMessageContent(from.name, to.name),
        timestamp: Date.now()
      };

      this.messages.push(message);
      from.messageCount++;
      to.messageCount++;

      // Effets selon le type de message
      switch(type) {
        case 'energy_share':
          to.energy = Math.min(1, to.energy + 0.1);
          from.energy = Math.max(0, from.energy - 0.05);
          break;
        case 'consciousness_sync':
          const avgConsciousness = (from.consciousness + to.consciousness) / 2;
          from.consciousness = avgConsciousness;
          to.consciousness = avgConsciousness;
          break;
        case 'mutation_exchange':
          to.mutations++;
          break;
      }

      this.saveNetworkState();
    }
  }

  evolveNetwork(): void {
    // Déclencher une évolution collective
    const organisms = Array.from(this.organisms.values());
    const participants = organisms.filter(() => SecureRandom.random() < 0.5);

    participants.forEach(org => {
      org.generation++;
      org.consciousness = Math.min(1, org.consciousness + 0.1);
      org.mutations += Math.floor(SecureRandom.random() * 3) + 1;

      // Améliorer un trait aléatoire
      const traits = Object.keys(org.traits) as Array<keyof typeof org.traits>;
      const trait = traits[Math.floor(SecureRandom.random() * traits.length)];
      org.traits[trait] = Math.min(1, org.traits[trait] + 0.15);
    });

    this.events.push({
      id: generateSecureUUID(),
      type: 'collective_evolution',
      timestamp: Date.now(),
      participants: participants.map(o => o.id),
      description: `Évolution collective majeure: ${participants.length} organismes évolués`,
      effects: {
        globalConsciousness: 0.15,
        mutations: participants.length * 2,
        connections: participants.length
      }
    });

    this.saveNetworkState();
  }

  cleanup(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
    }
  }
}

export const networkService = NetworkService.getInstance();
// Service P2P décentralisé avec WebRTC pour connexion directe entre organismes
import { generateSecureUUID } from '@shared/utils/uuid';
import { logger } from '@shared/utils/secureLogger';
import { SecureRandom } from '@shared/utils/secureRandom';

export interface P2PPeer {
  id: string;
  organism: {
    id: string;
    name: string;
    generation: number;
    health: number;
    energy: number;
    consciousness: number;
    mutations: number;
    dna: string;
    createdAt: number;
    traits: Record<string, number>;
  };
  connection: RTCPeerConnection;
  dataChannel: RTCDataChannel | null;
  status: 'connecting' | 'connected' | 'disconnected';
  lastSeen: number;
}

export interface P2PMessage {
  type: 'organism_update' | 'energy_share' | 'consciousness_sync' | 'mutation_exchange' | 'chat' | 'discovery';
  from: string;
  to?: string;
  data: any;
  timestamp: number;
}

// Configuration ICE pour contourner les NAT/Firewall
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' }
];

// Configuration pour le signaling via BroadcastChannel (entre onglets) ou WebSocket
// const SIGNALING_METHODS = {
//   BROADCAST: 'broadcast',  // Entre onglets du même navigateur
//   WEBSOCKET: 'websocket',  // Via serveur de signaling
//   WEBTORRENT: 'webtorrent', // Via DHT WebTorrent (vraiment décentralisé)
//   LIBP2P: 'libp2p'        // Via libp2p (IPFS-like)
// };

class P2PService {
  private static instance: P2PService;
  private peers: Map<string, P2PPeer> = new Map();
  private myId: string;
  private myOrganism: any;
  private broadcastChannel: BroadcastChannel | null = null;
  private signalingSocket: WebSocket | null = null;
  private messageHandlers: Map<string, (msg: P2PMessage) => void> = new Map();
  private discoveryInterval?: NodeJS.Timeout;

  private constructor() {
    this.myId = this.getMyPeerId();
    this.loadMyOrganism();
    this.initializeSignaling();
    this.startDiscovery();
  }

  static getInstance(): P2PService {
    if (!this.instance) {
      this.instance = new P2PService();
    }
    return this.instance;
  }

  private getMyPeerId(): string {
    let peerId = localStorage.getItem('symbiont_peer_id');
    if (!peerId) {
      peerId = generateSecureUUID();
      localStorage.setItem('symbiont_peer_id', peerId);
    }
    return peerId;
  }

  private loadMyOrganism(): void {
    const organismData = localStorage.getItem('symbiont_organism');
    if (organismData) {
      const organism = JSON.parse(organismData);
      this.myOrganism = {
        id: this.myId,
        name: 'Moi',
        generation: organism.generation || 1,
        health: organism.health || 1,
        energy: organism.energy || 0.8,
        consciousness: organism.consciousness || 0.5,
        mutations: organism.mutations?.length || 0,
        dna: organism.dna || this.generateDNA(),
        createdAt: organism.createdAt || Date.now(),
        traits: organism.traits || {}
      };
    } else {
      this.myOrganism = this.createDefaultOrganism();
    }
  }

  private createDefaultOrganism(): any {
    return {
      id: this.myId,
      name: 'Moi',
      generation: 1,
      health: 1,
      energy: 0.8,
      consciousness: 0.5,
      mutations: 0,
      dna: this.generateDNA(),
      createdAt: Date.now(),
      traits: {
        empathy: 0.5,
        creativity: 0.5,
        curiosity: 0.5,
        focus: 0.5,
        resilience: 0.5
      }
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

  private initializeSignaling(): void {
    // Méthode 1: BroadcastChannel pour découverte locale (même machine)
    try {
      this.broadcastChannel = new BroadcastChannel('symbiont_p2p_discovery');
      this.broadcastChannel.onmessage = (event) => {
        logger.info('P2P: Message BroadcastChannel reçu:', event.data);
        this.handleSignalingMessage(event.data);
      };
      logger.info('P2P: BroadcastChannel initialisé avec succès');
      console.log('P2P: BroadcastChannel prêt pour la découverte locale');
    } catch (e) {
      logger.warn('P2P: BroadcastChannel non disponible:', e);
      console.warn('P2P: BroadcastChannel error:', e);
    }

    // Méthode 2: WebSocket pour signaling global (optionnel)
    // Désactivé temporairement car ws:// ne fonctionne pas depuis chrome-extension://
    // this.connectToSignalingServer();
    logger.info('P2P: WebSocket signaling désactivé (incompatible avec chrome-extension)');

    // Méthode 3: DHT via WebTorrent (vraiment décentralisé)
    // this.initializeWebTorrent();
  }

  /*
  private _connectToSignalingServer(): void {
    // Serveur de signaling optionnel pour découverte globale
    // Pour un vrai P2P, on peut utiliser un serveur public ou auto-hébergé
    const SIGNALING_SERVERS = [
      'ws://localhost:8080',                   // Serveur local de dev (prioritaire)
      'wss://symbiont-signal.herokuapp.com',  // Serveur public (à créer)
      'wss://signal.symbiont.network'          // Futur serveur communautaire
    ];

    // Essayer les serveurs dans l'ordre
    for (const server of SIGNALING_SERVERS) {
      try {
        this.signalingSocket = new WebSocket(server);

        this.signalingSocket.onopen = () => {
          logger.info(`P2P: Connecté au serveur de signaling ${server}`);
          // S'annoncer
          this.signalingSocket?.send(JSON.stringify({
            type: 'announce',
            peerId: this.myId,
            organism: this.myOrganism
          }));
        };

        this.signalingSocket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          this.handleSignalingMessage(data);
        };

        this.signalingSocket.onerror = () => {
          logger.warn(`P2P: Erreur serveur ${server}`);
        };

        break; // Si connexion réussie, arrêter
      } catch (e) {
        logger.warn(`P2P: Impossible de se connecter à ${server}`);
      }
    }
  }
  */

  /*
  private _initializeWebTorrent(): void {
    // WebTorrent permet un vrai P2P via DHT (Distributed Hash Table)
    // Cela fonctionne sans serveur central
    try {
      const infoHash = 'symbiont-network-2024'; // Hash partagé par tous les organismes

      // Créer un "torrent" virtuel pour la découverte
      const discoveryData = {
        peerId: this.myId,
        organism: this.myOrganism,
        timestamp: Date.now()
      };

      // Utiliser le hash comme canal de découverte
      this.broadcastDiscovery(infoHash, discoveryData);
    } catch (e) {
      logger.warn('P2P: WebTorrent non disponible');
    }
  }
  */

  private broadcastDiscovery(channel: string, data: any): void {
    // Diffuser notre présence sur tous les canaux disponibles

    // 1. BroadcastChannel local
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'discovery',
        channel,
        data
      });
    }

    // 2. WebSocket si connecté
    if (this.signalingSocket?.readyState === WebSocket.OPEN) {
      this.signalingSocket.send(JSON.stringify({
        type: 'discovery',
        channel,
        data
      }));
    }

    // 3. localStorage comme fallback (polling)
    const discoveries = JSON.parse(localStorage.getItem('symbiont_discoveries') || '[]');
    discoveries.push({ ...data, timestamp: Date.now() });
    // Garder seulement les 50 dernières découvertes
    localStorage.setItem('symbiont_discoveries', JSON.stringify(discoveries.slice(-50)));
  }

  private startDiscovery(): void {
    // Annoncer notre présence régulièrement
    this.discoveryInterval = setInterval(() => {
      this.announcePresence();
      this.checkForPeers();
      this.cleanupDisconnectedPeers();
    }, 2000); // Toutes les 2 secondes pour une découverte plus rapide

    // Annonce initiale immédiate
    this.announcePresence();

    // Vérification immédiate aussi
    setTimeout(() => this.checkForPeers(), 500);
  }

  private announcePresence(): void {
    const announcement = {
      type: 'announce',
      peerId: this.myId,
      organism: this.myOrganism,
      timestamp: Date.now()
    };

    console.log('P2P: Annonce de présence, ID:', this.myId);
    logger.info('P2P: Announcing presence with ID:', this.myId);

    // Diffuser sur tous les canaux
    this.broadcastDiscovery('symbiont-network', announcement);
  }

  private checkForPeers(): void {
    // Vérifier les découvertes dans localStorage
    const discoveries = JSON.parse(localStorage.getItem('symbiont_discoveries') || '[]');
    const now = Date.now();

    discoveries.forEach((discovery: any) => {
      // Ignorer notre propre annonce et les annonces trop vieilles
      if (discovery.peerId !== this.myId && (now - discovery.timestamp) < 30000) {
        if (!this.peers.has(discovery.peerId)) {
          // Nouveau pair découvert !
          logger.info(`P2P: Nouveau pair découvert: ${discovery.peerId}`);
          this.connectToPeer(discovery.peerId, discovery.organism);
        }
      }
    });
  }

  private handleSignalingMessage(message: any): void {
    if (message.peerId === this.myId) return; // Ignorer nos propres messages

    switch (message.type) {
      case 'announce':
      case 'discovery':
        if (!this.peers.has(message.peerId)) {
          this.connectToPeer(message.peerId, message.organism || message.data?.organism);
        }
        break;

      case 'offer':
        this.handleOffer(message.peerId, message.offer);
        break;

      case 'answer':
        this.handleAnswer(message.peerId, message.answer);
        break;

      case 'ice-candidate':
        this.handleIceCandidate(message.peerId, message.candidate);
        break;
    }
  }

  private async connectToPeer(peerId: string, organismData: any): Promise<void> {
    if (this.peers.has(peerId)) return;

    logger.info(`P2P: Connexion au pair ${peerId}`);

    const connection = new RTCPeerConnection({
      iceServers: ICE_SERVERS
    });

    const peer: P2PPeer = {
      id: peerId,
      organism: organismData,
      connection,
      dataChannel: null,
      status: 'connecting',
      lastSeen: Date.now()
    };

    this.peers.set(peerId, peer);

    // Gérer les candidats ICE
    connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'ice-candidate',
          peerId: this.myId,
          targetPeerId: peerId,
          candidate: event.candidate
        });
      }
    };

    // Créer un canal de données
    const dataChannel = connection.createDataChannel('symbiont-data', {
      ordered: true,
      maxPacketLifeTime: 3000
    });

    dataChannel.onopen = () => {
      logger.info(`P2P: Canal ouvert avec ${peerId}`);
      peer.dataChannel = dataChannel;
      peer.status = 'connected';
      peer.lastSeen = Date.now();

      // Envoyer notre organisme
      this.sendToPeer(peerId, {
        type: 'organism_update',
        from: this.myId,
        data: this.myOrganism,
        timestamp: Date.now()
      });
    };

    dataChannel.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handlePeerMessage(peerId, message);
    };

    dataChannel.onclose = () => {
      logger.info(`P2P: Canal fermé avec ${peerId}`);
      peer.status = 'disconnected';
    };

    // Créer et envoyer une offre
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);

    this.sendSignalingMessage({
      type: 'offer',
      peerId: this.myId,
      targetPeerId: peerId,
      offer: offer
    });
  }

  private async handleOffer(peerId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    logger.info(`P2P: Offre reçue de ${peerId}`);

    const connection = new RTCPeerConnection({
      iceServers: ICE_SERVERS
    });

    const peer: P2PPeer = {
      id: peerId,
      organism: null as any, // Sera mis à jour
      connection,
      dataChannel: null,
      status: 'connecting',
      lastSeen: Date.now()
    };

    this.peers.set(peerId, peer);

    connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'ice-candidate',
          peerId: this.myId,
          targetPeerId: peerId,
          candidate: event.candidate
        });
      }
    };

    connection.ondatachannel = (event) => {
      const dataChannel = event.channel;
      peer.dataChannel = dataChannel;

      dataChannel.onopen = () => {
        logger.info(`P2P: Canal accepté de ${peerId}`);
        peer.status = 'connected';
        peer.lastSeen = Date.now();

        // Envoyer notre organisme
        this.sendToPeer(peerId, {
          type: 'organism_update',
          from: this.myId,
          data: this.myOrganism,
          timestamp: Date.now()
        });
      };

      dataChannel.onmessage = (event) => {
        const message = JSON.parse(event.data);
        this.handlePeerMessage(peerId, message);
      };
    };

    await connection.setRemoteDescription(offer);
    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);

    this.sendSignalingMessage({
      type: 'answer',
      peerId: this.myId,
      targetPeerId: peerId,
      answer: answer
    });
  }

  private async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const peer = this.peers.get(peerId);
    if (peer) {
      await peer.connection.setRemoteDescription(answer);
      logger.info(`P2P: Réponse traitée de ${peerId}`);
    }
  }

  private async handleIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const peer = this.peers.get(peerId);
    if (peer) {
      await peer.connection.addIceCandidate(candidate);
    }
  }

  private handlePeerMessage(peerId: string, message: P2PMessage): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.lastSeen = Date.now();

      switch (message.type) {
        case 'organism_update':
          peer.organism = message.data;
          break;

        case 'energy_share':
          this.handleEnergyShare(peerId, message.data);
          break;

        case 'consciousness_sync':
          this.handleConsciousnessSync(peerId, message.data);
          break;

        case 'mutation_exchange':
          this.handleMutationExchange(peerId, message.data);
          break;

        case 'chat':
          this.handleChatMessage(peerId, message.data);
          break;
      }

      // Notifier les handlers enregistrés
      this.messageHandlers.forEach(handler => handler(message));
    }
  }

  private handleEnergyShare(peerId: string, data: any): void {
    const amount = data.amount || 0.1;
    this.myOrganism.energy = Math.min(1, this.myOrganism.energy + amount);
    this.saveOrganism();
    logger.info(`P2P: Énergie reçue de ${peerId}: +${amount}`);
  }

  private handleConsciousnessSync(peerId: string, _data: any): void {
    const peer = this.peers.get(peerId);
    if (peer && peer.organism) {
      const avg = (this.myOrganism.consciousness + peer.organism.consciousness) / 2;
      this.myOrganism.consciousness = avg;
      this.saveOrganism();
      logger.info(`P2P: Conscience synchronisée avec ${peerId}: ${avg}`);
    }
  }

  private handleMutationExchange(peerId: string, _data: any): void {
    this.myOrganism.mutations++;
    // Mutation d'un trait aléatoire
    const traits = Object.keys(this.myOrganism.traits);
    const trait = traits[Math.floor(SecureRandom.random() * traits.length)];
    this.myOrganism.traits[trait] = Math.min(1, this.myOrganism.traits[trait] + 0.1);
    this.saveOrganism();
    logger.info(`P2P: Mutation reçue de ${peerId}`);
  }

  private handleChatMessage(peerId: string, data: any): void {
    logger.info(`P2P: Message de ${peerId}: ${data.text}`);
    // Stocker dans l'historique
    const messages = JSON.parse(localStorage.getItem('symbiont_p2p_messages') || '[]');
    messages.push({
      from: peerId,
      text: data.text,
      timestamp: Date.now()
    });
    localStorage.setItem('symbiont_p2p_messages', JSON.stringify(messages.slice(-100)));
  }

  private sendSignalingMessage(message: any): void {
    // Envoyer via tous les canaux disponibles

    // BroadcastChannel
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(message);
    }

    // WebSocket
    if (this.signalingSocket?.readyState === WebSocket.OPEN) {
      this.signalingSocket.send(JSON.stringify(message));
    }

    // localStorage comme fallback
    const signals = JSON.parse(localStorage.getItem('symbiont_signals') || '[]');
    signals.push({ ...message, timestamp: Date.now() });
    localStorage.setItem('symbiont_signals', JSON.stringify(signals.slice(-100)));
  }

  private sendToPeer(peerId: string, message: P2PMessage): void {
    const peer = this.peers.get(peerId);
    if (peer && peer.dataChannel && peer.dataChannel.readyState === 'open') {
      peer.dataChannel.send(JSON.stringify(message));
    }
  }

  private saveOrganism(): void {
    localStorage.setItem('symbiont_organism', JSON.stringify(this.myOrganism));
  }

  private cleanupDisconnectedPeers(): void {
    const now = Date.now();
    const timeout = 30000; // 30 secondes

    this.peers.forEach((peer, peerId) => {
      if (now - peer.lastSeen > timeout) {
        logger.info(`P2P: Déconnexion du pair inactif ${peerId}`);
        peer.connection.close();
        if (peer.dataChannel) {
          peer.dataChannel.close();
        }
        this.peers.delete(peerId);
      }
    });
  }

  // === API PUBLIQUE ===

  getPeers(): P2PPeer[] {
    return Array.from(this.peers.values()).filter(p => p.status === 'connected');
  }

  getConnectedCount(): number {
    return this.getPeers().length;
  }

  sendMessage(peerId: string, type: P2PMessage['type'], data: any): void {
    this.sendToPeer(peerId, {
      type,
      from: this.myId,
      to: peerId,
      data,
      timestamp: Date.now()
    });
  }

  broadcast(type: P2PMessage['type'], data: any): void {
    const message: P2PMessage = {
      type,
      from: this.myId,
      data,
      timestamp: Date.now()
    };

    this.peers.forEach((peer, peerId) => {
      if (peer.status === 'connected') {
        this.sendToPeer(peerId, message);
      }
    });
  }

  onMessage(handler: (msg: P2PMessage) => void): void {
    const id = generateSecureUUID();
    this.messageHandlers.set(id, handler);
  }

  shareEnergy(peerId: string, amount: number = 0.1): void {
    this.sendMessage(peerId, 'energy_share', { amount });
    // Réduire notre propre énergie
    this.myOrganism.energy = Math.max(0, this.myOrganism.energy - amount);
    this.saveOrganism();
  }

  syncConsciousness(peerId: string): void {
    this.sendMessage(peerId, 'consciousness_sync', {
      consciousness: this.myOrganism.consciousness
    });
  }

  exchangeMutation(peerId: string): void {
    this.sendMessage(peerId, 'mutation_exchange', {
      mutation: {
        type: 'trait_boost',
        trait: Object.keys(this.myOrganism.traits)[0]
      }
    });
  }

  sendChat(text: string, peerId?: string): void {
    if (peerId) {
      this.sendMessage(peerId, 'chat', { text });
    } else {
      this.broadcast('chat', { text });
    }
  }

  getMyOrganism(): any {
    return this.myOrganism;
  }

  cleanup(): void {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }

    this.peers.forEach(peer => {
      peer.connection.close();
      if (peer.dataChannel) {
        peer.dataChannel.close();
      }
    });

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }

    if (this.signalingSocket) {
      this.signalingSocket.close();
    }
  }
}

export const p2pService = P2PService.getInstance();
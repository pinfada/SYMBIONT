// Service P2P décentralisé avec WebRTC pour connexion directe entre organismes
import { generateSecureUUID } from '@shared/utils/uuid';
import { logger } from '@shared/utils/secureLogger';
import { SecureRandom } from '@shared/utils/secureRandom';
import { P2P_CONFIG } from '@/config/p2p.config';
import { cryptoService } from './CryptoService';

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
  publicKey?: string; // Clé publique pour le chiffrement E2E
  displayName?: string; // Nom anonyme généré
  hasEncryption?: boolean; // Indique si le chiffrement est actif
}

export interface P2PMessage {
  type: 'organism_update' | 'energy_share' | 'consciousness_sync' | 'mutation_exchange' | 'chat' | 'discovery' | 'key_exchange';
  from: string;
  to?: string;
  data: any;
  timestamp: number;
  encrypted?: boolean; // Indique si le message est chiffré
}

// Configuration ICE depuis le fichier de config
const ICE_SERVERS = P2P_CONFIG.ICE_SERVERS;

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

    // Méthode 2: WebSocket pour signaling global
    // Maintenant actif avec WSS sur Render !
    this.connectToSignalingServer();
    logger.info('P2P: Tentative de connexion au serveur de signaling WSS...');

    // Méthode 3: DHT via WebTorrent (vraiment décentralisé)
    // this.initializeWebTorrent();
  }

  private async connectToSignalingServer(): Promise<void> {
    // Serveur de signaling pour découverte globale
    const SIGNALING_SERVERS = P2P_CONFIG.SIGNALING_SERVERS;

    // Essayer les serveurs dans l'ordre
    for (const server of SIGNALING_SERVERS) {
      try {
        logger.info(`P2P: Tentative de connexion à ${server}...`);
        this.signalingSocket = new WebSocket(server);

        // Attendre la connexion avec timeout
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Connection timeout'));
          }, 5000);

          this.signalingSocket!.onopen = () => {
            clearTimeout(timeout);
            logger.info(`P2P: ✅ Connecté au serveur de signaling ${server}`);
            console.log(`P2P: Connected to signaling server: ${server}`);

            // S'annoncer au serveur
            this.signalingSocket?.send(JSON.stringify({
              type: 'announce',
              peerId: this.myId,
              organism: this.myOrganism
            }));

            // Envoyer un ping régulièrement pour maintenir la connexion
            setInterval(() => {
              if (this.signalingSocket?.readyState === WebSocket.OPEN) {
                this.signalingSocket.send(JSON.stringify({
                  type: 'ping',
                  peerId: this.myId
                }));
              }
            }, P2P_CONFIG.TIMEOUTS.HEARTBEAT_INTERVAL);

            resolve();
          };

          this.signalingSocket!.onerror = (error) => {
            clearTimeout(timeout);
            logger.warn(`P2P: Erreur serveur ${server}:`, error);
            reject(error);
          };
        });

        // Gérer les messages du serveur
        this.signalingSocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            switch(data.type) {
              case 'peers_list':
                // Liste des pairs connectés
                logger.info(`P2P: Reçu liste de ${data.peers?.length || 0} pairs`);
                data.peers?.forEach((peer: any) => {
                  if (!this.peers.has(peer.peerId)) {
                    this.connectToPeer(peer.peerId, peer.organism);
                  }
                });
                break;

              case 'peer_left':
                // Un pair s'est déconnecté
                logger.info(`P2P: Pair déconnecté: ${data.peerId}`);
                const peer = this.peers.get(data.peerId);
                if (peer) {
                  peer.connection.close();
                  this.peers.delete(data.peerId);
                }
                break;

              case 'pong':
                // Réponse au ping
                break;

              case 'error':
                logger.error('P2P: Erreur serveur:', data.message);
                break;

              default:
                // Messages de signaling WebRTC
                this.handleSignalingMessage(data);
            }
          } catch (error) {
            logger.error('P2P: Erreur parsing message:', error);
          }
        };

        this.signalingSocket.onclose = () => {
          logger.warn(`P2P: Déconnecté du serveur ${server}`);
          console.warn('P2P: Disconnected from signaling server');
          // Tentative de reconnexion après 5 secondes
          setTimeout(() => this.connectToSignalingServer(), 5000);
        };

        break; // Si connexion réussie, arrêter d'essayer les autres serveurs

      } catch (e) {
        logger.warn(`P2P: Impossible de se connecter à ${server}:`, e);
        console.warn(`P2P: Failed to connect to ${server}`, e);
      }
    }

    if (!this.signalingSocket || this.signalingSocket.readyState !== WebSocket.OPEN) {
      logger.warn('P2P: Aucun serveur de signaling disponible, mode local uniquement');
      console.warn('P2P: No signaling server available, local mode only');
    }
  }

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

    // Aussi annoncer via WebSocket si connecté
    if (this.signalingSocket?.readyState === WebSocket.OPEN) {
      this.signalingSocket.send(JSON.stringify(announcement));
    }
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
    // Vérifier si une connexion existe déjà ou est en cours
    const existingPeer = this.peers.get(peerId);
    if (existingPeer) {
      // Si déjà connecté ou en cours de connexion, ne pas reconnecter
      if (existingPeer.status === 'connected' || existingPeer.status === 'connecting') {
        logger.info(`P2P: Déjà connecté ou en cours avec ${peerId}`);
        return;
      }
      // Si déconnecté, nettoyer avant de reconnecter
      existingPeer.connection.close();
      this.peers.delete(peerId);
    }

    // Pour éviter les connexions simultanées, on décide qui initie selon l'ID
    // Le pair avec l'ID le plus petit initie la connexion
    if (peerId < this.myId) {
      logger.info(`P2P: En attente de connexion de ${peerId} (son ID est plus petit)`);
      return;
    }

    logger.info(`P2P: Initiation de connexion au pair ${peerId}`);

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
        // Convertir RTCIceCandidate en objet simple pour éviter l'erreur de clonage
        const candidateInit = {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          usernameFragment: event.candidate.usernameFragment
        };

        this.sendSignalingMessage({
          type: 'ice-candidate',
          peerId: this.myId,
          targetPeerId: peerId,
          candidate: candidateInit
        });
      }
    };

    // Créer un canal de données
    const dataChannel = connection.createDataChannel('symbiont-data', {
      ordered: true,
      maxPacketLifeTime: 3000
    });

    dataChannel.onopen = async () => {
      logger.info(`P2P: Canal ouvert avec ${peerId}`);
      peer.dataChannel = dataChannel;
      peer.status = 'connected';
      peer.lastSeen = Date.now();

      // Générer un nom anonyme pour ce pair
      peer.displayName = cryptoService.generateAnonymousName(peerId);

      // Échanger les clés publiques pour le chiffrement E2E
      try {
        const myPublicKey = await cryptoService.getPublicKeyString();
        await this.sendToPeer(peerId, {
          type: 'key_exchange',
          from: this.myId,
          data: { publicKey: myPublicKey },
          timestamp: Date.now()
        });
        logger.info(`P2P: Clé publique envoyée à ${peerId}`);
      } catch (error) {
        logger.error('P2P: Erreur envoi clé publique:', error);
      }

      // Envoyer notre organisme
      await this.sendToPeer(peerId, {
        type: 'organism_update',
        from: this.myId,
        data: this.myOrganism,
        timestamp: Date.now()
      });
    };

    dataChannel.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      await this.handlePeerMessage(peerId, message);
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

    // Vérifier si on a déjà une connexion avec ce pair
    const existingPeer = this.peers.get(peerId);
    if (existingPeer && (existingPeer.status === 'connected' || existingPeer.status === 'connecting')) {
      logger.info(`P2P: Ignoré offre de ${peerId}, déjà connecté ou en cours`);
      return;
    }

    // Nettoyer toute connexion existante
    if (existingPeer) {
      existingPeer.connection.close();
      this.peers.delete(peerId);
    }

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
        // Convertir RTCIceCandidate en objet simple pour éviter l'erreur de clonage
        const candidateInit = {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          usernameFragment: event.candidate.usernameFragment
        };

        this.sendSignalingMessage({
          type: 'ice-candidate',
          peerId: this.myId,
          targetPeerId: peerId,
          candidate: candidateInit
        });
      }
    };

    connection.ondatachannel = (event) => {
      const dataChannel = event.channel;
      peer.dataChannel = dataChannel;

      dataChannel.onopen = async () => {
        logger.info(`P2P: Canal accepté de ${peerId}`);
        peer.status = 'connected';
        peer.lastSeen = Date.now();

        // Générer un nom anonyme pour ce pair
        peer.displayName = cryptoService.generateAnonymousName(peerId);

        // Échanger les clés publiques pour le chiffrement E2E
        try {
          const myPublicKey = await cryptoService.getPublicKeyString();
          await this.sendToPeer(peerId, {
            type: 'key_exchange',
            from: this.myId,
            data: { publicKey: myPublicKey },
            timestamp: Date.now()
          });
          logger.info(`P2P: Clé publique envoyée à ${peerId}`);
        } catch (error) {
          logger.error('P2P: Erreur envoi clé publique:', error);
        }

        // Envoyer notre organisme
        await this.sendToPeer(peerId, {
          type: 'organism_update',
          from: this.myId,
          data: this.myOrganism,
          timestamp: Date.now()
        });
      };

      dataChannel.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        await this.handlePeerMessage(peerId, message);
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
    if (!peer) {
      logger.warn(`P2P: Réponse ignorée de ${peerId}, pair inconnu`);
      return;
    }

    // Vérifier l'état de signaling de la connexion
    const signalingState = peer.connection.signalingState;
    if (signalingState !== 'have-local-offer') {
      logger.warn(`P2P: Réponse ignorée de ${peerId}, état incorrect: ${signalingState}`);
      return;
    }

    try {
      await peer.connection.setRemoteDescription(answer);
      logger.info(`P2P: Réponse traitée de ${peerId}`);
    } catch (error) {
      logger.error(`P2P: Erreur lors du traitement de la réponse de ${peerId}:`, error);
      // Nettoyer la connexion en cas d'erreur
      peer.connection.close();
      this.peers.delete(peerId);
    }
  }

  private async handleIceCandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const peer = this.peers.get(peerId);
    if (peer) {
      await peer.connection.addIceCandidate(candidate);
    }
  }

  private async handlePeerMessage(peerId: string, message: P2PMessage): Promise<void> {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.lastSeen = Date.now();

      // Si le message est chiffré, le déchiffrer d'abord
      if (message.encrypted && message.data && typeof message.data === 'string') {
        try {
          const decryptedData = await cryptoService.decryptMessage(message.data);
          message.data = JSON.parse(decryptedData);
          logger.info(`P2P: Message déchiffré de ${peerId}`);
        } catch (error) {
          logger.error('P2P: Erreur déchiffrement message:', error);
          return;
        }
      }

      switch (message.type) {
        case 'key_exchange':
          // Stocker la clé publique du pair
          const publicKey = message.data.publicKey;
          if (publicKey) {
            await cryptoService.importPeerPublicKey(peerId, publicKey);
            peer.publicKey = publicKey;
            peer.hasEncryption = true;
            logger.info(`P2P: Clé publique reçue de ${peerId}, chiffrement E2E activé 🔐`);
          }
          break;

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

    // WebSocket prioritaire pour signaling WebRTC
    if (this.signalingSocket?.readyState === WebSocket.OPEN) {
      this.signalingSocket.send(JSON.stringify(message));
      logger.info(`P2P: Message envoyé via WSS: ${message.type}`);
    }

    // BroadcastChannel pour découverte locale
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(message);
    }

    // localStorage comme fallback
    const signals = JSON.parse(localStorage.getItem('symbiont_signals') || '[]');
    signals.push({ ...message, timestamp: Date.now() });
    localStorage.setItem('symbiont_signals', JSON.stringify(signals.slice(-100)));
  }

  private async sendToPeer(peerId: string, message: P2PMessage): Promise<void> {
    const peer = this.peers.get(peerId);
    if (peer && peer.dataChannel && peer.dataChannel.readyState === 'open') {
      // Si le pair a une clé publique et le message n'est pas un échange de clé, chiffrer
      if (peer.hasEncryption && message.type !== 'key_exchange' && cryptoService.hasPeerKey(peerId)) {
        try {
          // Chiffrer les données sensibles
          const dataString = JSON.stringify(message.data);
          const encryptedData = await cryptoService.encryptForPeer(peerId, dataString);

          // Envoyer le message avec données chiffrées
          const encryptedMessage = {
            ...message,
            data: encryptedData,
            encrypted: true
          };

          peer.dataChannel.send(JSON.stringify(encryptedMessage));
          logger.info(`P2P: Message chiffré envoyé à ${peerId} 🔐`);
        } catch (error) {
          logger.error('P2P: Erreur chiffrement message:', error);
          // Fallback: envoyer en clair si erreur
          peer.dataChannel.send(JSON.stringify(message));
        }
      } else {
        // Envoyer en clair (pas de clé ou échange de clé)
        peer.dataChannel.send(JSON.stringify(message));
      }
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

        // Nettoyer la clé de chiffrement
        cryptoService.removePeerKey(peerId);

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

  async sendMessage(peerId: string, type: P2PMessage['type'], data: any): Promise<void> {
    await this.sendToPeer(peerId, {
      type,
      from: this.myId,
      to: peerId,
      data,
      timestamp: Date.now()
    });
  }

  async broadcast(type: P2PMessage['type'], data: any): Promise<void> {
    const message: P2PMessage = {
      type,
      from: this.myId,
      data,
      timestamp: Date.now()
    };

    const promises: Promise<void>[] = [];
    this.peers.forEach((peer, peerId) => {
      if (peer.status === 'connected') {
        promises.push(this.sendToPeer(peerId, message));
      }
    });

    await Promise.all(promises);
  }

  onMessage(handler: (msg: P2PMessage) => void): void {
    const id = generateSecureUUID();
    this.messageHandlers.set(id, handler);
  }

  async shareEnergy(peerId: string, amount: number = 0.1): Promise<void> {
    await this.sendMessage(peerId, 'energy_share', { amount });
    // Réduire notre propre énergie
    this.myOrganism.energy = Math.max(0, this.myOrganism.energy - amount);
    this.saveOrganism();
  }

  async syncConsciousness(peerId: string): Promise<void> {
    await this.sendMessage(peerId, 'consciousness_sync', {
      consciousness: this.myOrganism.consciousness
    });
  }

  async exchangeMutation(peerId: string): Promise<void> {
    await this.sendMessage(peerId, 'mutation_exchange', {
      mutation: {
        type: 'trait_boost',
        trait: Object.keys(this.myOrganism.traits)[0]
      }
    });
  }

  async sendChat(text: string, peerId?: string): Promise<void> {
    if (peerId) {
      await this.sendMessage(peerId, 'chat', { text });
    } else {
      await this.broadcast('chat', { text });
    }
  }

  getMyOrganism(): any {
    return this.myOrganism;
  }

  // Obtenir les informations détaillées d'un pair
  getPeerInfo(peerId: string): P2PPeer | undefined {
    return this.peers.get(peerId);
  }

  // Vérifier si les messages avec un pair sont chiffrés
  isPeerEncrypted(peerId: string): boolean {
    const peer = this.peers.get(peerId);
    return peer?.hasEncryption === true && cryptoService.hasPeerKey(peerId);
  }

  cleanup(): void {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }

    this.peers.forEach((peer, peerId) => {
      // Nettoyer les clés de chiffrement
      cryptoService.removePeerKey(peerId);

      peer.connection.close();
      if (peer.dataChannel) {
        peer.dataChannel.close();
      }
    });

    this.peers.clear();

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }

    if (this.signalingSocket) {
      this.signalingSocket.close();
    }
  }
}

export const p2pService = P2PService.getInstance();
// Configuration P2P pour SYMBIONT
// Gère les URLs de signaling selon l'environnement

export const P2P_CONFIG = {
  // Serveurs de signaling (WebSocket)
  SIGNALING_SERVERS: [
    // Production sur Render (remplacer avec votre URL)
    'wss://symbiont-signaling.onrender.com',

    // Serveur local de développement
    'ws://localhost:8080',

    // Backup communautaire (à créer)
    // 'wss://signal.symbiont.community'
  ],

  // Serveurs STUN pour traverser les NAT
  ICE_SERVERS: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ],

  // Configuration des timeouts
  TIMEOUTS: {
    DISCOVERY_INTERVAL: 2000,      // Annonce toutes les 2 secondes
    PEER_TIMEOUT: 30000,           // Déconnexion après 30 secondes
    HEARTBEAT_INTERVAL: 10000,     // Ping toutes les 10 secondes
    CONNECTION_TIMEOUT: 15000      // Timeout de connexion 15 secondes
  },

  // Limites
  LIMITS: {
    MAX_PEERS: 50,                 // Maximum de pairs connectés
    MAX_MESSAGE_SIZE: 65536,       // 64KB max par message
    MAX_DISCOVERY_CACHE: 50,       // Découvertes en cache
    MAX_CHAT_HISTORY: 100          // Messages de chat gardés
  },

  // Activer/désactiver les méthodes de découverte
  DISCOVERY_METHODS: {
    BROADCAST_CHANNEL: true,       // Entre onglets (toujours activé)
    WEBSOCKET: true,               // Via serveur de signaling
    LOCAL_STORAGE: true,           // Polling localStorage (fallback)
    WEBTORRENT: false,            // DHT (futur)
    LIBP2P: false                 // IPFS-like (futur)
  }
};

// Fonction helper pour obtenir le meilleur serveur disponible
export async function getBestSignalingServer(): Promise<string | null> {
  for (const server of P2P_CONFIG.SIGNALING_SERVERS) {
    try {
      // Tester la connexion avec un timeout court
      const ws = new WebSocket(server);

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          ws.close();
          resolve(null);
        }, 3000);

        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve(server);
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          resolve(null);
        };
      });
    } catch {
      continue;
    }
  }

  return null;
}

// Détecter si on est en développement
export const isDevelopment = () => {
  return !chrome?.runtime?.id || chrome.runtime.id === 'development';
};
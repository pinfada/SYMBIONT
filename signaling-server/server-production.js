// Serveur de signaling de production pour SYMBIONT P2P
// Optimisé pour déploiement sur Render avec support HTTPS/WSS

const WebSocket = require('ws');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const PORT = process.env.PORT || 8080;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,chrome-extension://').split(',');

// Configuration CORS pour WebSocket
function verifyClient(info) {
  const origin = info.origin || info.req.headers.origin;

  // En production sur Render, accepter les connexions sécurisées
  if (IS_PRODUCTION) {
    // Accepter les extensions Chrome et les domaines autorisés
    const isAllowed = ALLOWED_ORIGINS.some(allowed => {
      if (allowed === 'chrome-extension://') {
        return origin?.startsWith('chrome-extension://');
      }
      return origin === allowed;
    });

    if (!isAllowed && origin) {
      console.log(`❌ Origine refusée: ${origin}`);
      return false;
    }
  }

  return true;
}

// Créer le serveur HTTP/HTTPS selon l'environnement
let server;

if (IS_PRODUCTION) {
  // En production sur Render, utiliser HTTP (Render gère HTTPS/WSS)
  server = http.createServer((req, res) => {
    // Headers CORS pour les requêtes HTTP
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.some(o => origin?.startsWith(o))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
    } else if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        name: 'SYMBIONT Signaling Server',
        status: 'online',
        peers: peers.size,
        secure: IS_PRODUCTION,
        timestamp: Date.now()
      }));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });
} else {
  // En développement, utiliser HTTP simple
  server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('SYMBIONT P2P Signaling Server (Development)\n');
  });
}

// Créer le serveur WebSocket avec vérification des origines
const wss = new WebSocket.Server({
  server,
  verifyClient: IS_PRODUCTION ? verifyClient : undefined,
  perMessageDeflate: {
    zlibDeflateOptions: {
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
    serverMaxWindowBits: 10,
    concurrencyLimit: 10,
    threshold: 1024
  }
});

// Stocker les pairs connectés avec métadonnées
const peers = new Map();

console.log(`🌐 SYMBIONT P2P Signaling Server ${IS_PRODUCTION ? '(PRODUCTION)' : '(DEVELOPMENT)'}`);
console.log(`================================`);

// Statistiques du serveur
let stats = {
  totalConnections: 0,
  messagesRelayed: 0,
  peersConnected: 0,
  startTime: Date.now()
};

wss.on('connection', (ws, req) => {
  // Vie privée : l'origine sert au contrôle CORS, mais ni l'IP ni aucune
  // donnée d'organisme ne sont stockées ou journalisées côté serveur.
  const origin = req.headers.origin || 'unknown';

  stats.totalConnections++;
  console.log(`✅ Nouveau pair connecté (origine: ${origin})`);

  let peerId = null;
  let pingInterval;

  // Heartbeat pour maintenir la connexion active sur Render
  pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, 30000); // Ping toutes les 30 secondes

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());

      // Limiter la taille des messages (protection DoS)
      if (message.length > 65536) { // 64KB max
        console.warn(`⚠️ Message trop large de ${peerId}: ${message.length} bytes`);
        return;
      }

      switch(data.type) {
        case 'announce':
          // Un pair s'annonce au réseau
          peerId = data.peerId;

          // Vérifier l'unicité du peerId
          if (peers.has(peerId)) {
            const existingPeer = peers.get(peerId);
            if (existingPeer.ws !== ws) {
              // Fermer l'ancienne connexion si elle existe
              existingPeer.ws.close();
            }
          }

          // Vie privée : on ne conserve QUE le peerId (identifiant de routage
          // éphémère). Aucun organisme, aucune IP. Les données d'organisme
          // ne transitent qu'en pair-à-pair chiffré (DataChannel WebRTC).
          peers.set(peerId, {
            ws: ws,
            lastSeen: Date.now()
          });

          stats.peersConnected = peers.size;

          console.log(`📢 Pair annoncé: ${peerId}`);

          // Notifier les autres pairs de la présence (peerId uniquement)
          broadcastToPeers({ type: 'announce', peerId, timestamp: Date.now() }, peerId);

          // Envoyer la liste des pairs existants au nouveau
          sendPeersList(ws, peerId);
          break;

        case 'discovery':
          // Relayer uniquement l'existence du pair, sans charge utile
          if (peerId) {
            broadcastToPeers({ type: 'discovery', peerId, timestamp: Date.now() }, peerId);
            stats.messagesRelayed++;
          }
          break;

        case 'offer':
        case 'answer':
        case 'ice-candidate':
          // Relayer les messages de signaling WebRTC
          const targetPeer = peers.get(data.targetPeerId);
          if (targetPeer && targetPeer.ws.readyState === WebSocket.OPEN) {
            targetPeer.ws.send(JSON.stringify({
              ...data,
              sourcePeerId: peerId
            }));
            console.log(`↔️ Relais ${data.type}: ${peerId} → ${data.targetPeerId}`);
            stats.messagesRelayed++;
          } else {
            console.log(`⚠️ Pair cible non trouvé: ${data.targetPeerId}`);
            // Notifier l'émetteur que le pair n'existe pas
            ws.send(JSON.stringify({
              type: 'peer_not_found',
              targetPeerId: data.targetPeerId
            }));
          }
          break;

        case 'ping':
          // Heartbeat pour maintenir la connexion
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          if (peerId) {
            const peer = peers.get(peerId);
            if (peer) {
              peer.lastSeen = Date.now();
            }
          }
          break;

        case 'stats':
          // Envoyer les statistiques du serveur
          ws.send(JSON.stringify({
            type: 'server_stats',
            stats: {
              ...stats,
              uptime: Date.now() - stats.startTime,
              currentPeers: Array.from(peers.keys())
            }
          }));
          break;
      }
    } catch (error) {
      console.error('❌ Erreur traitement message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });

  ws.on('close', () => {
    clearInterval(pingInterval);

    if (peerId) {
      peers.delete(peerId);
      stats.peersConnected = peers.size;
      console.log(`👋 Pair déconnecté: ${peerId}`);

      // Notifier les autres de la déconnexion
      broadcastToPeers({
        type: 'peer_left',
        peerId: peerId,
        timestamp: Date.now()
      }, peerId);
    }
  });

  ws.on('error', (error) => {
    console.error(`❌ Erreur WebSocket pour ${peerId}:`, error.message);
  });

  ws.on('pong', () => {
    // Client répond au ping, connexion active
    if (peerId) {
      const peer = peers.get(peerId);
      if (peer) {
        peer.lastSeen = Date.now();
      }
    }
  });
});

// Diffuser un message à tous les pairs sauf l'émetteur
function broadcastToPeers(message, excludePeerId) {
  let broadcasted = 0;
  peers.forEach((peer, id) => {
    if (id !== excludePeerId && peer.ws.readyState === WebSocket.OPEN) {
      peer.ws.send(JSON.stringify(message));
      broadcasted++;
    }
  });

  if (broadcasted > 0) {
    console.log(`📡 Message diffusé à ${broadcasted} pairs`);
  }
}

// Envoyer la liste des pairs existants (peerId uniquement — pas d'organisme)
function sendPeersList(ws, excludePeerId) {
  const peersList = [];

  peers.forEach((peer, id) => {
    if (id !== excludePeerId) {
      peersList.push({
        peerId: id,
        lastSeen: peer.lastSeen
      });
    }
  });

  if (peersList.length > 0) {
    ws.send(JSON.stringify({
      type: 'peers_list',
      peers: peersList,
      timestamp: Date.now()
    }));

    console.log(`📋 Liste envoyée: ${peersList.length} pairs existants`);
  }
}

// Nettoyer les pairs inactifs
setInterval(() => {
  const now = Date.now();
  const timeout = IS_PRODUCTION ? 120000 : 60000; // 2 minutes en prod, 1 minute en dev
  let cleaned = 0;

  peers.forEach((peer, id) => {
    if (now - peer.lastSeen > timeout) {
      console.log(`🧹 Nettoyage pair inactif: ${id}`);
      peer.ws.close();
      peers.delete(id);
      cleaned++;
    }
  });

  stats.peersConnected = peers.size;

  console.log(`📊 Statistiques:`);
  console.log(`   Pairs actifs: ${peers.size}`);
  console.log(`   Total connexions: ${stats.totalConnections}`);
  console.log(`   Messages relayés: ${stats.messagesRelayed}`);
  console.log(`   Uptime: ${Math.floor((Date.now() - stats.startTime) / 1000 / 60)} minutes`);

  if (cleaned > 0) {
    console.log(`   Pairs nettoyés: ${cleaned}`);
  }
}, 30000);

// Démarrer le serveur
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);

  if (IS_PRODUCTION) {
    console.log(`🔒 Mode PRODUCTION - WSS activé via Render`);
    console.log(`📡 WebSocket: wss://votre-app.onrender.com`);
  } else {
    console.log(`🔓 Mode DÉVELOPPEMENT`);
    console.log(`📡 WebSocket: ws://localhost:${PORT}`);
  }

  console.log('');
  console.log('Configuration:');
  console.log(`  Origines autorisées: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`  Compression: Activée`);
  console.log(`  Heartbeat: 30 secondes`);
  console.log(`  Timeout inactivité: ${IS_PRODUCTION ? '2' : '1'} minute(s)`);
  console.log('');
});

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
  console.log('\n🛑 Arrêt du serveur...');

  // Notifier tous les clients
  const shutdownMessage = JSON.stringify({
    type: 'server_shutdown',
    message: 'Server is shutting down',
    timestamp: Date.now()
  });

  wss.clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(shutdownMessage);
      ws.close();
    }
  });

  server.close(() => {
    console.log('✅ Serveur arrêté proprement');
    console.log(`📊 Statistiques finales:`);
    console.log(`   Total connexions: ${stats.totalConnections}`);
    console.log(`   Messages relayés: ${stats.messagesRelayed}`);
    console.log(`   Uptime: ${Math.floor((Date.now() - stats.startTime) / 1000 / 60)} minutes`);
    process.exit(0);
  });

  // Forcer l'arrêt après 10 secondes
  setTimeout(() => {
    console.error('⚠️ Arrêt forcé après timeout');
    process.exit(1);
  }, 10000);
});

process.on('SIGINT', () => {
  process.emit('SIGTERM');
});

// Log non capturées exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Exception non capturée:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesse rejetée non gérée:', reason);
});
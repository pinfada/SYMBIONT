// Serveur de signaling minimal pour SYMBIONT P2P
// Ce serveur facilite la découverte initiale des pairs
// Une fois connectés, les pairs communiquent directement sans passer par le serveur

const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;

// Créer un serveur HTTP simple
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('SYMBIONT P2P Signaling Server\n');
});

// Créer le serveur WebSocket
const wss = new WebSocket.Server({ server });

// Stocker les pairs connectés
const peers = new Map();

console.log(`🌐 SYMBIONT P2P Signaling Server`);
console.log(`================================`);

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`✅ Nouveau pair connecté: ${clientIp}`);

  let peerId = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());

      switch(data.type) {
        case 'announce':
          // Un pair s'annonce au réseau
          peerId = data.peerId;
          peers.set(peerId, {
            ws: ws,
            organism: data.organism,
            lastSeen: Date.now()
          });

          console.log(`📢 Pair annoncé: ${peerId} (${data.organism?.name || 'Unknown'})`);
          console.log(`   Génération: ${data.organism?.generation || 0}`);
          console.log(`   Conscience: ${Math.round((data.organism?.consciousness || 0) * 100)}%`);

          // Notifier tous les autres pairs
          broadcastToPeers(data, peerId);

          // Envoyer la liste des pairs existants au nouveau
          sendPeersList(ws, peerId);
          break;

        case 'discovery':
          // Diffuser la découverte aux autres
          broadcastToPeers(data, peerId);
          break;

        case 'offer':
        case 'answer':
        case 'ice-candidate':
          // Relayer les messages de signaling WebRTC
          const targetPeer = peers.get(data.targetPeerId);
          if (targetPeer && targetPeer.ws.readyState === WebSocket.OPEN) {
            targetPeer.ws.send(JSON.stringify(data));
            console.log(`↔️ Relais ${data.type}: ${data.peerId} → ${data.targetPeerId}`);
          }
          break;

        case 'ping':
          // Heartbeat pour maintenir la connexion
          ws.send(JSON.stringify({ type: 'pong' }));
          if (peerId) {
            const peer = peers.get(peerId);
            if (peer) {
              peer.lastSeen = Date.now();
            }
          }
          break;
      }
    } catch (error) {
      console.error('❌ Erreur message:', error);
    }
  });

  ws.on('close', () => {
    if (peerId) {
      peers.delete(peerId);
      console.log(`👋 Pair déconnecté: ${peerId}`);

      // Notifier les autres de la déconnexion
      broadcastToPeers({
        type: 'peer_left',
        peerId: peerId
      }, peerId);
    }
  });

  ws.on('error', (error) => {
    console.error(`❌ Erreur WebSocket pour ${peerId}:`, error.message);
  });
});

// Diffuser un message à tous les pairs sauf l'émetteur
function broadcastToPeers(message, excludePeerId) {
  peers.forEach((peer, id) => {
    if (id !== excludePeerId && peer.ws.readyState === WebSocket.OPEN) {
      peer.ws.send(JSON.stringify(message));
    }
  });
}

// Envoyer la liste des pairs existants
function sendPeersList(ws, excludePeerId) {
  const peersList = [];

  peers.forEach((peer, id) => {
    if (id !== excludePeerId) {
      peersList.push({
        peerId: id,
        organism: peer.organism
      });
    }
  });

  if (peersList.length > 0) {
    ws.send(JSON.stringify({
      type: 'peers_list',
      peers: peersList
    }));

    console.log(`📋 Liste envoyée: ${peersList.length} pairs existants`);
  }
}

// Nettoyer les pairs inactifs toutes les 30 secondes
setInterval(() => {
  const now = Date.now();
  const timeout = 60000; // 1 minute

  peers.forEach((peer, id) => {
    if (now - peer.lastSeen > timeout) {
      console.log(`🧹 Nettoyage pair inactif: ${id}`);
      peer.ws.close();
      peers.delete(id);
    }
  });

  console.log(`📊 Pairs actifs: ${peers.size}`);
}, 30000);

// Démarrer le serveur
server.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📡 WebSocket: ws://localhost:${PORT}`);
  console.log('');
  console.log('Les pairs peuvent se connecter pour découvrir d\'autres organismes');
  console.log('Une fois connectés en P2P, ils n\'ont plus besoin du serveur');
  console.log('');
});

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
  console.log('\n🛑 Arrêt du serveur...');
  wss.clients.forEach(ws => ws.close());
  server.close(() => {
    console.log('✅ Serveur arrêté proprement');
    process.exit(0);
  });
});

console.log('Statistiques en temps réel:');
console.log('============================\n');
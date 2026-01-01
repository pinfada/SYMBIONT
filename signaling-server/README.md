# 🌐 SYMBIONT Signaling Server

Serveur de signaling WebSocket pour le réseau P2P SYMBIONT. Ce serveur facilite la découverte initiale des pairs et l'échange des offres/réponses WebRTC. Une fois connectés, les pairs communiquent directement sans passer par le serveur.

## 🚀 Déploiement sur Render

### Méthode 1 : Déploiement automatique (Recommandé)

1. **Fork ou clone ce repository**
2. **Créer un compte sur [Render](https://render.com)**
3. **Connecter votre compte GitHub à Render**
4. **Créer un nouveau Web Service** :
   - Cliquer sur "New +" → "Web Service"
   - Choisir le repository `SYMBIONT`
   - Root Directory : `signaling-server`
   - Environment : `Node`
   - Build Command : `npm install`
   - Start Command : `node server-production.js`

5. **Variables d'environnement** (dans Render Dashboard) :
   ```
   NODE_ENV=production
   ALLOWED_ORIGINS=chrome-extension://,https://votre-site.com
   ```

6. **Cliquer sur "Create Web Service"**

Render va automatiquement :
- ✅ Provisionner un serveur
- ✅ Installer les dépendances
- ✅ Démarrer le serveur
- ✅ Fournir une URL HTTPS/WSS : `wss://symbiont-signaling.onrender.com`

### Méthode 2 : Déploiement via Blueprint (render.yaml)

1. **Pousser le code sur GitHub** :
   ```bash
   git add signaling-server/
   git commit -m "Add signaling server for Render deployment"
   git push
   ```

2. **Dans Render Dashboard** :
   - New → Blueprint
   - Connecter le repository
   - Render détectera automatiquement `render.yaml`
   - Cliquer sur "Apply"

### Configuration de l'extension

Une fois le serveur déployé, mettre à jour l'URL dans l'extension :

**Dans `/src/popup/services/P2PService.ts`** :
```typescript
// Remplacer ws://localhost:8080 par votre URL Render
const WS_URL = 'wss://symbiont-signaling.onrender.com';
```

## 🛠 Développement local

### Installation
```bash
cd signaling-server
npm install
```

### Lancer le serveur
```bash
# Mode développement
npm run dev

# Mode production local
NODE_ENV=production npm start
```

### Variables d'environnement
Créer un fichier `.env` basé sur `.env.example` :
```env
NODE_ENV=development
PORT=8080
ALLOWED_ORIGINS=chrome-extension://,http://localhost:3000
```

## 📡 API WebSocket

### Messages client → serveur

#### Announce (S'annoncer au réseau)
```json
{
  "type": "announce",
  "peerId": "unique-peer-id",
  "organism": {
    "name": "Mon Organisme",
    "generation": 5,
    "consciousness": 0.75
  }
}
```

#### Offer (Offre WebRTC)
```json
{
  "type": "offer",
  "peerId": "sender-id",
  "targetPeerId": "receiver-id",
  "offer": { /* RTCSessionDescription */ }
}
```

#### Answer (Réponse WebRTC)
```json
{
  "type": "answer",
  "peerId": "sender-id",
  "targetPeerId": "receiver-id",
  "answer": { /* RTCSessionDescription */ }
}
```

#### ICE Candidate
```json
{
  "type": "ice-candidate",
  "peerId": "sender-id",
  "targetPeerId": "receiver-id",
  "candidate": { /* RTCIceCandidate */ }
}
```

### Messages serveur → client

#### Liste des pairs
```json
{
  "type": "peers_list",
  "peers": [
    {
      "peerId": "peer-123",
      "organism": { /* ... */ },
      "lastSeen": 1704120000000
    }
  ]
}
```

#### Pair déconnecté
```json
{
  "type": "peer_left",
  "peerId": "disconnected-peer-id"
}
```

## 🔒 Sécurité

- **CORS** : Seules les origines autorisées peuvent se connecter
- **Rate limiting** : Protection contre le spam (limite de message à 64KB)
- **Heartbeat** : Déconnexion automatique des pairs inactifs
- **HTTPS/WSS** : Chiffrement obligatoire en production

## 📊 Monitoring

### Health Check
```
GET https://votre-serveur.onrender.com/health
```

### Statistiques
```
GET https://votre-serveur.onrender.com/
```

Retourne :
```json
{
  "name": "SYMBIONT Signaling Server",
  "status": "online",
  "peers": 42,
  "secure": true,
  "timestamp": 1704120000000
}
```

## 🎯 Architecture

```
Extension Chrome (WebRTC)
         ↓
    WSS (Secure)
         ↓
Render Web Service (signaling)
         ↓
  Relais messages
         ↓
Autres Extensions Chrome
```

### Flux de connexion P2P

1. **Peer A** se connecte au serveur et s'annonce
2. **Peer B** se connecte et reçoit la liste des pairs
3. **Peer A** envoie une offre WebRTC via le serveur
4. **Peer B** répond avec une réponse WebRTC
5. **ICE candidates** sont échangés via le serveur
6. **Connexion P2P établie** directement entre A et B
7. **Le serveur n'est plus nécessaire** pour la communication

## 🚨 Limitations du plan gratuit Render

- **Spin down** : Le serveur s'arrête après 15 min d'inactivité
- **Spin up** : ~30 secondes pour redémarrer
- **Bande passante** : 100 GB/mois
- **RAM** : 512 MB
- **CPU** : Partagé

Pour une meilleure disponibilité, considérer :
- Upgrade vers Render Starter ($7/mois)
- Utiliser un service de monitoring (UptimeRobot) pour garder le serveur actif
- Implémenter reconnexion automatique côté client

## 📝 License

MIT - Voir [LICENSE](../LICENSE)
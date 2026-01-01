# 🧪 Guide de Test P2P avec WSS sur Render

## ✅ État actuel

- **Serveur WSS déployé** : `wss://symbiont-ytla.onrender.com`
- **Status** : Online ✅
- **Extension mise à jour** : Build complété avec support WSS

## 📋 Test de connexion P2P

### 1. Charger l'extension dans Chrome

```bash
1. Ouvrir chrome://extensions
2. Activer le mode développeur
3. "Charger l'extension non empaquetée" → sélectionner le dossier /dist
```

### 2. Ouvrir la console développeur

```bash
1. Clic droit sur l'icône SYMBIONT → "Inspecter la popup"
2. Aller dans l'onglet Console
```

### 3. Vérifier la connexion WSS

Vous devriez voir dans la console :
```
P2P: Connected to signaling server: wss://symbiont-ytla.onrender.com
```

### 4. Test avec plusieurs profils Chrome

Pour tester le P2P entre différents organismes :

#### Méthode 1 : Profils Chrome différents
```bash
# Profil 1
chrome --user-data-dir=/tmp/chrome1

# Profil 2
chrome --user-data-dir=/tmp/chrome2
```

#### Méthode 2 : Mode incognito + normal
- Extension en mode normal
- Extension en mode incognito (activer dans chrome://extensions)

### 5. Vérifier dans l'onglet "Réseau Global"

Une fois 2 extensions connectées :
- Les organismes devraient apparaître
- Statut "Connecté" en vert
- Possibilité de chat, partage d'énergie, etc.

## 🔍 Diagnostic

### Vérifier le serveur Render

```bash
curl https://symbiont-ytla.onrender.com/
```

Réponse attendue :
```json
{
  "name": "SYMBIONT Signaling Server",
  "status": "online",
  "peers": X,
  "secure": true,
  "timestamp": ...
}
```

### Logs dans la console

Messages importants à surveiller :
- `P2P: ✅ Connecté au serveur de signaling`
- `P2P: Nouveau pair découvert`
- `P2P: Canal ouvert avec [peerId]`
- `P2P: Reçu liste de X pairs`

### Problèmes courants

#### "WebSocket connection failed"
- Le serveur Render peut être en spin down (attendre 30s)
- Vérifier l'URL dans `/src/config/p2p.config.ts`

#### "No peers found"
- Ouvrir 2+ instances de l'extension
- Attendre 2-3 secondes pour la découverte
- Vérifier que les 2 sont connectés au serveur WSS

#### "ICE connection failed"
- Firewall/NAT trop restrictif
- Essayer sur un réseau différent
- Les serveurs STUN Google sont bloqués → utiliser un VPN

## 📊 Monitoring du serveur

### Dashboard Render
- Aller sur render.com → votre service
- Onglet "Logs" pour voir les connexions
- Onglet "Metrics" pour la charge

### Statistiques en temps réel
```bash
# Voir le nombre de pairs connectés
curl https://symbiont-ytla.onrender.com/ | jq .peers
```

## 🎯 Test de charge

Pour tester avec plusieurs organismes :
```javascript
// Dans la console de chaque extension
p2pService.getConnectedCount() // Nombre de pairs connectés
p2pService.getPeers()          // Liste détaillée
```

## ✨ Fonctionnalités à tester

1. **Chat P2P** : Envoyer un message dans l'onglet Social
2. **Partage d'énergie** : Cliquer sur "Partager énergie"
3. **Synchronisation conscience** : "Synchroniser"
4. **Échange de mutations** : "Échanger mutation"

## 🔄 Prochaines étapes

Si les tests sont concluants :
1. ✅ Commit des changements
2. ✅ Push sur GitHub
3. ✅ Auto-deploy sur Render (si configuré)
4. 📦 Préparer pour Chrome Web Store

## 🚨 Note importante

Le serveur Render gratuit :
- S'arrête après 15 min d'inactivité
- Redémarre en ~30 secondes au premier appel
- Solution : Ping régulier ou upgrade vers Starter ($7/mois)
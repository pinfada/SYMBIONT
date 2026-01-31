# 🧬 SYMBIONT - Plan d'Amélioration & État d'Implémentation

**Date d'audit:** 31 Janvier 2026
**État global:** 70% des fonctionnalités déjà implémentées ou avec infrastructure existante

---

## 📊 MATRICE DE FAISABILITÉ

| Fonctionnalité | Faisabilité | Complétion | Risques | Temps Estimé |
|----------------|-------------|------------|---------|--------------|
| 1. Archéologie du DOM | ✅ ÉLEVÉE | 90% | FAIBLE | 4-8h |
| 2. Relais P2P Résilience | ⚠️ MOYENNE | 40% | MOYEN-ÉLEVÉ | 20-30h |
| 3. Analyse Prédation | ✅ ÉLEVÉE | 75% | FAIBLE-MOYEN | 8-12h |
| 4. Feedback Résonance | ✅ TRÈS ÉLEVÉE | 85% | TRÈS FAIBLE | 2-4h |
| 5. Noyau Sentinel | ⚠️ MOYENNE | 50% | MOYEN | 16-24h |

---

## 🎯 PLAN D'IMPLÉMENTATION DÉTAILLÉ

### PHASE 1: QUICK WINS (1 semaine)
*Objectif: Maximiser l'impact avec minimum d'effort*

#### 1.1 Feedback Sensoriel des Micro-Frictions (2-4h)
**État actuel:** Infrastructure complète, manque uniquement le câblage

**Actions:**
```typescript
// 1. Modifier src/content/observers/DOMResonanceSensor.ts
// Ligne 220: Changer le seuil de 0.3 à 0.4
if (correlation > 0.4) { // était 0.3

// 2. Ajouter dans src/popup/components/MysticalPanel.tsx
useEffect(() => {
  const handleResonance = (message: any) => {
    if (message.type === 'DOM_RESONANCE_DETECTED') {
      addMurmur(`Friction détectée: ${message.payload.state}`, 'warning');
    }
  };
  MessageBus.on('DOM_RESONANCE_DETECTED', handleResonance);
}, []);

// 3. Implémenter vibration WebGL dans src/content/webgl/OrganismRenderer.ts
updateParticleVibration(resonanceLevel: number) {
  this.particles.forEach(p => {
    p.velocity.x += (Math.random() - 0.5) * resonanceLevel;
    p.velocity.y += (Math.random() - 0.5) * resonanceLevel;
  });
}
```

**Validation:**
- [ ] Notifications MURMUR apparaissent à friction > 0.4
- [ ] Particules WebGL vibrent proportionnellement
- [ ] Pas de régression sur performances

#### 1.2 Activation Archéologie du DOM (4-8h)
**État actuel:** Fonctionnalité implémentée à 90%, manque UI et z-index

**Actions:**
```typescript
// 1. Ajouter dans src/popup/components/MysticalPanel.tsx
const AVAILABLE_RITUALS = [
  // ... existants
  {
    id: 'vision-spectrale',
    name: 'Vision Spectrale',
    description: 'Révèle les éléments cachés du DOM',
    handler: 'EXTRACT_HIDDEN_ELEMENTS',
    energy: 10,
    icon: '👁️'
  }
];

// 2. Modifier src/content/rituals/CountermeasureHandler.ts
// Ajouter détection z-index négatif (ligne ~360)
const negativeZIndex = Array.from(document.querySelectorAll('*'))
  .filter(el => {
    const zIndex = window.getComputedStyle(el).zIndex;
    return zIndex !== 'auto' && parseInt(zIndex) < 0;
  });

// 3. Connecter aux traits dans src/core/OrganismCore.ts
processHiddenElements(data: HiddenElementData) {
  const intuitionGain = data.hiddenElements.length * 0.1;
  const consciousnessGain = data.suspiciousPatterns * 0.2;

  this.traits.intuition = Math.min(100,
    this.traits.intuition + intuitionGain);
  this.traits.consciousness = Math.min(100,
    this.traits.consciousness + consciousnessGain);
}
```

**Validation:**
- [ ] Rituel "Vision Spectrale" visible dans UI Mystique
- [ ] Détection z-index négatif fonctionnelle
- [ ] Traits Intuition/Conscience augmentent après scan

---

### PHASE 2: VALEUR STRATÉGIQUE (2 semaines)

#### 2.1 Analyse de la Prédation Numérique (8-12h)
**État actuel:** Détection passive implémentée, manque interception active

**Actions:**
```typescript
// 1. Modifier manifest.json - Ajouter permission
"permissions": [
  // ... existantes
  "webRequest",
  "webRequestBlocking"
]

// 2. Créer src/background/TrackerInterceptor.ts
class TrackerInterceptor {
  private neuralMesh: NeuralMesh;
  private memoryFragments: Map<string, TrackerSignature>;

  initialize() {
    chrome.webRequest.onBeforeRequest.addListener(
      this.interceptRequest.bind(this),
      { urls: ["<all_urls>"] },
      ["requestBody"]
    );
  }

  async interceptRequest(details: chrome.webRequest.WebRequestDetails) {
    const isTracker = await this.analyzeTracker(details.url);
    if (isTracker.confidence > 0.7) {
      // Envoyer au NeuralMesh pour apprentissage
      this.neuralMesh.learn({
        type: 'TRACKER_SIGNATURE',
        data: this.extractSignature(details)
      });

      // Modifier traits organisme
      MessageBus.send({
        type: 'ORGANISM_TRAIT_UPDATE',
        payload: {
          cortisol: '+10',  // Stress immédiat
          curiosity: '+5'    // Apprentissage permanent
        }
      });
    }
  }
}

// 3. Implémenter fragments mémoire dans src/core/storage/SymbiontStorage.ts
async storeTrackerFragment(tracker: TrackerSignature) {
  const fragments = await this.get('trackerFragments') || [];
  fragments.push({
    ...tracker,
    timestamp: Date.now(),
    id: generateSecureUUID()
  });
  await this.set('trackerFragments', fragments);
}
```

**Validation:**
- [ ] Requêtes tracker interceptées en temps réel
- [ ] NeuralMesh apprend les signatures
- [ ] Cortisol augmente à la détection
- [ ] Fragments persistés dans storage

#### 2.2 Déploiement du Noyau Sentinel (16-24h)
**État actuel:** Workers existants, PatternDetector non implémenté

**Actions:**
```typescript
// 1. Implémenter src/behavioral/core/PatternDetector.ts
export class PatternDetector {
  private sequences: TemporalSequence[] = [];
  private patterns: Map<string, Pattern> = new Map();

  detectPattern(events: BehaviorEvent[]): DetectedPattern[] {
    // Algorithme de détection temporelle
    const patterns = [];

    // Sliding window pour séquences
    for (let i = 0; i < events.length - 3; i++) {
      const window = events.slice(i, i + 4);
      const pattern = this.analyzeWindow(window);
      if (pattern.confidence > 0.6) {
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  private analyzeWindow(window: BehaviorEvent[]): Pattern {
    // Calcul de similarité, fréquence, corrélation
    // ...
  }
}

// 2. Créer src/workers/PatternWorker.ts
self.onmessage = async (e) => {
  const { type, payload } = e.data;

  switch(type) {
    case 'DETECT_PATTERNS':
      const detector = new PatternDetector();
      const patterns = detector.detectPattern(payload.events);
      self.postMessage({
        type: 'PATTERNS_DETECTED',
        payload: patterns
      });
      break;

    case 'RESOURCE_CHECK':
      // Vérifier mémoire disponible
      if (performance.memory) {
        const usage = performance.memory.usedJSHeapSize /
                     performance.memory.jsHeapSizeLimit;
        if (usage > 0.85) { // 15% libre
          self.postMessage({
            type: 'HIBERNATION_REQUEST',
            payload: { reason: 'memory_pressure', usage }
          });
        }
      }
      break;
  }
};

// 3. Intégrer BackpressureController
// Dans src/background/index.ts
const backpressure = new BackpressureController();
const patternWorker = new Worker('pattern-worker.js');

setInterval(async () => {
  const pressure = await backpressure.getMemoryPressure();
  if (pressure > 0.85) {
    patternWorker.postMessage({ type: 'HIBERNATE' });
  } else if (pressure < 0.7) {
    patternWorker.postMessage({ type: 'RESUME' });
  }
}, 5000);
```

**Validation:**
- [ ] PatternWorker compile et charge
- [ ] Détection patterns déportée du thread principal
- [ ] Hibernation automatique à 85% mémoire
- [ ] MessageBus communication worker ↔ background

---

### PHASE 3: INNOVATION (3-4 semaines)

#### 3.1 Implémentation Relais P2P Résilience (20-30h)
**État actuel:** Infrastructure partielle, nécessite décision architecturale

**Options architecturales:**

**Option A: WebRTC Direct (Recommandé)**
```typescript
// src/social/P2PRelayManager.ts
class P2PRelayManager {
  private peerConnections: Map<string, RTCPeerConnection>;
  private healthMetrics: Map<string, PeerHealth>;

  async establishRelay(targetPeerId: string) {
    // 1. Négociation WebRTC via signaling server
    const pc = new RTCPeerConnection(iceConfig);

    // 2. Créer data channel chiffré
    const channel = pc.createDataChannel('relay', {
      ordered: true,
      maxRetransmits: 3
    });

    // 3. Chiffrer avec AES-GCM existant
    const encryptedData = await SecurityManager.encrypt(data);
    channel.send(encryptedData);
  }

  selectHealthyPeer(): string {
    // Utiliser NetworkLatencyCollector metrics
    return Array.from(this.healthMetrics.entries())
      .filter(([_, health]) => health.latency < 50 && health.jitter < 10)
      .sort((a, b) => a[1].score - b[1].score)[0]?.[0];
  }
}
```

**Option B: Backend WebSocket Proxy**
```typescript
// backend/src/services/RelayService.ts
class RelayService {
  private connections: Map<string, WebSocket>;

  handleRelayRequest(source: string, target: string, data: Buffer) {
    const targetWs = this.connections.get(target);
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
      targetWs.send(data);
    }
  }
}
```

**Implémentation visuelle "État Quantique":**
```typescript
// src/content/webgl/QuantumState.ts
class QuantumStateRenderer {
  private dualOrganisms: [Organism, Organism];

  renderQuantumState(canvas: HTMLCanvasElement) {
    // Dupliquer organisme avec décalage alpha
    this.dualOrganisms.forEach((org, i) => {
      ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 1000) * 0.3;
      ctx.translate(i * 10, 0);
      org.render(ctx);
    });
  }
}
```

**Validation:**
- [ ] Connexion P2P établie entre pairs
- [ ] Données relayées via pair sain
- [ ] Chiffrement AES-GCM appliqué
- [ ] État visuel "Quantique" actif
- [ ] Résilience augmentée de 30%

---

## 📋 ROADMAP RECOMMANDÉE

### Semaine 1 (Quick Wins)
- **Jour 1-2:** Feedback Résonance (2-4h)
- **Jour 3-5:** Archéologie DOM (4-8h)
- **Tests & Validation**

### Semaine 2-3 (Valeur Stratégique)
- **Semaine 2:** Analyse Prédation (8-12h)
- **Semaine 3:** Noyau Sentinel début (8h)
- **Tests d'intégration**

### Semaine 4-5 (Foundation)
- **Semaine 4:** Noyau Sentinel fin (8-16h)
- **Semaine 5:** Tests de charge et optimisation
- **Documentation**

### Semaine 6-8 (Innovation - Phase 2)
- **Décision architecture P2P**
- **Implémentation Relais Résilience**
- **Tests sécurité**
- **Déploiement beta**

---

## 🔒 CONSIDÉRATIONS SÉCURITÉ

### Permissions Chrome
- ⚠️ `webRequest`: Nécessite justification dans privacy policy
- ✅ Storage: Déjà chiffré via AES-GCM
- ✅ Logging: SecureLogger sanitize les données sensibles

### Privacy Compliance
- Tracker interception: Anonymiser avant stockage
- P2P Relay: Pas de données personnelles dans relay
- Hidden elements: Filtrer tokens/API keys avant traitement

### Performance Impact
- BackpressureController: Limite à 85% CPU/RAM
- Worker hibernation: Automatique sous 15% ressources libres
- Debouncing: Tous les observers ont délai 100-500ms

---

## ✅ CRITÈRES DE VALIDATION FINALE

### Métriques Techniques
- [ ] Latence UI < 100ms
- [ ] Utilisation CPU < 10% idle
- [ ] Utilisation RAM < 150MB
- [ ] Pas de memory leaks sur 24h

### Métriques Organiques
- [ ] Traits évoluent selon stimuli
- [ ] Neural learning converge
- [ ] Visualisation WebGL fluide 60fps
- [ ] Notifications pertinentes (pas de spam)

### Métriques Utilisateur
- [ ] Détection 90% des trackers connus
- [ ] Révélation éléments cachés pertinents
- [ ] Feedback friction avant ralentissement perceptible
- [ ] Resilience P2P améliore latence 30%

---

## 🚀 COMMANDES DE DÉPLOIEMENT

```bash
# Phase 1 - Quick Wins
git checkout -b feature/resonance-feedback
npm run test:watch
npm run build:full

# Phase 2 - Strategic
git checkout -b feature/tracker-analysis
npm run lint:fix
npm run test:e2e

# Phase 3 - Innovation
git checkout -b feature/p2p-relay
npm run test:security
npm run build:production

# Validation finale
npm run test:ci
npm run analyze
chrome://extensions/ → Load unpacked → dist/
```

---

## 📝 NOTES DE L'AUDIT

**Points Forts Identifiés:**
- Infrastructure de monitoring exceptionnelle (DOMResonanceSensor, NetworkLatencyCollector)
- Sécurité robuste (AES-GCM, SecureLogger, anonymisation)
- Architecture workers établie et fonctionnelle
- MessageBus typé pour toutes les fonctionnalités proposées

**Gaps Critiques:**
1. BroadcastChannel limité aux onglets (pas de vrai P2P)
2. PatternDetector non implémenté (stub 1 ligne)
3. Permission webRequest absente pour interception active

**Recommandation Finale:**
Commencer par Phase 1 (ROI maximal), puis Phase 2 pour valeur métier, reporter P2P Relay après validation concept avec utilisateurs beta.

---

*Document généré le 31/01/2026 - Claude Code Audit v4.1*
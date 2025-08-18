# 🌐 Fonctionnalités Sociales SYMBIONT

## 📋 Vue d'ensemble

Le système social de SYMBIONT permet aux organismes numériques d'interagir, d'évoluer collectivement et de former des réseaux d'intelligence distribuée respectant la vie privée des utilisateurs.

**Architecture P2P** : Communication directe entre extensions sans serveur central
**Anonymisation complète** : Aucune donnée personnelle n'est transmise
**Évolution collaborative** : Organismes qui s'enrichissent mutuellement

## 🎫 Système d'invitations contextuelles

### Génération d'invitations

```typescript
// InvitationService.ts - Création d'invitation
const invitation = await invitationService.generateInvitation({
  context: {
    domain: window.location.hostname,
    traits: organism.getAnonymizedTraits(),
    timestamp: Date.now()
  },
  ttl: 24 * 60 * 60 * 1000, // 24h expiration
  maxUses: 5
});

console.log(`Code d'invitation: ${invitation.code}`);
// Output: "SYMB-X7K9-M2P4-Q8W1"
```

### Structure des invitations

```typescript
interface Invitation {
  code: string;           // "SYMB-XXXX-XXXX-XXXX"
  createdAt: number;      // Timestamp création
  expiresAt: number;      // Expiration automatique
  maxUses: number;        // Limite d'utilisations
  usedCount: number;      // Nombre d'acceptations
  context: {
    domain: string;       // Domaine d'origine (anonymisé)
    traits: AnonymizedTraits; // Traits publics seulement
    compatibility: number; // Score de compatibilité
  };
  creator: {
    id: string;          // Hash anonyme
    networkSignature: string; // Signature cryptographique
  };
}
```

### Acceptation d'invitations

```typescript
// Processus d'acceptation
const response = await invitationService.acceptInvitation({
  code: "SYMB-X7K9-M2P4-Q8W1",
  recipientOrganism: myOrganism.getPublicData()
});

if (response.success) {
  console.log('Connexion établie !');
  // Déclenchement du processus de mutation partagée
}
```

### Sécurité et vie privée

```typescript
// Anonymisation des données contextuelles
function anonymizeContext(rawContext: RawContext): AnonymizedContext {
  return {
    domain: hashDomain(rawContext.domain),
    timeWindow: getTimeWindow(rawContext.timestamp), // Précision à l'heure
    activityLevel: quantizeActivity(rawContext.activity),
    interests: generalizeInterests(rawContext.interests)
  };
}
```

## 🧬 Mutations partagées et évolution collaborative

### Compatibilité génétique

```typescript
// SocialNetworkManager.ts - Calcul de compatibilité
function calculateCompatibility(
  organism1: Organism,
  organism2: Organism
): CompatibilityScore {
  
  const traitAlignment = compareTraits(organism1.traits, organism2.traits);
  const experienceOverlap = compareExperiences(organism1.memory, organism2.memory);
  const behaviorSynergy = analyzeBehaviorSynergy(organism1.patterns, organism2.patterns);
  
  return {
    overall: (traitAlignment + experienceOverlap + behaviorSynergy) / 3,
    dimensions: {
      curiosity: Math.abs(organism1.traits.curiosity - organism2.traits.curiosity),
      social: calculateSocialAffinitiy(organism1, organism2),
      exploration: compareExplorationPatterns(organism1, organism2)
    },
    recommendation: generateMutationSuggestions(organism1, organism2)
  };
}
```

### Processus de mutation collaboratif

```typescript
// Fusion de traits entre organismes compatibles
async function performSharedMutation(
  organism1: Organism,
  organism2: Organism,
  compatibility: CompatibilityScore
): Promise<MutationResult> {
  
  // 1. Sélection des traits à échanger
  const selectedTraits = selectOptimalTraits(organism1, organism2, compatibility);
  
  // 2. Création des variants génétiques
  const variants = await generateMutationVariants({
    source: selectedTraits.from,
    target: selectedTraits.to,
    strength: compatibility.overall
  });
  
  // 3. Application des mutations avec validation
  const mutations = await Promise.all([
    organism1.applyMutation(variants.forOrganism1),
    organism2.applyMutation(variants.forOrganism2)
  ]);
  
  // 4. Sauvegarde distribuée
  await Promise.all([
    organism1.save(),
    organism2.save(),
    logSocialInteraction(organism1.id, organism2.id, mutations)
  ]);
  
  return {
    success: true,
    mutations: mutations,
    newCompatibility: await calculateCompatibility(organism1, organism2)
  };
}
```

### Types de mutations sociales

```typescript
enum SocialMutationType {
  TRAIT_EXCHANGE = 'trait_exchange',    // Échange direct de traits
  TRAIT_FUSION = 'trait_fusion',        // Fusion créant nouveau trait
  EXPERIENCE_SHARE = 'experience_share', // Partage d'expériences
  PATTERN_SYNC = 'pattern_sync',        // Synchronisation de patterns
  COLLECTIVE_BOOST = 'collective_boost' // Amplification mutuelle
}

interface MutationOutcome {
  type: SocialMutationType;
  success: boolean;
  participants: string[];              // IDs anonymes
  traitChanges: TraitDelta[];
  experienceGain: number;
  networkEffect: NetworkImpact;
}
```

## 🧠 Intelligence collective

### Système de réveil collectif

```typescript
// CollectiveIntelligence.ts - Événements synchronisés
class CollectiveWakeRitual {
  async initiateGlobalWake(initiator: Organism): Promise<RitualResult> {
    // 1. Propagation P2P du signal de réveil
    const wakeSignal = {
      id: generateRitualId(),
      type: 'COLLECTIVE_WAKE',
      initiator: initiator.getAnonymousId(),
      timestamp: Date.now(),
      energyBoost: calculateEnergyContribution(initiator),
      participants: []
    };
    
    // 2. Diffusion sur le réseau social
    const propagationResults = await this.propagateSignal(wakeSignal);
    
    // 3. Collecte des réponses
    const participants = await this.collectParticipants(wakeSignal.id, 30000); // 30s
    
    // 4. Application des effets collectifs
    const ritualEffects = await this.applyCollectiveEffects(participants);
    
    return {
      participantCount: participants.length,
      energyAmplification: ritualEffects.energyMultiplier,
      networkStrength: ritualEffects.newConnections,
      success: participants.length >= 3 // Minimum pour réussite
    };
  }
}
```

### Analyse du réseau social

```typescript
// Métriques du réseau social distribuées
interface NetworkAnalytics {
  personalMetrics: {
    connectionCount: number;
    mutationParticipation: number;
    ritualContributions: number;
    influenceScore: number;
  };
  
  networkHealth: {
    totalNodes: number;           // Estimé via gossip protocol
    averageConnectivity: number;  // Connectivité moyenne
    mutationRate: number;         // Taux de mutations/heure
    collectiveActivity: number;   // Niveau d'activité global
  };
  
  emergentPatterns: {
    trendingTraits: TraitTrend[];
    popularDomains: DomainActivity[];
    ritualFrequency: RitualStats[];
    innovationHotspots: InnovationZone[];
  };
}
```

### Mécanismes de résistance et résilience

```typescript
// SocialResilience.ts - Protection contre les attaques
class SocialResilienceSystem {
  
  // Protection contre le spam d'invitations
  async validateInvitation(invitation: Invitation): Promise<ValidationResult> {
    const checks = await Promise.all([
      this.checkRateLimit(invitation.creator.id),
      this.validateCryptographicSignature(invitation),
      this.assessSuspiciousPatterns(invitation),
      this.verifyNetworkReputation(invitation.creator.id)
    ]);
    
    return {
      valid: checks.every(check => check.passed),
      reasons: checks.filter(check => !check.passed).map(check => check.reason),
      riskScore: this.calculateRiskScore(checks)
    };
  }
  
  // Protection contre les mutations malveillantes
  async validateMutation(mutation: ProposedMutation): Promise<boolean> {
    // Vérifier que la mutation n'est pas destructive
    const impactAnalysis = await this.analyzeMutationImpact(mutation);
    
    return impactAnalysis.riskLevel < 0.3 && // Risque faible
           impactAnalysis.benefitScore > 0.5 && // Bénéfice significatif
           impactAnalysis.reversible; // Mutation réversible
  }
}
```

## 🌍 Protocoles de communication P2P

### Architecture WebRTC

```typescript
// P2PConnection.ts - Communication directe
class P2PConnectionManager {
  private connections: Map<string, RTCPeerConnection> = new Map();
  
  async establishConnection(peerId: string, offer?: RTCSessionDescription): Promise<void> {
    const connection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });
    
    // Configuration des canaux de données
    const dataChannel = connection.createDataChannel('symbiont', {
      ordered: true,
      maxRetransmits: 3
    });
    
    dataChannel.onmessage = (event) => {
      this.handleP2PMessage(peerId, JSON.parse(event.data));
    };
    
    this.connections.set(peerId, connection);
  }
}
```

### Protocole de découverte

```typescript
// PeerDiscovery.ts - Découverte d'organismes
interface DiscoveryBeacon {
  id: string;
  type: 'DISCOVERY_BEACON';
  capabilities: string[];
  lastSeen: number;
  publicTraits: AnonymizedTraits;
  networkSignature: string;
}

class PeerDiscoveryService {
  async broadcastPresence(): Promise<void> {
    const beacon: DiscoveryBeacon = {
      id: this.getAnonymousId(),
      type: 'DISCOVERY_BEACON',
      capabilities: ['mutation', 'ritual', 'analysis'],
      lastSeen: Date.now(),
      publicTraits: this.organism.getPublicTraits(),
      networkSignature: await this.signBeacon()
    };
    
    // Diffusion via WebRTC DataChannels
    await this.broadcastToNetwork(beacon);
  }
}
```

## 📊 Métriques et observabilité sociale

### Tableaux de bord collectifs

```typescript
// SocialDashboard.tsx - Interface réseau social
const SocialDashboard: React.FC = () => {
  const { networkStats, connections, recentInteractions } = useSocialData();
  
  return (
    <div className="social-dashboard">
      <NetworkHealthWidget stats={networkStats} />
      <ConnectionsGraph connections={connections} />
      <RecentInteractions interactions={recentInteractions} />
      <MutationOpportunities suggestions={connections} />
    </div>
  );
};
```

### Anonymisation et confidentialité

```typescript
// PrivacyGuard.ts - Protection des données
class PrivacyGuard {
  
  // Masquage des données sensibles
  static anonymizeForSharing(data: any): any {
    return {
      ...data,
      userId: hashUserId(data.userId),
      location: generalizeLocation(data.location),
      timestamps: quantizeTimestamps(data.timestamps),
      personalData: undefined // Suppression explicite
    };
  }
  
  // Vérification avant transmission
  static validateDataSafety(data: any): boolean {
    const sensitiveFields = ['email', 'password', 'realName', 'address'];
    return !this.containsSensitiveData(data, sensitiveFields);
  }
}
```

## 🚀 Feuille de route sociale

### Fonctionnalités en développement

1. **Communautés thématiques** : Regroupement par centres d'intérêt
2. **Économie des mutations** : Système de "crédits" pour mutations rares
3. **Tournois d'évolution** : Compétitions d'optimisation collective
4. **Archives collectives** : Mémoire partagée du réseau
5. **IA collective** : Prédictions basées sur l'intelligence de groupe

### Intégrations prévues

- **WebRTC avancé** : Communication vidéo pour rituels immersifs
- **Blockchain légère** : Traçabilité des mutations importantes
- **ML fédéré** : Apprentissage collectif sans partage de données
- **Réalité augmentée** : Visualisation 3D des réseaux sociaux

### Métriques de succès

- **Adoption** : 1000+ organismes connectés en réseau
- **Engagement** : 10+ mutations sociales par utilisateur/mois  
- **Résilience** : 99.9% de disponibilité du réseau P2P
- **Innovation** : 5+ nouveaux patterns émergents par semaine 
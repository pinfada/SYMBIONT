/**
 * StructureInstinctRitual.ts
 * Rituel de l'Éveil de l'Instinct de Structure - Deep Analysis
 * Analyse sémantique profonde pour révéler les connexions cachées
 */

import {
  IRitual,
  RitualType,
  RitualStatus,
  RitualTriggerCondition,
  RitualContext,
  RitualResult,
  RitualMetrics,
  RitualHealth
} from '../interfaces/IRitual';
import { logger } from '@/shared/utils/secureLogger';
import { SecureRandom } from '@/shared/utils/secureRandom';
import { MessageBus, MessageType } from '@/shared/messaging/MessageBus';

interface HiddenElement {
  type: 'comment' | 'meta' | 'link' | 'script' | 'data' | 'microdata';
  content: string;
  location: string;
  significance: number;
  pattern?: string;
}

interface SemanticPattern {
  id: string;
  type: 'connection' | 'reference' | 'dependency' | 'alternative' | 'hidden';
  source: string;
  target: string;
  strength: number;
  metadata: Record<string, unknown>;
}

interface DeepInsight {
  category: 'resource' | 'tracking' | 'api' | 'social' | 'semantic' | 'structural';
  description: string;
  evidence: HiddenElement[];
  implications: string[];
  actionable: boolean;
  severity: 'info' | 'warning' | 'critical';
}

export class StructureInstinctRitual implements IRitual {
  public readonly id = 'structure-instinct-001';
  public readonly type = RitualType.STRUCTURE_INSTINCT;
  public readonly name = 'Éveil de l\'Instinct de Structure';
  public readonly description = 'Analyse profonde révélant les connexions invisibles et sources alternatives';

  public readonly triggers: RitualTriggerCondition[] = [
    {
      type: 'PATTERN',
      metric: 'mutationStagnation',
      operator: '>',
      value: 300000, // 5 minutes sans mutation
      cooldownMs: 900000 // 15 minutes
    },
    {
      type: 'THRESHOLD',
      metric: 'consciousness',
      operator: '<',
      value: 30, // Conscience faible
      cooldownMs: 900000
    }
  ];

  public readonly priority = 7;
  public readonly maxExecutionsPerHour = 4;
  public readonly requiresUserConsent = false;

  public status: RitualStatus = RitualStatus.IDLE;
  public lastExecutionTime = 0;
  public executionCount = 0;

  private messageBus: MessageBus;
  private discoveredPatterns: Map<string, SemanticPattern> = new Map();
  private insights: DeepInsight[] = [];
  private semanticCache: Map<string, any> = new Map();

  private metrics = {
    hiddenElementsFound: 0,
    patternsDiscovered: 0,
    insightsGenerated: 0,
    mutationsTriggered: 0,
    alternativeSourcesFound: 0,
    semanticDepth: 0
  };

  constructor() {
    this.messageBus = new MessageBus('structure-instinct-ritual');
  }

  /**
   * Vérifie si le rituel peut être déclenché
   */
  public canTrigger(context: RitualContext): boolean {
    const now = Date.now();
    const timeSinceLastExecution = now - this.lastExecutionTime;
    const minCooldown = Math.min(...this.triggers.map(t => t.cooldownMs || 0));

    if (timeSinceLastExecution < minCooldown) {
      return false;
    }

    // Vérifier la stagnation des mutations
    const organism = context.organism;
    const timeSinceLastMutation = now - (organism.lastMutation || 0);

    // Condition spéciale : léthargie informationnelle
    if (timeSinceLastMutation > 300000) { // 5 minutes
      logger.debug('[StructureInstinct] Lethargy detected, triggering analysis');
      return true;
    }

    // Vérifier les conditions standard
    for (const trigger of this.triggers) {
      if (this.evaluateTrigger(trigger, context)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Exécute le rituel d'analyse profonde
   */
  public async execute(context: RitualContext): Promise<RitualResult> {
    try {
      this.status = RitualStatus.EXECUTING;
      const startTime = performance.now();

      logger.info('[StructureInstinct] Starting deep structural analysis', {
        consciousness: context.organism.consciousness,
        stagnationTime: Date.now() - (context.organism.lastMutation || 0)
      });

      // Phase 1: Extraction du DOM profond
      const hiddenElements = await this.extractHiddenElements();
      logger.info(`[StructureInstinct] Found ${hiddenElements.length} hidden elements`);

      // Phase 2: Analyse sémantique
      const patterns = await this.analyzeSemanticPatterns(hiddenElements);
      logger.info(`[StructureInstinct] Discovered ${patterns.length} semantic patterns`);

      // Phase 3: Découverte de ressources alternatives
      const alternatives = await this.discoverAlternativeResources(patterns);

      // Phase 4: Génération d'insights
      const insights = await this.generateDeepInsights(hiddenElements, patterns, alternatives);

      // Phase 5: Déclencher une mutation de rupture
      const mutation = await this.triggerBreakthroughMutation(context, insights);

      // Phase 6: Activer l'effet visuel neural
      await this.activateNeuralVisualization(context, patterns.length);

      // Calculer les métriques
      const executionTime = performance.now() - startTime;
      const impactScore = this.calculateImpactScore(insights, mutation);

      this.status = RitualStatus.COMPLETED;
      this.lastExecutionTime = Date.now();
      this.executionCount++;

      // Préparer le message pour l'utilisateur
      const topInsight = insights
        .sort((a, b) => b.evidence.length - a.evidence.length)[0];

      return {
        success: true,
        status: RitualStatus.COMPLETED,
        effects: [
          {
            type: 'DATA',
            target: 'semantic_analysis',
            duration: 3600000, // 1 heure
            intensity: 0.9,
            reversible: false
          },
          {
            type: 'ORGANISM',
            target: 'breakthrough_mutation',
            duration: 1800000, // 30 minutes
            intensity: mutation ? 0.8 : 0.3,
            reversible: false
          },
          {
            type: 'VISUAL',
            target: 'neural_mesh',
            duration: 20000,
            intensity: 0.85,
            reversible: true
          }
        ],
        metrics: {
          executionTime,
          resourcesUsed: hiddenElements.length + patterns.length,
          impactScore
        },
        message: topInsight ?
          `Rupture détectée : ${topInsight.description}. ${insights.length} nouvelles connexions révélées.` :
          `Analyse profonde complétée : ${patterns.length} patterns structurels identifiés.`
      };

    } catch (error) {
      logger.error('[StructureInstinct] Ritual execution failed:', error);
      this.status = RitualStatus.FAILED;

      return {
        success: false,
        status: RitualStatus.FAILED,
        effects: [],
        metrics: {
          executionTime: 0,
          resourcesUsed: 0,
          impactScore: 0
        },
        error: error as Error
      };
    }
  }

  /**
   * Extrait les éléments cachés du DOM
   */
  private async extractHiddenElements(): Promise<HiddenElement[]> {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (!tabs[0]?.id) {
          resolve([]);
          return;
        }

        try {
          // Envoyer un message au content script pour analyser le DOM
          chrome.tabs.sendMessage(
            tabs[0].id,
            {
              type: MessageType.EXTRACT_HIDDEN_ELEMENTS,
              payload: {
                maxElements: 100, // Limiter pour la performance
                depth: 3 // Profondeur maximale de recherche
              }
            },
            (response) => {
              const elements = response?.elements || [];
              this.metrics.hiddenElementsFound = elements.length;
              resolve(elements);
            }
          );

        } catch (error) {
          logger.error('[StructureInstinct] DOM extraction failed:', error);
          resolve([]);
        }
      });
    });
  }

  /**
   * Fonction d'analyse profonde du DOM (exécutée dans la page)
   */
  private deepDOMAnalysis(): HiddenElement[] {
    const hiddenElements: HiddenElement[] = [];

    // 1. Extraire les commentaires HTML
    const walkComments = (node: Node) => {
      if (node.nodeType === Node.COMMENT_NODE) {
        const content = node.nodeValue?.trim() || '';
        if (content && !content.startsWith('[if') && content.length > 10) {
          hiddenElements.push({
            type: 'comment',
            content,
            location: (node.parentElement?.tagName || 'document').toLowerCase(),
            significance: content.includes('http') || content.includes('api') ? 0.8 : 0.3
          });
        }
      }

      for (const child of node.childNodes) {
        walkComments(child);
      }
    };
    walkComments(document.documentElement);

    // 2. Analyser les meta tags non standards
    document.querySelectorAll('meta').forEach(meta => {
      const name = meta.getAttribute('name') || meta.getAttribute('property') || '';
      const content = meta.getAttribute('content') || '';

      if (name && content && !['viewport', 'description', 'keywords'].includes(name)) {
        hiddenElements.push({
          type: 'meta',
          content: `${name}: ${content}`,
          location: 'head',
          significance: name.includes('og:') || name.includes('twitter:') ? 0.6 : 0.4
        });
      }
    });

    // 3. Liens cachés ou alternatifs
    document.querySelectorAll('link').forEach(link => {
      const rel = link.getAttribute('rel') || '';
      const href = link.getAttribute('href') || '';

      if (href && !['stylesheet', 'icon', 'manifest'].includes(rel)) {
        hiddenElements.push({
          type: 'link',
          content: `${rel}: ${href}`,
          location: 'head',
          significance: ['alternate', 'prefetch', 'preconnect'].includes(rel) ? 0.7 : 0.5
        });
      }
    });

    // 4. Scripts avec données inline
    document.querySelectorAll('script').forEach(script => {
      const content = script.textContent || '';

      // Rechercher des patterns de données
      const jsonPattern = /window\.\w+\s*=\s*({[\s\S]*?});/g;
      const apiPattern = /(https?:\/\/[^\s"']+api[^\s"']*)/gi;

      let match;
      while ((match = jsonPattern.exec(content)) !== null) {
        try {
          const data = JSON.parse(match[1]);
          if (Object.keys(data).length > 0) {
            hiddenElements.push({
              type: 'data',
              content: JSON.stringify(data).substring(0, 200),
              location: 'script',
              significance: 0.75,
              pattern: 'embedded_json'
            });
          }
        } catch {}
      }

      const apis = content.match(apiPattern);
      if (apis && apis.length > 0) {
        apis.forEach(api => {
          hiddenElements.push({
            type: 'script',
            content: api,
            location: 'script',
            significance: 0.85,
            pattern: 'api_endpoint'
          });
        });
      }
    });

    // 5. Microdata et structured data
    document.querySelectorAll('[itemscope]').forEach(element => {
      const itemtype = element.getAttribute('itemtype') || '';
      const props: Record<string, string> = {};

      element.querySelectorAll('[itemprop]').forEach(prop => {
        const name = prop.getAttribute('itemprop') || '';
        const content = prop.getAttribute('content') ||
                        prop.textContent?.trim().substring(0, 100) || '';
        if (name) props[name] = content;
      });

      if (Object.keys(props).length > 0) {
        hiddenElements.push({
          type: 'microdata',
          content: JSON.stringify({ type: itemtype, props }),
          location: element.tagName.toLowerCase(),
          significance: 0.65
        });
      }
    });

    // 6. Data attributes non triviaux
    document.querySelectorAll('[data-*]').forEach(element => {
      const attrs = Array.from(element.attributes)
        .filter(attr => attr.name.startsWith('data-'))
        .filter(attr => !['id', 'index', 'toggle'].some(skip => attr.name.includes(skip)));

      attrs.forEach(attr => {
        if (attr.value.length > 20 && (attr.value.includes('http') || attr.value.includes('{'))) {
          hiddenElements.push({
            type: 'data',
            content: `${attr.name}: ${attr.value.substring(0, 100)}`,
            location: element.tagName.toLowerCase(),
            significance: 0.55
          });
        }
      });
    });

    return hiddenElements;
  }

  /**
   * Analyse les patterns sémantiques
   */
  private async analyzeSemanticPatterns(elements: HiddenElement[]): Promise<SemanticPattern[]> {
    const patterns: SemanticPattern[] = [];
    const urlPattern = /https?:\/\/[^\s"']+/gi;
    const apiPattern = /\/api\/[^\s"']*/gi;

    // Grouper les éléments par type et contenu similaire
    const grouped = new Map<string, HiddenElement[]>();

    for (const element of elements) {
      // Extraire les URLs et APIs
      const urls = element.content.match(urlPattern) || [];
      const apis = element.content.match(apiPattern) || [];

      // Créer des patterns pour les connexions
      for (const url of urls) {
        const domain = new URL(url).hostname;
        const patternId = `url_${domain}`;

        if (!this.discoveredPatterns.has(patternId)) {
          const pattern: SemanticPattern = {
            id: patternId,
            type: 'connection',
            source: window.location.hostname,
            target: domain,
            strength: element.significance,
            metadata: {
              url,
              elementType: element.type,
              location: element.location
            }
          };

          patterns.push(pattern);
          this.discoveredPatterns.set(patternId, pattern);
        }
      }

      // Patterns pour les APIs
      for (const api of apis) {
        const patternId = `api_${api}`;

        if (!this.discoveredPatterns.has(patternId)) {
          const pattern: SemanticPattern = {
            id: patternId,
            type: 'reference',
            source: element.location,
            target: api,
            strength: 0.9,
            metadata: {
              endpoint: api,
              elementType: element.type,
              hidden: true
            }
          };

          patterns.push(pattern);
          this.discoveredPatterns.set(patternId, pattern);
        }
      }

      // Détecter les dépendances
      if (element.type === 'script' && element.pattern === 'embedded_json') {
        try {
          const data = JSON.parse(element.content);
          const keys = Object.keys(data);

          if (keys.some(k => k.includes('config') || k.includes('settings'))) {
            patterns.push({
              id: `dep_${Date.now()}`,
              type: 'dependency',
              source: 'page_config',
              target: JSON.stringify(keys),
              strength: 0.7,
              metadata: { data: element.content }
            });
          }
        } catch {}
      }
    }

    // Analyser les relations entre patterns
    this.analyzePatternRelationships(patterns);

    this.metrics.patternsDiscovered = patterns.length;
    return patterns;
  }

  /**
   * Analyse les relations entre patterns
   */
  private analyzePatternRelationships(patterns: SemanticPattern[]): void {
    // Détecter les clusters de connexions
    const connectionClusters = new Map<string, SemanticPattern[]>();

    for (const pattern of patterns) {
      if (pattern.type === 'connection') {
        const domain = pattern.target;
        if (!connectionClusters.has(domain)) {
          connectionClusters.set(domain, []);
        }
        connectionClusters.get(domain)!.push(pattern);
      }
    }

    // Renforcer les patterns qui apparaissent en cluster
    for (const [domain, clusterPatterns] of connectionClusters) {
      if (clusterPatterns.length > 2) {
        clusterPatterns.forEach(p => {
          p.strength = Math.min(1.0, p.strength * 1.2);
          (p.metadata as any).clustered = true;
        });
      }
    }
  }

  /**
   * Découvre des ressources alternatives
   */
  private async discoverAlternativeResources(
    patterns: SemanticPattern[]
  ): Promise<string[]> {
    const alternatives: string[] = [];

    // Identifier les patterns de type "alternate"
    for (const pattern of patterns) {
      if (pattern.type === 'connection' || pattern.type === 'reference') {
        const metadata = pattern.metadata as any;

        // Vérifier si c'est une ressource alternative
        if (metadata.url && metadata.url.includes('alternate')) {
          alternatives.push(metadata.url);
        }

        // Chercher des versions alternatives (mobile, amp, etc.)
        if (metadata.url) {
          const url = metadata.url as string;
          const variations = [
            url.replace('www.', 'm.'),
            url.replace('www.', 'mobile.'),
            url + '.amp',
            url.replace('.com', '.org'),
            url.replace('.com', '.net')
          ];

          // Tester l'existence (simulé pour éviter les requêtes réseau excessives)
          for (const variant of variations) {
            if (this.isLikelyValidAlternative(variant, url)) {
              alternatives.push(variant);
            }
          }
        }
      }
    }

    // Rechercher dans le cache sémantique
    const cachedAlternatives = this.semanticCache.get('alternatives') || [];
    alternatives.push(...cachedAlternatives);

    // Dédupliquer
    const unique = Array.from(new Set(alternatives));
    this.metrics.alternativeSourcesFound = unique.length;

    return unique;
  }

  /**
   * Vérifie si une URL est probablement une alternative valide
   */
  private isLikelyValidAlternative(variant: string, original: string): boolean {
    // Heuristiques simples pour éviter les faux positifs
    if (variant === original) return false;
    if (variant.length > original.length * 2) return false;
    if (!variant.startsWith('http')) return false;

    // Patterns connus d'alternatives
    const knownPatterns = ['m.', 'mobile.', 'amp.', 'api.', 'data.'];
    return knownPatterns.some(p => variant.includes(p) && !original.includes(p));
  }

  /**
   * Génère des insights profonds
   */
  private async generateDeepInsights(
    elements: HiddenElement[],
    patterns: SemanticPattern[],
    alternatives: string[]
  ): Promise<DeepInsight[]> {
    const insights: DeepInsight[] = [];

    // Insight 1: Tracking caché
    const trackingElements = elements.filter(e =>
      e.content.includes('track') ||
      e.content.includes('analytics') ||
      e.content.includes('pixel')
    );

    if (trackingElements.length > 0) {
      insights.push({
        category: 'tracking',
        description: 'Mécanismes de tracking cachés détectés dans la structure',
        evidence: trackingElements,
        implications: [
          'Collecte de données potentiellement extensive',
          'Profilage comportemental actif'
        ],
        actionable: true,
        severity: 'warning'
      });
    }

    // Insight 2: APIs non documentées
    const apiPatterns = patterns.filter(p => p.type === 'reference' && p.metadata.hidden);

    if (apiPatterns.length > 0) {
      insights.push({
        category: 'api',
        description: 'APIs cachées ou non documentées découvertes',
        evidence: apiPatterns.map(p => ({
          type: 'script',
          content: p.target,
          location: p.source,
          significance: p.strength
        })),
        implications: [
          'Accès possible à des fonctionnalités non publiques',
          'Potentiel de données supplémentaires'
        ],
        actionable: true,
        severity: 'info'
      });
    }

    // Insight 3: Sources alternatives
    if (alternatives.length > 0) {
      insights.push({
        category: 'resource',
        description: 'Sources d\'information alternatives identifiées',
        evidence: alternatives.map(url => ({
          type: 'link',
          content: url,
          location: 'discovered',
          significance: 0.7
        })),
        implications: [
          'Contenu potentiellement différent ou non filtré',
          'Bypass possible de restrictions'
        ],
        actionable: true,
        severity: 'info'
      });
    }

    // Insight 4: Structure sémantique cachée
    const semanticElements = elements.filter(e => e.type === 'microdata' || e.type === 'meta');

    if (semanticElements.length > 5) {
      insights.push({
        category: 'semantic',
        description: 'Structure sémantique riche mais cachée visuellement',
        evidence: semanticElements.slice(0, 5),
        implications: [
          'Informations destinées aux machines mais pas aux humains',
          'Métadonnées pouvant révéler l\'intention réelle'
        ],
        actionable: false,
        severity: 'info'
      });
    }

    // Insight 5: Dépendances critiques
    const dependencies = patterns.filter(p => p.type === 'dependency');

    if (dependencies.length > 0) {
      const critical = dependencies.filter(d => d.strength > 0.7);
      if (critical.length > 0) {
        insights.push({
          category: 'structural',
          description: 'Dépendances structurelles critiques identifiées',
          evidence: critical.map(d => ({
            type: 'data',
            content: d.target.substring(0, 100),
            location: d.source,
            significance: d.strength
          })),
          implications: [
            'Points de défaillance potentiels',
            'Opportunités d\'intervention ciblée'
          ],
          actionable: true,
          severity: 'warning'
        });
      }
    }

    this.insights = insights;
    this.metrics.insightsGenerated = insights.length;

    return insights;
  }

  /**
   * Déclenche une mutation de rupture basée sur les insights
   */
  private async triggerBreakthroughMutation(
    context: RitualContext,
    insights: DeepInsight[]
  ): Promise<boolean> {
    if (insights.length === 0) return false;

    // Sélectionner l'insight le plus significatif
    const criticalInsights = insights.filter(i => i.severity === 'critical' || i.severity === 'warning');
    const selectedInsight = criticalInsights.length > 0 ? criticalInsights[0] : insights[0];

    // Créer une mutation basée sur l'insight
    const mutationType = this.determineMutationType(selectedInsight);
    const magnitude = this.calculateMutationMagnitude(selectedInsight);

    // Envoyer la mutation
    this.messageBus.send({
      type: MessageType.ORGANISM_MUTATE,
      payload: {
        organismId: context.organism.id,
        mutation: {
          type: mutationType,
          trigger: `structure_insight_${selectedInsight.category}`,
          magnitude,
          timestamp: Date.now(),
          traits: this.calculateTraitChanges(selectedInsight, context.organism)
        }
      }
    });

    // Forcer une mise à jour de conscience
    this.messageBus.send({
      type: MessageType.ORGANISM_UPDATE,
      payload: {
        state: {
          ...context.organism,
          consciousness: Math.min(100, (context.organism.consciousness || 0) + 25),
          lastMutation: Date.now()
        }
      }
    });

    this.metrics.mutationsTriggered++;
    return true;
  }

  /**
   * Active la visualisation neurale
   */
  private async activateNeuralVisualization(context: RitualContext, intensity: number): Promise<void> {
    // Impulsions lumineuses dans le mesh neural
    this.messageBus.send({
      type: 'RITUAL_VISUAL_EFFECT' as MessageType,
      payload: {
        ritualType: this.type,
        effect: 'NEURAL_PULSE',
        duration: 20000,
        intensity: Math.min(1.0, 0.5 + intensity * 0.05),
        organismId: context.organism.id,
        pulseData: {
          frequency: 2.0, // Hz
          color: [0.2, 0.8, 1.0], // Cyan
          propagation: 'radial'
        }
      }
    });

    // Augmenter l'intuition et la mémoire
    this.messageBus.send({
      type: MessageType.ORGANISM_MUTATE,
      payload: {
        organismId: context.organism.id,
        mutation: {
          type: 'cognitive',
          traits: {
            intuition: Math.min(100, (context.organism.traits?.intuition || 0) + 30),
            memory: Math.min(100, (context.organism.traits?.memory || 0) + 20),
            curiosity: Math.min(100, (context.organism.traits?.curiosity || 0) + 15)
          },
          trigger: 'structure_awakening',
          magnitude: 0.9,
          timestamp: Date.now()
        }
      }
    });
  }

  /**
   * Méthodes utilitaires
   */

  private evaluateTrigger(trigger: RitualTriggerCondition, context: RitualContext): boolean {
    let value: any;

    // Gérer les métriques spéciales
    if (trigger.metric === 'mutationStagnation') {
      value = Date.now() - (context.organism.lastMutation || 0);
    } else if (trigger.metric === 'consciousness') {
      value = context.organism.consciousness || 0;
    } else {
      value = (context as any)[trigger.metric];
    }

    if (value === undefined) return false;

    switch (trigger.operator) {
      case '>': return value > trigger.value;
      case '<': return value < trigger.value;
      case '>=': return value >= trigger.value;
      case '<=': return value <= trigger.value;
      case '==': return value === trigger.value;
      default: return false;
    }
  }

  private determineMutationType(insight: DeepInsight): 'visual' | 'behavioral' | 'cognitive' {
    switch (insight.category) {
      case 'tracking':
      case 'api':
        return 'behavioral';
      case 'semantic':
      case 'structural':
        return 'cognitive';
      default:
        return 'visual';
    }
  }

  private calculateMutationMagnitude(insight: DeepInsight): number {
    const base = insight.severity === 'critical' ? 0.9 :
                 insight.severity === 'warning' ? 0.7 : 0.5;

    const evidenceBonus = Math.min(insight.evidence.length * 0.05, 0.3);

    return Math.min(1.0, base + evidenceBonus);
  }

  private calculateTraitChanges(
    insight: DeepInsight,
    organism: RitualContext['organism']
  ): Record<string, number> {
    const changes: Record<string, number> = {};

    switch (insight.category) {
      case 'tracking':
        changes.resilience = Math.min(100, (organism.traits?.resilience || 0) + 20);
        changes.adaptability = Math.min(100, (organism.traits?.adaptability || 0) + 15);
        break;

      case 'api':
      case 'resource':
        changes.curiosity = Math.min(100, (organism.traits?.curiosity || 0) + 25);
        changes.creativity = Math.min(100, (organism.traits?.creativity || 0) + 20);
        break;

      case 'semantic':
      case 'structural':
        changes.intuition = Math.min(100, (organism.traits?.intuition || 0) + 30);
        changes.memory = Math.min(100, (organism.traits?.memory || 0) + 15);
        changes.focus = Math.min(100, (organism.traits?.focus || 0) + 10);
        break;
    }

    return changes;
  }

  private calculateImpactScore(insights: DeepInsight[], mutationTriggered: boolean): number {
    const insightScore = Math.min(insights.length * 15, 40);
    const severityScore = insights.filter(i => i.severity === 'critical').length * 20 +
                          insights.filter(i => i.severity === 'warning').length * 10;
    const mutationScore = mutationTriggered ? 30 : 0;

    return Math.min(100, insightScore + severityScore + mutationScore);
  }

  /**
   * Annule le rituel
   */
  public async cancel(): Promise<void> {
    this.status = RitualStatus.CANCELLED;
    this.discoveredPatterns.clear();
    this.insights = [];
  }

  /**
   * Annule les effets
   */
  public async rollback(): Promise<void> {
    await this.cancel();

    // Réinitialiser les métriques
    this.metrics = {
      hiddenElementsFound: 0,
      patternsDiscovered: 0,
      insightsGenerated: 0,
      mutationsTriggered: 0,
      alternativeSourcesFound: 0,
      semanticDepth: 0
    };

    // Vider le cache sémantique
    this.semanticCache.clear();
  }

  /**
   * Obtient les métriques
   */
  public getMetrics(): RitualMetrics {
    const totalAnalyses = this.executionCount;
    const averageInsights = totalAnalyses > 0 ?
      this.metrics.insightsGenerated / totalAnalyses : 0;

    return {
      successRate: totalAnalyses > 0 ?
        Math.min(1.0, averageInsights / 5) : 0, // 5 insights = 100% success
      averageExecutionTime: 8000, // 8 secondes en moyenne
      resourceConsumption: 0.3, // 30% de ressources
      userBenefit: 0.95 // 95% de bénéfice (révélation d'informations cachées)
    };
  }

  /**
   * Obtient l'état de santé
   */
  public getHealthStatus(): RitualHealth {
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (this.metrics.mutationsTriggered === 0 && this.executionCount > 5) {
      issues.push('No breakthrough mutations despite multiple analyses');
      recommendations.push('Consider manual exploration of discovered patterns');
    }

    if (this.metrics.semanticDepth > 100) {
      issues.push('Very deep semantic structures detected');
      recommendations.push('Page may be overly complex or obfuscated');
    }

    if (this.insights.filter(i => i.severity === 'critical').length > 3) {
      issues.push('Multiple critical issues discovered');
      recommendations.push('Consider switching to a more transparent website');
    }

    return {
      isHealthy: issues.length === 0,
      issues,
      recommendations
    };
  }
}
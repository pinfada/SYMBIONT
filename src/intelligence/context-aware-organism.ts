// intelligence/context-aware-organism.ts
// Intelligence adaptative contextuelle (Phase 2)

export class ContextAwareOrganism {
  private contextEngine: any
  private adaptiveIntelligence: any
  private environmentAnalyzer: any
  private behaviorPredictor: any
  private traits: Record<string, number> = {
    empathy: 0.5,
    focus: 0.5,
    creativity: 0.5,
    curiosity: 0.5,
    analytical: 0.5
  }
  private onTraitsUpdate: ((traits: Record<string, number>) => void) | null = null

  constructor(onTraitsUpdate?: (traits: Record<string, number>) => void) {
    if (onTraitsUpdate) this.onTraitsUpdate = onTraitsUpdate
    this.contextEngine = this.createSimulatedContextEngine()
    this.setupContextualAdaptation()
  }

  // Simule un moteur de contexte qui émet un changement toutes les 10s
  private createSimulatedContextEngine() {
    const listeners: ((ctx: any) => void)[] = []
    setInterval(() => {
      const categories = ['social', 'work', 'entertainment', 'learning']
      const behaviors = ['multitask', 'long_read', 'fast_nav', 'idle']
      const technicals = [
        { cpu: 'high', gpu: 'high', bandwidth: 'high' },
        { cpu: 'low', gpu: 'low', bandwidth: 'low' },
        { cpu: 'medium', gpu: 'medium', bandwidth: 'medium' }
      ]
      const socials = [
        { density: Math.random() },
        { density: Math.random() * 0.5 },
        { density: Math.random() * 1.5 }
      ]
      const ctx = {
        website: {
          category: categories[Math.floor(Math.random() * categories.length)],
          isResourceIntensive: Math.random() < 0.3,
          hasPrivacyConcerns: Math.random() < 0.2
        },
        userBehavior: {
          pattern: behaviors[Math.floor(Math.random() * behaviors.length)]
        },
        technical: technicals[Math.floor(Math.random() * technicals.length)],
        social: socials[Math.floor(Math.random() * socials.length)]
      }
      listeners.forEach(l => l(ctx))
    }, 10000)
    return {
      on: (event: string, cb: (ctx: any) => void) => { if (event === 'contextChange') listeners.push(cb) }
    }
  }

  // Adaptation contextuelle intelligente
  private setupContextualAdaptation(): void {
    this.contextEngine.on('contextChange', async (newContext: any) => {
      await this.adaptToWebEnvironment(newContext.website)
      await this.adaptToBehaviorPattern(newContext.userBehavior)
      await this.adaptToTechnicalCapabilities(newContext.technical)
      await this.adaptToSocialContext(newContext.social)
      if (this.onTraitsUpdate) this.onTraitsUpdate(this.traits)
    })
  }

  private async adaptToWebEnvironment(website: any): Promise<void> {
    switch (website.category) {
      case 'social':
        this.traits.empathy = Math.min(1, this.traits.empathy + 0.1)
        this.traits.analytical = Math.max(0, this.traits.analytical - 0.05)
        break
      case 'work':
        this.traits.focus = Math.min(1, this.traits.focus + 0.1)
        this.traits.creativity = Math.max(0, this.traits.creativity - 0.05)
        break
      case 'entertainment':
        this.traits.creativity = Math.min(1, this.traits.creativity + 0.1)
        this.traits.focus = Math.max(0, this.traits.focus - 0.05)
        break
      case 'learning':
        this.traits.curiosity = Math.min(1, this.traits.curiosity + 0.1)
        this.traits.focus = Math.min(1, this.traits.focus + 0.05)
        break
    }
    if (website.isResourceIntensive) {
      // TODO: Activer un mode performance
      console.log('[Context] Mode performance activé (site intensif)')
    }
    if (website.hasPrivacyConcerns) {
      // TODO: Activer un mode confidentialité
      console.log('[Context] Mode confidentialité activé (site sensible)')
    }
  }

  private async adaptToBehaviorPattern(userBehavior: any): Promise<void> {
    switch (userBehavior.pattern) {
      case 'multitask':
        this.traits.focus = Math.min(1, this.traits.focus + 0.05)
        this.traits.analytical = Math.min(1, this.traits.analytical + 0.05)
        console.log('[Context] Adaptation multitâche : focus et analytique +')
        break
      case 'long_read':
        this.traits.curiosity = Math.min(1, this.traits.curiosity + 0.05)
        this.traits.focus = Math.min(1, this.traits.focus + 0.03)
        console.log('[Context] Adaptation lecture longue : curiosité et focus +')
        break
      case 'fast_nav':
        this.traits.creativity = Math.min(1, this.traits.creativity + 0.04)
        this.traits.empathy = Math.max(0, this.traits.empathy - 0.02)
        console.log('[Context] Adaptation navigation rapide : créativité +, empathie -')
        break
      case 'idle':
        this.traits.focus = Math.max(0, this.traits.focus - 0.03)
        this.traits.curiosity = Math.max(0, this.traits.curiosity - 0.02)
        console.log('[Context] Adaptation inactivité : focus et curiosité -')
        break
    }
  }

  private async adaptToTechnicalCapabilities(technical: any): Promise<void> {
    if (technical.cpu === 'low' || technical.gpu === 'low') {
      // Réduire la complexité visuelle, augmenter la robustesse
      this.traits.creativity = Math.max(0, this.traits.creativity - 0.05)
      this.traits.analytical = Math.min(1, this.traits.analytical + 0.03)
      console.log('[Context] Adaptation technique : mode léger activé')
    } else if (technical.cpu === 'high' && technical.gpu === 'high') {
      this.traits.creativity = Math.min(1, this.traits.creativity + 0.05)
      console.log('[Context] Adaptation technique : mode enrichi activé')
    }
    // Bande passante faible : mode offline
    if (technical.bandwidth === 'low') {
      console.log('[Context] Adaptation technique : mode offline préventif')
    }
  }

  private async adaptToSocialContext(social: any): Promise<void> {
    // Plus la densité d'interactions sociales est élevée, plus l'empathie et la créativité augmentent
    if (social.density > 1) {
      this.traits.empathy = Math.min(1, this.traits.empathy + 0.07)
      this.traits.creativity = Math.min(1, this.traits.creativity + 0.04)
      console.log('[Context] Adaptation sociale : forte densité, empathie et créativité ++')
    } else if (social.density < 0.3) {
      this.traits.empathy = Math.max(0, this.traits.empathy - 0.03)
      this.traits.creativity = Math.max(0, this.traits.creativity - 0.01)
      console.log('[Context] Adaptation sociale : faible densité, empathie et créativité -')
    }
  }
} 
import { PerformanceMetrics } from '../shared/types/organism'
import { SymbiontMessage, SymbiontResponse } from '../shared/types/messages'
import { NeuralCoreEngine } from '../neural/NeuralCoreEngine'
import { SocialNetworkManager } from '../social/SocialNetworkManager'
import { SecretRitualSystem } from '../mystical/SecretRitualSystem'
import { WebGLOrchestrator } from './WebGLOrchestrator'

interface SynapticRouterDeps {
  neural: NeuralCoreEngine
  social: SocialNetworkManager
  rituals: SecretRitualSystem
  webgl?: WebGLOrchestrator
}

export class SynapticRouter {
  private deps: SynapticRouterDeps

  constructor(deps: SynapticRouterDeps) {
    this.deps = deps
  }

  async routeMessage(message: SymbiontMessage): Promise<SymbiontResponse> {
    try {
      switch (message.type) {
        case 'APPLY_VISUAL_MUTATION': {
          if (!this.deps.webgl) return { success: false, error: 'WebGLOrchestrator non disponible' }
          const { id, mutation } = message.payload || {}
          await this.deps.webgl.receiveVisualMutation(id, mutation)
          return { success: true, data: 'Mutation visuelle appliquée' }
        }
        case 'CREATE_ORGANISM': {
          const org = await this.deps.neural.createOrganism(message.payload?.userId || 'main')
          return { success: true, data: org }
        }
        case 'EVOLVE_ORGANISM': {
          const mutations = await this.deps.neural.evolveOrganism('main', message.payload?.behaviorData || [])
          return { success: true, data: mutations }
        }
        case 'PREDICT_ACTION': {
          const prediction = await this.deps.neural.predictNextAction('main', message.payload?.context)
          return { success: true, data: prediction }
        }
        case 'GENERATE_INVITATION': {
          const invitation = await this.deps.social.generateInvitation('main', message.payload?.context)
          return { success: true, data: invitation }
        }
        case 'SHARED_MUTATION': {
          const result = await this.deps.social.facilitateSharedMutation(message.payload?.source, message.payload?.target)
          return { success: true, data: result }
        }
        case 'TRIGGER_RITUAL': {
          const ritual = this.deps.rituals.detectRitualTrigger(message.payload?.interactions || [])
          return { success: true, data: ritual }
        }
        case 'GET_ORGANISM_STATE': {
          // TODO: exposer l'état courant
          return { success: true, data: null }
        }
        case 'GET_HISTORY': {
          // TODO: exposer l'historique
          return { success: true, data: null }
        }
        case 'PING':
        default:
          return { success: true, data: 'pong' }
      }
    } catch (e: any) {
      return { success: false, error: e?.message || 'Erreur inconnue' }
    }
  }

  async optimizeRouting(_performance: PerformanceMetrics): Promise<void> {
    // TODO: Optimisation dynamique du routage
  }
} 
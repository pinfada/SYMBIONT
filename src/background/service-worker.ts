// Service Worker principal SYMBIONT
import { NeuralCoreEngine } from '../neural/NeuralCoreEngine'
import { SynapticRouter } from './SynapticRouter'
import { OrganismMemoryBank } from './OrganismMemoryBank'
import { WebGLOrchestrator } from './WebGLOrchestrator'
import { SocialNetworkManager } from '../social/SocialNetworkManager'
import { SecretRitualSystem } from '../mystical/SecretRitualSystem'
import { SymbiontMessage, SymbiontResponse } from '../shared/types/messages'
import { SecurityManager } from './SecurityManager'

export class SymbiontBackgroundService {
  private neuralCore: NeuralCoreEngine
  private synapticRouter: SynapticRouter
  private memoryBank: OrganismMemoryBank
  private webglOrchestrator: WebGLOrchestrator
  private socialManager: SocialNetworkManager
  private ritualSystem: SecretRitualSystem

  constructor() {
    // Initialisation des modules principaux
    this.memoryBank = new OrganismMemoryBank()
    this.neuralCore = new NeuralCoreEngine(this.memoryBank)
    this.socialManager = new SocialNetworkManager(this.memoryBank, new SecurityManager())
    this.ritualSystem = new SecretRitualSystem()
    this.webglOrchestrator = new WebGLOrchestrator(this.memoryBank)
    this.synapticRouter = new SynapticRouter({
      neural: this.neuralCore,
      social: this.socialManager,
      rituals: this.ritualSystem,
      webgl: this.webglOrchestrator
    })
    this.setupListeners()
  }

  private setupListeners() {
    chrome.runtime.onMessage.addListener((message: SymbiontMessage, sender, sendResponse) => {
      this.synapticRouter.routeMessage(message).then((response: SymbiontResponse) => {
        sendResponse(response)
      })
      return true // Keep the message channel open for async response
    })
  }
}

// Initialisation globale
new SymbiontBackgroundService() 
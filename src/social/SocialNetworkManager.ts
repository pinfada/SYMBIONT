import { InvitationContext, InvitationCode, SharedMutationResult, CollectiveTrigger, WakeResult } from '../shared/types/social'
import { BehaviorPattern } from '../shared/types/organism'
import { OrganismMemoryBank } from '../background/OrganismMemoryBank'
import { SecurityManager } from '../background/SecurityManager'

function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

interface Invitation {
  code: string
  context: InvitationContext
  expirationTime: number
  createdBy: string
  createdAt: number
}

export class SocialNetworkManager {
  private invitations: Invitation[] = []
  private memoryBank: OrganismMemoryBank
  private security: SecurityManager
  private _collectiveSessions: Map<string, { participants: string[], traits: Record<string, number> }> = new Map()

  constructor(memoryBank: OrganismMemoryBank, security: SecurityManager) {
    this.memoryBank = memoryBank
    this.security = security
  }

  async generateInvitation(inviterId: string, context: InvitationContext): Promise<InvitationCode> {
    // Anonymisation du contexte comportemental
    const anonymizedContext = {
      ...context,
      behaviorPattern: this.security.anonymizeForSharing(context.behaviorPattern as BehaviorPattern)
    }
    const code = randomUUID()
    const invitation: Invitation = {
      code,
      context: anonymizedContext,
      expirationTime: Date.now() + 24 * 60 * 60 * 1000, // 24h
      createdBy: inviterId,
      createdAt: Date.now()
    }
    this.invitations.push(invitation)
    return code
  }

  async facilitateSharedMutation(source: string, target: string): Promise<SharedMutationResult> {
    // Chargement des organismes depuis la mémoire centrale
    const history1 = await this.memoryBank.loadOrganismHistory(source)
    const history2 = await this.memoryBank.loadOrganismHistory(target)
    const org1 = history1.states[0]
    const org2 = history2.states[0]
    if (!org1 || !org2) {
      return {
        id: '', traitChanges: {}, compatibility: 0, timestamp: Date.now(), mutationType: 'social_exchange'
      }
    }
    // Calcul compatibilité
    const traits = Object.keys(org1.traits)
    let diff = 0
    traits.forEach(trait => {
      diff += Math.abs((org1.traits[trait] || 0) - (org2.traits[trait] || 0))
    })
    const compatibility = 1 - diff / traits.length
    // Sélection de traits à partager
    const traitChanges: Record<string, number> = {}
    traits.forEach(trait => {
      if (Math.random() < 0.5) {
        traitChanges[trait] = (org1.traits[trait] + org2.traits[trait]) / 2
        // Application de la mutation sur les deux organismes
        org1.traits[trait] = traitChanges[trait]
        org2.traits[trait] = traitChanges[trait]
      }
    })
    // Anonymisation des données comportementales échangées (exemple)
    // (À adapter selon le format réel des échanges)
    // const anonymizedData = this.security.anonymizeForSharing(...)
    // Sauvegarde des organismes modifiés
    await this.memoryBank.saveOrganismState(source, org1)
    await this.memoryBank.saveOrganismState(target, org2)
    return {
      id: randomUUID(),
      traitChanges,
      compatibility,
      timestamp: Date.now(),
      mutationType: 'social_exchange'
    }
  }

  // Détecte une synchronisation collective (plusieurs utilisateurs)
  async detectCollectiveSync(userIds: string[]): Promise<boolean> {
    // Si >3 utilisateurs actifs en même temps, on considère une synchro
    return userIds.length >= 3
  }

  // Fusionne les traits de plusieurs organismes (moyenne)
  async fuseTraits(userIds: string[]): Promise<Record<string, number>> {
    const traitSums: Record<string, number> = {}
    let count = 0
    for (const userId of userIds) {
      const history = await this.memoryBank.loadOrganismHistory(userId)
      const org = history.states[0]
      if (!org) continue
      for (const [k, v] of Object.entries(org.traits)) {
        traitSums[k] = (traitSums[k] ?? 0) + (v as number)
      }
      count++
    }
    const fused: Record<string, number> = {}
    for (const [k, v] of Object.entries(traitSums)) {
      fused[k] = v / count
    }
    return fused
  }

  // Applique un effet collectif (bonus)
  async applyCollectiveBonus(userIds: string[], bonus: Record<string, number>) {
    for (const userId of userIds) {
      const history = await this.memoryBank.loadOrganismHistory(userId)
      const org = history.states[0]
      if (!org) continue
      for (const [k, v] of Object.entries(bonus)) {
        org.traits[k] = Math.min(1, (org.traits[k] ?? 0.5) + (v as number))
      }
      await this.memoryBank.saveOrganismState(userId, org)
    }
  }

  // Rituel collectif complet
  async triggerCollectiveWake(trigger: CollectiveTrigger, userIds: string[]): Promise<WakeResult> {
    const sync = await this.detectCollectiveSync(userIds)
    if (!sync) return { success: false, details: 'Pas assez de participants.' }
    const fusedTraits = await this.fuseTraits(userIds)
    // Bonus collectif : +0.05 sur l'empathie et la créativité
    await this.applyCollectiveBonus(userIds, { empathy: 0.05, creativity: 0.05 })
    return {
      success: true,
      details: `Réveil collectif réussi pour ${userIds.length} participants. Traits fusionnés : ${JSON.stringify(fusedTraits)}`
    }
  }
} 
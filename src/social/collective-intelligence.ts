// social/collective-intelligence.ts
// Intelligence collective émergente (Phase 3)
import { SecureRandom } from '../shared/utils/secureRandom';
import { logger } from '@shared/utils/secureLogger';

export class CollectiveIntelligence {
  private proposals: Map<string, any[]> = new Map()
  private votes: Map<string, Set<string>> = new Map()
  // @ts-expect-error Peer ID réservé pour usage futur
  private peerId: string
  private onCollectiveMutation: ((mutationId: string) => void) | null = null

  constructor(onCollectiveMutation?: (mutationId: string) => void) {
    this.peerId = 'peer_' + SecureRandom.random().toString(36).substr(2, 8)
    if (onCollectiveMutation) this.onCollectiveMutation = onCollectiveMutation
  }

  proposeMutation(mutation: any, proposerId: string) {
    if (!this.proposals.has(mutation.id)) {
      this.proposals.set(mutation.id, [])
      this.votes.set(mutation.id, new Set())
    }
    this.proposals.get(mutation.id)!.push({ mutation, proposerId })
    // Vote automatiquement pour sa propre proposition
    this.vote(mutation.id, proposerId)
    logger.info(`[Collective] Mutation proposée par ${proposerId}`)
  }

  vote(mutationId: string, voterId: string) {
    if (!this.votes.has(mutationId)) this.votes.set(mutationId, new Set())
    this.votes.get(mutationId)!.add(voterId)
    logger.info(`[Collective] Vote de ${voterId} pour mutation ${mutationId}`)
  }

  aggregateVotes(mutationId: string): number {
    return this.votes.get(mutationId)?.size || 0
  }

  triggerCollectiveMutation(mutationId: string, totalPeers: number): boolean {
    const votes = this.aggregateVotes(mutationId)
    const consensus = votes > Math.max(1, Math.floor(totalPeers / 2))
    if (consensus) {
      logger.info(`[Collective] Mutation collective déclenchée : ${mutationId}`)
      if (this.onCollectiveMutation) this.onCollectiveMutation(mutationId)
      return true
    } else {
      logger.info(`[Collective] Consensus non atteint pour ${mutationId} (${votes}/${totalPeers})`)
      return false
    }
  }
} 
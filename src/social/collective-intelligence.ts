// social/collective-intelligence.ts
// Intelligence collective émergente (Phase 3)

export class CollectiveIntelligence {
  private proposals: Map<string, any[]> = new Map()
  private votes: Map<string, Set<string>> = new Map()
  private peerId: string
  private onCollectiveMutation: ((mutationId: string) => void) | null = null

  constructor(onCollectiveMutation?: (mutationId: string) => void) {
    this.peerId = 'peer_' + Math.random().toString(36).substr(2, 8)
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
    console.log(`[Collective] Mutation proposée par ${proposerId}`)
  }

  vote(mutationId: string, voterId: string) {
    if (!this.votes.has(mutationId)) this.votes.set(mutationId, new Set())
    this.votes.get(mutationId)!.add(voterId)
    console.log(`[Collective] Vote de ${voterId} pour mutation ${mutationId}`)
  }

  aggregateVotes(mutationId: string): number {
    return this.votes.get(mutationId)?.size || 0
  }

  triggerCollectiveMutation(mutationId: string, totalPeers: number): boolean {
    const votes = this.aggregateVotes(mutationId)
    const consensus = votes > Math.max(1, Math.floor(totalPeers / 2))
    if (consensus) {
      console.log(`[Collective] Mutation collective déclenchée : ${mutationId}`)
      if (this.onCollectiveMutation) this.onCollectiveMutation(mutationId)
      return true
    } else {
      console.log(`[Collective] Consensus non atteint pour ${mutationId} (${votes}/${totalPeers})`)
      return false
    }
  }
} 
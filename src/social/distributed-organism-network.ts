// social/distributed-organism-network.ts
// Réseau distribué d'organismes (Phase 3)
import { SecureRandom } from '../shared/utils/secureRandom';
import { logger } from '@shared/utils/secureLogger';

export class DistributedOrganismNetwork {
  private peers: Set<string> = new Set()
  // @ts-expect-error État d'organisme réservé pour usage futur
  private organismState: any = null
  private channel: BroadcastChannel
  private peerId: string

  constructor() {
    this.peerId = 'peer_' + SecureRandom.random().toString(36).substr(2, 8)
    this.channel = new BroadcastChannel('symbiont_network')
    this.channel.onmessage = (event) => this.handleMessage(event.data)
    // S'annonce à la création
    this.announce()
  }

  private announce() {
    this.channel.postMessage({ type: 'announce', peerId: this.peerId })
  }

  joinNetwork(peerId: string) {
    this.peers.add(peerId)
    this.channel.postMessage({ type: 'join', peerId: this.peerId })
    logger.info(`[Network] Pair rejoint : ${peerId}`)
  }

  leaveNetwork(peerId: string) {
    this.peers.delete(peerId)
    this.channel.postMessage({ type: 'leave', peerId: this.peerId })
    logger.info(`[Network] Pair quitté : ${peerId}`)
  }

  broadcastMutation(mutation: any) {
    this.channel.postMessage({ type: 'mutation', from: this.peerId, mutation })
    logger.info(`[Network] Diffusion mutation à ${this.peers.size} pairs`)
  }

  receiveMutation(mutation: any, fromPeer: string) {
    // Appliquer la mutation reçue (log pour l'instant)
    logger.info(`[Network] Mutation reçue de ${fromPeer}`, mutation)
  }

  performCommunityBackup(state: any) {
    this.channel.postMessage({ type: 'backup', from: this.peerId, state })
    logger.info(`[Network] Backup communautaire lancé`)
  }

  private handleMessage(msg: any) {
    if (msg.peerId === this.peerId) return // Ignore self
    switch (msg.type) {
      case 'announce':
        this.peers.add(msg.peerId)
        break
      case 'join':
        this.peers.add(msg.peerId)
        break
      case 'leave':
        this.peers.delete(msg.peerId)
        break
      case 'mutation':
        this.receiveMutation(msg.mutation, msg.from)
        break
      case 'backup':
        // Pour l'instant, log seulement
        logger.info(`[Network] Backup reçu de ${msg.from}`, msg.state)
        break
    }
  }
} 
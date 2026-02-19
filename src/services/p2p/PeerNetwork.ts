/**
 * PeerNetwork.ts
 * Real WebRTC DataChannels P2P network with chrome.storage.sync signaling.
 *
 * Uses chrome.storage.sync as a lightweight signaling channel between
 * extension instances across machines (same Google account), and
 * BroadcastChannel for local instances on the same machine.
 */

import { logger } from '@shared/utils/secureLogger';
import { P2P_CONFIG } from '@/config/p2p.config';

// ---- Types ----

export interface PeerInfo {
  id: string;
  publicKey: string;
  lastSeen: number;
  capabilities: string[];
  trustScore: number;
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate';
  from: string;
  to: string;
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
  timestamp: number;
  ttl: number;
}

export interface PeerNetworkStats {
  localId: string;
  discoveredPeers: number;
  activeConnections: number;
  openChannels: number;
  totalBytesSent: number;
  totalBytesReceived: number;
}

type DataHandler = (event: { peerId: string; data: ArrayBuffer | string }) => void;

// ---- Constants ----

const MAX_PEERS = 5;
const MAX_MESSAGE_SIZE = 16384; // 16KB per message
const DISCOVERY_INTERVAL_MS = 30000; // 30s
const CONNECTION_TIMEOUT_MS = 10000;
const CLEANUP_INTERVAL_MS = 60000;
const PEER_ANNOUNCEMENT_TTL_MS = 120000; // 2 min
const SIGNAL_KEY_PREFIX = 'signal_';
const PEER_KEY_PREFIX = 'peer_';

// ---- PeerNetwork ----

export class PeerNetwork {
  private localPeerId: string;
  private connections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private discoveredPeers: Map<string, PeerInfo> = new Map();
  private dataHandlers: Set<DataHandler> = new Set();

  private keyPair: CryptoKeyPair | null = null;
  private publicKeyString: string = '';
  private broadcastChannel: BroadcastChannel | null = null;

  private discoveryIntervalId: ReturnType<typeof setInterval> | null = null;
  private cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

  private totalBytesSent = 0;
  private totalBytesReceived = 0;
  private destroyed = false;

  /**
   * ICE/STUN servers from project config.
   * No proprietary servers — only public STUN.
   */
  private readonly rtcConfig: RTCConfiguration = {
    iceServers: P2P_CONFIG.ICE_SERVERS.slice(0, 2), // limit to 2 STUN servers
    iceCandidatePoolSize: 2,
  };

  constructor() {
    this.localPeerId = crypto.randomUUID();
  }

  // ---- Lifecycle ----

  /**
   * Initialize the peer network.
   * Must be called before any other method.
   */
  async start(): Promise<void> {
    await this.generateKeyPair();
    this.setupBroadcastChannel();
    this.setupStorageListener();
    await this.announcePresence();

    this.discoveryIntervalId = setInterval(
      () => this.announcePresence(),
      DISCOVERY_INTERVAL_MS,
    );
    this.cleanupIntervalId = setInterval(
      () => this.cleanupStalePeers(),
      CLEANUP_INTERVAL_MS,
    );

    logger.info('[PeerNetwork] Started', { localId: this.localPeerId });
  }

  destroy(): void {
    this.destroyed = true;

    if (this.discoveryIntervalId) clearInterval(this.discoveryIntervalId);
    if (this.cleanupIntervalId) clearInterval(this.cleanupIntervalId);

    for (const pc of this.connections.values()) pc.close();
    this.connections.clear();
    this.dataChannels.clear();
    this.dataHandlers.clear();

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    // Remove our announcement from sync storage
    try {
      chrome.storage.sync.remove(`${PEER_KEY_PREFIX}${this.localPeerId.substring(0, 8)}`);
    } catch {
      // Extension context may already be invalidated
    }

    logger.info('[PeerNetwork] Destroyed');
  }

  // ---- Key Management ----

  private async generateKeyPair(): Promise<void> {
    try {
      this.keyPair = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveKey', 'deriveBits'],
      );
      const rawPub = await crypto.subtle.exportKey('raw', this.keyPair.publicKey);
      this.publicKeyString = btoa(String.fromCharCode(...new Uint8Array(rawPub)));
    } catch (error) {
      logger.warn('[PeerNetwork] WebCrypto key generation failed, using placeholder', error);
      this.publicKeyString = `pk_${this.localPeerId.substring(0, 16)}`;
    }
  }

  // ---- Discovery via chrome.storage.sync ----

  /**
   * Announce our presence so other extension instances can find us.
   *
   * IMPORTANT: chrome.storage.sync is limited to 8KB per key and 100KB total.
   * We only store minimal announcements.
   */
  private async announcePresence(): Promise<void> {
    if (this.destroyed) return;

    const announcement: PeerInfo = {
      id: this.localPeerId,
      publicKey: this.publicKeyString,
      lastSeen: Date.now(),
      capabilities: ['data-relay', 'cache-share'],
      trustScore: 0.5,
    };

    try {
      await chrome.storage.sync.set({
        [`${PEER_KEY_PREFIX}${this.localPeerId.substring(0, 8)}`]: announcement,
      });
    } catch (error) {
      logger.debug('[PeerNetwork] Failed to announce via storage.sync', error);
    }

    // Also broadcast locally
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'peer-announce',
          peer: announcement,
        });
      } catch {
        // BroadcastChannel may be closed
      }
    }
  }

  private setupBroadcastChannel(): void {
    try {
      this.broadcastChannel = new BroadcastChannel('symbiont_peer_network');
      this.broadcastChannel.onmessage = (event) => {
        const { type, peer, signal } = event.data;
        if (type === 'peer-announce' && peer?.id !== this.localPeerId) {
          this.handlePeerDiscovered(peer as PeerInfo);
        }
        if (type === 'signaling' && signal?.to === this.localPeerId) {
          this.handleSignalingMessage(signal as SignalingMessage);
        }
      };
    } catch (error) {
      logger.warn('[PeerNetwork] BroadcastChannel unavailable', error);
    }
  }

  /**
   * Listen for chrome.storage.sync changes to discover peers and
   * receive signaling messages from other machines.
   */
  private setupStorageListener(): void {
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'sync' || this.destroyed) return;

        for (const [key, change] of Object.entries(changes)) {
          if (key.startsWith(PEER_KEY_PREFIX) && change.newValue) {
            const peerInfo = change.newValue as PeerInfo;
            if (peerInfo.id !== this.localPeerId) {
              this.handlePeerDiscovered(peerInfo);
            }
          }

          if (key.startsWith(SIGNAL_KEY_PREFIX) && change.newValue) {
            const signal = change.newValue as SignalingMessage;
            if (signal.to === this.localPeerId) {
              this.handleSignalingMessage(signal);
              // Clean up processed signal
              chrome.storage.sync.remove(key);
            }
          }
        }
      });
    } catch (error) {
      logger.warn('[PeerNetwork] Could not attach storage listener', error);
    }
  }

  private handlePeerDiscovered(peer: PeerInfo): void {
    const existing = this.discoveredPeers.get(peer.id);
    this.discoveredPeers.set(peer.id, peer);

    // Auto-connect if we have room and not already connected
    if (
      !existing &&
      !this.connections.has(peer.id) &&
      this.connections.size < MAX_PEERS
    ) {
      this.connectToPeer(peer.id).catch((err) => {
        logger.debug(`[PeerNetwork] Auto-connect to ${peer.id} failed`, err);
      });
    }
  }

  // ---- Signaling ----

  private async sendSignal(signal: SignalingMessage): Promise<void> {
    // Via BroadcastChannel (local)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: 'signaling', signal });
      } catch { /* noop */ }
    }

    // Via chrome.storage.sync (cross-machine)
    try {
      const key = `${SIGNAL_KEY_PREFIX}${signal.to.substring(0, 8)}_${Date.now() % 100000}`;
      await chrome.storage.sync.set({ [key]: signal });
    } catch (error) {
      logger.debug('[PeerNetwork] Failed to send signal via storage.sync', error);
    }
  }

  private async handleSignalingMessage(signal: SignalingMessage): Promise<void> {
    // Discard expired signals
    if (Date.now() - signal.timestamp > signal.ttl) return;

    try {
      if (signal.type === 'offer') {
        await this.handleOffer(signal);
      } else if (signal.type === 'answer') {
        await this.handleAnswer(signal);
      } else if (signal.type === 'ice-candidate') {
        await this.handleIceCandidate(signal);
      }
    } catch (error) {
      logger.warn(`[PeerNetwork] Failed to handle ${signal.type} from ${signal.from}`, error);
    }
  }

  private async handleOffer(signal: SignalingMessage): Promise<void> {
    const pc = new RTCPeerConnection(this.rtcConfig);
    this.connections.set(signal.from, pc);

    pc.ondatachannel = (event) => {
      this.setupDataChannel(event.channel, signal.from);
    };

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await this.sendSignal({
          type: 'ice-candidate',
          from: this.localPeerId,
          to: signal.from,
          payload: event.candidate.toJSON(),
          timestamp: Date.now(),
          ttl: 30000,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.cleanupConnection(signal.from);
      }
    };

    await pc.setRemoteDescription(signal.payload as RTCSessionDescriptionInit);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await this.sendSignal({
      type: 'answer',
      from: this.localPeerId,
      to: signal.from,
      payload: answer,
      timestamp: Date.now(),
      ttl: 30000,
    });
  }

  private async handleAnswer(signal: SignalingMessage): Promise<void> {
    const pc = this.connections.get(signal.from);
    if (!pc) return;

    if (pc.signalingState === 'have-local-offer') {
      await pc.setRemoteDescription(signal.payload as RTCSessionDescriptionInit);
    }
  }

  private async handleIceCandidate(signal: SignalingMessage): Promise<void> {
    const pc = this.connections.get(signal.from);
    if (pc && pc.remoteDescription) {
      await pc.addIceCandidate(signal.payload as RTCIceCandidateInit);
    }
  }

  // ---- Connection Management ----

  /**
   * Establish a WebRTC connection with a discovered peer.
   */
  async connectToPeer(peerId: string): Promise<boolean> {
    if (this.destroyed) return false;
    if (this.connections.has(peerId)) return true;

    if (this.connections.size >= MAX_PEERS) {
      this.evictLeastActivePeer();
    }

    const pc = new RTCPeerConnection(this.rtcConfig);
    this.connections.set(peerId, pc);

    // Create DataChannel BEFORE offer
    const channel = pc.createDataChannel('symbiont-data', {
      ordered: false,
      maxRetransmits: 3,
    });
    this.setupDataChannel(channel, peerId);

    // ICE candidates -> signaling
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await this.sendSignal({
          type: 'ice-candidate',
          from: this.localPeerId,
          to: peerId,
          payload: event.candidate.toJSON(),
          timestamp: Date.now(),
          ttl: 30000,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.cleanupConnection(peerId);
      }
    };

    // Connection race with timeout
    const timeout = new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), CONNECTION_TIMEOUT_MS);
    });

    const connection = new Promise<boolean>(async (resolve) => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await this.sendSignal({
          type: 'offer',
          from: this.localPeerId,
          to: peerId,
          payload: offer,
          timestamp: Date.now(),
          ttl: 30000,
        });

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'connected') resolve(true);
          if (pc.connectionState === 'failed') {
            this.cleanupConnection(peerId);
            resolve(false);
          }
        };
      } catch {
        this.cleanupConnection(peerId);
        resolve(false);
      }
    });

    return Promise.race([connection, timeout]);
  }

  private setupDataChannel(channel: RTCDataChannel, peerId: string): void {
    channel.binaryType = 'arraybuffer';

    channel.onopen = () => {
      this.dataChannels.set(peerId, channel);
      this.updatePeerTrust(peerId, 0.1);
      logger.info(`[PeerNetwork] DataChannel opened with ${peerId.substring(0, 8)}`);
    };

    channel.onmessage = (event) => {
      this.handleIncomingData(peerId, event.data);
    };

    channel.onclose = () => {
      this.cleanupConnection(peerId);
    };

    channel.onerror = () => {
      this.cleanupConnection(peerId);
    };

    // Flow control
    channel.bufferedAmountLowThreshold = 65536;
  }

  private cleanupConnection(peerId: string): void {
    const pc = this.connections.get(peerId);
    if (pc) {
      try { pc.close(); } catch { /* noop */ }
    }
    this.connections.delete(peerId);
    this.dataChannels.delete(peerId);
  }

  private evictLeastActivePeer(): void {
    let oldest: string | null = null;
    let oldestTime = Infinity;

    for (const [id, peer] of this.discoveredPeers) {
      if (this.connections.has(id) && peer.lastSeen < oldestTime) {
        oldestTime = peer.lastSeen;
        oldest = id;
      }
    }

    if (oldest) {
      this.cleanupConnection(oldest);
    }
  }

  // ---- Data Transfer ----

  /**
   * Send data to a specific peer.
   * Automatically fragments if payload exceeds MAX_MESSAGE_SIZE.
   */
  async sendData(peerId: string, data: ArrayBuffer | string): Promise<boolean> {
    const channel = this.dataChannels.get(peerId);
    if (!channel || channel.readyState !== 'open') return false;

    const payload =
      typeof data === 'string'
        ? new TextEncoder().encode(data)
        : new Uint8Array(data);

    if (payload.byteLength > MAX_MESSAGE_SIZE) {
      return this.sendFragmented(channel, payload);
    }

    try {
      channel.send(payload);
      this.totalBytesSent += payload.byteLength;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Broadcast data to all connected peers.
   */
  async broadcast(data: ArrayBuffer | string): Promise<number> {
    let sent = 0;
    for (const peerId of this.getConnectedPeers()) {
      const ok = await this.sendData(peerId, data);
      if (ok) sent++;
    }
    return sent;
  }

  private sendFragmented(channel: RTCDataChannel, data: Uint8Array): boolean {
    const fragmentId = crypto.randomUUID().substring(0, 8);
    const totalFragments = Math.ceil(data.byteLength / MAX_MESSAGE_SIZE);

    for (let i = 0; i < totalFragments; i++) {
      const start = i * MAX_MESSAGE_SIZE;
      const end = Math.min(start + MAX_MESSAGE_SIZE, data.byteLength);
      const fragment = data.slice(start, end);

      // Header: 1 byte type + 8 bytes fragmentId + 2 bytes index + 2 bytes total = 13 bytes
      const header = new Uint8Array(13);
      header[0] = 0x01; // Type: fragment
      const idBytes = new TextEncoder().encode(fragmentId);
      header.set(idBytes.slice(0, 8), 1);
      new DataView(header.buffer).setUint16(9, i);
      new DataView(header.buffer).setUint16(11, totalFragments);

      const packet = new Uint8Array(header.byteLength + fragment.byteLength);
      packet.set(header);
      packet.set(fragment, header.byteLength);

      try {
        channel.send(packet);
        this.totalBytesSent += packet.byteLength;
      } catch {
        return false;
      }
    }
    return true;
  }

  private handleIncomingData(peerId: string, data: ArrayBuffer | string): void {
    if (data instanceof ArrayBuffer) {
      this.totalBytesReceived += data.byteLength;
    } else {
      this.totalBytesReceived += data.length;
    }

    for (const handler of this.dataHandlers) {
      try {
        handler({ peerId, data: data as ArrayBuffer | string });
      } catch (error) {
        logger.debug('[PeerNetwork] Data handler error', error);
      }
    }
  }

  // ---- Event Handlers ----

  onData(handler: DataHandler): () => void {
    this.dataHandlers.add(handler);
    return () => {
      this.dataHandlers.delete(handler);
    };
  }

  // ---- Cleanup ----

  private async cleanupStalePeers(): Promise<void> {
    if (this.destroyed) return;
    const now = Date.now();

    try {
      chrome.storage.sync.get(null, (items) => {
        if (chrome.runtime.lastError) return;

        for (const [key, value] of Object.entries(items)) {
          if (
            key.startsWith(PEER_KEY_PREFIX) &&
            now - (value as PeerInfo).lastSeen > PEER_ANNOUNCEMENT_TTL_MS
          ) {
            chrome.storage.sync.remove(key);
          }
          if (key.startsWith(SIGNAL_KEY_PREFIX)) {
            const sig = value as SignalingMessage;
            if (now - sig.timestamp > sig.ttl) {
              chrome.storage.sync.remove(key);
            }
          }
        }
      });
    } catch {
      // Extension context may be invalidated
    }

    // Close stale local connections
    for (const [peerId, peer] of this.discoveredPeers) {
      if (now - peer.lastSeen > PEER_ANNOUNCEMENT_TTL_MS && this.connections.has(peerId)) {
        this.cleanupConnection(peerId);
      }
    }
  }

  // ---- Helpers ----

  private updatePeerTrust(peerId: string, delta: number): void {
    const peer = this.discoveredPeers.get(peerId);
    if (peer) {
      peer.trustScore = Math.max(0, Math.min(1, peer.trustScore + delta));
    }
  }

  // ---- Public Getters ----

  getLocalPeerId(): string {
    return this.localPeerId;
  }

  getConnectedPeers(): string[] {
    return Array.from(this.dataChannels.entries())
      .filter(([_, ch]) => ch.readyState === 'open')
      .map(([id]) => id);
  }

  getDiscoveredPeers(): PeerInfo[] {
    return Array.from(this.discoveredPeers.values());
  }

  getPeerInfo(peerId: string): PeerInfo | undefined {
    return this.discoveredPeers.get(peerId);
  }

  getStats(): PeerNetworkStats {
    return {
      localId: this.localPeerId,
      discoveredPeers: this.discoveredPeers.size,
      activeConnections: this.connections.size,
      openChannels: this.dataChannels.size,
      totalBytesSent: this.totalBytesSent,
      totalBytesReceived: this.totalBytesReceived,
    };
  }

  isConnected(peerId: string): boolean {
    const ch = this.dataChannels.get(peerId);
    return ch ? ch.readyState === 'open' : false;
  }
}

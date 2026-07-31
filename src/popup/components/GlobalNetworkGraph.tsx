import React, { useState, useEffect, useRef, useCallback } from 'react';
import { p2pService, P2PPeer } from '../services/P2PService';
import { logger } from '@shared/utils/secureLogger';

interface Node {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  generation: number;
  consciousness: number;
  energy: number;
  status: 'connected' | 'disconnected' | 'self';
  isMe: boolean;
  isPeer: boolean;
}

export const GlobalNetworkGraph: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [connectedPeers, setConnectedPeers] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'graph' | 'peers' | 'messages' | 'stats'>('graph');
  const [chatInput, setChatInput] = useState('');
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan] = useState({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  // Charger les données P2P
  const loadP2PData = useCallback(() => {
    const myOrganism = p2pService.getMyOrganism();
    const peers = p2pService.getPeers();

    // Créer les nodes
    const newNodes: Node[] = [];

    // Notre organisme au centre
    newNodes.push({
      id: myOrganism.id,
      name: 'Moi',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      generation: myOrganism.generation,
      consciousness: myOrganism.consciousness,
      energy: myOrganism.energy,
      status: 'self',
      isMe: true,
      isPeer: false
    });

    // Ajouter les vrais pairs connectés
    peers.forEach((peer: P2PPeer, index: number) => {
      if (peer.organism) {
        const angle = (index / Math.max(1, peers.length)) * 2 * Math.PI;
        const radius = 150;

        newNodes.push({
          id: peer.id,
          name: peer.organism.name || `Pair ${index + 1}`,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          vx: 0,
          vy: 0,
          generation: peer.organism.generation || 1,
          consciousness: peer.organism.consciousness || 0.5,
          energy: peer.organism.energy || 0.8,
          status: peer.status === 'connected' ? 'connected' : 'disconnected',
          isMe: false,
          isPeer: true
        });
      }
    });

    // Appliquer une simulation de forces
    for (let i = 0; i < 30; i++) {
      simulateForces(newNodes);
    }

    setNodes(newNodes);
    setConnectedPeers(peers.length);

    // Charger l'historique des messages
    const p2pMessages = JSON.parse(localStorage.getItem('symbiont_p2p_messages') || '[]');
    setMessages(p2pMessages.slice(-20));
  }, []);

  // Simulation de forces pour le layout
  const simulateForces = (nodes: Node[]) => {
    const REPULSION = 50;
    const DAMPING = 0.95;

    // Forces de répulsion entre tous les nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].isMe || nodes[j].isMe) continue; // Ne pas bouger notre node

        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        const force = REPULSION / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        nodes[i].vx -= fx;
        nodes[i].vy -= fy;
        nodes[j].vx += fx;
        nodes[j].vy += fy;
      }
    }

    // Appliquer les vitesses
    nodes.forEach(node => {
      if (!node.isMe) {
        node.x += node.vx;
        node.y += node.vy;
        node.vx *= DAMPING;
        node.vy *= DAMPING;

        // Limiter la position
        node.x = Math.max(-300, Math.min(300, node.x));
        node.y = Math.max(-300, Math.min(300, node.y));
      }
    });
  };

  // Écouter les messages P2P
  useEffect(() => {
    // Handler pour les nouveaux messages
    const handleP2PMessage = (msg: any) => {
      logger.info('Nouveau message P2P reçu:', msg);
      loadP2PData(); // Recharger les données
    };

    p2pService.onMessage(handleP2PMessage);

    // Charger les données initiales
    loadP2PData();

    // Rafraîchir toutes les 3 secondes
    const interval = setInterval(loadP2PData, 3000);

    return () => {
      clearInterval(interval);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [loadP2PData]);

  // Gestion du zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.3, Math.min(3, prev * delta)));
  };

  // Actions P2P
  const shareEnergy = (peerId: string) => {
    p2pService.shareEnergy(peerId, 0.1);
    logger.info(`Énergie partagée avec ${peerId}`);
    loadP2PData();
  };

  const syncConsciousness = (peerId: string) => {
    p2pService.syncConsciousness(peerId);
    logger.info(`Conscience synchronisée avec ${peerId}`);
    loadP2PData();
  };

  const sendChatMessage = () => {
    if (chatInput.trim()) {
      if (selectedPeer) {
        p2pService.sendChat(chatInput, selectedPeer);
      } else {
        p2pService.sendChat(chatInput); // Broadcast
      }
      setChatInput('');
      loadP2PData();
    }
  };

  const renderGraph = () => (
    <div className="network-graph-container">
      <div className="p2p-status">
        <div className="status-badge" style={{
          background: connectedPeers > 0 ? '#2ee6a6' : '#ef4444',
          padding: '8px 16px',
          borderRadius: '20px',
          color: '#fff',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '20px' }}>
            {connectedPeers > 0 ? '🟢' : '🔴'}
          </span>
          <span>
            {connectedPeers > 0
              ? `${connectedPeers} pairs connectés en P2P`
              : 'Recherche de pairs...'}
          </span>
        </div>
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height="400"
        onWheel={handleWheel}
        style={{ cursor: 'grab' }}
      >
        <defs>
          {/* Gradient pour les connexions P2P */}
          <linearGradient id="p2pGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00e0ff" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#00e0ff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#00e0ff" stopOpacity="0.3" />
          </linearGradient>

          {/* Glow pour les pairs connectés */}
          <filter id="connectedGlow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <g transform={`translate(${200 + pan.x}, ${200 + pan.y}) scale(${zoom})`}>
          {/* Connexions P2P */}
          {nodes.filter(n => n.isPeer && n.status === 'connected').map(peer => (
            <g key={`link-${peer.id}`}>
              <line
                x1={0}
                y1={0}
                x2={peer.x}
                y2={peer.y}
                stroke="url(#p2pGradient)"
                strokeWidth="3"
                strokeDasharray="5,5"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to="10"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </line>

              {/* Flux de données */}
              <circle r="4" fill="#00e0ff">
                <animateMotion
                  dur="2s"
                  repeatCount="indefinite"
                  path={`M0,0 L${peer.x},${peer.y}`}
                />
              </circle>
              <circle r="4" fill="#00e0ff">
                <animateMotion
                  dur="2s"
                  begin="1s"
                  repeatCount="indefinite"
                  path={`M${peer.x},${peer.y} L0,0`}
                />
              </circle>
            </g>
          ))}

          {/* Nodes */}
          {nodes.map(node => {
            const isHovered = hoveredNode === node.id;
            const isSelected = selectedPeer === node.id;

            let fill = '#666666';
            if (node.isMe) fill = '#ffb700';
            else if (node.status === 'connected') fill = '#2ee6a6';
            else if (node.status === 'disconnected') fill = '#ef4444';

            const radius = node.isMe ? 20 : 15;

            return (
              <g key={node.id}>
                {/* Aura pour les pairs connectés */}
                {node.isPeer && node.status === 'connected' && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={radius + 15}
                    fill="none"
                    stroke="#00e0ff"
                    strokeWidth="1"
                    opacity="0.3"
                  >
                    <animate
                      attributeName="r"
                      from={radius + 15}
                      to={radius + 25}
                      dur="2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      from="0.3"
                      to="0"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}

                {/* Node principal */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={radius}
                  fill={fill}
                  stroke={isSelected ? '#ffffff' : 'none'}
                  strokeWidth={isSelected ? 3 : 0}
                  filter={node.status === 'connected' ? 'url(#connectedGlow)' : ''}
                  opacity={node.energy || 1}
                  style={{ cursor: node.isPeer ? 'pointer' : 'default' }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => node.isPeer && setSelectedPeer(node.id)}
                />

                {/* Indicateur P2P */}
                {node.isPeer && (
                  <text
                    x={node.x}
                    y={node.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#ffffff"
                    fontSize="20"
                    fontWeight="bold"
                  >
                    P2P
                  </text>
                )}

                {/* Label */}
                {(isHovered || node.isMe) && (
                  <text
                    x={node.x}
                    y={node.y - radius - 10}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="12"
                    fontWeight={node.isMe ? 'bold' : 'normal'}
                  >
                    {node.name}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Tooltip pour les pairs */}
      {hoveredNode && nodes.find(n => n.id === hoveredNode && n.isPeer) && (
        <div className="network-tooltip" style={{
          position: 'absolute',
          left: '10px',
          top: '60px',
          background: 'rgba(0, 0, 0, 0.9)',
          border: '2px solid #00e0ff',
          borderRadius: '8px',
          padding: '12px',
          color: '#fff'
        }}>
          {(() => {
            const node = nodes.find(n => n.id === hoveredNode);
            if (!node) return null;
            return (
              <div>
                <div style={{ fontWeight: 'bold', color: '#00e0ff', marginBottom: '8px' }}>
                  🟢 PAIR P2P RÉEL
                </div>
                <div>ID: {node.id.substring(0, 8)}...</div>
                <div>Génération: {node.generation}</div>
                <div>Conscience: {(node.consciousness * 100).toFixed(0)}%</div>
                <div>Énergie: {(node.energy * 100).toFixed(0)}%</div>
                <div style={{ marginTop: '8px', fontSize: '10px', color: '#888' }}>
                  Connexion WebRTC directe
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Actions sur pair sélectionné */}
      {selectedPeer && (
        <div className="peer-actions" style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          background: 'rgba(0, 0, 0, 0.9)',
          border: '2px solid #00e0ff',
          borderRadius: '8px',
          padding: '12px'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#00e0ff' }}>
            Actions P2P avec {nodes.find(n => n.id === selectedPeer)?.name}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={() => shareEnergy(selectedPeer)} style={{
              background: '#00e0ff',
              color: '#000',
              border: 'none',
              padding: '8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}>
              ⚡ Partager Énergie (P2P)
            </button>
            <button onClick={() => syncConsciousness(selectedPeer)} style={{
              background: '#00e0ff',
              color: '#000',
              border: 'none',
              padding: '8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}>
              🧠 Synchroniser Conscience (P2P)
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderPeers = () => (
    <div className="peers-list">
      <h3>🌐 Pairs P2P Connectés ({connectedPeers})</h3>

      {connectedPeers === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔍</div>
          <p>Recherche de pairs en cours...</p>
          <p style={{ fontSize: '12px', marginTop: '20px' }}>
            Assurez-vous que d'autres utilisateurs ont l'extension SYMBIONT installée
            et sont sur le même réseau ou connectés au serveur de signaling.
          </p>
          <div style={{ marginTop: '20px', padding: '10px', background: '#111', borderRadius: '8px' }}>
            <p style={{ fontSize: '11px', fontFamily: 'monospace' }}>
              Méthodes de découverte actives:
              <br />✅ BroadcastChannel (même navigateur)
              <br />✅ WebSocket (serveur de signaling)
              <br />✅ localStorage (polling local)
            </p>
          </div>
        </div>
      ) : (
        <div className="peers-grid">
          {p2pService.getPeers().map(peer => (
            <div key={peer.id} className="peer-card" style={{
              background: 'rgba(0, 224, 255, 0.08)',
              border: '2px solid #00e0ff',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px', marginRight: '12px' }}>🟢</span>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#00e0ff' }}>
                    {peer.organism?.name || 'Pair Anonyme'}
                  </div>
                  <div style={{ fontSize: '10px', color: '#888' }}>
                    {peer.id.substring(0, 16)}...
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: '#ccc' }}>
                <div>📊 Génération: {peer.organism?.generation || 0}</div>
                <div>🧠 Conscience: {((peer.organism?.consciousness || 0) * 100).toFixed(0)}%</div>
                <div>⚡ Énergie: {((peer.organism?.energy || 0) * 100).toFixed(0)}%</div>
                <div>🧬 Mutations: {peer.organism?.mutations || 0}</div>
              </div>

              <div style={{ marginTop: '12px', fontSize: '10px', color: '#666' }}>
                ⏱️ Dernière activité: {new Date(peer.lastSeen).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderMessages = () => (
    <div className="p2p-messages">
      <h3>💬 Messages P2P</h3>

      <div className="chat-container">
        <div className="messages-list" style={{
          height: '300px',
          overflowY: 'auto',
          background: '#111',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '12px'
        }}>
          {messages.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center' }}>Aucun message</p>
          ) : (
            messages.map((msg, i) => (
              <div key={i} style={{
                marginBottom: '8px',
                padding: '8px',
                background: msg.from === p2pService.getMyOrganism().id ? 'rgba(0, 224, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                borderRadius: '4px'
              }}>
                <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px' }}>
                  {msg.from.substring(0, 8)}... • {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
                <div style={{ color: '#fff' }}>{msg.text}</div>
              </div>
            ))
          )}
        </div>

        <div className="chat-input" style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
            placeholder="Envoyer un message P2P..."
            style={{
              flex: 1,
              padding: '8px',
              background: '#222',
              border: '1px solid #444',
              borderRadius: '4px',
              color: '#fff'
            }}
          />
          <button onClick={sendChatMessage} style={{
            background: '#00e0ff',
            color: '#000',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}>
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );

  const renderStats = () => (
    <div className="p2p-stats">
      <h3>📊 Statistiques P2P</h3>

      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        <div className="stat-card" style={{
          background: 'rgba(0, 224, 255, 0.08)',
          border: '1px solid #00e0ff',
          borderRadius: '8px',
          padding: '16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#00e0ff' }}>
            {connectedPeers}
          </div>
          <div style={{ color: '#888', fontSize: '12px' }}>Pairs Connectés</div>
        </div>

        <div className="stat-card" style={{
          background: 'rgba(0, 224, 255, 0.08)',
          border: '1px solid #00e0ff',
          borderRadius: '8px',
          padding: '16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#00e0ff' }}>
            P2P
          </div>
          <div style={{ color: '#888', fontSize: '12px' }}>Mode Décentralisé</div>
        </div>

        <div className="stat-card" style={{
          background: 'rgba(0, 224, 255, 0.08)',
          border: '1px solid #00e0ff',
          borderRadius: '8px',
          padding: '16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#00e0ff' }}>
            {messages.length}
          </div>
          <div style={{ color: '#888', fontSize: '12px' }}>Messages Échangés</div>
        </div>

        <div className="stat-card" style={{
          background: 'rgba(0, 224, 255, 0.08)',
          border: '1px solid #00e0ff',
          borderRadius: '8px',
          padding: '16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#00e0ff' }}>
            WebRTC
          </div>
          <div style={{ color: '#888', fontSize: '12px' }}>Protocole</div>
        </div>
      </div>

      <div style={{ marginTop: '24px', padding: '16px', background: '#111', borderRadius: '8px' }}>
        <h4 style={{ color: '#00e0ff', marginBottom: '12px' }}>🔐 Informations Techniques</h4>
        <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#888' }}>
          <div>Protocole: WebRTC DataChannel</div>
          <div>Signaling: BroadcastChannel + WebSocket</div>
          <div>STUN: Google Public STUN Servers</div>
          <div>Chiffrement: DTLS (par défaut WebRTC)</div>
          <div>Découverte: Multi-méthodes (broadcast, WS, localStorage)</div>
          <div>Mon Peer ID: {p2pService.getMyOrganism().id.substring(0, 16)}...</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="global-network-panel">
      {/* Navigation */}
      <div className="network-nav">
        {[
          { key: 'graph', label: 'Réseau P2P', icon: '🌐' },
          { key: 'peers', label: 'Pairs', icon: '👥' },
          { key: 'messages', label: 'Messages', icon: '💬' },
          { key: 'stats', label: 'Stats', icon: '📊' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`nav-btn ${activeTab === tab.key ? 'active' : ''}`}
            style={{
              background: activeTab === tab.key ? '#00e0ff' : 'transparent',
              color: activeTab === tab.key ? '#001018' : '#8899a6',
              border: activeTab === tab.key ? '1px solid #00e0ff' : '1px solid rgba(0, 224, 255, 0.2)',
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: activeTab === tab.key ? 600 : 400,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div className="network-content">
        {activeTab === 'graph' && renderGraph()}
        {activeTab === 'peers' && renderPeers()}
        {activeTab === 'messages' && renderMessages()}
        {activeTab === 'stats' && renderStats()}
      </div>
    </div>
  );
};

export default GlobalNetworkGraph;
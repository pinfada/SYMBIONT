import React, { useState, useEffect, useRef } from 'react';

interface NetworkNode {
  id: string;
  generation: number;
  x: number;
  y: number;
}

interface NetworkLink {
  source: string;
  target: string;
}

interface GlobalNetworkGraphProps {
  nodes?: NetworkNode[];
  links?: NetworkLink[];
  onNodeCountChange?: (count: number) => void;
}

// Génère un réseau mocké simple
function generateMockNetwork(): { nodes: NetworkNode[]; links: NetworkLink[] } {
  const nodes: NetworkNode[] = [];
  const links: NetworkLink[] = [];
  const centerX = 200, centerY = 150, radius1 = 60, radius2 = 100;
  
  // Racine
  nodes.push({ id: 'ROOT', generation: 0, x: centerX, y: centerY });
  
  // 3 enfants
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * 2 * Math.PI;
    const x = centerX + radius1 * Math.cos(angle);
    const y = centerY + radius1 * Math.sin(angle);
    const id = `A${i}`;
    nodes.push({ id, generation: 1, x, y });
    links.push({ source: 'ROOT', target: id });
    
    // 2 petits-enfants par enfant
    for (let j = 0; j < 2; j++) {
      const subAngle = angle + (j === 0 ? -0.3 : 0.3);
      const x2 = centerX + radius2 * Math.cos(subAngle);
      const y2 = centerY + radius2 * Math.sin(subAngle);
      const subId = `B${i}${j}`;
      nodes.push({ id: subId, generation: 2, x: x2, y: y2 });
      links.push({ source: id, target: subId });
    }
  }
  
  return { nodes, links };
}

export const GlobalNetworkGraph: React.FC<GlobalNetworkGraphProps> = (props) => {
  // États principaux regroupés
  const [networkState, setNetworkState] = useState({
    network: null as { nodes: NetworkNode[]; links: NetworkLink[] } | null,
    loading: true,
    error: null as string | null
  });

  const [viewState, setViewState] = useState({
    zoom: 1,
    offset: { x: 0, y: 0 },
    hoveredNode: null as NetworkNode | null,
    selectedNode: null as NetworkNode | null
  });

  const svgRef = useRef<SVGSVGElement>(null);

  // Chargement du réseau
  useEffect(() => {
    setNetworkState(prev => ({ ...prev, loading: true, error: null }));
    
    // Simulation chargement puis utilisation mock
    setTimeout(() => {
      try {
        const mockNetwork = generateMockNetwork();
        setNetworkState({
          network: mockNetwork,
          loading: false,
          error: null
        });
        
        if (props.onNodeCountChange) {
          props.onNodeCountChange(mockNetwork.nodes.length);
        }
      } catch {
        setNetworkState(prev => ({
          ...prev,
          loading: false,
          error: 'Erreur lors du chargement du réseau'
        }));
      }
    }, 1000);
  }, [props.onNodeCountChange]);

  // Gestion du zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setViewState(prev => ({
      ...prev,
      zoom: Math.max(0.5, Math.min(3, prev.zoom - e.deltaY * 0.001))
    }));
  };

  // Gestion du survol des nœuds
  const handleNodeMouseOver = (node: NetworkNode) => {
    setViewState(prev => ({ ...prev, hoveredNode: node }));
  };

  const handleNodeMouseOut = () => {
    setViewState(prev => ({ ...prev, hoveredNode: null }));
  };

  const handleNodeClick = (node: NetworkNode) => {
    setViewState(prev => ({ 
      ...prev, 
      selectedNode: prev.selectedNode?.id === node.id ? null : node 
    }));
  };

  if (networkState.loading) {
    return (
      <div className="network-loading">
        <div className="loading-spinner loading-spinner--medium"></div>
        <p>Chargement du réseau...</p>
      </div>
    );
  }

  if (networkState.error || !networkState.network) {
    return (
      <div className="network-error">
        <h3>Réseau Indisponible</h3>
        <p>{networkState.error || 'Impossible de charger le réseau'}</p>
        <button 
          onClick={() => window.location.reload()}
          className="btn-retry"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const { network } = networkState;
  const { zoom, offset, hoveredNode, selectedNode } = viewState;

  return (
    <div className="network-container">
      <div className="network-header">
        <h3>Réseau Global SYMBIONT</h3>
        <div className="network-stats">
          <span className="stat-badge">
            {network.nodes.length} organismes
          </span>
          <span className="stat-badge">
            {network.links.length} connexions
          </span>
        </div>
      </div>

      <div className="network-graph-wrapper">
        <svg
          ref={svgRef}
          className="network-svg"
          width="100%"
          height="300"
          onWheel={handleWheel}
        >
          <g transform={`translate(${offset.x}, ${offset.y}) scale(${zoom})`}>
            {/* Liens */}
            <g className="links">
              {network.links.map((link, i) => {
                const source = network.nodes.find(n => n.id === link.source);
                const target = network.nodes.find(n => n.id === link.target);
                if (!source || !target) return null;
                
                return (
                  <line
                    key={i}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke="rgba(0, 224, 255, 0.4)"
                    strokeWidth="2"
                    className="network-link"
                  />
                );
              })}
            </g>

            {/* Nœuds */}
            <g className="nodes">
              {network.nodes.map((node) => (
                <g key={node.id}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.generation === 0 ? 12 : 8}
                    fill={node.generation === 0 ? '#ff4b6e' : '#00e0ff'}
                    stroke={selectedNode?.id === node.id ? '#ffb700' : 'rgba(255,255,255,0.3)'}
                    strokeWidth={selectedNode?.id === node.id ? 3 : 1}
                    className="network-node"
                    onMouseEnter={() => handleNodeMouseOver(node)}
                    onMouseLeave={handleNodeMouseOut}
                    onClick={() => handleNodeClick(node)}
                    style={{ cursor: 'pointer' }}
                  />
                  
                  {/* Label du nœud */}
                  <text
                    x={node.x}
                    y={node.y + 20}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#ffffff"
                    className="node-label"
                  >
                    {node.id}
                  </text>
                </g>
              ))}
            </g>
          </g>
        </svg>

        {/* Tooltip */}
        {hoveredNode && (
          <div className="network-tooltip">
            <h4>{hoveredNode.id}</h4>
            <p>Génération: {hoveredNode.generation}</p>
            <p>Position: ({Math.round(hoveredNode.x)}, {Math.round(hoveredNode.y)})</p>
          </div>
        )}
      </div>

      {selectedNode && (
        <div className="node-details">
          <h4>Détails de {selectedNode.id}</h4>
          <div className="detail-grid">
            <div>
              <span className="detail-label">Génération:</span>
              <span className="detail-value">{selectedNode.generation}</span>
            </div>
            <div>
              <span className="detail-label">Type:</span>
              <span className="detail-value">{selectedNode.generation === 0 ? 'Racine' : 'Descendant'}</span>
            </div>
          </div>
        </div>
      )}

      <div className="network-controls">
        <button onClick={() => setViewState(prev => ({ ...prev, zoom: Math.min(3, prev.zoom * 1.2) }))}>
          Zoom +
        </button>
        <button onClick={() => setViewState(prev => ({ ...prev, zoom: Math.max(0.5, prev.zoom / 1.2) }))}>
          Zoom -
        </button>
        <button onClick={() => setViewState(prev => ({ ...prev, zoom: 1, offset: { x: 0, y: 0 } }))}>
          Reset
        </button>
      </div>
    </div>
  );
};

export default GlobalNetworkGraph; 
import React from 'react';

const nodes = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' },
  { id: 4, name: 'Diana' },
];

const NetworkGraph: React.FC = () => (
  <div data-testid="network-graph">
    <h3>Réseau social distribué</h3>
    <ul>
      {nodes.map(node => (
        <li key={node.id}>
          <span role="img" aria-label="noeud">🔗</span> {node.name}
        </li>
      ))}
    </ul>
    <p style={{ color: '#aaa', fontSize: 12 }}>Ceci est une visualisation statique de démonstration.</p>
  </div>
);

export default NetworkGraph; 
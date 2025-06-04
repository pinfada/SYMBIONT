import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const API_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:8080' : 'https://symbiont-backend.onrender.com';
const WS_URL = process.env.NODE_ENV === 'development' ? 'ws://localhost:8080' : 'wss://symbiont-backend.onrender.com';

interface Network {
  nodes: any[];
  links: any[];
}
interface InviteParams {
  source: string;
  target: string;
  traits: any;
}
interface FusionParams {
  type: string;
  participants: string[];
  result: string;
  traits: any;
}

interface NetworkContextType {
  network: Network;
  loading: boolean;
  error: string | null;
  wsConnected: boolean;
  actionStatus: 'idle' | 'loading' | 'success' | 'error';
  invite: (params: InviteParams) => Promise<void>;
  fusion: (params: FusionParams) => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType | null>(null);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [network, setNetwork] = useState<Network>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [actionStatus, setActionStatus] = useState<'idle'|'loading'|'success'|'error'>('idle');

  // Fetch initial
  useEffect(() => {
    setLoading(true);
    fetch(API_URL + '/api/network')
      .then(res => res.json())
      .then(data => { setNetwork(data); setLoading(false); })
      .catch(() => { setError('Erreur réseau'); setLoading(false); });
  }, []);

  // WebSocket
  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      setWsConnected(true);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setNetwork(data);
      } catch (error) {
        console.error('Failed to parse network data:', error);
      }
    };
    
    ws.onclose = () => {
      setWsConnected(false);
    };
    
    return () => {
      ws.close();
    };
  }, []);

  // Actions
  async function invite({ source, target, traits }: InviteParams) {
    setActionStatus('loading');
    try {
      await fetch(API_URL + '/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, target, traits })
      });
      setActionStatus('success');
      setTimeout(() => setActionStatus('idle'), 2000);
    } catch {
      setActionStatus('error');
    }
  }
  async function fusion({ type, participants, result, traits }: FusionParams) {
    setActionStatus('loading');
    try {
      await fetch(API_URL + '/api/ritual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, participants, result, traits })
      });
      setActionStatus('success');
      setTimeout(() => setActionStatus('idle'), 2000);
    } catch {
      setActionStatus('error');
    }
  }

  return (
    <NetworkContext.Provider value={{
      network, loading, error, wsConnected, actionStatus,
      invite, fusion
    }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext)!;
} 
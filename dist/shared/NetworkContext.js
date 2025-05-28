"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkProvider = NetworkProvider;
exports.useNetwork = useNetwork;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const API_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:8080' : 'https://symbiont-backend.onrender.com';
const WS_URL = process.env.NODE_ENV === 'development' ? 'ws://localhost:8080' : 'wss://symbiont-backend.onrender.com';
const NetworkContext = (0, react_1.createContext)(null);
function NetworkProvider({ children }) {
    const [network, setNetwork] = (0, react_1.useState)({ nodes: [], links: [] });
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [wsConnected, setWsConnected] = (0, react_1.useState)(false);
    const [actionStatus, setActionStatus] = (0, react_1.useState)('idle');
    const wsRef = (0, react_1.useRef)(null);
    // Fetch initial
    (0, react_1.useEffect)(() => {
        setLoading(true);
        fetch(API_URL + '/api/network')
            .then(res => res.json())
            .then(data => { setNetwork(data); setLoading(false); })
            .catch(() => { setError('Erreur réseau'); setLoading(false); });
    }, []);
    // WebSocket
    (0, react_1.useEffect)(() => {
        let ws = null;
        let closed = false;
        try {
            ws = new window.WebSocket(WS_URL);
            wsRef.current = ws;
            ws.onopen = () => setWsConnected(true);
            ws.onclose = () => setWsConnected(false);
            ws.onerror = () => setWsConnected(false);
            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'network_update')
                        setNetwork({ nodes: msg.nodes, links: msg.links });
                }
                catch { }
            };
        }
        catch { }
        return () => { closed = true; if (ws)
            ws.close(); };
    }, []);
    // Actions
    async function invite({ source, target, traits }) {
        setActionStatus('loading');
        try {
            await fetch(API_URL + '/api/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source, target, traits })
            });
            setActionStatus('success');
            setTimeout(() => setActionStatus('idle'), 2000);
        }
        catch {
            setActionStatus('error');
        }
    }
    async function fusion({ type, participants, result, traits }) {
        setActionStatus('loading');
        try {
            await fetch(API_URL + '/api/ritual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, participants, result, traits })
            });
            setActionStatus('success');
            setTimeout(() => setActionStatus('idle'), 2000);
        }
        catch {
            setActionStatus('error');
        }
    }
    return ((0, jsx_runtime_1.jsx)(NetworkContext.Provider, { value: {
            network, loading, error, wsConnected, actionStatus,
            invite, fusion
        }, children: children }));
}
function useNetwork() {
    return (0, react_1.useContext)(NetworkContext);
}

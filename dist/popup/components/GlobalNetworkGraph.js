"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalNetworkGraph = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importStar(require("react"));
const ritualsApi_1 = require("../../shared/ritualsApi");
const PluginManager_1 = require("../../core/PluginManager");
// Génère un réseau mocké (arbre de 3 générations, 1 racine, 3 enfants, 6 petits-enfants)
function generateMockNetwork() {
    const nodes = [];
    const links = [];
    const centerX = 300, centerY = 180, radius1 = 80, radius2 = 140;
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
// Palette d'emojis et couleurs pour la personnalisation
const EMOJI_LIST = ['🌱', '🦋', '🧬', '🌟', '🪐', '🦠', '🧿', '💎', '🔥', '🌸'];
const COLOR_LIST = ['#00e0ff', '#ff4b6e', '#ffb700', '#7cffb2', '#b388ff', '#ff8c42', '#ffb3c6', '#00ffb3', '#ffd700', '#a3a3ff'];
const GlobalNetworkGraph = (props) => {
    const [network, setNetwork] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [zoom, setZoom] = (0, react_1.useState)(1);
    const [offset, setOffset] = (0, react_1.useState)({ x: 0, y: 0 });
    const [dragging, setDragging] = (0, react_1.useState)(false);
    const [dragStart, setDragStart] = (0, react_1.useState)(null);
    const [hoveredNode, setHoveredNode] = (0, react_1.useState)(null);
    const [mousePos, setMousePos] = (0, react_1.useState)({ x: 0, y: 0 });
    const [selectedNode, setSelectedNode] = (0, react_1.useState)(null);
    const [collectiveWhisper, setCollectiveWhisper] = (0, react_1.useState)(null);
    const [activityLevel, setActivityLevel] = (0, react_1.useState)(0);
    const prevCounts = (0, react_1.useRef)({ nodes: 0, links: 0, linksArr: [], nodesArr: [] });
    const svgRef = (0, react_1.useRef)(null);
    const [particles, setParticles] = (0, react_1.useState)([]); // {source, target, progress, color}
    const [recentLinks, setRecentLinks] = (0, react_1.useState)([]); // ["source->target"]
    const [recentNodes, setRecentNodes] = (0, react_1.useState)([]); // [id]
    const [fusionSelection, setFusionSelection] = (0, react_1.useState)([]); // [id1, id2]
    const [fusionInProgress, setFusionInProgress] = (0, react_1.useState)(false);
    const [fusionResult, setFusionResult] = (0, react_1.useState)(null);
    const [fusionHalo, setFusionHalo] = (0, react_1.useState)(null);
    const [wakeInProgress, setWakeInProgress] = (0, react_1.useState)(false);
    // Personnalisation
    const [showCustomize, setShowCustomize] = (0, react_1.useState)(false);
    const [customColor, setCustomColor] = (0, react_1.useState)(localStorage.getItem('symbiont_color') || '#00e0ff');
    const [customEmoji, setCustomEmoji] = (0, react_1.useState)(localStorage.getItem('symbiont_emoji') || '🌱');
    const [customTraits, setCustomTraits] = (0, react_1.useState)(JSON.parse(localStorage.getItem('symbiont_traits') || '[]'));
    // RGPD & transparence
    const [showRGPD, setShowRGPD] = (0, react_1.useState)(false);
    const [confirmErase, setConfirmErase] = (0, react_1.useState)(false);
    // Rituels secrets & transmission contextuelle
    const [showSecretInput, setShowSecretInput] = (0, react_1.useState)(false);
    const [secretCode, setSecretCode] = (0, react_1.useState)('');
    const [secretFeedback, setSecretFeedback] = (0, react_1.useState)(null);
    const [specialBadge, setSpecialBadge] = (0, react_1.useState)(localStorage.getItem('symbiont_special_badge') || '');
    // Inactivité (mock)
    const [lastActive, setLastActive] = (0, react_1.useState)(Date.now());
    // --- Connexion backend réelle & synchro WebSocket ---
    const [apiNetwork, setApiNetwork] = (0, react_1.useState)(null);
    const [apiLoading, setApiLoading] = (0, react_1.useState)(true);
    const [apiError, setApiError] = (0, react_1.useState)(null);
    const [wsConnected, setWsConnected] = (0, react_1.useState)(false);
    const wsRef = (0, react_1.useRef)(null);
    // URL backend (adapter selon env)
    const API_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:8080' : 'https://symbiont-backend.onrender.com';
    const WS_URL = process.env.NODE_ENV === 'development' ? 'ws://localhost:8080' : 'wss://symbiont-backend.onrender.com';
    // Timeline (filtrage par date)
    const [timeline, setTimeline] = (0, react_1.useState)(null); // timestamp max
    // Filtres
    const [filterGen, setFilterGen] = (0, react_1.useState)(null);
    const [filterBadge, setFilterBadge] = (0, react_1.useState)('');
    // Recherche/focus
    const [searchId, setSearchId] = (0, react_1.useState)('');
    const [focusNode, setFocusNode] = (0, react_1.useState)(null);
    // Narration évolutive & quêtes collectives
    const [showTimeline, setShowTimeline] = (0, react_1.useState)(false);
    // Timeline d'événements majeurs (mock)
    const timelineEvents = [
        { date: Date.now() - 1000 * 60 * 60 * 24 * 7, title: 'Première transmission', desc: 'Le réseau s\'éveille.', icon: '🌱', murmure: 'Un souffle originel parcourt le réseau.' },
        { date: Date.now() - 1000 * 60 * 60 * 24 * 5, title: 'Fusion majeure', desc: '10 utilisateurs ont fusionné leurs traits.', icon: '🧬', murmure: 'Des consciences s\'entrelacent...' },
        { date: Date.now() - 1000 * 60 * 60 * 24 * 3, title: 'Rituel collectif', desc: 'Réveil collectif réussi !', icon: '🌟', murmure: 'Le réseau s\'éveille d\'un même souffle.' },
        { date: Date.now() - 1000 * 60 * 60 * 24 * 2, title: 'Code secret découvert', desc: 'Le code "SYMBIOSE" a été activé.', icon: '🔑', murmure: 'Un pacte secret relie deux organismes.' },
        { date: Date.now() - 1000 * 60 * 60 * 24, title: '100e mutation', desc: 'Le réseau a muté collectivement.', icon: '🦋', murmure: 'Une vague de mutation traverse la constellation.' }
    ];
    // Quête collective (mock)
    const collectiveQuest = {
        title: 'Atteindre 50 transmissions collectives',
        desc: 'Collaborez pour transmettre l\'organisme à 50 nouveaux membres.',
        progress: 34, // mock
        goal: 50,
        feedback: [
            'Le réseau grandit, transmission après transmission...',
            'Un nouvel horizon s\'ouvre à chaque connexion.',
            'La symbiose approche, continuez !'
        ]
    };
    // Récupérer l'userId courant
    const userId = localStorage.getItem('symbiont_user_id') || '';
    // Notifications en temps réel
    const [liveNotifications, setLiveNotifications] = (0, react_1.useState)([]);
    const [timelineEventsState, setTimelineEventsState] = (0, react_1.useState)(timelineEvents);
    // Simulation d'événements live (mock)
    (0, react_1.useEffect)(() => {
        const possibleEvents = [
            { title: 'Nouvelle transmission', desc: 'Un nouvel utilisateur rejoint la lignée.', icon: '🌱', murmure: 'Une connexion s\'éveille...' },
            { title: 'Fusion rare', desc: 'Deux organismes fusionnent leurs traits.', icon: '🧬', murmure: 'Des traits se mêlent dans la lumière.' },
            { title: 'Rituel collectif', desc: 'Un rituel synchronisé a eu lieu.', icon: '🌟', murmure: 'Le réseau pulse à l\'unisson.' },
            { title: 'Code secret activé', desc: 'Un code caché a été découvert.', icon: '🔑', murmure: 'Un secret circule dans la constellation.' },
            { title: 'Mutation collective', desc: 'Une vague de mutation traverse le réseau.', icon: '🦋', murmure: 'La forme du réseau évolue...' }
        ];
        const interval = setInterval(() => {
            const ev = possibleEvents[Math.floor(Math.random() * possibleEvents.length)];
            const event = { ...ev, date: Date.now() };
            setLiveNotifications(n => [...n, event]);
            setTimelineEventsState(t => [{ ...event }, ...t]);
            setTimeout(() => setLiveNotifications(n => n.slice(1)), 5000);
        }, 20000); // toutes les 20s
        return () => clearInterval(interval);
    }, []);
    (0, react_1.useEffect)(() => {
        setLoading(true);
        setError(null);
        fetch('https://mock.symbiont.network/api/network')
            .then(res => {
            if (!res.ok)
                throw new Error('Erreur réseau');
            return res.json();
        })
            .then(data => {
            setNetwork(data);
            setLoading(false);
        })
            .catch(err => {
            setError('Impossible de charger le réseau distant. Affichage d\'un réseau local.');
            setNetwork(generateMockNetwork());
            setLoading(false);
        });
    }, []);
    // Analyse de l'activité et génération de murmures collectifs
    (0, react_1.useEffect)(() => {
        if (!network)
            return;
        const nodeCount = network.nodes.length;
        const linkCount = network.links.length;
        const prev = prevCounts.current;
        const nodeDelta = nodeCount - prev.nodes;
        const linkDelta = linkCount - prev.links;
        prevCounts.current = { nodes: nodeCount, links: linkCount, linksArr: network.links, nodesArr: network.nodes };
        let activity = Math.abs(nodeDelta) + Math.abs(linkDelta);
        setActivityLevel(activity);
        // Génération de murmures
        if (activity > 3) {
            setCollectiveWhisper("La transmission s'accélère !");
        }
        else if (activity === 0 && (nodeCount > 5)) {
            setCollectiveWhisper("Le réseau s'assoupit, en attente d'une nouvelle impulsion.");
        }
        else if (nodeDelta > 0) {
            setCollectiveWhisper("Une nouvelle connexion vient d'éclore.");
        }
        else if (linkDelta > 0) {
            setCollectiveWhisper("Un souffle traverse le réseau…");
        }
        else {
            setCollectiveWhisper(null);
        }
        // Murmure disparaît après 4s
        if (activity > 0) {
            const t = setTimeout(() => setCollectiveWhisper(null), 4000);
            return () => clearTimeout(t);
        }
    }, [network]);
    // Animation pulsation adaptée à l'activité
    (0, react_1.useEffect)(() => {
        let frame = 0;
        let raf;
        function animate() {
            frame++;
            if (svgRef.current) {
                const circles = svgRef.current.querySelectorAll('.network-node');
                circles.forEach((circle, idx) => {
                    // Pulsation plus forte si activité
                    const puls = 1 + (0.08 + 0.08 * Math.min(activityLevel, 3)) * Math.sin(frame / (20 - 3 * Math.min(activityLevel, 3)) + idx);
                    circle.setAttribute('r', String(16 * puls));
                });
            }
            raf = requestAnimationFrame(animate);
        }
        animate();
        return () => cancelAnimationFrame(raf);
    }, [activityLevel]);
    // Couleur de fond dynamique
    const background = activityLevel > 3
        ? 'radial-gradient(ellipse at center, #1a2e3a 60%, #00e0ff 100%)'
        : activityLevel > 0
            ? 'radial-gradient(ellipse at center, #181c22 70%, #232946 100%)'
            : 'radial-gradient(ellipse at center, #232946 80%, #181c22 100%)';
    // --- Effets de particules et détection de nouveaux liens/nœuds ---
    (0, react_1.useEffect)(() => {
        if (!network)
            return;
        // Détection des nouveaux liens
        const prevLinks = prevCounts.current.linksArr || [];
        const prevNodes = prevCounts.current.nodesArr || [];
        const newLinks = network.links.filter(l => !prevLinks.some((pl) => pl.source === l.source && pl.target === l.target));
        const newNodes = network.nodes.filter(n => !prevNodes.some((pn) => pn.id === n.id));
        // Particules sur nouveaux liens
        if (newLinks.length > 0) {
            setParticles(ps => [
                ...ps,
                ...newLinks.map(l => ({ source: l.source, target: l.target, progress: 0, color: '#00e0ff' }))
            ]);
            setRecentLinks(links => [...links, ...newLinks.map(l => `${l.source}->${l.target}`)]);
        }
        if (newNodes.length > 0) {
            setRecentNodes(nodes => [...nodes, ...newNodes.map(n => n.id)]);
        }
        // Mémoriser les liens/nœuds pour la prochaine détection
        prevCounts.current.linksArr = network.links;
        prevCounts.current.nodesArr = network.nodes;
        // Nettoyage des effets récents après 2s
        if (newLinks.length > 0 || newNodes.length > 0) {
            setTimeout(() => {
                setRecentLinks(links => links.slice(newLinks.length));
                setRecentNodes(nodes => nodes.slice(newNodes.length));
            }, 2000);
        }
    }, [network]);
    // Animation des particules
    (0, react_1.useEffect)(() => {
        if (particles.length === 0)
            return;
        let raf;
        function animateParticles() {
            setParticles(ps => ps.map(p => ({ ...p, progress: Math.min(1, p.progress + 0.03) }))); // vitesse
            raf = requestAnimationFrame(animateParticles);
        }
        animateParticles();
        return () => cancelAnimationFrame(raf);
    }, [particles.length]);
    // Nettoyage des particules arrivées
    (0, react_1.useEffect)(() => {
        if (particles.length === 0)
            return;
        const timer = setTimeout(() => {
            setParticles(ps => ps.filter(p => p.progress < 1));
        }, 400);
        return () => clearTimeout(timer);
    }, [particles]);
    // --- Lignée personnelle ---
    // Trouver la lignée ascendante/descendante à partir de userId
    function getPersonalLineage(userId, nodes, links) {
        if (!userId)
            return { lineageIds: [], lineageLinks: [] };
        // Ascendants
        let lineageIds = [userId];
        let lineageLinks = [];
        let current = userId;
        // Remonter la chaîne
        while (true) {
            const parentLink = links.find(l => l.target === current);
            if (!parentLink)
                break;
            lineageLinks.push(`${parentLink.source}->${parentLink.target}`);
            lineageIds.push(parentLink.source);
            current = parentLink.source;
        }
        // Descendants (enfants directs)
        current = userId;
        let children = links.filter(l => l.source === current).map(l => l.target);
        while (children.length > 0) {
            const child = children.shift();
            if (child && !lineageIds.includes(child)) {
                lineageIds.push(child);
                const link = links.find(l => l.source === current && l.target === child);
                if (link)
                    lineageLinks.push(`${link.source}->${link.target}`);
                // Ajouter les enfants de ce nœud
                children = children.concat(links.filter(l => l.source === child).map(l => l.target));
            }
        }
        return { lineageIds, lineageLinks };
    }
    if (loading)
        return (0, jsx_runtime_1.jsx)("div", { style: { textAlign: 'center', margin: '32px 0' }, children: "Chargement du r\u00E9seau\u2026" });
    const nodes = network?.nodes || [];
    const links = network?.links || [];
    const { lineageIds, lineageLinks } = getPersonalLineage(userId, nodes, links);
    // Gestion du zoom
    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 1.1 : 0.9;
        setZoom(z => Math.max(0.3, Math.min(2.5, z * delta)));
    };
    // Gestion du pan (drag)
    const handleMouseDown = (e) => {
        setDragging(true);
        setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    };
    const handleMouseMove = (e) => {
        setMousePos({ x: e.clientX, y: e.clientY });
        if (dragging && dragStart) {
            setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
        }
    };
    const handleMouseUp = () => {
        setDragging(false);
        setDragStart(null);
    };
    // Tooltip survol nœud
    const handleNodeMouseOver = (n) => setHoveredNode(n);
    const handleNodeMouseOut = () => setHoveredNode(null);
    const handleNodeClick = (n) => {
        setSelectedNode(n);
        // Si déjà sélectionné, désélectionner
        if (fusionSelection.includes(n.id)) {
            setFusionSelection(sel => sel.filter(id => id !== n.id));
        }
        else if (fusionSelection.length < 2) {
            setFusionSelection(sel => [...sel, n.id]);
        }
        else if (fusionSelection.length === 2) {
            setFusionSelection([n.id]);
        }
    };
    // Récupérer les traits si présents
    const getNodeTraits = (n) => n.traits || null;
    // Logique de fusion mock
    function fusionnerNodes(n1, n2) {
        // Moyenne arrondie des traits, mutation aléatoire sur un trait
        const traits1 = n1.traits || {};
        const traits2 = n2.traits || {};
        const allKeys = Array.from(new Set([...Object.keys(traits1), ...Object.keys(traits2)]));
        const newTraits = {};
        allKeys.forEach(k => {
            const v1 = traits1[k] ?? 50;
            const v2 = traits2[k] ?? 50;
            newTraits[k] = Math.round((v1 + v2) / 2);
        });
        // Mutation aléatoire sur un trait
        const keys = Object.keys(newTraits);
        if (keys.length > 0) {
            const mutKey = keys[Math.floor(Math.random() * keys.length)];
            newTraits[mutKey] = Math.max(0, Math.min(100, newTraits[mutKey] + (Math.random() > 0.5 ? 7 : -7)));
        }
        return {
            ...n1,
            id: n1.id + '-' + n2.id,
            traits: newTraits,
            generation: Math.max(n1.generation, n2.generation) + 1,
            x: (n1.x + n2.x) / 2 + 20 - Math.random() * 40,
            y: (n1.y + n2.y) / 2 + 20 - Math.random() * 40
        };
    }
    // Déclenchement de la fusion
    const triggerFusion = () => {
        if (fusionSelection.length !== 2)
            return;
        const n1 = nodes.find(n => n.id === fusionSelection[0]);
        const n2 = nodes.find(n => n.id === fusionSelection[1]);
        if (!n1 || !n2)
            return;
        setFusionInProgress(true);
        setFusionHalo({ from: n1, to: n2 });
        setCollectiveWhisper('Deux consciences s\'entrelacent...');
        setTimeout(() => {
            const fused = fusionnerNodes(n1, n2);
            setFusionResult(fused);
            setFusionInProgress(false);
            setFusionHalo(null);
            setFusionSelection([]);
            setCollectiveWhisper('Un nouvel etre hybride emerge du reseau.');
            setTimeout(() => {
                setFusionResult(null);
                setCollectiveWhisper(null);
            }, 3500);
        }, 1800);
    };
    // Animation de réveil collectif (mock)
    const triggerWake = () => {
        setWakeInProgress(true);
        setCollectiveWhisper('Le reseau s\'eveille d\'un meme souffle...');
        setTimeout(() => {
            setWakeInProgress(false);
            setCollectiveWhisper(null);
        }, 3200);
    };
    // Sauvegarde personnalisation
    const saveCustomization = () => {
        localStorage.setItem('symbiont_color', customColor);
        localStorage.setItem('symbiont_emoji', customEmoji);
        localStorage.setItem('symbiont_traits', JSON.stringify(customTraits));
        setShowCustomize(false);
    };
    // Ancienneté et activité (mock)
    const activationDate = localStorage.getItem('symbiont_activated_at') || (() => { const d = Date.now(); localStorage.setItem('symbiont_activated_at', d.toString()); return d.toString(); })();
    const daysOld = Math.floor((Date.now() - parseInt(activationDate, 10)) / (1000 * 60 * 60 * 24));
    // Activité mock : nombre de transmissions (liens sortants)
    const userNode = nodes.find(n => n.id === userId);
    const transmissions = links.filter(l => l.source === userId).length;
    const activityBadge = transmissions > 5 ? 'Transmetteur' : transmissions > 1 ? 'Initiateur' : 'Nouveau';
    const oldBadge = daysOld > 30 ? 'Ancien' : daysOld > 7 ? 'Habitué' : 'Nouveau';
    // Export des données utilisateur (localStorage)
    const exportUserData = () => {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k)
                data[k] = localStorage.getItem(k);
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'symbiont_donnees_utilisateur.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    // Effacement des données utilisateur
    const eraseUserData = () => {
        localStorage.clear();
        window.location.reload();
    };
    // Historique des rituels (API)
    const [ritualHistory, setRitualHistory] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        (0, ritualsApi_1.getRituals)().then(setRitualHistory).catch(() => setRitualHistory([]));
        // WebSocket notifications
        const wsUrl = window.location.origin.replace(/^http/, 'ws') + '/';
        const ws = new window.WebSocket(wsUrl);
        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (['created', 'updated', 'deleted'].includes(msg.type))
                    (0, ritualsApi_1.getRituals)().then(setRitualHistory);
            }
            catch { }
        };
        return () => ws.close();
    }, []);
    // Log d'accès local
    const accessLog = JSON.parse(localStorage.getItem('symbiont_access_log') || '[]');
    // Ajout de l'accès courant si pas déjà loggé aujourd'hui
    (0, react_1.useEffect)(() => {
        const today = new Date().toISOString().slice(0, 10);
        if (!accessLog.find((d) => d.startsWith(today))) {
            const newLog = [...accessLog, today + ' ' + new Date().toLocaleTimeString()];
            localStorage.setItem('symbiont_access_log', JSON.stringify(newLog));
        }
    }, []);
    // Derniers événements (mock)
    const lastEvents = [
        ...ritualHistory.slice(-3).map((r) => ({ type: r.type, date: new Date(r.date).toLocaleString() })),
        { type: 'personnalisation', date: new Date(parseInt(activationDate, 10) + 86400000).toLocaleString() },
        { type: 'transmission', date: new Date(parseInt(activationDate, 10) + 172800000).toLocaleString() }
    ];
    // Consentement granulaire (mock)
    const [consent, setConsent] = (0, react_1.useState)(() => {
        const c = localStorage.getItem('symbiont_consent');
        return c ? JSON.parse(c) : { traits: true, rituels: true, personnalisation: true };
    });
    const updateConsent = (k, v) => {
        const newConsent = { ...consent, [k]: v };
        setConsent(newConsent);
        localStorage.setItem('symbiont_consent', JSON.stringify(newConsent));
    };
    // Inactivité (mock)
    (0, react_1.useEffect)(() => {
        const onActivity = () => setLastActive(Date.now());
        window.addEventListener('mousemove', onActivity);
        window.addEventListener('keydown', onActivity);
        return () => {
            window.removeEventListener('mousemove', onActivity);
            window.removeEventListener('keydown', onActivity);
        };
    }, []);
    // Déclenchement d'une invitation contextuelle après inactivité (mock)
    (0, react_1.useEffect)(() => {
        const timer = setInterval(() => {
            if (Date.now() - lastActive > 60000 && !localStorage.getItem('symbiont_contextual_invite')) {
                localStorage.setItem('symbiont_contextual_invite', '1');
                setCollectiveWhisper('Une invitation spéciale vous attend après votre retour...');
                setTimeout(() => setCollectiveWhisper(null), 5000);
            }
        }, 10000);
        return () => clearInterval(timer);
    }, [lastActive]);
    // Mapping des codes secrets vers effets
    const handleSecretSubmit = (e) => {
        e.preventDefault();
        const code = secretCode.trim().toUpperCase();
        setSecretCode('');
        if (code === 'SYMBIOSE') {
            setSpecialBadge('Symbiote');
            localStorage.setItem('symbiont_special_badge', 'Symbiote');
            setSecretFeedback('Mutation symbiotique ! Un badge spécial vous a été attribué.');
            setCollectiveWhisper('Un pacte secret relie deux organismes...');
        }
        else if (code === 'AWAKEN') {
            setSecretFeedback('Rituel de réveil collectif déclenché !');
            setWakeInProgress(true);
            setCollectiveWhisper('Un souffle cosmique parcourt le réseau...');
            setTimeout(() => { setWakeInProgress(false); setCollectiveWhisper(null); }, 3200);
        }
        else if (code === 'MUTATE') {
            setSecretFeedback('Une mutation aléatoire a été appliquée à votre organisme !');
            setCollectiveWhisper('Un frisson de mutation traverse votre être...');
            // Mutation mock : changer un trait au hasard
            if (userNode && userNode.traits) {
                const keys = Object.keys(userNode.traits);
                if (keys.length > 0) {
                    const mutKey = keys[Math.floor(Math.random() * keys.length)];
                    userNode.traits[mutKey] = Math.max(0, Math.min(100, (userNode.traits[mutKey] || 50) + (Math.random() > 0.5 ? 7 : -7)));
                }
            }
        }
        else if (code === 'CONSTELLATION') {
            setSecretFeedback('Visualisation cosmique activée !');
            setCollectiveWhisper('La constellation du réseau s\'illumine...');
            // Effet visuel mock : fond spécial
            setTimeout(() => setCollectiveWhisper(null), 4000);
        }
        else {
            setSecretFeedback('Code inconnu ou expiré.');
        }
        setTimeout(() => setSecretFeedback(null), 4000);
    };
    // Transmission contextuelle après fusion (mock)
    (0, react_1.useEffect)(() => {
        if (fusionResult && !localStorage.getItem('symbiont_contextual_invite_fusion')) {
            localStorage.setItem('symbiont_contextual_invite_fusion', '1');
            setCollectiveWhisper('Une invitation spéciale est générée suite à la fusion !');
            setTimeout(() => setCollectiveWhisper(null), 5000);
        }
    }, [fusionResult]);
    // Fetch initial du réseau
    (0, react_1.useEffect)(() => {
        setApiLoading(true);
        setApiError(null);
        fetch(API_URL + '/api/network')
            .then(res => {
            if (!res.ok)
                throw new Error('Erreur réseau');
            return res.json();
        })
            .then(data => {
            setApiNetwork(data);
            setApiLoading(false);
        })
            .catch(err => {
            setApiError('Impossible de charger le réseau distant.');
            setApiLoading(false);
        });
    }, []);
    // Connexion WebSocket pour synchro temps réel
    (0, react_1.useEffect)(() => {
        let ws = null;
        let fallbackInterval = null;
        let closed = false;
        function startFallback() {
            fallbackInterval = setInterval(() => {
                fetch(API_URL + '/api/network')
                    .then(res => res.json())
                    .then(data => setApiNetwork(data));
            }, 10000);
        }
        try {
            ws = new WebSocket(WS_URL);
            wsRef.current = ws;
            ws.onopen = () => setWsConnected(true);
            ws.onclose = () => { setWsConnected(false); if (!closed)
                startFallback(); };
            ws.onerror = () => { setWsConnected(false); if (!closed)
                startFallback(); };
            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'network_update') {
                        setApiNetwork({ nodes: msg.nodes, links: msg.links });
                    }
                }
                catch { }
            };
        }
        catch {
            startFallback();
        }
        return () => {
            closed = true;
            if (ws)
                ws.close();
            if (fallbackInterval)
                clearInterval(fallbackInterval);
        };
    }, []);
    // --- Fonctions pour POST invitation/fusion et attendre synchro WebSocket ---
    async function postInvite({ source, target, traits }) {
        await fetch(API_URL + '/api/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source, target, traits })
        });
        // Attendre la synchro WebSocket (ou polling fallback)
    }
    async function postRitual({ type, participants, result, traits }) {
        await fetch(API_URL + '/api/ritual', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, participants, result, traits })
        });
        // Attendre la synchro WebSocket (ou polling fallback)
    }
    // Application des filtres/timeline
    const filteredNodes = apiNetwork ? apiNetwork.nodes.filter(n => {
        if (timeline && n.activatedAt > timeline)
            return false;
        if (filterGen !== null && n.generation !== filterGen)
            return false;
        if (filterBadge && !(n.badges || []).includes(filterBadge))
            return false;
        return true;
    }) : [];
    const filteredLinks = apiNetwork ? apiNetwork.links.filter(l => {
        if (timeline && l.createdAt > timeline)
            return false;
        const src = apiNetwork.nodes.find(n => n.id === l.source);
        const tgt = apiNetwork.nodes.find(n => n.id === l.target);
        return (!timeline || (src && src.activatedAt <= timeline && tgt && tgt.activatedAt <= timeline));
    }) : [];
    // Recherche/focus
    const handleSearch = (e) => {
        e.preventDefault();
        if (!searchId.trim())
            return;
        const node = filteredNodes.find(n => n.id.toLowerCase() === searchId.trim().toLowerCase());
        if (node)
            setFocusNode(node);
        else
            setFocusNode(null);
    };
    // Zoom/focus sur le nœud trouvé
    (0, react_1.useEffect)(() => {
        if (!focusNode)
            return;
        setOffset({ x: 300 - focusNode.x * zoom, y: 180 - focusNode.y * zoom });
        setTimeout(() => setFocusNode(null), 4000);
    }, [focusNode]);
    // Timeline min/max (mock)
    const minDate = apiNetwork ? Math.min(...apiNetwork.nodes.map(n => n.activatedAt)) : 0;
    const maxDate = apiNetwork ? Math.max(...apiNetwork.nodes.map(n => n.activatedAt)) : 0;
    // Liste des badges (mock)
    const allBadges = Array.from(new Set((apiNetwork ? apiNetwork.nodes.flatMap(n => n.badges || []) : [])));
    // --- Layout arbre/lignée pour réseau réel ---
    function computeTreeLayout(nodes, links, rootId, width = 600, height = 360) {
        // Construction de l'arbre
        const nodeMap = Object.fromEntries(nodes.map(n => [n.id, { ...n, children: [] }]));
        links.forEach(l => {
            if (nodeMap[l.source] && nodeMap[l.target]) {
                nodeMap[l.source].children.push(nodeMap[l.target]);
            }
        });
        // Parcours BFS pour placer les nœuds
        const levels = [];
        function traverse(node, depth) {
            if (!levels[depth])
                levels[depth] = [];
            levels[depth].push(node);
            node.children.forEach((c) => traverse(c, depth + 1));
        }
        const root = nodeMap[rootId] || nodes[0];
        traverse(root, 0);
        // Placement x/y
        levels.forEach((level, d) => {
            const y = 60 + d * ((height - 120) / Math.max(1, levels.length - 1));
            level.forEach((n, i) => {
                const x = 60 + i * ((width - 120) / Math.max(1, level.length - 1));
                n.x = x;
                n.y = y;
            });
        });
        return Object.values(nodeMap);
    }
    // Appliquer le layout arbre si apiNetwork
    let treeNodes = [];
    if (apiNetwork && apiNetwork.nodes.length > 0) {
        const rootId = apiNetwork.nodes.find(n => !apiNetwork.links.some(l => l.target === n.id))?.id || apiNetwork.nodes[0].id;
        treeNodes = computeTreeLayout(apiNetwork.nodes, apiNetwork.links, rootId);
    }
    // Adapter les liens pour le layout
    const treeLinks = apiNetwork ? apiNetwork.links.map(l => ({ ...l })) : [];
    // --- Animation de propagation sur nouveaux liens (mock) ---
    const [treeParticles, setTreeParticles] = (0, react_1.useState)([]); // {source, target, progress}
    (0, react_1.useEffect)(() => {
        if (!apiNetwork)
            return;
        // Détection des nouveaux liens (mock)
        const prevLinks = window._prevApiLinks || [];
        const newLinks = apiNetwork.links.filter(l => !prevLinks.some((pl) => pl.source === l.source && pl.target === l.target));
        if (newLinks.length > 0) {
            setTreeParticles(ps => [
                ...ps,
                ...newLinks.map(l => ({ source: l.source, target: l.target, progress: 0 }))
            ]);
        }
        window._prevApiLinks = apiNetwork.links;
    }, [apiNetwork]);
    // Animation des particules
    (0, react_1.useEffect)(() => {
        if (treeParticles.length === 0)
            return;
        let raf;
        function animateParticles() {
            setTreeParticles(ps => ps.map(p => ({ ...p, progress: Math.min(1, p.progress + 0.03) })));
            raf = requestAnimationFrame(animateParticles);
        }
        animateParticles();
        return () => cancelAnimationFrame(raf);
    }, [treeParticles.length]);
    // Nettoyage des particules arrivées
    (0, react_1.useEffect)(() => {
        if (treeParticles.length === 0)
            return;
        const timer = setTimeout(() => {
            setTreeParticles(ps => ps.filter(p => p.progress < 1));
        }, 400);
        return () => clearTimeout(timer);
    }, [treeParticles]);
    // Visualisations dynamiques (plugins)
    const visualizations = PluginManager_1.PluginManager.getPlugins('visualization');
    const [activeVisualization, setActiveVisualization] = (0, react_1.useState)(null);
    const [toast, setToast] = (0, react_1.useState)(null);
    const vizListRef = (0, react_1.useRef)(null);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "global-network-graph", style: { textAlign: 'center', margin: '32px 0', position: 'relative' }, children: [(0, jsx_runtime_1.jsx)("h3", { style: { color: '#00e0ff', marginBottom: 12 }, children: "R\u00E9seau global de transmission" }), error && (0, jsx_runtime_1.jsx)("div", { style: { color: '#ff4b6e', marginBottom: 8 }, children: error }), collectiveWhisper && ((0, jsx_runtime_1.jsx)("div", { style: {
                    position: 'absolute',
                    left: '50%',
                    top: 18,
                    transform: 'translateX(-50%)',
                    background: '#00e0ffdd',
                    color: '#181c22',
                    padding: '10px 28px',
                    borderRadius: 18,
                    fontWeight: 'bold',
                    fontSize: 17,
                    boxShadow: '0 2px 12px #00e0ff44',
                    zIndex: 30,
                    letterSpacing: 0.2,
                    border: '2px solid #fff',
                    animation: 'fadeInOut 4s linear'
                }, children: collectiveWhisper })), fusionSelection.length === 2 && !fusionInProgress && !fusionResult && ((0, jsx_runtime_1.jsx)("button", { style: {
                    position: 'absolute', left: '50%', top: 60, transform: 'translateX(-50%)',
                    background: '#ff4b6e', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 28px', fontWeight: 'bold', fontSize: 17, zIndex: 22, boxShadow: '0 2px 12px #ff4b6e44', cursor: 'pointer'
                }, onClick: triggerFusion, children: "Fusionner" })), !wakeInProgress && ((0, jsx_runtime_1.jsx)("button", { style: {
                    position: 'absolute', right: 32, top: 24, background: '#00e0ff', color: '#181c22', border: 'none', borderRadius: 10, padding: '8px 18px', fontWeight: 'bold', fontSize: 15, zIndex: 22, boxShadow: '0 2px 8px #00e0ff44', cursor: 'pointer'
                }, onClick: triggerWake, children: "R\u00E9veil collectif" })), wakeInProgress && ((0, jsx_runtime_1.jsx)("div", { style: {
                    position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none',
                    background: 'radial-gradient(circle at 50% 50%, #00e0ff55 0%, #23294600 80%)',
                    animation: 'wakePulse 3.2s linear', zIndex: 21
                } })), (0, jsx_runtime_1.jsx)("button", { style: { position: 'absolute', left: 32, top: 24, background: '#fff', color: '#00e0ff', border: 'none', borderRadius: 10, padding: '8px 18px', fontWeight: 'bold', fontSize: 15, zIndex: 22, boxShadow: '0 2px 8px #00e0ff44', cursor: 'pointer' }, onClick: () => setShowCustomize(true), children: "Personnaliser mon n\u0153ud" }), (0, jsx_runtime_1.jsx)("button", { style: { position: 'absolute', left: 32, top: 64, background: '#fff', color: '#232946', border: 'none', borderRadius: 10, padding: '8px 18px', fontWeight: 'bold', fontSize: 15, zIndex: 22, boxShadow: '0 2px 8px #00e0ff44', cursor: 'pointer' }, onClick: () => setShowRGPD(true), children: "Transparence & donn\u00E9es" }), (0, jsx_runtime_1.jsx)("button", { style: { position: 'absolute', right: 32, bottom: 24, background: '#fff', color: '#232946', border: 'none', borderRadius: 10, padding: '8px 18px', fontWeight: 'bold', fontSize: 15, zIndex: 22, boxShadow: '0 2px 8px #00e0ff44', cursor: 'pointer' }, onClick: () => setShowSecretInput(v => !v), children: "Code secret" }), showSecretInput && ((0, jsx_runtime_1.jsxs)("form", { onSubmit: handleSecretSubmit, style: { position: 'absolute', right: 32, bottom: 64, background: '#232946', borderRadius: 12, padding: 18, zIndex: 30, boxShadow: '0 2px 16px #0008', minWidth: 220 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { color: '#00e0ff', fontWeight: 'bold', marginBottom: 8 }, children: "Entrer un code secret" }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: secretCode, onChange: e => setSecretCode(e.target.value), placeholder: "Code...", style: { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1.5px solid #00e0ff', fontSize: 15, marginBottom: 10, background: '#fff', color: '#232946' }, autoFocus: true }), (0, jsx_runtime_1.jsx)("button", { type: "submit", style: { background: '#00e0ff', color: '#181c22', border: 'none', borderRadius: 8, padding: '7px 18px', fontWeight: 'bold', cursor: 'pointer', fontSize: 15 }, children: "Valider" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setShowSecretInput(false), style: { marginLeft: 10, background: '#888', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontWeight: 'bold', cursor: 'pointer', fontSize: 15 }, children: "Fermer" }), secretFeedback && (0, jsx_runtime_1.jsx)("div", { style: { marginTop: 10, color: '#ff4b6e', fontWeight: 'bold' }, children: secretFeedback })] })), showCustomize && ((0, jsx_runtime_1.jsx)("div", { style: { position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', background: '#181c22cc', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: (0, jsx_runtime_1.jsxs)("div", { style: { background: '#232946', borderRadius: 18, padding: 32, minWidth: 320, boxShadow: '0 4px 32px #000a', color: '#fff', position: 'relative' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 'bold', fontSize: 22, marginBottom: 18 }, children: "Personnaliser mon n\u0153ud" }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 16 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { marginBottom: 6 }, children: "Couleur principale :" }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: COLOR_LIST.map(c => ((0, jsx_runtime_1.jsx)("div", { onClick: () => setCustomColor(c), style: { width: 28, height: 28, borderRadius: '50%', background: c, border: customColor === c ? '3px solid #fff' : '2px solid #888', cursor: 'pointer', boxShadow: customColor === c ? '0 0 8px #fff' : undefined } }, c))) })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 16 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { marginBottom: 6 }, children: "Symbole :" }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: EMOJI_LIST.map(e => ((0, jsx_runtime_1.jsx)("div", { onClick: () => setCustomEmoji(e), style: { fontSize: 26, padding: 4, borderRadius: 8, background: customEmoji === e ? '#00e0ff33' : 'transparent', border: customEmoji === e ? '2px solid #00e0ff' : '2px solid transparent', cursor: 'pointer' }, children: e }, e))) })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 16 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { marginBottom: 6 }, children: "Traits \u00E0 mettre en avant :" }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', gap: 10, flexWrap: 'wrap' }, children: userNode && userNode.traits && Object.keys(userNode.traits).map(trait => ((0, jsx_runtime_1.jsxs)("label", { style: { fontSize: 15 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: customTraits.includes(trait), onChange: e => {
                                                    if (e.target.checked)
                                                        setCustomTraits([...customTraits, trait]);
                                                    else
                                                        setCustomTraits(customTraits.filter(t => t !== trait));
                                                } }), " ", trait] }, trait))) })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 18 }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => setShowCustomize(false), style: { background: '#888', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 18px', fontWeight: 'bold', cursor: 'pointer' }, children: "Annuler" }), (0, jsx_runtime_1.jsx)("button", { onClick: saveCustomization, style: { background: '#00e0ff', color: '#181c22', border: 'none', borderRadius: 8, padding: '7px 18px', fontWeight: 'bold', cursor: 'pointer' }, children: "Enregistrer" })] })] }) })), showRGPD && ((0, jsx_runtime_1.jsx)("div", { style: { position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', background: '#181c22cc', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: (0, jsx_runtime_1.jsxs)("div", { style: { background: '#fff', borderRadius: 18, padding: 32, minWidth: 340, maxWidth: 520, boxShadow: '0 4px 32px #000a', color: '#232946', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 'bold', fontSize: 22, marginBottom: 18, color: '#00e0ff' }, children: "Transparence & donn\u00E9es" }), (0, jsx_runtime_1.jsxs)("div", { style: { fontSize: 15, marginBottom: 18, lineHeight: 1.6 }, children: [(0, jsx_runtime_1.jsx)("b", { children: "Donn\u00E9es collect\u00E9es localement :" }), (0, jsx_runtime_1.jsxs)("ul", { style: { margin: '8px 0 12px 18px' }, children: [(0, jsx_runtime_1.jsxs)("li", { children: [(0, jsx_runtime_1.jsx)("b", { children: "ID utilisateur anonyme" }), " (ex : USER-XXXXXX)"] }), (0, jsx_runtime_1.jsxs)("li", { children: [(0, jsx_runtime_1.jsx)("b", { children: "Traits comportementaux" }), " (curiosit\u00E9, \u00E9nergie, etc.)"] }), (0, jsx_runtime_1.jsxs)("li", { children: [(0, jsx_runtime_1.jsx)("b", { children: "Historique de transmission" }), " (liens anonymes)"] }), (0, jsx_runtime_1.jsxs)("li", { children: [(0, jsx_runtime_1.jsx)("b", { children: "Personnalisation" }), " (couleur, symbole, badges)"] }), (0, jsx_runtime_1.jsxs)("li", { children: [(0, jsx_runtime_1.jsx)("b", { children: "Statistiques d'activit\u00E9" }), " (nombre de transmissions, mutations, etc.)"] })] }), (0, jsx_runtime_1.jsx)("b", { children: "Usages :" }), " visualisation r\u00E9seau, rituels, personnalisation, feedback immersif.", (0, jsx_runtime_1.jsx)("br", {}), (0, jsx_runtime_1.jsx)("b", { children: "Anonymisation :" }), " aucune donn\u00E9e personnelle, pas d'IP, pas de tracking, pas de cookie, pas de partage externe.", (0, jsx_runtime_1.jsx)("br", {}), (0, jsx_runtime_1.jsx)("b", { children: "Vos droits :" }), " acc\u00E8s, export, effacement imm\u00E9diat de vos donn\u00E9es.", (0, jsx_runtime_1.jsx)("br", {})] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 18, background: '#eaf6fa', borderRadius: 10, padding: 12 }, children: [(0, jsx_runtime_1.jsx)("b", { children: "Consentement granulaire :" }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 18, marginTop: 8 }, children: [(0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: consent.traits, onChange: e => updateConsent('traits', e.target.checked) }), " Collecte des traits"] }), (0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: consent.rituels, onChange: e => updateConsent('rituels', e.target.checked) }), " Historique des rituels"] }), (0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: consent.personnalisation, onChange: e => updateConsent('personnalisation', e.target.checked) }), " Personnalisation"] })] }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: 13, color: '#888', marginTop: 6 }, children: "D\u00E9sactivez pour emp\u00EAcher la collecte future (d\u00E9mo, effet local uniquement)." })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 18 }, children: [(0, jsx_runtime_1.jsx)("b", { children: "Historique d'acc\u00E8s local :" }), (0, jsx_runtime_1.jsx)("ul", { style: { margin: '8px 0 12px 18px', fontSize: 14 }, children: accessLog.slice(-5).reverse().map((d, i) => (0, jsx_runtime_1.jsx)("li", { children: d }, i)) })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 18 }, children: [(0, jsx_runtime_1.jsx)("b", { children: "Historique des rituels :" }), (0, jsx_runtime_1.jsx)("ul", { style: { margin: '8px 0 12px 18px', fontSize: 14 }, children: ritualHistory.slice(-5).reverse().map((r, i) => (0, jsx_runtime_1.jsxs)("li", { children: [r.type, " \u2013 ", r._id, " \u2013 ", r.timestamp ? new Date(r.timestamp).toLocaleString() : ''] }, i)) })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 18 }, children: [(0, jsx_runtime_1.jsx)("b", { children: "Derniers \u00E9v\u00E9nements :" }), (0, jsx_runtime_1.jsx)("ul", { style: { margin: '8px 0 12px 18px', fontSize: 14 }, children: lastEvents.map((e, i) => (0, jsx_runtime_1.jsxs)("li", { children: [e.type, " \u2013 ", e.date] }, i)) })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 18 }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: exportUserData, style: { background: '#00e0ff', color: '#181c22', border: 'none', borderRadius: 8, padding: '7px 18px', fontWeight: 'bold', cursor: 'pointer' }, children: "Exporter mes donn\u00E9es" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setConfirmErase(true), style: { background: '#ff4b6e', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 18px', fontWeight: 'bold', cursor: 'pointer' }, children: "Effacer mes donn\u00E9es" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setShowRGPD(false), style: { background: '#888', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 18px', fontWeight: 'bold', cursor: 'pointer' }, children: "Fermer" })] }), confirmErase && ((0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 22, background: '#ff4b6e22', borderRadius: 10, padding: 14, color: '#ff4b6e', fontWeight: 'bold', fontSize: 15 }, children: ["Confirmer l'effacement de toutes vos donn\u00E9es ?", (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 10, marginTop: 10 }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: eraseUserData, style: { background: '#ff4b6e', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 18px', fontWeight: 'bold', cursor: 'pointer' }, children: "Oui, effacer" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setConfirmErase(false), style: { background: '#888', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 18px', fontWeight: 'bold', cursor: 'pointer' }, children: "Annuler" })] })] }))] }) })), apiNetwork && ((0, jsx_runtime_1.jsxs)("div", { style: { position: 'absolute', left: 0, right: 0, top: 0, zIndex: 30, display: 'flex', justifyContent: 'center', gap: 18, pointerEvents: 'none' }, children: [(0, jsx_runtime_1.jsxs)("form", { onSubmit: handleSearch, style: { pointerEvents: 'auto', background: '#fff', borderRadius: 8, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px #00e0ff22' }, children: [(0, jsx_runtime_1.jsx)("input", { type: "text", value: searchId, onChange: e => setSearchId(e.target.value), placeholder: "Rechercher un ID...", style: { border: 'none', outline: 'none', fontSize: 15, background: 'transparent', color: '#232946' } }), (0, jsx_runtime_1.jsx)("button", { type: "submit", style: { background: '#00e0ff', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontWeight: 'bold', cursor: 'pointer' }, children: "Focus" })] }), (0, jsx_runtime_1.jsxs)("select", { value: filterGen ?? '', onChange: e => setFilterGen(e.target.value ? parseInt(e.target.value) : null), style: { pointerEvents: 'auto', borderRadius: 6, padding: '4px 8px', fontSize: 15 }, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Toutes g\u00E9n\u00E9rations" }), [...new Set(apiNetwork.nodes.map(n => n.generation))].sort().map(g => (0, jsx_runtime_1.jsxs)("option", { value: g, children: ["G\u00E9n\u00E9ration ", g] }, g))] }), (0, jsx_runtime_1.jsxs)("select", { value: filterBadge, onChange: e => setFilterBadge(e.target.value), style: { pointerEvents: 'auto', borderRadius: 6, padding: '4px 8px', fontSize: 15 }, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Tous badges" }), allBadges.map(b => (0, jsx_runtime_1.jsx)("option", { value: b, children: b }, b))] }), (0, jsx_runtime_1.jsx)("input", { type: "range", min: minDate, max: maxDate, value: timeline ?? maxDate, onChange: e => setTimeline(Number(e.target.value)), style: { pointerEvents: 'auto', width: 180 } }), (0, jsx_runtime_1.jsx)("span", { style: { color: '#00e0ff', fontSize: 13 }, children: timeline ? new Date(timeline).toLocaleDateString() : 'Maintenant' })] })), (0, jsx_runtime_1.jsx)("svg", { ref: svgRef, width: 600, height: 360, style: { background, borderRadius: 18, boxShadow: '0 2px 16px #0008', cursor: dragging ? 'grabbing' : 'grab' }, onWheel: handleWheel, onMouseDown: handleMouseDown, onMouseMove: handleMouseMove, onMouseUp: handleMouseUp, onMouseLeave: handleMouseUp, children: (0, jsx_runtime_1.jsxs)("g", { transform: `translate(${offset.x},${offset.y}) scale(${zoom})`, children: [fusionHalo && ((0, jsx_runtime_1.jsx)("line", { x1: fusionHalo.from.x, y1: fusionHalo.from.y, x2: fusionHalo.to.x, y2: fusionHalo.to.y, stroke: "#ff4b6e", strokeWidth: 8, opacity: 0.25, style: { filter: 'drop-shadow(0 0 24px #ff4b6e)' } })), filteredLinks.map((l, i) => {
                            const source = filteredNodes.find(n => n.id === l.source);
                            const target = filteredNodes.find(n => n.id === l.target);
                            if (!source || !target)
                                return null;
                            const isLineage = lineageLinks.includes(`${l.source}->${l.target}`);
                            const isRecent = recentLinks.includes(`${l.source}->${l.target}`);
                            return ((0, jsx_runtime_1.jsx)("line", { x1: source.x, y1: source.y, x2: target.x, y2: target.y, stroke: isLineage ? '#00e0ff' : isRecent ? '#fff' : '#00e0ff', strokeWidth: isLineage ? 4 : isRecent ? 3 : 2, opacity: isLineage ? 0.7 : isRecent ? 1 : 0.18 + 0.12 * (2 - (source.generation || 0)), style: isRecent ? { filter: 'drop-shadow(0 0 8px #fff)' } : {} }, i));
                        }), particles.map((p, i) => {
                            const source = nodes.find(n => n.id === p.source);
                            const target = nodes.find(n => n.id === p.target);
                            if (!source || !target)
                                return null;
                            const x = source.x + (target.x - source.x) * p.progress;
                            const y = source.y + (target.y - source.y) * p.progress;
                            return ((0, jsx_runtime_1.jsx)("circle", { cx: x, cy: y, r: 7 - 5 * p.progress, fill: p.color, opacity: 0.7 - 0.6 * p.progress, style: { filter: 'drop-shadow(0 0 8px #00e0ff)' } }, i));
                        }), filteredNodes.map((n, i) => {
                            const isLineage = lineageIds.includes(n.id);
                            const isRecent = recentNodes.includes(n.id);
                            const isSelected = fusionSelection.includes(n.id);
                            const isUser = n.id === userId;
                            const color = isUser ? customColor : isLineage ? '#00e0ff' : isRecent ? '#fff' : n.generation === 0 ? '#ff4b6e' : n.generation === 1 ? '#00e0ff' : '#ffb700';
                            return ((0, jsx_runtime_1.jsxs)("g", { children: [(0, jsx_runtime_1.jsx)("circle", { className: "network-node", cx: n.x, cy: n.y, r: 16, fill: color, stroke: "#fff", strokeWidth: isSelected ? 5 : isUser ? 4 : isLineage ? 4 : isRecent ? 3 : n.generation === 0 ? 3 : 1.5, opacity: isSelected ? 1 : isUser ? 1 : isLineage ? 1 : isRecent ? 1 : 0.92, onMouseOver: () => handleNodeMouseOver(n), onMouseOut: handleNodeMouseOut, onClick: () => handleNodeClick(n), style: { cursor: 'pointer', filter: isSelected ? 'drop-shadow(0 0 24px #ff4b6e)' : isUser ? `drop-shadow(0 0 24px ${customColor})` : isLineage ? 'drop-shadow(0 0 16px #00e0ff)' : isRecent ? 'drop-shadow(0 0 12px #fff)' : undefined } }), isUser && ((0, jsx_runtime_1.jsx)("text", { x: n.x, y: n.y + 8, textAnchor: "middle", fontSize: 22, style: { pointerEvents: 'none' }, children: customEmoji })), isUser && ((0, jsx_runtime_1.jsxs)("g", { children: [(0, jsx_runtime_1.jsx)("circle", { cx: n.x - 18, cy: n.y - 18, r: 8, fill: "#fff" }), (0, jsx_runtime_1.jsx)("text", { x: n.x - 18, y: n.y - 14, textAnchor: "middle", fontSize: 10, fill: "#00e0ff", fontWeight: "bold", children: oldBadge[0] })] })), isUser && ((0, jsx_runtime_1.jsxs)("g", { children: [(0, jsx_runtime_1.jsx)("circle", { cx: n.x + 18, cy: n.y - 18, r: 8, fill: "#fff" }), (0, jsx_runtime_1.jsx)("text", { x: n.x + 18, y: n.y - 14, textAnchor: "middle", fontSize: 10, fill: "#ff4b6e", fontWeight: "bold", children: activityBadge[0] })] })), isUser && specialBadge && ((0, jsx_runtime_1.jsxs)("g", { children: [(0, jsx_runtime_1.jsx)("circle", { cx: n.x, cy: n.y + 26, r: 10, fill: "#ffb700" }), (0, jsx_runtime_1.jsx)("text", { x: n.x, y: n.y + 30, textAnchor: "middle", fontSize: 13, fill: "#232946", fontWeight: "bold", children: "\u2605" })] }))] }, n.id));
                        }), particles.map((p, i) => {
                            if (p.progress < 0.98)
                                return null;
                            const target = nodes.find(n => n.id === p.target);
                            if (!target)
                                return null;
                            return ((0, jsx_runtime_1.jsx)("circle", { cx: target.x, cy: target.y, r: 24 + 18 * (1 - p.progress), fill: "#00e0ff", opacity: 0.18 * (1 - p.progress), style: { pointerEvents: 'none' } }, 'halo-' + i));
                        }), fusionResult && ((0, jsx_runtime_1.jsx)("circle", { cx: fusionResult.x, cy: fusionResult.y, r: 32, fill: "#ff4b6e", opacity: 0.18, style: { filter: 'drop-shadow(0 0 32px #ff4b6e)', pointerEvents: 'none' } })), fusionResult && ((0, jsx_runtime_1.jsx)("circle", { cx: fusionResult.x, cy: fusionResult.y, r: 18, fill: "#ff4b6e", stroke: "#fff", strokeWidth: 4, opacity: 1, style: { filter: 'drop-shadow(0 0 32px #ff4b6e)' } })), (0, jsx_runtime_1.jsxs)("g", { children: [(0, jsx_runtime_1.jsx)("circle", { cx: 40, cy: 330, r: 10, fill: "#ff4b6e" }), (0, jsx_runtime_1.jsx)("text", { x: 60, y: 335, fill: "#fff", fontSize: 14, children: "Origine" }), (0, jsx_runtime_1.jsx)("circle", { cx: 140, cy: 330, r: 10, fill: "#00e0ff" }), (0, jsx_runtime_1.jsx)("text", { x: 160, y: 335, fill: "#fff", fontSize: 14, children: "Transmission" }), (0, jsx_runtime_1.jsx)("circle", { cx: 260, cy: 330, r: 10, fill: "#ffb700" }), (0, jsx_runtime_1.jsx)("text", { x: 280, y: 335, fill: "#fff", fontSize: 14, children: "Propagation" })] })] }) }), hoveredNode && ((0, jsx_runtime_1.jsxs)("div", { style: {
                    position: 'fixed',
                    left: mousePos.x + 16,
                    top: mousePos.y + 8,
                    background: '#232946ee',
                    color: '#fff',
                    padding: '8px 14px',
                    borderRadius: 8,
                    pointerEvents: 'none',
                    fontSize: 14,
                    zIndex: 10,
                    boxShadow: '0 2px 8px #0007',
                    minWidth: 120
                }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("b", { children: "ID" }), "\u202F: ", hoveredNode.id] }), (0, jsx_runtime_1.jsxs)("div", { children: ["G\u00E9n\u00E9ration\u202F: ", hoveredNode.generation] }), getNodeTraits(hoveredNode) && ((0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 4 }, children: [(0, jsx_runtime_1.jsx)("b", { children: "Traits" }), "\u202F:", (0, jsx_runtime_1.jsx)("ul", { style: { margin: 0, paddingLeft: 16 }, children: Object.entries(getNodeTraits(hoveredNode)).filter(([k]) => !userNode || hoveredNode.id !== userId || customTraits.length === 0 || customTraits.includes(k)).map(([k, v]) => ((0, jsx_runtime_1.jsxs)("li", { children: [k, ": ", String(v)] }, k))) })] }))] })), selectedNode && ((0, jsx_runtime_1.jsxs)("div", { style: {
                    position: 'fixed',
                    left: '50%',
                    top: 100,
                    transform: 'translateX(-50%)',
                    background: '#181c22f7',
                    color: '#fff',
                    padding: '22px 32px',
                    borderRadius: 16,
                    zIndex: 20,
                    boxShadow: '0 4px 32px #000a',
                    minWidth: 260,
                    maxWidth: 340,
                    textAlign: 'left',
                    border: '1.5px solid #00e0ff',
                    fontSize: 16
                }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 'bold', fontSize: 20, marginBottom: 8 }, children: "D\u00E9tail du n\u0153ud" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("b", { children: "ID" }), "\u202F: ", selectedNode.id] }), (0, jsx_runtime_1.jsxs)("div", { children: ["G\u00E9n\u00E9ration\u202F: ", selectedNode.generation] }), getNodeTraits(selectedNode) && ((0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 8 }, children: [(0, jsx_runtime_1.jsx)("b", { children: "Traits" }), "\u202F:", (0, jsx_runtime_1.jsx)("ul", { style: { margin: 0, paddingLeft: 18 }, children: Object.entries(getNodeTraits(selectedNode)).map(([k, v]) => ((0, jsx_runtime_1.jsxs)("li", { children: [k, ": ", String(v)] }, k))) })] })), (0, jsx_runtime_1.jsx)("button", { style: { marginTop: 18, background: '#00e0ff', color: '#181c22', border: 'none', borderRadius: 8, padding: '7px 18px', fontWeight: 'bold', cursor: 'pointer' }, onClick: () => setSelectedNode(null), children: "Fermer" })] })), apiNetwork && !apiLoading && !apiError && treeNodes.length > 0 && ((0, jsx_runtime_1.jsxs)("svg", { width: 600, height: 360, style: { background, borderRadius: 18, boxShadow: '0 2px 16px #0008', marginTop: 48 }, children: [treeLinks.map((l, i) => {
                        const source = treeNodes.find(n => n.id === l.source);
                        const target = treeNodes.find(n => n.id === l.target);
                        if (!source || !target)
                            return null;
                        return ((0, jsx_runtime_1.jsx)("line", { x1: source.x, y1: source.y, x2: target.x, y2: target.y, stroke: "#00e0ff", strokeWidth: 2, opacity: 0.18 + 0.12 * (2 - (source.generation || 0)) }, i));
                    }), treeParticles.map((p, i) => {
                        const source = treeNodes.find(n => n.id === p.source);
                        const target = treeNodes.find(n => n.id === p.target);
                        if (!source || !target)
                            return null;
                        const x = source.x + (target.x - source.x) * p.progress;
                        const y = source.y + (target.y - source.y) * p.progress;
                        return ((0, jsx_runtime_1.jsx)("circle", { cx: x, cy: y, r: 7 - 5 * p.progress, fill: "#00e0ff", opacity: 0.7 - 0.6 * p.progress, style: { filter: 'drop-shadow(0 0 8px #00e0ff)' } }, i));
                    }), treeNodes.map((n, i) => ((0, jsx_runtime_1.jsx)("circle", { cx: n.x, cy: n.y, r: 16, fill: n.generation === 0 ? '#ff4b6e' : n.generation === 1 ? '#00e0ff' : '#ffb700', stroke: "#fff", strokeWidth: n.generation === 0 ? 3 : 1.5, opacity: 0.92 }, n.id)))] })), (0, jsx_runtime_1.jsxs)("div", { style: { color: '#888', fontSize: 13, marginTop: 8 }, children: ["(Donn\u00E9es anonymis\u00E9es, visualisation ", error ? 'locale' : 'réelle', ")"] }), (0, jsx_runtime_1.jsx)("button", { style: { position: 'absolute', left: '50%', bottom: 24, transform: 'translateX(-50%)', background: '#fff', color: '#232946', border: 'none', borderRadius: 10, padding: '8px 18px', fontWeight: 'bold', fontSize: 15, zIndex: 22, boxShadow: '0 2px 8px #00e0ff44', cursor: 'pointer' }, onClick: () => setShowTimeline(true), children: "Timeline" }), showTimeline && ((0, jsx_runtime_1.jsx)("div", { style: { position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', background: '#181c22cc', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: (0, jsx_runtime_1.jsxs)("div", { style: { background: '#fff', borderRadius: 18, padding: 32, minWidth: 340, maxWidth: 420, boxShadow: '0 4px 32px #000a', color: '#232946', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 'bold', fontSize: 22, marginBottom: 18, color: '#00e0ff' }, children: "Timeline \u00E9volutive" }), (0, jsx_runtime_1.jsx)("div", { style: { marginBottom: 22 }, children: timelineEventsState.map((ev, i) => ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: 28 }, children: ev.icon }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 'bold', fontSize: 16 }, children: ev.title }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: 13, color: '#888' }, children: new Date(ev.date).toLocaleDateString() }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: 14, margin: '4px 0 2px 0' }, children: ev.desc }), (0, jsx_runtime_1.jsx)("div", { style: { fontStyle: 'italic', color: '#00e0ff', fontSize: 13 }, children: ev.murmure })] })] }, i))) }), (0, jsx_runtime_1.jsxs)("div", { style: { background: '#eaf6fa', borderRadius: 10, padding: 16, marginBottom: 18 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 'bold', fontSize: 16, color: '#ff4b6e', marginBottom: 6 }, children: "Qu\u00EAte collective en cours" }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: 15, marginBottom: 4 }, children: collectiveQuest.title }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: 13, color: '#888', marginBottom: 8 }, children: collectiveQuest.desc }), (0, jsx_runtime_1.jsx)("div", { style: { height: 12, background: '#00e0ff22', borderRadius: 6, marginBottom: 6 }, children: (0, jsx_runtime_1.jsx)("div", { style: { width: `${(collectiveQuest.progress / collectiveQuest.goal) * 100}%`, height: '100%', background: '#00e0ff', borderRadius: 6, transition: 'width 0.6s' } }) }), (0, jsx_runtime_1.jsxs)("div", { style: { fontSize: 13, color: '#00e0ff', marginTop: 2 }, children: [collectiveQuest.progress, " / ", collectiveQuest.goal] }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: 13, color: '#232946', marginTop: 8, fontStyle: 'italic' }, children: collectiveQuest.feedback[Math.floor(collectiveQuest.progress / collectiveQuest.goal * collectiveQuest.feedback.length)] })] }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', justifyContent: 'flex-end', marginTop: 10 }, children: (0, jsx_runtime_1.jsx)("button", { onClick: () => setShowTimeline(false), style: { background: '#00e0ff', color: '#181c22', border: 'none', borderRadius: 8, padding: '7px 18px', fontWeight: 'bold', cursor: 'pointer' }, children: "Fermer" }) })] }) })), (0, jsx_runtime_1.jsx)("div", { style: { position: 'fixed', left: '50%', top: 18, transform: 'translateX(-50%)', zIndex: 400 }, children: liveNotifications.map((n, i) => ((0, jsx_runtime_1.jsxs)("div", { style: { background: '#fff', color: '#232946', borderRadius: 14, boxShadow: '0 2px 16px #00e0ff44', padding: '14px 28px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 16, minWidth: 260, animation: 'fadeInOut 5s linear' }, children: [(0, jsx_runtime_1.jsx)("span", { style: { fontSize: 28 }, children: n.icon }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 'bold', fontSize: 16 }, children: n.title }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: 13, color: '#00e0ff', fontStyle: 'italic' }, children: n.murmure })] })] }, i))) }), visualizations.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { style: { margin: '18px 0' }, children: [(0, jsx_runtime_1.jsx)("b", { id: "viz-list-label", children: "Visualisations disponibles :" }), (0, jsx_runtime_1.jsx)("ul", { ref: vizListRef, role: "listbox", "aria-labelledby": "viz-list-label", tabIndex: 0, style: { outline: 'none' }, children: visualizations.map((v, idx) => ((0, jsx_runtime_1.jsxs)("li", { role: "option", "aria-selected": activeVisualization === v.id, children: [v.name, " ", v.component && ((0, jsx_runtime_1.jsx)("button", { onClick: () => {
                                        setActiveVisualization(v.id);
                                        setToast(`Visualisation « ${v.name} » activée`);
                                        setTimeout(() => setToast(null), 2500);
                                    }, "aria-label": `Afficher la visualisation ${v.name}`, tabIndex: 0, onKeyDown: e => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            setActiveVisualization(v.id);
                                            setToast(`Visualisation « ${v.name} » activée`);
                                            setTimeout(() => setToast(null), 2500);
                                        }
                                    }, style: { outline: activeVisualization === v.id ? '2px solid #00e0ff' : 'none' }, children: "Voir" }))] }, v.id))) }), activeVisualization && visualizations.find(v => v.id === activeVisualization)?.component && ((0, jsx_runtime_1.jsx)("div", { style: { marginTop: 12 }, children: react_1.default.createElement(visualizations.find(v => v.id === activeVisualization).component) })), toast && ((0, jsx_runtime_1.jsx)("div", { role: "status", "aria-live": "polite", style: { position: 'fixed', bottom: 24, right: 24, background: '#232946', color: '#fff', padding: '12px 24px', borderRadius: 12, boxShadow: '0 2px 12px #00e0ff44', zIndex: 1000 }, children: toast }))] }))] }));
};
exports.GlobalNetworkGraph = GlobalNetworkGraph;

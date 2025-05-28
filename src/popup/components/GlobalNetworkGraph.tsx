import React, { useEffect, useRef, useState } from 'react';
import { getRituals, Ritual } from '../../shared/ritualsApi';
import { PluginManager, Plugin } from '../../core/PluginManager';

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
}

// Génère un réseau mocké (arbre de 3 générations, 1 racine, 3 enfants, 6 petits-enfants)
function generateMockNetwork(): { nodes: NetworkNode[]; links: NetworkLink[] } {
  const nodes: NetworkNode[] = [];
  const links: NetworkLink[] = [];
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

export const GlobalNetworkGraph: React.FC<GlobalNetworkGraphProps> = (props) => {
  const [network, setNetwork] = useState<{ nodes: NetworkNode[]; links: NetworkLink[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [collectiveWhisper, setCollectiveWhisper] = useState<string | null>(null);
  const [activityLevel, setActivityLevel] = useState(0);
  const prevCounts = useRef<{
    nodes: number;
    links: number;
    linksArr: NetworkLink[];
    nodesArr: NetworkNode[];
  }>({ nodes: 0, links: 0, linksArr: [], nodesArr: [] });
  const svgRef = useRef<SVGSVGElement>(null);
  const [particles, setParticles] = useState<any[]>([]); // {source, target, progress, color}
  const [recentLinks, setRecentLinks] = useState<string[]>([]); // ["source->target"]
  const [recentNodes, setRecentNodes] = useState<string[]>([]); // [id]
  const [fusionSelection, setFusionSelection] = useState<string[]>([]); // [id1, id2]
  const [fusionInProgress, setFusionInProgress] = useState(false);
  const [fusionResult, setFusionResult] = useState<NetworkNode | null>(null);
  const [fusionHalo, setFusionHalo] = useState<{from: NetworkNode, to: NetworkNode} | null>(null);
  const [wakeInProgress, setWakeInProgress] = useState(false);
  // Personnalisation
  const [showCustomize, setShowCustomize] = useState(false);
  const [customColor, setCustomColor] = useState(localStorage.getItem('symbiont_color') || '#00e0ff');
  const [customEmoji, setCustomEmoji] = useState(localStorage.getItem('symbiont_emoji') || '🌱');
  const [customTraits, setCustomTraits] = useState<string[]>(JSON.parse(localStorage.getItem('symbiont_traits') || '[]'));
  // RGPD & transparence
  const [showRGPD, setShowRGPD] = useState(false);
  const [confirmErase, setConfirmErase] = useState(false);
  // Rituels secrets & transmission contextuelle
  const [showSecretInput, setShowSecretInput] = useState(false);
  const [secretCode, setSecretCode] = useState('');
  const [secretFeedback, setSecretFeedback] = useState<string | null>(null);
  const [specialBadge, setSpecialBadge] = useState(localStorage.getItem('symbiont_special_badge') || '');
  // Inactivité (mock)
  const [lastActive, setLastActive] = useState(Date.now());
  // --- Connexion backend réelle & synchro WebSocket ---
  const [apiNetwork, setApiNetwork] = useState<{ nodes: any[]; links: any[] } | null>(null);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  // URL backend (adapter selon env)
  const API_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:8080' : 'https://symbiont-backend.onrender.com';
  const WS_URL = process.env.NODE_ENV === 'development' ? 'ws://localhost:8080' : 'wss://symbiont-backend.onrender.com';
  // Timeline (filtrage par date)
  const [timeline, setTimeline] = useState<number | null>(null); // timestamp max
  // Filtres
  const [filterGen, setFilterGen] = useState<number | null>(null);
  const [filterBadge, setFilterBadge] = useState<string>('');
  // Recherche/focus
  const [searchId, setSearchId] = useState('');
  const [focusNode, setFocusNode] = useState<any>(null);
  // Narration évolutive & quêtes collectives
  const [showTimeline, setShowTimeline] = useState(false);
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
  const [liveNotifications, setLiveNotifications] = useState<any[]>([]);
  const [timelineEventsState, setTimelineEventsState] = useState(timelineEvents);
  // Simulation d'événements live (mock)
  useEffect(() => {
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

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch('https://mock.symbiont.network/api/network')
      .then(res => {
        if (!res.ok) throw new Error('Erreur réseau');
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
  useEffect(() => {
    if (!network) return;
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
    } else if (activity === 0 && (nodeCount > 5)) {
      setCollectiveWhisper("Le réseau s'assoupit, en attente d'une nouvelle impulsion.");
    } else if (nodeDelta > 0) {
      setCollectiveWhisper("Une nouvelle connexion vient d'éclore.");
    } else if (linkDelta > 0) {
      setCollectiveWhisper("Un souffle traverse le réseau…");
    } else {
      setCollectiveWhisper(null);
    }
    // Murmure disparaît après 4s
    if (activity > 0) {
      const t = setTimeout(() => setCollectiveWhisper(null), 4000);
      return () => clearTimeout(t);
    }
  }, [network]);

  // Animation pulsation adaptée à l'activité
  useEffect(() => {
    let frame = 0;
    let raf: number;
    function animate() {
      frame++;
      if (svgRef.current) {
        const circles = svgRef.current.querySelectorAll('.network-node');
        circles.forEach((circle, idx) => {
          // Pulsation plus forte si activité
          const puls = 1 + (0.08 + 0.08 * Math.min(activityLevel, 3)) * Math.sin(frame / (20 - 3 * Math.min(activityLevel, 3)) + idx);
          (circle as SVGCircleElement).setAttribute('r', String(16 * puls));
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
  useEffect(() => {
    if (!network) return;
    // Détection des nouveaux liens
    const prevLinks = prevCounts.current.linksArr || [];
    const prevNodes = prevCounts.current.nodesArr || [];
    const newLinks = network.links.filter(l => !prevLinks.some((pl: any) => pl.source === l.source && pl.target === l.target));
    const newNodes = network.nodes.filter(n => !prevNodes.some((pn: any) => pn.id === n.id));
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
  useEffect(() => {
    if (particles.length === 0) return;
    let raf: number;
    function animateParticles() {
      setParticles(ps => ps.map(p => ({ ...p, progress: Math.min(1, p.progress + 0.03) }))); // vitesse
      raf = requestAnimationFrame(animateParticles);
    }
    animateParticles();
    return () => cancelAnimationFrame(raf);
  }, [particles.length]);
  // Nettoyage des particules arrivées
  useEffect(() => {
    if (particles.length === 0) return;
    const timer = setTimeout(() => {
      setParticles(ps => ps.filter(p => p.progress < 1));
    }, 400);
    return () => clearTimeout(timer);
  }, [particles]);

  // --- Lignée personnelle ---
  // Trouver la lignée ascendante/descendante à partir de userId
  function getPersonalLineage(userId: string, nodes: any[], links: any[]) {
    if (!userId) return { lineageIds: [], lineageLinks: [] };
    // Ascendants
    let lineageIds = [userId];
    let lineageLinks: string[] = [];
    let current = userId;
    // Remonter la chaîne
    while (true) {
      const parentLink = links.find(l => l.target === current);
      if (!parentLink) break;
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
        if (link) lineageLinks.push(`${link.source}->${link.target}`);
        // Ajouter les enfants de ce nœud
        children = children.concat(links.filter(l => l.source === child).map(l => l.target));
      }
    }
    return { lineageIds, lineageLinks };
  }

  if (loading) return <div style={{textAlign:'center',margin:'32px 0'}}>Chargement du réseau…</div>;

  const nodes = network?.nodes || [];
  const links = network?.links || [];
  const { lineageIds, lineageLinks } = getPersonalLineage(userId, nodes, links);

  // Gestion du zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom(z => Math.max(0.3, Math.min(2.5, z * delta)));
  };

  // Gestion du pan (drag)
  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
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
  const handleNodeMouseOver = (n: NetworkNode) => setHoveredNode(n);
  const handleNodeMouseOut = () => setHoveredNode(null);
  const handleNodeClick = (n: NetworkNode) => {
    setSelectedNode(n);
    // Si déjà sélectionné, désélectionner
    if (fusionSelection.includes(n.id)) {
      setFusionSelection(sel => sel.filter(id => id !== n.id));
    } else if (fusionSelection.length < 2) {
      setFusionSelection(sel => [...sel, n.id]);
    } else if (fusionSelection.length === 2) {
      setFusionSelection([n.id]);
    }
  };

  // Récupérer les traits si présents
  const getNodeTraits = (n: any) => n.traits || null;

  // Logique de fusion mock
  function fusionnerNodes(n1: any, n2: any) {
    // Moyenne arrondie des traits, mutation aléatoire sur un trait
    const traits1 = n1.traits || {};
    const traits2 = n2.traits || {};
    const allKeys = Array.from(new Set([...Object.keys(traits1), ...Object.keys(traits2)]));
    const newTraits: Record<string, number> = {};
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
    if (fusionSelection.length !== 2) return;
    const n1 = nodes.find(n => n.id === fusionSelection[0]);
    const n2 = nodes.find(n => n.id === fusionSelection[1]);
    if (!n1 || !n2) return;
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
    const data: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) data[k] = localStorage.getItem(k);
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
  const [ritualHistory, setRitualHistory] = useState<Ritual[]>([]);
  useEffect(() => {
    getRituals().then(setRitualHistory).catch(() => setRitualHistory([]));
    // WebSocket notifications
    const wsUrl = window.location.origin.replace(/^http/, 'ws') + '/';
    const ws = new window.WebSocket(wsUrl);
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (['created','updated','deleted'].includes(msg.type)) getRituals().then(setRitualHistory);
      } catch {}
    };
    return () => ws.close();
  }, []);
  // Log d'accès local
  const accessLog = JSON.parse(localStorage.getItem('symbiont_access_log') || '[]');
  // Ajout de l'accès courant si pas déjà loggé aujourd'hui
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (!accessLog.find((d: string) => d.startsWith(today))) {
      const newLog = [...accessLog, today + ' ' + new Date().toLocaleTimeString()];
      localStorage.setItem('symbiont_access_log', JSON.stringify(newLog));
    }
  }, []);
  // Derniers événements (mock)
  const lastEvents = [
    ...ritualHistory.slice(-3).map((r: any) => ({ type: r.type, date: new Date(r.date).toLocaleString() })),
    { type: 'personnalisation', date: new Date(parseInt(activationDate, 10) + 86400000).toLocaleString() },
    { type: 'transmission', date: new Date(parseInt(activationDate, 10) + 172800000).toLocaleString() }
  ];
  // Consentement granulaire (mock)
  const [consent, setConsent] = useState(() => {
    const c = localStorage.getItem('symbiont_consent');
    return c ? JSON.parse(c) : { traits: true, rituels: true, personnalisation: true };
  });
  const updateConsent = (k: string, v: boolean) => {
    const newConsent = { ...consent, [k]: v };
    setConsent(newConsent);
    localStorage.setItem('symbiont_consent', JSON.stringify(newConsent));
  };

  // Inactivité (mock)
  useEffect(() => {
    const onActivity = () => setLastActive(Date.now());
    window.addEventListener('mousemove', onActivity);
    window.addEventListener('keydown', onActivity);
    return () => {
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('keydown', onActivity);
    };
  }, []);
  // Déclenchement d'une invitation contextuelle après inactivité (mock)
  useEffect(() => {
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
  const handleSecretSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = secretCode.trim().toUpperCase();
    setSecretCode('');
    if (code === 'SYMBIOSE') {
      setSpecialBadge('Symbiote');
      localStorage.setItem('symbiont_special_badge', 'Symbiote');
      setSecretFeedback('Mutation symbiotique ! Un badge spécial vous a été attribué.');
      setCollectiveWhisper('Un pacte secret relie deux organismes...');
    } else if (code === 'AWAKEN') {
      setSecretFeedback('Rituel de réveil collectif déclenché !');
      setWakeInProgress(true);
      setCollectiveWhisper('Un souffle cosmique parcourt le réseau...');
      setTimeout(() => { setWakeInProgress(false); setCollectiveWhisper(null); }, 3200);
    } else if (code === 'MUTATE') {
      setSecretFeedback('Une mutation aléatoire a été appliquée à votre organisme !');
      setCollectiveWhisper('Un frisson de mutation traverse votre être...');
      // Mutation mock : changer un trait au hasard
      if (userNode && (userNode as any).traits) {
        const keys = Object.keys((userNode as any).traits);
        if (keys.length > 0) {
          const mutKey = keys[Math.floor(Math.random() * keys.length)];
          (userNode as any).traits[mutKey] = Math.max(0, Math.min(100, ((userNode as any).traits[mutKey] || 50) + (Math.random() > 0.5 ? 7 : -7)));
        }
      }
    } else if (code === 'CONSTELLATION') {
      setSecretFeedback('Visualisation cosmique activée !');
      setCollectiveWhisper('La constellation du réseau s\'illumine...');
      // Effet visuel mock : fond spécial
      setTimeout(() => setCollectiveWhisper(null), 4000);
    } else {
      setSecretFeedback('Code inconnu ou expiré.');
    }
    setTimeout(() => setSecretFeedback(null), 4000);
  };

  // Transmission contextuelle après fusion (mock)
  useEffect(() => {
    if (fusionResult && !localStorage.getItem('symbiont_contextual_invite_fusion')) {
      localStorage.setItem('symbiont_contextual_invite_fusion', '1');
      setCollectiveWhisper('Une invitation spéciale est générée suite à la fusion !');
      setTimeout(() => setCollectiveWhisper(null), 5000);
    }
  }, [fusionResult]);

  // Fetch initial du réseau
  useEffect(() => {
    setApiLoading(true);
    setApiError(null);
    fetch(API_URL + '/api/network')
      .then(res => {
        if (!res.ok) throw new Error('Erreur réseau');
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
  useEffect(() => {
    let ws: WebSocket | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;
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
      ws.onclose = () => { setWsConnected(false); if (!closed) startFallback(); };
      ws.onerror = () => { setWsConnected(false); if (!closed) startFallback(); };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'network_update') {
            setApiNetwork({ nodes: msg.nodes, links: msg.links });
          }
        } catch {}
      };
    } catch {
      startFallback();
    }
    return () => {
      closed = true;
      if (ws) ws.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, []);

  // --- Fonctions pour POST invitation/fusion et attendre synchro WebSocket ---
  async function postInvite({ source, target, traits }: { source: string, target: string, traits: any }) {
    await fetch(API_URL + '/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, target, traits })
    });
    // Attendre la synchro WebSocket (ou polling fallback)
  }
  async function postRitual({ type, participants, result, traits }: { type: string, participants: string[], result: string, traits: any }) {
    await fetch(API_URL + '/api/ritual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, participants, result, traits })
    });
    // Attendre la synchro WebSocket (ou polling fallback)
  }

  // Application des filtres/timeline
  const filteredNodes = apiNetwork ? apiNetwork.nodes.filter(n => {
    if (timeline && n.activatedAt > timeline) return false;
    if (filterGen !== null && n.generation !== filterGen) return false;
    if (filterBadge && !(n.badges || []).includes(filterBadge)) return false;
    return true;
  }) : [];
  const filteredLinks = apiNetwork ? apiNetwork.links.filter(l => {
    if (timeline && l.createdAt > timeline) return false;
    const src = apiNetwork.nodes.find(n => n.id === l.source);
    const tgt = apiNetwork.nodes.find(n => n.id === l.target);
    return (!timeline || (src && src.activatedAt <= timeline && tgt && tgt.activatedAt <= timeline));
  }) : [];

  // Recherche/focus
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) return;
    const node = filteredNodes.find(n => n.id.toLowerCase() === searchId.trim().toLowerCase());
    if (node) setFocusNode(node);
    else setFocusNode(null);
  };
  // Zoom/focus sur le nœud trouvé
  useEffect(() => {
    if (!focusNode) return;
    setOffset({ x: 300 - focusNode.x * zoom, y: 180 - focusNode.y * zoom });
    setTimeout(() => setFocusNode(null), 4000);
  }, [focusNode]);

  // Timeline min/max (mock)
  const minDate = apiNetwork ? Math.min(...apiNetwork.nodes.map(n => n.activatedAt)) : 0;
  const maxDate = apiNetwork ? Math.max(...apiNetwork.nodes.map(n => n.activatedAt)) : 0;

  // Liste des badges (mock)
  const allBadges = Array.from(new Set((apiNetwork ? apiNetwork.nodes.flatMap(n => n.badges || []) : [])));

  // --- Layout arbre/lignée pour réseau réel ---
  function computeTreeLayout(nodes: any[], links: any[], rootId: string, width = 600, height = 360) {
    // Construction de l'arbre
    const nodeMap = Object.fromEntries(nodes.map(n => [n.id, { ...n, children: [] }]));
    links.forEach(l => {
      if (nodeMap[l.source] && nodeMap[l.target]) {
        nodeMap[l.source].children.push(nodeMap[l.target]);
      }
    });
    // Parcours BFS pour placer les nœuds
    const levels: any[][] = [];
    function traverse(node: any, depth: number) {
      if (!levels[depth]) levels[depth] = [];
      levels[depth].push(node);
      node.children.forEach((c: any) => traverse(c, depth + 1));
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
  let treeNodes: any[] = [];
  if (apiNetwork && apiNetwork.nodes.length > 0) {
    const rootId = apiNetwork.nodes.find(n => !apiNetwork.links.some(l => l.target === n.id))?.id || apiNetwork.nodes[0].id;
    treeNodes = computeTreeLayout(apiNetwork.nodes, apiNetwork.links, rootId);
  }
  // Adapter les liens pour le layout
  const treeLinks = apiNetwork ? apiNetwork.links.map(l => ({ ...l })) : [];

  // --- Animation de propagation sur nouveaux liens (mock) ---
  const [treeParticles, setTreeParticles] = useState<any[]>([]); // {source, target, progress}
  useEffect(() => {
    if (!apiNetwork) return;
    // Détection des nouveaux liens (mock)
    const prevLinks = (window as any)._prevApiLinks || [];
    const newLinks = apiNetwork.links.filter(l => !prevLinks.some((pl: any) => pl.source === l.source && pl.target === l.target));
    if (newLinks.length > 0) {
      setTreeParticles(ps => [
        ...ps,
        ...newLinks.map(l => ({ source: l.source, target: l.target, progress: 0 }))
      ]);
    }
    (window as any)._prevApiLinks = apiNetwork.links;
  }, [apiNetwork]);
  // Animation des particules
  useEffect(() => {
    if (treeParticles.length === 0) return;
    let raf: number;
    function animateParticles() {
      setTreeParticles(ps => ps.map(p => ({ ...p, progress: Math.min(1, p.progress + 0.03) })));
      raf = requestAnimationFrame(animateParticles);
    }
    animateParticles();
    return () => cancelAnimationFrame(raf);
  }, [treeParticles.length]);
  // Nettoyage des particules arrivées
  useEffect(() => {
    if (treeParticles.length === 0) return;
    const timer = setTimeout(() => {
      setTreeParticles(ps => ps.filter(p => p.progress < 1));
    }, 400);
    return () => clearTimeout(timer);
  }, [treeParticles]);

  // Visualisations dynamiques (plugins)
  const visualizations = PluginManager.getPlugins('visualization');

  const [activeVisualization, setActiveVisualization] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const vizListRef = useRef<HTMLUListElement>(null);

  return (
    <div className="global-network-graph" style={{ textAlign: 'center', margin: '32px 0', position: 'relative' }}>
      <h3 style={{ color: '#00e0ff', marginBottom: 12 }}>Réseau global de transmission</h3>
      {error && <div style={{color:'#ff4b6e',marginBottom:8}}>{error}</div>}
      {/* Murmure collectif */}
      {collectiveWhisper && (
        <div style={{
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
        }}>
          {collectiveWhisper}
        </div>
      )}
      {/* Bouton Fusionner */}
      {fusionSelection.length === 2 && !fusionInProgress && !fusionResult && (
        <button
          style={{
            position: 'absolute', left: '50%', top: 60, transform: 'translateX(-50%)',
            background: '#ff4b6e', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 28px', fontWeight: 'bold', fontSize: 17, zIndex: 22, boxShadow: '0 2px 12px #ff4b6e44', cursor: 'pointer'
          }}
          onClick={triggerFusion}
        >Fusionner</button>
      )}
      {/* Bouton Réveil collectif */}
      {!wakeInProgress && (
        <button
          style={{
            position: 'absolute', right: 32, top: 24, background: '#00e0ff', color: '#181c22', border: 'none', borderRadius: 10, padding: '8px 18px', fontWeight: 'bold', fontSize: 15, zIndex: 22, boxShadow: '0 2px 8px #00e0ff44', cursor: 'pointer'
          }}
          onClick={triggerWake}
        >Réveil collectif</button>
      )}
      {/* Animation de réveil collectif */}
      {wakeInProgress && (
        <div style={{
          position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none',
          background: 'radial-gradient(circle at 50% 50%, #00e0ff55 0%, #23294600 80%)',
          animation: 'wakePulse 3.2s linear', zIndex: 21
        }} />
      )}
      {/* Bouton personnalisation */}
      <button
        style={{ position: 'absolute', left: 32, top: 24, background: '#fff', color: '#00e0ff', border: 'none', borderRadius: 10, padding: '8px 18px', fontWeight: 'bold', fontSize: 15, zIndex: 22, boxShadow: '0 2px 8px #00e0ff44', cursor: 'pointer' }}
        onClick={() => setShowCustomize(true)}
      >Personnaliser mon nœud</button>
      {/* Bouton RGPD & transparence */}
      <button
        style={{ position: 'absolute', left: 32, top: 64, background: '#fff', color: '#232946', border: 'none', borderRadius: 10, padding: '8px 18px', fontWeight: 'bold', fontSize: 15, zIndex: 22, boxShadow: '0 2px 8px #00e0ff44', cursor: 'pointer' }}
        onClick={() => setShowRGPD(true)}
      >Transparence & données</button>
      {/* Bouton Code secret */}
      <button
        style={{ position: 'absolute', right: 32, bottom: 24, background: '#fff', color: '#232946', border: 'none', borderRadius: 10, padding: '8px 18px', fontWeight: 'bold', fontSize: 15, zIndex: 22, boxShadow: '0 2px 8px #00e0ff44', cursor: 'pointer' }}
        onClick={() => setShowSecretInput(v => !v)}
      >Code secret</button>
      {/* Champ de saisie Code secret */}
      {showSecretInput && (
        <form onSubmit={handleSecretSubmit} style={{ position: 'absolute', right: 32, bottom: 64, background: '#232946', borderRadius: 12, padding: 18, zIndex: 30, boxShadow: '0 2px 16px #0008', minWidth: 220 }}>
          <div style={{ color: '#00e0ff', fontWeight: 'bold', marginBottom: 8 }}>Entrer un code secret</div>
          <input
            type="text"
            value={secretCode}
            onChange={e => setSecretCode(e.target.value)}
            placeholder="Code..."
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1.5px solid #00e0ff', fontSize: 15, marginBottom: 10, background: '#fff', color: '#232946' }}
            autoFocus
          />
          <button type="submit" style={{ background: '#00e0ff', color: '#181c22', border: 'none', borderRadius: 8, padding: '7px 18px', fontWeight: 'bold', cursor: 'pointer', fontSize: 15 }}>Valider</button>
          <button type="button" onClick={() => setShowSecretInput(false)} style={{ marginLeft: 10, background: '#888', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontWeight: 'bold', cursor: 'pointer', fontSize: 15 }}>Fermer</button>
          {secretFeedback && <div style={{ marginTop: 10, color: '#ff4b6e', fontWeight: 'bold' }}>{secretFeedback}</div>}
        </form>
      )}
      {/* Modale de personnalisation */}
      {showCustomize && (
        <div style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', background: '#181c22cc', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#232946', borderRadius: 18, padding: 32, minWidth: 320, boxShadow: '0 4px 32px #000a', color: '#fff', position: 'relative' }}>
            <div style={{ fontWeight: 'bold', fontSize: 22, marginBottom: 18 }}>Personnaliser mon nœud</div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 6 }}>Couleur principale :</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {COLOR_LIST.map(c => (
                  <div key={c} onClick={() => setCustomColor(c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: customColor === c ? '3px solid #fff' : '2px solid #888', cursor: 'pointer', boxShadow: customColor === c ? '0 0 8px #fff' : undefined }} />
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 6 }}>Symbole :</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {EMOJI_LIST.map(e => (
                  <div key={e} onClick={() => setCustomEmoji(e)} style={{ fontSize: 26, padding: 4, borderRadius: 8, background: customEmoji === e ? '#00e0ff33' : 'transparent', border: customEmoji === e ? '2px solid #00e0ff' : '2px solid transparent', cursor: 'pointer' }}>{e}</div>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 6 }}>Traits à mettre en avant :</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {userNode && (userNode as any).traits && Object.keys((userNode as any).traits).map(trait => (
                  <label key={trait} style={{ fontSize: 15 }}>
                    <input type="checkbox" checked={customTraits.includes(trait)} onChange={e => {
                      if (e.target.checked) setCustomTraits([...customTraits, trait]);
                      else setCustomTraits(customTraits.filter(t => t !== trait));
                    }} /> {trait}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 18 }}>
              <button onClick={() => setShowCustomize(false)} style={{ background: '#888', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 18px', fontWeight: 'bold', cursor: 'pointer' }}>Annuler</button>
              <button onClick={saveCustomization} style={{ background: '#00e0ff', color: '#181c22', border: 'none', borderRadius: 8, padding: '7px 18px', fontWeight: 'bold', cursor: 'pointer' }}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
      {/* Modale RGPD */}
      {showRGPD && (
        <div style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', background: '#181c22cc', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 32, minWidth: 340, maxWidth: 520, boxShadow: '0 4px 32px #000a', color: '#232946', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontWeight: 'bold', fontSize: 22, marginBottom: 18, color: '#00e0ff' }}>Transparence & données</div>
            <div style={{ fontSize: 15, marginBottom: 18, lineHeight: 1.6 }}>
              <b>Données collectées localement :</b>
              <ul style={{ margin: '8px 0 12px 18px' }}>
                <li><b>ID utilisateur anonyme</b> (ex : USER-XXXXXX)</li>
                <li><b>Traits comportementaux</b> (curiosité, énergie, etc.)</li>
                <li><b>Historique de transmission</b> (liens anonymes)</li>
                <li><b>Personnalisation</b> (couleur, symbole, badges)</li>
                <li><b>Statistiques d'activité</b> (nombre de transmissions, mutations, etc.)</li>
              </ul>
              <b>Usages :</b> visualisation réseau, rituels, personnalisation, feedback immersif.<br />
              <b>Anonymisation :</b> aucune donnée personnelle, pas d'IP, pas de tracking, pas de cookie, pas de partage externe.<br />
              <b>Vos droits :</b> accès, export, effacement immédiat de vos données.<br />
            </div>
            {/* Consentement granulaire */}
            <div style={{ marginBottom: 18, background: '#eaf6fa', borderRadius: 10, padding: 12 }}>
              <b>Consentement granulaire :</b>
              <div style={{ display: 'flex', gap: 18, marginTop: 8 }}>
                <label><input type="checkbox" checked={consent.traits} onChange={e => updateConsent('traits', e.target.checked)} /> Collecte des traits</label>
                <label><input type="checkbox" checked={consent.rituels} onChange={e => updateConsent('rituels', e.target.checked)} /> Historique des rituels</label>
                <label><input type="checkbox" checked={consent.personnalisation} onChange={e => updateConsent('personnalisation', e.target.checked)} /> Personnalisation</label>
              </div>
              <div style={{ fontSize: 13, color: '#888', marginTop: 6 }}>Désactivez pour empêcher la collecte future (démo, effet local uniquement).</div>
            </div>
            {/* Log d'accès */}
            <div style={{ marginBottom: 18 }}>
              <b>Historique d'accès local :</b>
              <ul style={{ margin: '8px 0 12px 18px', fontSize: 14 }}>
                {accessLog.slice(-5).reverse().map((d: string, i: number) => <li key={i}>{d}</li>)}
              </ul>
            </div>
            {/* Historique des rituels */}
            <div style={{ marginBottom: 18 }}>
              <b>Historique des rituels :</b>
              <ul style={{ margin: '8px 0 12px 18px', fontSize: 14 }}>
                {ritualHistory.slice(-5).reverse().map((r: any, i: number) => <li key={i}>{r.type} – {r._id} – {r.timestamp ? new Date(r.timestamp).toLocaleString() : ''}</li>)}
              </ul>
            </div>
            {/* Derniers événements */}
            <div style={{ marginBottom: 18 }}>
              <b>Derniers événements :</b>
              <ul style={{ margin: '8px 0 12px 18px', fontSize: 14 }}>
                {lastEvents.map((e, i) => <li key={i}>{e.type} – {e.date}</li>)}
              </ul>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 18 }}>
              <button onClick={exportUserData} style={{ background: '#00e0ff', color: '#181c22', border: 'none', borderRadius: 8, padding: '7px 18px', fontWeight: 'bold', cursor: 'pointer' }}>Exporter mes données</button>
              <button onClick={() => setConfirmErase(true)} style={{ background: '#ff4b6e', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 18px', fontWeight: 'bold', cursor: 'pointer' }}>Effacer mes données</button>
              <button onClick={() => setShowRGPD(false)} style={{ background: '#888', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 18px', fontWeight: 'bold', cursor: 'pointer' }}>Fermer</button>
            </div>
            {/* Confirmation effacement */}
            {confirmErase && (
              <div style={{ marginTop: 22, background: '#ff4b6e22', borderRadius: 10, padding: 14, color: '#ff4b6e', fontWeight: 'bold', fontSize: 15 }}>
                Confirmer l'effacement de toutes vos données ?
                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                  <button onClick={eraseUserData} style={{ background: '#ff4b6e', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 18px', fontWeight: 'bold', cursor: 'pointer' }}>Oui, effacer</button>
                  <button onClick={() => setConfirmErase(false)} style={{ background: '#888', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 18px', fontWeight: 'bold', cursor: 'pointer' }}>Annuler</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* UI avancée réseau réel */}
      {apiNetwork && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, zIndex: 30, display: 'flex', justifyContent: 'center', gap: 18, pointerEvents: 'none' }}>
          {/* Recherche ID */}
          <form onSubmit={handleSearch} style={{ pointerEvents: 'auto', background: '#fff', borderRadius: 8, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px #00e0ff22' }}>
            <input type="text" value={searchId} onChange={e => setSearchId(e.target.value)} placeholder="Rechercher un ID..." style={{ border: 'none', outline: 'none', fontSize: 15, background: 'transparent', color: '#232946' }} />
            <button type="submit" style={{ background: '#00e0ff', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontWeight: 'bold', cursor: 'pointer' }}>Focus</button>
          </form>
          {/* Filtres génération */}
          <select value={filterGen ?? ''} onChange={e => setFilterGen(e.target.value ? parseInt(e.target.value) : null)} style={{ pointerEvents: 'auto', borderRadius: 6, padding: '4px 8px', fontSize: 15 }}>
            <option value="">Toutes générations</option>
            {[...new Set(apiNetwork.nodes.map(n => n.generation))].sort().map(g => <option key={g} value={g}>Génération {g}</option>)}
          </select>
          {/* Filtres badge */}
          <select value={filterBadge} onChange={e => setFilterBadge(e.target.value)} style={{ pointerEvents: 'auto', borderRadius: 6, padding: '4px 8px', fontSize: 15 }}>
            <option value="">Tous badges</option>
            {allBadges.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          {/* Timeline slider */}
          <input type="range" min={minDate} max={maxDate} value={timeline ?? maxDate} onChange={e => setTimeline(Number(e.target.value))} style={{ pointerEvents: 'auto', width: 180 }} />
          <span style={{ color: '#00e0ff', fontSize: 13 }}>{timeline ? new Date(timeline).toLocaleDateString() : 'Maintenant'}</span>
        </div>
      )}
      <svg
        ref={svgRef}
        width={600}
        height={360}
        style={{ background, borderRadius: 18, boxShadow: '0 2px 16px #0008', cursor: dragging ? 'grabbing' : 'grab' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <g transform={`translate(${offset.x},${offset.y}) scale(${zoom})`}>
          {/* Halo de fusion */}
          {fusionHalo && (
            <line
              x1={fusionHalo.from.x}
              y1={fusionHalo.from.y}
              x2={fusionHalo.to.x}
              y2={fusionHalo.to.y}
              stroke="#ff4b6e"
              strokeWidth={8}
              opacity={0.25}
              style={{ filter: 'drop-shadow(0 0 24px #ff4b6e)' }}
            />
          )}
          {/* Liens */}
          {filteredLinks.map((l, i) => {
            const source = filteredNodes.find(n => n.id === l.source);
            const target = filteredNodes.find(n => n.id === l.target);
            if (!source || !target) return null;
            const isLineage = lineageLinks.includes(`${l.source}->${l.target}`);
            const isRecent = recentLinks.includes(`${l.source}->${l.target}`);
            return (
              <line
                key={i}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={isLineage ? '#00e0ff' : isRecent ? '#fff' : '#00e0ff'}
                strokeWidth={isLineage ? 4 : isRecent ? 3 : 2}
                opacity={isLineage ? 0.7 : isRecent ? 1 : 0.18 + 0.12 * (2 - (source.generation || 0))}
                style={isRecent ? { filter: 'drop-shadow(0 0 8px #fff)' } : {}}
              />
            );
          })}
          {/* Particules animées sur les liens */}
          {particles.map((p, i) => {
            const source = nodes.find(n => n.id === p.source);
            const target = nodes.find(n => n.id === p.target);
            if (!source || !target) return null;
            const x = source.x + (target.x - source.x) * p.progress;
            const y = source.y + (target.y - source.y) * p.progress;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={7 - 5 * p.progress}
                fill={p.color}
                opacity={0.7 - 0.6 * p.progress}
                style={{ filter: 'drop-shadow(0 0 8px #00e0ff)' }}
              />
            );
          })}
          {/* Nœuds */}
          {filteredNodes.map((n, i) => {
            const isLineage = lineageIds.includes(n.id);
            const isRecent = recentNodes.includes(n.id);
            const isSelected = fusionSelection.includes(n.id);
            const isUser = n.id === userId;
            const color = isUser ? customColor : isLineage ? '#00e0ff' : isRecent ? '#fff' : n.generation === 0 ? '#ff4b6e' : n.generation === 1 ? '#00e0ff' : '#ffb700';
            return (
              <g key={n.id}>
                <circle
                  className="network-node"
                  cx={n.x}
                  cy={n.y}
                  r={16}
                  fill={color}
                  stroke="#fff"
                  strokeWidth={isSelected ? 5 : isUser ? 4 : isLineage ? 4 : isRecent ? 3 : n.generation === 0 ? 3 : 1.5}
                  opacity={isSelected ? 1 : isUser ? 1 : isLineage ? 1 : isRecent ? 1 : 0.92}
                  onMouseOver={() => handleNodeMouseOver(n)}
                  onMouseOut={handleNodeMouseOut}
                  onClick={() => handleNodeClick(n)}
                  style={{ cursor: 'pointer', filter: isSelected ? 'drop-shadow(0 0 24px #ff4b6e)' : isUser ? `drop-shadow(0 0 24px ${customColor})` : isLineage ? 'drop-shadow(0 0 16px #00e0ff)' : isRecent ? 'drop-shadow(0 0 12px #fff)' : undefined }}
                />
                {/* Emoji personnalisé */}
                {isUser && (
                  <text x={n.x} y={n.y + 8} textAnchor="middle" fontSize={22} style={{ pointerEvents: 'none' }}>{customEmoji}</text>
                )}
                {/* Badge d'ancienneté */}
                {isUser && (
                  <g>
                    <circle cx={n.x - 18} cy={n.y - 18} r={8} fill="#fff" />
                    <text x={n.x - 18} y={n.y - 14} textAnchor="middle" fontSize={10} fill="#00e0ff" fontWeight="bold">{oldBadge[0]}</text>
                  </g>
                )}
                {/* Badge d'activité */}
                {isUser && (
                  <g>
                    <circle cx={n.x + 18} cy={n.y - 18} r={8} fill="#fff" />
                    <text x={n.x + 18} y={n.y - 14} textAnchor="middle" fontSize={10} fill="#ff4b6e" fontWeight="bold">{activityBadge[0]}</text>
                  </g>
                )}
                {/* Badge spécial (code secret) */}
                {isUser && specialBadge && (
                  <g>
                    <circle cx={n.x} cy={n.y + 26} r={10} fill="#ffb700" />
                    <text x={n.x} y={n.y + 30} textAnchor="middle" fontSize={13} fill="#232946" fontWeight="bold">★</text>
                  </g>
                )}
              </g>
            );
          })}
          {/* Halo de propagation sur nœud cible */}
          {particles.map((p, i) => {
            if (p.progress < 0.98) return null;
            const target = nodes.find(n => n.id === p.target);
            if (!target) return null;
            return (
              <circle
                key={'halo-' + i}
                cx={target.x}
                cy={target.y}
                r={24 + 18 * (1 - p.progress)}
                fill="#00e0ff"
                opacity={0.18 * (1 - p.progress)}
                style={{ pointerEvents: 'none' }}
              />
            );
          })}
          {/* Halo de fusion sur le nœud résultant */}
          {fusionResult && (
            <circle
              cx={fusionResult.x}
              cy={fusionResult.y}
              r={32}
              fill="#ff4b6e"
              opacity={0.18}
              style={{ filter: 'drop-shadow(0 0 32px #ff4b6e)', pointerEvents: 'none' }}
            />
          )}
          {/* Nœud résultant de la fusion (temporaire, non ajouté au réseau réel) */}
          {fusionResult && (
            <circle
              cx={fusionResult.x}
              cy={fusionResult.y}
              r={18}
              fill="#ff4b6e"
              stroke="#fff"
              strokeWidth={4}
              opacity={1}
              style={{ filter: 'drop-shadow(0 0 32px #ff4b6e)' }}
            />
          )}
          {/* Légende */}
          <g>
            <circle cx={40} cy={330} r={10} fill="#ff4b6e" />
            <text x={60} y={335} fill="#fff" fontSize={14}>Origine</text>
            <circle cx={140} cy={330} r={10} fill="#00e0ff" />
            <text x={160} y={335} fill="#fff" fontSize={14}>Transmission</text>
            <circle cx={260} cy={330} r={10} fill="#ffb700" />
            <text x={280} y={335} fill="#fff" fontSize={14}>Propagation</text>
          </g>
        </g>
      </svg>
      {/* Tooltip enrichi pour traits visibles */}
      {hoveredNode && (
        <div
          style={{
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
          }}
        >
          <div><b>ID</b> : {hoveredNode.id}</div>
          <div>Génération : {hoveredNode.generation}</div>
          {getNodeTraits(hoveredNode) && (
            <div style={{marginTop:4}}>
              <b>Traits</b> :
              <ul style={{margin:0,paddingLeft:16}}>
                {Object.entries(getNodeTraits(hoveredNode)).filter(([k]) => !userNode || hoveredNode.id !== userId || customTraits.length === 0 || customTraits.includes(k)).map(([k,v]) => (
                  <li key={k}>{k}: {String(v)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {/* Carte détail nœud */}
      {selectedNode && (
        <div
          style={{
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
          }}
        >
          <div style={{fontWeight:'bold',fontSize:20,marginBottom:8}}>Détail du nœud</div>
          <div><b>ID</b> : {selectedNode.id}</div>
          <div>Génération : {selectedNode.generation}</div>
          {getNodeTraits(selectedNode) && (
            <div style={{marginTop:8}}>
              <b>Traits</b> :
              <ul style={{margin:0,paddingLeft:18}}>
                {Object.entries(getNodeTraits(selectedNode)).map(([k,v]) => (
                  <li key={k}>{k}: {String(v)}</li>
                ))}
              </ul>
            </div>
          )}
          <button
            style={{marginTop:18,background:'#00e0ff',color:'#181c22',border:'none',borderRadius:8,padding:'7px 18px',fontWeight:'bold',cursor:'pointer'}}
            onClick={() => setSelectedNode(null)}
          >Fermer</button>
        </div>
      )}
      {/* Affichage réseau réel (arbre/lignée) */}
      {apiNetwork && !apiLoading && !apiError && treeNodes.length > 0 && (
        <svg width={600} height={360} style={{ background, borderRadius: 18, boxShadow: '0 2px 16px #0008', marginTop: 48 }}>
          {/* Liens */}
          {treeLinks.map((l, i) => {
            const source = treeNodes.find(n => n.id === l.source);
            const target = treeNodes.find(n => n.id === l.target);
            if (!source || !target) return null;
            return (
              <line
                key={i}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="#00e0ff"
                strokeWidth={2}
                opacity={0.18 + 0.12 * (2 - (source.generation || 0))}
              />
            );
          })}
          {/* Particules animées sur les liens (propagation) */}
          {treeParticles.map((p, i) => {
            const source = treeNodes.find(n => n.id === p.source);
            const target = treeNodes.find(n => n.id === p.target);
            if (!source || !target) return null;
            const x = source.x + (target.x - source.x) * p.progress;
            const y = source.y + (target.y - source.y) * p.progress;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={7 - 5 * p.progress}
                fill="#00e0ff"
                opacity={0.7 - 0.6 * p.progress}
                style={{ filter: 'drop-shadow(0 0 8px #00e0ff)' }}
              />
            );
          })}
          {/* Nœuds */}
          {treeNodes.map((n, i) => (
            <circle
              key={n.id}
              cx={n.x}
              cy={n.y}
              r={16}
              fill={n.generation === 0 ? '#ff4b6e' : n.generation === 1 ? '#00e0ff' : '#ffb700'}
              stroke="#fff"
              strokeWidth={n.generation === 0 ? 3 : 1.5}
              opacity={0.92}
            />
          ))}
        </svg>
      )}
      <div style={{ color: '#888', fontSize: 13, marginTop: 8 }}>
        (Données anonymisées, visualisation {error ? 'locale' : 'réelle'})
      </div>
      {/* Bouton Timeline */}
      <button
        style={{ position: 'absolute', left: '50%', bottom: 24, transform: 'translateX(-50%)', background: '#fff', color: '#232946', border: 'none', borderRadius: 10, padding: '8px 18px', fontWeight: 'bold', fontSize: 15, zIndex: 22, boxShadow: '0 2px 8px #00e0ff44', cursor: 'pointer' }}
        onClick={() => setShowTimeline(true)}
      >Timeline</button>
      {/* Timeline évolutive (modale) */}
      {showTimeline && (
        <div style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', background: '#181c22cc', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 32, minWidth: 340, maxWidth: 420, boxShadow: '0 4px 32px #000a', color: '#232946', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontWeight: 'bold', fontSize: 22, marginBottom: 18, color: '#00e0ff' }}>Timeline évolutive</div>
            <div style={{ marginBottom: 22 }}>
              {timelineEventsState.map((ev, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
                  <div style={{ fontSize: 28 }}>{ev.icon}</div>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: 16 }}>{ev.title}</div>
                    <div style={{ fontSize: 13, color: '#888' }}>{new Date(ev.date).toLocaleDateString()}</div>
                    <div style={{ fontSize: 14, margin: '4px 0 2px 0' }}>{ev.desc}</div>
                    <div style={{ fontStyle: 'italic', color: '#00e0ff', fontSize: 13 }}>{ev.murmure}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: '#eaf6fa', borderRadius: 10, padding: 16, marginBottom: 18 }}>
              <div style={{ fontWeight: 'bold', fontSize: 16, color: '#ff4b6e', marginBottom: 6 }}>Quête collective en cours</div>
              <div style={{ fontSize: 15, marginBottom: 4 }}>{collectiveQuest.title}</div>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>{collectiveQuest.desc}</div>
              <div style={{ height: 12, background: '#00e0ff22', borderRadius: 6, marginBottom: 6 }}>
                <div style={{ width: `${(collectiveQuest.progress / collectiveQuest.goal) * 100}%`, height: '100%', background: '#00e0ff', borderRadius: 6, transition: 'width 0.6s' }} />
              </div>
              <div style={{ fontSize: 13, color: '#00e0ff', marginTop: 2 }}>{collectiveQuest.progress} / {collectiveQuest.goal}</div>
              <div style={{ fontSize: 13, color: '#232946', marginTop: 8, fontStyle: 'italic' }}>{collectiveQuest.feedback[Math.floor(collectiveQuest.progress / collectiveQuest.goal * collectiveQuest.feedback.length)]}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button onClick={() => setShowTimeline(false)} style={{ background: '#00e0ff', color: '#181c22', border: 'none', borderRadius: 8, padding: '7px 18px', fontWeight: 'bold', cursor: 'pointer' }}>Fermer</button>
            </div>
          </div>
        </div>
      )}
      {/* Notifications en temps réel */}
      <div style={{ position: 'fixed', left: '50%', top: 18, transform: 'translateX(-50%)', zIndex: 400 }}>
        {liveNotifications.map((n, i) => (
          <div key={i} style={{ background: '#fff', color: '#232946', borderRadius: 14, boxShadow: '0 2px 16px #00e0ff44', padding: '14px 28px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 16, minWidth: 260, animation: 'fadeInOut 5s linear' }}>
            <span style={{ fontSize: 28 }}>{n.icon}</span>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: 16 }}>{n.title}</div>
              <div style={{ fontSize: 13, color: '#00e0ff', fontStyle: 'italic' }}>{n.murmure}</div>
            </div>
          </div>
        ))}
      </div>
      {visualizations.length > 0 && (
        <div style={{margin:'18px 0'}}>
          <b id="viz-list-label">Visualisations disponibles :</b>
          <ul ref={vizListRef} role="listbox" aria-labelledby="viz-list-label" tabIndex={0} style={{outline:'none'}}>
            {visualizations.map((v, idx) => (
              <li key={v.id} role="option" aria-selected={activeVisualization===v.id}>
                {v.name} {v.component && (
                  <button
                    onClick={()=>{
                      setActiveVisualization(v.id);
                      setToast(`Visualisation « ${v.name} » activée`);
                      setTimeout(()=>setToast(null), 2500);
                    }}
                    aria-label={`Afficher la visualisation ${v.name}`}
                    tabIndex={0}
                    onKeyDown={e=>{
                      if(e.key==='Enter'||e.key===' '){
                        setActiveVisualization(v.id);
                        setToast(`Visualisation « ${v.name} » activée`);
                        setTimeout(()=>setToast(null), 2500);
                      }
                    }}
                    style={{outline:activeVisualization===v.id?'2px solid #00e0ff':'none'}}
                  >Voir</button>
                )}
              </li>
            ))}
          </ul>
          {activeVisualization && visualizations.find(v=>v.id===activeVisualization)?.component && (
            <div style={{marginTop:12}}>
              {React.createElement(visualizations.find(v=>v.id===activeVisualization)!.component)}
            </div>
          )}
          {toast && (
            <div role="status" aria-live="polite" style={{position:'fixed',bottom:24,right:24,background:'#232946',color:'#fff',padding:'12px 24px',borderRadius:12,boxShadow:'0 2px 12px #00e0ff44',zIndex:1000}}>{toast}</div>
          )}
        </div>
      )}
    </div>
  );
}; 
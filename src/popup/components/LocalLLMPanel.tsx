// src/popup/components/LocalLLMPanel.tsx
//
// UI du module cognitif local (LLM WebGPU, opt-in). Chargée en lazy depuis
// App.tsx : le gros chunk WebLLM n'arrive que si l'utilisateur ouvre cet
// onglet ET active le module.
//
// Parcours :
//   1. Détection WebGPU → si absent, message de repli (NeuralMesh reste actif).
//   2. Sélection du modèle + consentement explicite au téléchargement.
//   3. Barre de progression pendant le téléchargement/initialisation.
//   4. Chat de démonstration en streaming.

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { logger } from '@shared/utils/secureLogger';
import {
  detectWebGPU,
  type WebGPUSupport,
  MODEL_CATALOG,
  getModelInfo,
  llmPreferences,
  type LLMPreferences,
  LocalLLMEngine,
  type ChatMessage,
} from '@shared/llm';

const C = {
  accent: '#00e0ff',
  bg: '#0f1419',
  panel: '#161b26',
  border: 'rgba(0, 224, 255, 0.15)',
  text: '#e1e8ed',
  dim: '#8899a6',
  danger: '#ef4444',
  user: 'rgba(0, 224, 255, 0.12)',
  assistant: 'rgba(255, 255, 255, 0.05)',
};

type UIState = 'detecting' | 'unsupported' | 'setup' | 'loading' | 'ready';

interface Bubble {
  role: 'user' | 'assistant';
  content: string;
}

const LocalLLMPanel: React.FC = () => {
  const engineRef = useRef<LocalLLMEngine | null>(null);
  const [support, setSupport] = useState<WebGPUSupport | null>(null);
  const [uiState, setUiState] = useState<UIState>('detecting');
  const [prefs, setPrefs] = useState<LLMPreferences>(llmPreferences.get());
  const [progress, setProgress] = useState<{ pct: number; text: string }>({ pct: 0, text: '' });
  const [messages, setMessages] = useState<Bubble[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Détection WebGPU + chargement des préférences au montage.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await llmPreferences.load();
      const sup = await detectWebGPU();
      if (cancelled) return;
      setPrefs(llmPreferences.get());
      setSupport(sup);
      setUiState(sup.available ? 'setup' : 'unsupported');
    })();
    const unsub = llmPreferences.subscribe((p) => setPrefs(p));
    return () => {
      cancelled = true;
      unsub();
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, busy]);

  const activate = useCallback(async (modelId: string) => {
    setError(null);
    setUiState('loading');
    setProgress({ pct: 0, text: 'Initialisation…' });
    await llmPreferences.update({ enabled: true, modelId, downloadConsented: true });
    const engine = engineRef.current ?? new LocalLLMEngine();
    engineRef.current = engine;
    try {
      await engine.load(modelId, (p) => {
        setProgress({ pct: Math.round(p.progress * 100), text: p.text });
      });
      setUiState('ready');
    } catch (e) {
      logger.error('LocalLLMPanel: échec du chargement', e as Error);
      setError('Le chargement du modèle a échoué. Vérifiez votre connexion et réessayez.');
      setUiState('setup');
    }
  }, []);

  const send = useCallback(async () => {
    const engine = engineRef.current;
    const prompt = draft.trim();
    if (!engine || !engine.isReady() || !prompt || busy) return;

    setDraft('');
    setError(null);
    setBusy(true);
    const history: Bubble[] = [...messages, { role: 'user', content: prompt }];
    setMessages([...history, { role: 'assistant', content: '' }]);

    const chatMessages: ChatMessage[] = [
      {
        role: 'system',
        content:
          "Tu es le noyau cognitif local d'un organisme numérique SYMBIONT. Réponds de façon concise et utile, en français.",
      },
      ...history.map((b) => ({ role: b.role, content: b.content }) as ChatMessage),
    ];

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      await engine.chat(chatMessages, {
        signal: abort.signal,
        onToken: (delta) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === 'assistant') {
              next[next.length - 1] = { role: 'assistant', content: last.content + delta };
            }
            return next;
          });
        },
      });
    } catch (e) {
      logger.error('LocalLLMPanel: génération échouée', e as Error);
      setError('La génération a échoué.');
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }, [draft, messages, busy]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  // --- Rendu ---

  if (uiState === 'detecting') {
    return <p style={{ color: C.dim }}>Détection de WebGPU…</p>;
  }

  if (uiState === 'unsupported') {
    return (
      <div style={s.card}>
        <p style={{ color: C.text, marginBottom: 8 }}>
          🧠 Le module cognitif local nécessite <strong>WebGPU</strong>, indisponible ici.
        </p>
        <p style={{ color: C.dim, fontSize: 13 }}>{support?.reason}</p>
        <p style={{ color: C.dim, fontSize: 13, marginTop: 12 }}>
          Aucun souci : l&apos;organisme continue de fonctionner avec son réseau de neurones
          embarqué (NeuralMesh). Le module cognitif est un bonus, pas un prérequis.
        </p>
      </div>
    );
  }

  if (uiState === 'loading') {
    return (
      <div style={s.card}>
        <p style={{ color: C.text, marginBottom: 12 }}>Téléchargement / initialisation du modèle…</p>
        <div style={s.progressTrack}>
          <div style={{ ...s.progressFill, width: `${progress.pct}%` }} />
        </div>
        <p style={{ color: C.dim, fontSize: 12, marginTop: 8 }}>
          {progress.pct}% — {progress.text}
        </p>
        <p style={{ color: C.dim, fontSize: 12, marginTop: 12 }}>
          Le premier chargement télécharge les poids (mis en cache ensuite). Les suivants sont rapides.
        </p>
      </div>
    );
  }

  if (uiState === 'setup') {
    return (
      <div style={s.card}>
        <p style={{ color: C.text, marginBottom: 4 }}>
          🧠 Donne à ton organisme un <strong>cerveau de langage local</strong>.
        </p>
        <p style={{ color: C.dim, fontSize: 13, marginBottom: 4 }}>
          100% sur ton poste via WebGPU — aucune donnée n&apos;est envoyée à un serveur.
        </p>
        {support?.adapterInfo && (
          <p style={{ color: C.dim, fontSize: 12, marginBottom: 12 }}>GPU détecté : {support.adapterInfo}</p>
        )}
        {error && <p style={{ color: C.danger, fontSize: 13, marginBottom: 8 }}>{error}</p>}

        <label style={{ color: C.dim, fontSize: 12 }}>Modèle</label>
        <select
          value={prefs.modelId}
          onChange={(e) => void llmPreferences.update({ modelId: e.target.value })}
          style={s.select}
        >
          {MODEL_CATALOG.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label} — {m.sizeLabel} ({m.tier})
            </option>
          ))}
        </select>

        <p style={{ color: C.dim, fontSize: 12, margin: '8px 0 14px' }}>
          {getModelInfo(prefs.modelId)?.description}
        </p>

        <button style={s.primaryBtn} onClick={() => void activate(prefs.modelId)}>
          Activer & télécharger ({getModelInfo(prefs.modelId)?.sizeLabel})
        </button>
      </div>
    );
  }

  // uiState === 'ready'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 220px)', minHeight: 320 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ color: C.dim, fontSize: 12 }}>
          {getModelInfo(engineRef.current?.getModelId() ?? '')?.label ?? 'Modèle'} • local
        </span>
        <button
          style={s.linkBtn}
          onClick={() => {
            setMessages([]);
            setError(null);
          }}
        >
          Effacer
        </button>
      </div>

      <div ref={scrollRef} style={s.chatScroll}>
        {messages.length === 0 && (
          <p style={{ color: C.dim, fontSize: 13 }}>
            Pose une question à ton organisme. Tout reste sur ton poste.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              ...s.bubble,
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              background: m.role === 'user' ? C.user : C.assistant,
            }}
          >
            {m.content || (busy && i === messages.length - 1 ? '…' : '')}
          </div>
        ))}
      </div>

      {error && <p style={{ color: C.danger, fontSize: 13 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Écris un message…"
          disabled={busy}
          style={s.input}
        />
        {busy ? (
          <button style={s.stopBtn} onClick={stop}>
            Stop
          </button>
        ) : (
          <button style={s.primaryBtn} onClick={() => void send()} disabled={!draft.trim()}>
            Envoyer
          </button>
        )}
      </div>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  card: {
    background: C.panel,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: 16,
  },
  progressTrack: {
    height: 8,
    background: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: `linear-gradient(90deg, ${C.accent}, #4fc3f7)`,
    transition: 'width 0.2s ease',
  },
  select: {
    width: '100%',
    marginTop: 4,
    padding: '8px 10px',
    background: C.bg,
    color: C.text,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    fontSize: 13,
  },
  primaryBtn: {
    padding: '10px 14px',
    background: C.accent,
    color: '#04222b',
    border: 'none',
    borderRadius: 8,
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 13,
  },
  stopBtn: {
    padding: '10px 14px',
    background: C.danger,
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 13,
  },
  linkBtn: {
    background: 'transparent',
    color: C.dim,
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    textDecoration: 'underline',
  },
  chatScroll: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: 4,
  },
  bubble: {
    maxWidth: '85%',
    padding: '8px 12px',
    borderRadius: 12,
    color: C.text,
    fontSize: 13,
    lineHeight: 1.45,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  input: {
    flex: 1,
    padding: '10px 12px',
    background: C.bg,
    color: C.text,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    fontSize: 13,
  },
};

export default LocalLLMPanel;

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
  createCognitiveEngine,
  type CognitiveEngine,
  type ChatMessage,
  extractActivePageText,
  feedReliabilityToOrganism,
  OffscreenLLMClient,
  type ReliabilityReport,
} from '@shared/llm';
import {
  readPage,
  KnowledgeStore,
  SurfaceJournal,
  HashingEmbedder,
  hashingEmbedFn,
  selectForagingSeeds,
  deriveForagingTargets,
  decideAgency,
  DietLog,
  type EmbedFn,
  type ReadingOutcome,
  type ForagingTarget,
  type AgencyVerdict,
} from '@shared/comprehension';
import { organismStateManager } from '@shared/services/OrganismStateManager';

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
  const engineRef = useRef<CognitiveEngine | null>(null);
  const [support, setSupport] = useState<WebGPUSupport | null>(null);
  const [uiState, setUiState] = useState<UIState>('detecting');
  const [prefs, setPrefs] = useState<LLMPreferences>(llmPreferences.get());
  const [progress, setProgress] = useState<{ pct: number; text: string }>({ pct: 0, text: '' });
  const [messages, setMessages] = useState<Bubble[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReliabilityReport | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [digest, setDigest] = useState<ReadingOutcome | null>(null);
  const [digesting, setDigesting] = useState(false);
  const [foragingTargets, setForagingTargets] = useState<ForagingTarget[]>([]);
  const [foraging, setForaging] = useState(false);
  const [agencyVerdict, setAgencyVerdict] = useState<AgencyVerdict | null>(null);
  const dietLogRef = useRef(new DietLog());
  // Modèle du monde persistant + journal de surface (créés une fois).
  // Embedding par défaut = hachage (gratuit) ; le sémantique (2ᵉ modèle) est opt-in.
  const knowledgeRef = useRef(new KnowledgeStore());
  const journalRef = useRef(new SurfaceJournal());
  const hashingEmbedRef = useRef(hashingEmbedFn(new HashingEmbedder()));
  const embedClientRef = useRef<OffscreenLLMClient | null>(null);

  // Choisit l'embedding selon la préférence : sémantique (offscreen, 2ᵉ modèle)
  // avec repli sur le hachage, ou hachage seul.
  const currentEmbed = useCallback((): EmbedFn => {
    if (!prefs.semanticEmbedding) return hashingEmbedRef.current;
    if (!embedClientRef.current) embedClientRef.current = new OffscreenLLMClient();
    const client = embedClientRef.current;
    const fallback = hashingEmbedRef.current;
    return async (t: string) => {
      try {
        return await client.embed(t);
      } catch {
        return fallback(t);
      }
    };
  }, [prefs.semanticEmbedding]);
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
    const engine = engineRef.current ?? (await createCognitiveEngine());
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

  // Analyse de fiabilité de la page active (v2) : le LLM local lit le texte de
  // la page et renvoie un score + des signaux de désinformation, qui nudgent
  // la vigilance de l'organisme. Rien ne quitte le poste.
  const analyzePage = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || !engine.isReady() || analyzing) return;
    setAnalyzing(true);
    setError(null);
    setReport(null);
    try {
      const page = await extractActivePageText();
      if (!page.text || page.text.length < 40) {
        setError("Pas assez de texte lisible sur cette page pour l'analyser.");
        return;
      }
      const r = await engine.analyze(page.text, page.domain ? { domain: page.domain } : {});
      setReport(r);
      void feedReliabilityToOrganism(r);
    } catch (e) {
      logger.error('LocalLLMPanel: analyse de page échouée', e as Error);
      setError("L'analyse de la page a échoué.");
    } finally {
      setAnalyzing(false);
    }
  }, [analyzing]);

  // Digestion persistante : le symbiote lit la page active, l'accrète à son
  // modèle du monde, et ne fait « surface » que sur ce qui révise ta compréhension.
  const digestActivePage = useCallback(async (force = false) => {
    const engine = engineRef.current;
    if (!engine || !engine.isReady() || digesting) return;

    // Agentivité : le symbiote peut négocier avant de digérer (jamais bloquer).
    if (!force) {
      let energy = 75;
      try {
        energy = organismStateManager.getState().energy;
      } catch {
        /* état indisponible : on garde une énergie neutre */
      }
      const verdict = decideAgency({ energy, recentDiet: await dietLogRef.current.load() });
      if (verdict.stance !== 'accept') {
        setAgencyVerdict(verdict);
        return;
      }
    }
    setAgencyVerdict(null);

    setDigesting(true);
    setError(null);
    try {
      const page = await extractActivePageText();
      if (!page.text || page.text.length < 40) {
        setError("Pas assez de texte lisible sur cette page pour la digérer.");
        return;
      }
      const outcome = await readPage(
        engine,
        { store: knowledgeRef.current, journal: journalRef.current },
        currentEmbed(),
        page.text,
        { now: Date.now(), ...(page.domain ? { domain: page.domain } : {}) },
      );
      setDigest(outcome);
      // Enregistre le régime récent (pour l'agentivité future).
      void dietLogRef.current.record({ ts: Date.now(), surfaced: outcome.surface, dominantKind: outcome.dominantKind });
    } catch (e) {
      logger.error('LocalLLMPanel: digestion échouée', e as Error);
      setError('La digestion de la page a échoué.');
    } finally {
      setDigesting(false);
    }
  }, [digesting, currentEmbed]);

  // Fourrage : le symbiote déduit de son modèle ce qu'il est curieux de
  // comprendre — au lieu que tu cherches. Cliquer ouvre une recherche (geste
  // utilisateur → aucune permission invasive).
  const forage = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || !engine.isReady() || foraging) return;
    setForaging(true);
    setError(null);
    try {
      const model = await knowledgeRef.current.load();
      const recent = await journalRef.current.load();
      const seeds = selectForagingSeeds(model, recent);
      if (seeds.length === 0) {
        setForagingTargets([]);
        setError("Pas encore assez de matière pour chercher — digère quelques pages d'abord.");
        return;
      }
      setForagingTargets(await deriveForagingTargets(engine, seeds, { curiosity: 0.6 }));
    } catch (e) {
      logger.error('LocalLLMPanel: fourrage échoué', e as Error);
      setError('Le fourrage a échoué.');
    } finally {
      setForaging(false);
    }
  }, [foraging]);

  const openSearch = useCallback((q: string) => {
    const url = 'https://duckduckgo.com/?q=' + encodeURIComponent(q);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = typeof chrome !== 'undefined' ? (chrome as any) : undefined;
    if (c?.tabs?.create) c.tabs.create({ url });
    else window.open(url, '_blank', 'noopener');
  }, []);

  const levelColor = (lvl: ReliabilityReport['level']): string =>
    lvl === 'faible' ? C.danger : lvl === 'moyenne' ? '#f59e0b' : '#22c55e';

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
      {/* Analyse de fiabilité de la page active */}
      <button
        style={{ ...s.primaryBtn, marginBottom: 8 }}
        onClick={() => void analyzePage()}
        disabled={analyzing}
      >
        {analyzing ? 'Analyse en cours…' : '🔍 Analyser la page active'}
      </button>
      {report && (
        <div style={{ ...s.card, padding: 12, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: `conic-gradient(${levelColor(report.level)} 0% ${report.score}%, rgba(255,255,255,0.08) ${report.score}% 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: '0 0 auto',
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: C.panel,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: levelColor(report.level),
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {report.score}
              </div>
            </div>
            <div>
              <div style={{ color: levelColor(report.level), fontWeight: 600, fontSize: 14 }}>
                Fiabilité {report.level}
              </div>
              {report.domain && <div style={{ color: C.dim, fontSize: 12 }}>{report.domain}</div>}
            </div>
          </div>
          <p style={{ color: C.text, fontSize: 12, margin: '0 0 8px', lineHeight: 1.5 }}>{report.summary}</p>
          {report.signals.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {report.signals.map((sg, i) => (
                <span
                  key={i}
                  style={{
                    background: 'rgba(239,68,68,0.15)',
                    color: levelColor(report.level),
                    fontSize: 11,
                    padding: '3px 8px',
                    borderRadius: 10,
                  }}
                >
                  {sg}
                </span>
              ))}
            </div>
          )}
          <p style={{ color: C.dim, fontSize: 11, margin: '10px 0 0' }}>
            ↳ signal transmis à l&apos;organisme (vigilance +)
          </p>
        </div>
      )}

      {/* Digestion : le symbiote lit et n'accrète ; il ne remonte que ce qui révise ta compréhension */}
      <button
        style={{ ...s.primaryBtn, marginBottom: 6 }}
        onClick={() => void digestActivePage()}
        disabled={digesting}
      >
        {digesting ? 'Digestion en cours…' : '🧫 Digérer la page active'}
      </button>
      <label
        style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.dim, fontSize: 11, marginBottom: 8, cursor: 'pointer' }}
      >
        <input
          type="checkbox"
          checked={prefs.semanticEmbedding}
          onChange={(e) => void llmPreferences.update({ semanticEmbedding: e.target.checked })}
        />
        Embedding sémantique — meilleure mémoire (2ᵉ modèle ~240 Mo)
      </label>
      {agencyVerdict && (
        <div style={{ ...s.card, padding: 12, marginBottom: 8 }}>
          <div style={{ color: '#f59e0b', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            {agencyVerdict.stance === 'reluctant'
              ? '😮‍💨 Ton organisme est réticent'
              : '🔄 Ton organisme te propose autre chose'}
          </div>
          <p style={{ color: C.text, fontSize: 12, margin: '0 0 6px', lineHeight: 1.5 }}>{agencyVerdict.reason}</p>
          {agencyVerdict.suggestion && (
            <p style={{ color: C.dim, fontSize: 12, margin: '0 0 10px' }}>{agencyVerdict.suggestion}</p>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button style={{ ...s.primaryBtn, padding: '8px 12px' }} onClick={() => void digestActivePage(true)}>
              Digérer quand même
            </button>
            <button style={s.linkBtn} onClick={() => setAgencyVerdict(null)}>
              OK, je te suis
            </button>
          </div>
        </div>
      )}
      {digest && (
        <div style={{ ...s.card, padding: 12, marginBottom: 8 }}>
          <div style={{ color: C.dim, fontSize: 12, marginBottom: 8 }}>
            Ton organisme connaît <strong style={{ color: C.text }}>{digest.modelSize}</strong> croyances ·{' '}
            {digest.claimCount} affirmation{digest.claimCount > 1 ? 's' : ''} digérée
            {digest.claimCount > 1 ? 's' : ''}.
          </div>
          {digest.surface ? (
            <>
              <div style={{ color: C.accent, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Ça a bougé ta compréhension :
              </div>
              {digest.revisions.map((r, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <span
                    style={{
                      background: 'rgba(0,224,255,0.15)',
                      color: C.accent,
                      fontSize: 11,
                      padding: '2px 7px',
                      borderRadius: 10,
                      marginRight: 6,
                    }}
                  >
                    {r.kind}
                  </span>
                  <span style={{ color: C.text, fontSize: 12 }}>{r.claimText}</span>
                </div>
              ))}
            </>
          ) : (
            <div style={{ color: C.dim, fontSize: 12 }}>
              Rien de neuf pour toi : digéré en silence. Le symbiote a grossi, mais ta carte du monde
              n&apos;a pas bougé.
            </div>
          )}
        </div>
      )}

      {/* Fourrage : ce que l'organisme est curieux de comprendre */}
      <button
        style={{ ...s.primaryBtn, marginBottom: 8 }}
        onClick={() => void forage()}
        disabled={foraging}
      >
        {foraging ? 'Recherche…' : '🔎 Ce que je cherche à comprendre'}
      </button>
      {foragingTargets.length > 0 && (
        <div style={{ ...s.card, padding: 12, marginBottom: 8 }}>
          <div style={{ color: C.dim, fontSize: 12, marginBottom: 8 }}>Ton organisme est curieux de :</div>
          {foragingTargets.map((t, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <button
                onClick={() => openSearch(t.question)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: C.accent,
                  fontSize: 13,
                  textAlign: 'left',
                  cursor: 'pointer',
                  padding: 0,
                  lineHeight: 1.4,
                }}
              >
                🔎 {t.question}
              </button>
              {t.rationale && <div style={{ color: C.dim, fontSize: 11, marginTop: 2 }}>{t.rationale}</div>}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ color: C.dim, fontSize: 12 }}>
          {getModelInfo(engineRef.current?.getModelId() ?? '')?.label ?? 'Modèle'} •{' '}
          {engineRef.current?.location === 'offscreen' ? 'offscreen (persistant)' : 'popup'}
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

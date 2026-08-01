// src/popup/components/WhatMovedPanel.tsx
//
// « Ce qui a bougé aujourd'hui » — le moment aha de la vision SYMBIONT. Lit le
// SurfaceJournal (aucun modèle WebGPU requis) et n'affiche que les révisions de
// compréhension : ce que le symbiote a jugé digne de faire surface, jamais la
// simple nouveauté. Vide au premier lancement (rien à montrer).

import React, { useEffect, useState, useCallback } from 'react';
import { logger } from '@shared/utils/secureLogger';
import {
  SurfaceJournal,
  partitionSurface,
  type SurfaceEntry,
  type DeltaKind,
} from '@shared/comprehension';

const C = {
  accent: '#00e0ff',
  panel: '#161b26',
  border: 'rgba(0, 224, 255, 0.15)',
  text: '#e1e8ed',
  dim: '#8899a6',
};

const KIND_STYLE: Record<DeltaKind, { label: string; color: string }> = {
  contredit: { label: 'contredit', color: '#ef4444' },
  déplace: { label: 'déplace ton regard', color: '#a855f7' },
  complète: { label: 'complète', color: '#22c55e' },
  nouveau: { label: 'nouveau', color: '#8899a6' },
  confirme: { label: 'confirme', color: '#8899a6' },
};

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const WhatMovedPanel: React.FC = () => {
  const [entries, setEntries] = useState<SurfaceEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const journal = new SurfaceJournal();
      setEntries(await journal.load());
    } catch (e) {
      logger.warn('WhatMovedPanel: lecture du journal échouée', e as Error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void reload();
    // Recharge quand une digestion écrit dans le journal.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = typeof chrome !== 'undefined' ? (chrome as any) : undefined;
    const listener = () => void reload();
    c?.storage?.onChanged?.addListener?.(listener);
    return () => c?.storage?.onChanged?.removeListener?.(listener);
  }, [reload]);

  if (!loaded || entries.length === 0) return null; // rien à montrer

  const { today, earlier } = partitionSurface(entries, startOfToday());

  const renderEntry = (e: SurfaceEntry, i: number) => {
    const ks = KIND_STYLE[e.kind] ?? KIND_STYLE.nouveau;
    return (
      <div key={i} style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span
            style={{
              background: `${ks.color}22`,
              color: ks.color,
              fontSize: 10,
              padding: '2px 7px',
              borderRadius: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
            }}
          >
            {ks.label}
          </span>
          {e.domain && <span style={{ color: C.dim, fontSize: 11 }}>{e.domain}</span>}
        </div>
        <div style={{ color: C.text, fontSize: 13, lineHeight: 1.45 }}>{e.claimText}</div>
        {e.rationale && <div style={{ color: C.dim, fontSize: 11, marginTop: 2 }}>{e.rationale}</div>}
      </div>
    );
  };

  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: 14,
        marginBottom: 14,
      }}
    >
      <div style={{ color: C.accent, fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
        🌅 Ce qui a bougé aujourd&apos;hui
      </div>

      {today.length > 0 ? (
        <>
          <div style={{ color: C.dim, fontSize: 12, marginBottom: 10 }}>
            {today.length} chose{today.length > 1 ? 's' : ''} ont bougé dans ta compréhension.
          </div>
          {today.map(renderEntry)}
        </>
      ) : (
        <div style={{ color: C.dim, fontSize: 12 }}>
          Rien n&apos;a bougé aujourd&apos;hui — ta carte du monde est stable. Le symbiote a peut-être
          lu, mais rien ne t&apos;a fait penser autrement.
        </div>
      )}

      {earlier.length > 0 && (
        <details style={{ marginTop: 10 }}>
          <summary style={{ color: C.dim, fontSize: 12, cursor: 'pointer' }}>
            Précédemment ({earlier.length})
          </summary>
          <div style={{ marginTop: 8 }}>{earlier.slice(0, 5).map(renderEntry)}</div>
        </details>
      )}
    </div>
  );
};

export default WhatMovedPanel;

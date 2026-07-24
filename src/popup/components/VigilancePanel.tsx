import React, { useEffect, useState } from 'react';
import { useMessaging } from '../hooks/useMessaging';
import { MessageType } from '@shared/messaging/MessageBus';

// Miroir des types du DreamProcessor (évite d'importer du code background)
interface SurveillanceSignature {
  id: string;
  domains: string[];
  confidence: number;
  infrastructure: {
    cdnPattern?: string;
    trackerFingerprint: string;
    protocolConsistency: number;
  };
  impact: number;
  discoveredAt: number;
  lastSeen: number;
}

interface DreamReport {
  synthesisId: string;
  startTime: number;
  endTime: number;
  fragmentsAnalyzed: number;
  clustersIdentified: number;
  shadowEntities: SurveillanceSignature[];
  cpuUtilization: number;
  memoryPeak: number;
  thermalEvents: number;
}

/**
 * Réveil Lucide — affiche le rapport de vigilance structurelle produit par le
 * Sommeil Analytique : entités d'ombre corrélées entre domaines (sites
 * partageant la même infrastructure de surveillance malgré des noms différents).
 */
const VigilancePanel: React.FC = () => {
  const messaging = useMessaging();
  const [report, setReport] = useState<DreamReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handler = (message: any) => {
      setReport(message.payload ?? null);
      setLoading(false);
    };
    messaging.subscribe(MessageType.DREAM_REPORT, handler);
    messaging.send(MessageType.GET_DREAM_REPORT, {});

    // Filet de sécurité : sortir de l'état de chargement si pas de réponse
    const timeout = setTimeout(() => setLoading(false), 4000);
    return () => {
      clearTimeout(timeout);
      messaging.unsubscribe(MessageType.DREAM_REPORT, handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const riskColor = (impact: number): string => {
    if (impact >= 0.66) return '#ff4b6e';
    if (impact >= 0.33) return '#ffb700';
    return '#7cffb2';
  };

  const shadowEntities = report?.shadowEntities || [];

  return (
    <div className="vigilance-panel" data-testid="vigilance-panel">
      <div style={{ color: '#8899a6', fontSize: 13, marginBottom: 12 }}>
        {loading ? 'Lecture du dernier rêve…'
          : report
            ? `Dernier rêve : ${report.fragmentsAnalyzed} fragments analysés · ${report.clustersIdentified} clusters`
            : 'L’organisme n’a pas encore rêvé'}
      </div>

      {!loading && shadowEntities.length === 0 && (
        <div style={{ color: '#8899a6', fontSize: 13, lineHeight: 1.6, padding: '12px 0' }}>
          <p>Aucune infrastructure de surveillance corrélée pour l’instant.</p>
          <p style={{ fontSize: 12, opacity: 0.8 }}>
            Ce journal est passif : l’organisme rêve seul pendant tes phases
            d’inactivité, corrèle les domaines croisés, et te chuchote dans la
            page — ou t’envoie une notification — uniquement quand il perçoit une
            structure invisible qui te concerne. Rien à ouvrir, rien à cliquer.
          </p>
        </div>
      )}

      {shadowEntities.length > 0 && (
        <div className="shadow-entities">
          <h4 style={{ color: '#00e0ff', margin: '4px 0 10px' }}>
            🕸️ {shadowEntities.length} infrastructure(s) d’ombre corrélée(s)
          </h4>
          {shadowEntities.map((entity) => (
            <div
              key={entity.id}
              data-testid="shadow-entity"
              style={{
                border: `1px solid ${riskColor(entity.impact)}44`,
                borderLeft: `3px solid ${riskColor(entity.impact)}`,
                borderRadius: 8, padding: 12, marginBottom: 10, background: '#161b22'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: riskColor(entity.impact), fontWeight: 700, fontSize: 13 }}>
                  Impact {Math.round(entity.impact * 100)}%
                </span>
                <span style={{ color: '#8899a6', fontSize: 12 }}>
                  Confiance {Math.round(entity.confidence * 100)}%
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#c9d1d9', marginBottom: 6 }}>
                {entity.domains.length} domaines liés :
                <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {entity.domains.map((d) => (
                    <span key={d} style={{
                      background: '#0d1117', border: '1px solid #30363d', borderRadius: 4,
                      padding: '2px 6px', fontSize: 11, fontFamily: 'monospace'
                    }}>{d}</span>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#8899a6' }}>
                Empreinte tracker : <code>{entity.infrastructure.trackerFingerprint?.slice(0, 24) || 'n/a'}</code>
                {entity.infrastructure.cdnPattern && <> · CDN {entity.infrastructure.cdnPattern}</>}
                {' '}· cohérence protocole {Math.round((entity.infrastructure.protocolConsistency || 0) * 100)}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VigilancePanel;

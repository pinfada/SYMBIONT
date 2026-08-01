// src/shared/llm/modelCatalog.ts
//
// Catalogue restreint et commenté des modèles locaux proposés dans l'UI.
// On n'expose pas les ~140 modèles de WebLLM : seulement une sélection
// pensée pour l'extension (petits modèles instruct, quantifiés q4f16), du
// plus léger (défaut, distribution de masse) au plus capable.
//
// `id` correspond exactement à un `model_id` de `prebuiltAppConfig` de
// @mlc-ai/web-llm ; toute faute de frappe casserait le chargement, donc les
// tests valident que chaque id existe bien dans le prebuilt.

export interface LocalModelInfo {
  /** model_id WebLLM (doit exister dans prebuiltAppConfig.model_list). */
  id: string;
  /** Nom court affiché. */
  label: string;
  /** Taille approximative du téléchargement (affichage UI). */
  sizeLabel: string;
  /** Taille approximative en octets, pour trier / avertir. */
  approxBytes: number;
  /** Niveau indicatif de capacité. */
  tier: 'léger' | 'équilibré' | 'intermédiaire' | 'avancé';
  /** Phrase d'aide affichée sous le modèle. */
  description: string;
}

const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;

/**
 * Modèles proposés. L'ordre = ordre d'affichage (léger → lourd).
 */
export const MODEL_CATALOG: readonly LocalModelInfo[] = [
  {
    id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    label: 'Qwen2.5 0.5B',
    sizeLabel: '~350 Mo',
    approxBytes: 350 * MB,
    tier: 'léger',
    description: 'Le plus léger. Idéal pour classer/résumer du texte sur GPU modeste. Raisonnement limité.',
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 1B',
    sizeLabel: '~900 Mo',
    approxBytes: 900 * MB,
    tier: 'équilibré',
    description: 'Bon équilibre compréhension / poids. Convient à l’analyse de contenu.',
  },
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    label: 'Qwen2.5 1.5B',
    sizeLabel: '~1,2 Go',
    approxBytes: Math.round(1.2 * GB),
    tier: 'intermédiaire',
    description: 'Plus fin que les 1B, téléchargement plus lourd.',
  },
  {
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    label: 'Phi-3.5 mini',
    sizeLabel: '~2,2 Go',
    approxBytes: Math.round(2.2 * GB),
    tier: 'avancé',
    description: 'Le plus capable de la liste. Gros téléchargement, GPU correct requis.',
  },
];

/** Modèle par défaut proposé au 1er lancement (choix : léger pour la masse). */
export const DEFAULT_MODEL_ID = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';

export function getModelInfo(id: string): LocalModelInfo | undefined {
  return MODEL_CATALOG.find((m) => m.id === id);
}

/** Renvoie l'id passé s'il est au catalogue, sinon le modèle par défaut. */
export function normalizeModelId(id: string | undefined | null): string {
  return id && getModelInfo(id) ? id : DEFAULT_MODEL_ID;
}

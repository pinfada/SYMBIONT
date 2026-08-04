// src/popup/components/metricsFormat.ts
//
// Formatage des statistiques affichées par MetricsPanel. Logique pure,
// séparée du composant pour être testable unitairement.

/**
 * Normalise un trait vers un pourcentage borné [0, 100].
 *
 * Deux échelles héritées coexistent selon la provenance de l'organisme :
 * 0-1 (organisme par défaut créé par le popup) et 0-100 (organisme créé par
 * le background). Sans normalisation, un trait background de 73,4 s'affichait
 * « 7340 % ». Heuristique : une valeur ≤ 1 est traitée comme une fraction —
 * sur l'échelle 0-100, les valeurs réelles ≤ 1 sont statistiquement
 * négligeables et s'afficheraient de toute façon à 0-1 %.
 */
export function toTraitPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const percent = value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, Math.round(percent)));
}

/**
 * Borne une valeur déjà en pourcentage (échelle 0-100) dans [0, 100].
 * Défensif : des états persistés avant le clamp de feed() peuvent contenir
 * une conscience au-delà de 100.
 */
export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

const TRAIT_LABELS: Record<string, string> = {
  curiosity: 'Curiosité',
  focus: 'Concentration',
  rhythm: 'Rythme',
  empathy: 'Empathie',
  creativity: 'Créativité',
  resilience: 'Résilience',
  adaptability: 'Adaptabilité',
  memory: 'Mémoire',
  intuition: 'Intuition',
};

/** Libellé français d'un trait ; repli sur la clé capitalisée si inconnue. */
export function traitLabel(key: string): string {
  return TRAIT_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

const MOOD_LABELS: Record<string, string> = {
  happy: 'Heureux',
  curious: 'Curieux',
  excited: 'Enthousiaste',
  meditating: 'En méditation',
  hungry: 'Affamé',
  tired: 'Fatigué',
};

/** Libellé français d'une humeur ; repli sur la valeur brute si inconnue. */
export function moodLabel(mood: string): string {
  return MOOD_LABELS[mood] ?? mood;
}

const PAGE_TYPE_LABELS: Record<string, string> = {
  science: 'scientifique',
  social: 'sociale',
  news: 'actualités',
  entertainment: 'divertissement',
  coding: 'programmation',
  learning: 'apprentissage',
  default: 'standard',
};

/** Libellé français d'un type de page ; repli sur la valeur brute si inconnu. */
export function pageTypeLabel(pageType: string): string {
  return PAGE_TYPE_LABELS[pageType] ?? pageType;
}

/**
 * Formate l'âge de l'organisme depuis son timestamp de naissance.
 * Renvoie « Inconnu » quand la date manque ou est incohérente (dans le
 * futur) plutôt que d'afficher un âge de 0 minute mensonger.
 */
export function formatAge(birthTimestamp: number | null | undefined, now: number = Date.now()): string {
  if (!birthTimestamp || birthTimestamp > now) return 'Inconnu';
  const minutes = Math.floor((now - birthTimestamp) / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}j ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

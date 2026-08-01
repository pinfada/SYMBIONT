// src/shared/comprehension/types.ts
//
// Le « delta de compréhension » — cœur de la vision SYMBIONT (voir docs/VISION.md).
// Ce n'est PAS de la détection de nouveauté (= un feed). C'est la mesure de ce
// qui **révise le modèle du monde** de l'utilisateur : seul ce qui complète,
// contredit ou déplace une croyance déjà assimilée « fait surface » ; le reste
// est digéré en silence (accrété au modèle).

/** Relation d'une affirmation nouvelle avec le modèle déjà assimilé. */
export type DeltaKind =
  | 'confirme' // redit ce qui est déjà su → digéré en silence
  | 'complète' // ajoute une nuance à une croyance existante → surface légère
  | 'contredit' // s'oppose à une croyance existante → surface forte
  | 'déplace' // recadre / change le cadre d'une croyance → surface forte
  | 'nouveau'; // sans lien avec le modèle → accrété, pas remonté (anti-feed)

/** Une croyance atomique assimilée par l'organisme. */
export interface Claim {
  id: string;
  text: string;
  embedding: number[];
  /** Force de la croyance (renforcée par 'confirme', créée à 1). */
  salience: number;
  firstSeen: number;
  lastSeen: number;
  /** Domaines d'où la croyance a été rencontrée. */
  sources: string[];
}

/** Verdict de relation pour UNE affirmation nouvelle. */
export interface RelationVerdict {
  claimText: string;
  kind: DeltaKind;
  /** Id de la croyance existante la plus concernée (si kind ≠ nouveau). */
  relatedClaimId?: string;
  /** Confiance 0..1 du classement. */
  confidence: number;
  /** Explication courte. */
  rationale: string;
}

/** Rapport de delta au niveau d'une page. */
export interface DeltaReport {
  /** Score 0..1 : intensité de la révision du modèle du monde. */
  score: number;
  /** Le symbiote doit-il faire surface (vs digérer en silence) ? */
  surface: boolean;
  /** Relation dominante qui a déclenché (ou non) la surface. */
  dominantKind: DeltaKind;
  /** Les révisions retenues (celles qui font surface). */
  revisions: RelationVerdict[];
  /** Toutes les affirmations évaluées (pour l'accrétion). */
  verdicts: RelationVerdict[];
  domain?: string;
}

/**
 * Poids de chaque relation dans le score. La nouveauté PURE pèse peu (0.15) —
 * c'est le refus du réflexe « feed ». La contradiction pèse le plus.
 */
export const KIND_WEIGHT: Record<DeltaKind, number> = {
  contredit: 1.0,
  déplace: 0.9,
  complète: 0.55,
  nouveau: 0.15,
  confirme: 0,
};

/** Seuil de surface : en dessous, l'organisme digère en silence. */
export const SURFACE_THRESHOLD = 0.5;

/** Seules ces relations peuvent faire surface (une révision, pas une nouveauté). */
export const SURFACING_KINDS: ReadonlySet<DeltaKind> = new Set<DeltaKind>([
  'contredit',
  'déplace',
  'complète',
]);

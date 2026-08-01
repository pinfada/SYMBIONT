// src/shared/comprehension/index.ts
// Le delta de compréhension — cœur de la vision SYMBIONT (docs/VISION.md).

export type {
  DeltaKind,
  Claim,
  RelationVerdict,
  DeltaReport,
} from './types';
export { KIND_WEIGHT, SURFACE_THRESHOLD, SURFACING_KINDS } from './types';
export { HashingEmbedder, cosineSimilarity } from './embedder';
export type { Embedder } from './embedder';
export { hashingEmbedFn } from './embedFn';
export type { EmbedFn } from './embedFn';
export { SemanticEmbedder, createEmbeddingEngine, DEFAULT_EMBEDDING_MODEL } from './SemanticEmbedder';
export type { EmbeddingEngine } from './SemanticEmbedder';
export { KnowledgeModel } from './KnowledgeModel';
export { extractClaims, buildClaimPrompt, parseClaims } from './ClaimExtractor';
export { assessDelta, buildRelationPrompt } from './ComprehensionDelta';
export type { EmbeddedClaim } from './ComprehensionDelta';
export { digestPage } from './digest';
export type { DigestResult } from './digest';
export { KnowledgeStore } from './KnowledgeStore';
export type { KVStorage } from './KnowledgeStore';
export { SurfaceJournal, partitionSurface } from './SurfaceJournal';
export type { SurfaceEntry } from './SurfaceJournal';
export { readPage } from './readingService';
export type { ReadingDeps, ReadingOutcome } from './readingService';
export { selectForagingSeeds, deriveForagingTargets } from './foraging';
export type { ForagingSeed, ForagingTarget } from './foraging';
export { coarsen, abstractRevision, integrateFragments } from './collective';
export type { MeaningFragment, CollectiveSignal } from './collective';
export { decideAgency, DietLog } from './agency';
export type { AgencyStance, AgencyVerdict, DietItem } from './agency';

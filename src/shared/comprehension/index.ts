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
export { KnowledgeModel } from './KnowledgeModel';
export { extractClaims, buildClaimPrompt, parseClaims } from './ClaimExtractor';
export { assessDelta, buildRelationPrompt } from './ComprehensionDelta';
export { digestPage } from './digest';
export type { DigestResult } from './digest';
export { KnowledgeStore } from './KnowledgeStore';
export type { KVStorage } from './KnowledgeStore';
export { SurfaceJournal, partitionSurface } from './SurfaceJournal';
export type { SurfaceEntry } from './SurfaceJournal';
export { readPage } from './readingService';
export type { ReadingDeps, ReadingOutcome } from './readingService';

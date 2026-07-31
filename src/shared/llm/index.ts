// src/shared/llm/index.ts
// Point d'entrée du module cognitif local (LLM WebGPU, opt-in, additif).

export { detectWebGPU } from './webgpu';
export type { WebGPUSupport } from './webgpu';
export {
  MODEL_CATALOG,
  DEFAULT_MODEL_ID,
  getModelInfo,
  normalizeModelId,
} from './modelCatalog';
export type { LocalModelInfo } from './modelCatalog';
export { llmPreferences } from './llmPreferences';
export type { LLMPreferences } from './llmPreferences';
export { LocalLLMEngine } from './LocalLLMEngine';
export type {
  ChatMessage,
  ChatRole,
  ChatOptions,
  EngineStatus,
  LoadProgress,
  CreateEngineFn,
} from './LocalLLMEngine';

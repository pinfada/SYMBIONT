import {
  MODEL_CATALOG,
  DEFAULT_MODEL_ID,
  getModelInfo,
  normalizeModelId,
} from '../modelCatalog';

// Ids attendus (vérifiés présents dans prebuiltAppConfig de @mlc-ai/web-llm).
// On ne charge PAS web-llm ici (dépendances WebGPU/WASM incompatibles jsdom) ;
// ce snapshot garde-fou détecte une faute de frappe dans un id.
const EXPECTED_IDS = [
  'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
  'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
  'Phi-3.5-mini-instruct-q4f16_1-MLC',
];

describe('modelCatalog', () => {
  it('default model is part of the catalog', () => {
    expect(getModelInfo(DEFAULT_MODEL_ID)).toBeDefined();
  });

  it('default is the lightest tier (mass distribution choice)', () => {
    expect(getModelInfo(DEFAULT_MODEL_ID)?.tier).toBe('léger');
    // Le défaut doit être le plus petit téléchargement du catalogue.
    const smallest = [...MODEL_CATALOG].sort((a, b) => a.approxBytes - b.approxBytes)[0];
    expect(smallest.id).toBe(DEFAULT_MODEL_ID);
  });

  it('exposes the expected model ids', () => {
    expect(MODEL_CATALOG.map((m) => m.id)).toEqual(EXPECTED_IDS);
  });

  it('every entry has display metadata', () => {
    for (const m of MODEL_CATALOG) {
      expect(m.label).toBeTruthy();
      expect(m.sizeLabel).toBeTruthy();
      expect(m.description).toBeTruthy();
      expect(m.approxBytes).toBeGreaterThan(0);
    }
  });

  it('catalog is ordered lightest → heaviest', () => {
    for (let i = 1; i < MODEL_CATALOG.length; i++) {
      expect(MODEL_CATALOG[i].approxBytes).toBeGreaterThanOrEqual(MODEL_CATALOG[i - 1].approxBytes);
    }
  });

  describe('normalizeModelId', () => {
    it('passes through a known id', () => {
      expect(normalizeModelId('Llama-3.2-1B-Instruct-q4f16_1-MLC')).toBe(
        'Llama-3.2-1B-Instruct-q4f16_1-MLC',
      );
    });
    it('falls back to default for unknown / empty', () => {
      expect(normalizeModelId('does-not-exist')).toBe(DEFAULT_MODEL_ID);
      expect(normalizeModelId(undefined)).toBe(DEFAULT_MODEL_ID);
      expect(normalizeModelId(null)).toBe(DEFAULT_MODEL_ID);
    });
  });
});

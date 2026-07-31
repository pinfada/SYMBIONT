// src/shared/llm/webgpu.ts
//
// Détection de la disponibilité de WebGPU. Le LLM local en dépend : sans
// WebGPU, aucun modèle ne peut tourner sur le poste et l'organisme retombe
// gracieusement sur le NeuralMesh embarqué.
//
// La détection est volontairement défensive : `navigator.gpu` peut exister
// mais `requestAdapter()` renvoyer `null` (GPU bloqué, pilote non supporté,
// navigateur en mode logiciel). On ne considère WebGPU disponible que si un
// adapter réel est obtenu.

import { logger } from '@shared/utils/secureLogger';

export interface WebGPUSupport {
  /** true seulement si un adapter GPU réel a pu être obtenu. */
  available: boolean;
  /** Raison lisible de l'indisponibilité (pour l'UI), sinon undefined. */
  reason?: string;
  /** Nom rapporté par l'adapter, si exposé (souvent masqué pour la vie privée). */
  adapterInfo?: string;
}

/**
 * Teste la présence effective de WebGPU.
 * Ne lève jamais : renvoie toujours un `WebGPUSupport`.
 */
export async function detectWebGPU(): Promise<WebGPUSupport> {
  try {
    const gpu = (navigator as unknown as { gpu?: unknown }).gpu as
      | { requestAdapter: (opts?: unknown) => Promise<unknown> }
      | undefined;

    if (!gpu || typeof gpu.requestAdapter !== 'function') {
      return {
        available: false,
        reason: "Ce navigateur n'expose pas WebGPU (Chrome/Edge 113+, ou Firefox récent requis).",
      };
    }

    const adapter = (await gpu.requestAdapter()) as
      | { requestAdapterInfo?: () => Promise<{ vendor?: string; architecture?: string }> }
      | null;

    if (!adapter) {
      return {
        available: false,
        reason: 'WebGPU est exposé mais aucun adaptateur GPU utilisable (GPU bloqué ou pilote non supporté).',
      };
    }

    let adapterInfo: string | undefined;
    try {
      if (typeof adapter.requestAdapterInfo === 'function') {
        const info = await adapter.requestAdapterInfo();
        adapterInfo = [info?.vendor, info?.architecture].filter(Boolean).join(' ') || undefined;
      }
    } catch {
      // requestAdapterInfo est optionnel / peut être restreint : sans importance.
    }

    return { available: true, ...(adapterInfo ? { adapterInfo } : {}) };
  } catch (error) {
    logger.warn('detectWebGPU: échec de la détection', error as Error);
    return {
      available: false,
      reason: 'Erreur lors de la détection de WebGPU.',
    };
  }
}

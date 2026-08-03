// src/background/CognitiveOffscreen.ts
//
// Coordination du document offscreen partagé (MV3 n'en autorise qu'UN). Le
// module cognitif « prend un bail » sur l'offscreen quand un modèle y est
// chargé, pour que le pont WebGL ne le ferme pas sous ses pieds.
//
// Seul le service worker peut créer l'offscreen ; le popup lui envoie
// ENSURE_OFFSCREEN_LLM, on garantit le document, puis le popup dialogue
// directement avec l'offscreen (broadcast runtime).

import { logger } from '@/shared/utils/secureLogger';
import { ENSURE_OFFSCREEN_LLM } from '@/shared/llm/offscreenProtocol';

let leaseHeld = false;

/** Le module cognitif tient-il l'offscreen ? (consulté par le pont WebGL.) */
export function isOffscreenLLMLeaseHeld(): boolean {
  return leaseHeld;
}

/** Libère explicitement le bail (ex. déchargement du modèle). */
export function releaseOffscreenLLMLease(): void {
  leaseHeld = false;
}

async function offscreenExists(): Promise<boolean> {
  try {
    // chrome.offscreen.hasDocument existe sur Chrome récents ; sinon getContexts.
    const off = chrome.offscreen as unknown as { hasDocument?: () => Promise<boolean> };
    if (typeof off?.hasDocument === 'function') return await off.hasDocument();
    const rt = chrome.runtime as unknown as {
      getContexts?: (f: { contextTypes: string[] }) => Promise<unknown[]>;
    };
    if (typeof rt?.getContexts === 'function') {
      const ctx = await rt.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
      return ctx.length > 0;
    }
  } catch {
    /* on tente la création, qui échouera proprement si déjà présent */
  }
  return false;
}

/**
 * Garantit l'existence du document offscreen et pose le bail LLM. Idempotent :
 * tolère un document déjà créé (par le pont WebGL ou un appel précédent).
 */
export async function ensureOffscreenForLLM(): Promise<void> {
  // Ne poser le bail qu'une fois l'API validée : sur Firefox (pas d'offscreen)
  // ce chemin lève, et un bail posé trop tôt resterait tenu indéfiniment pour
  // un document qui n'existe pas.
  if (typeof chrome === 'undefined' || !chrome.offscreen?.createDocument) {
    throw new Error('API offscreen indisponible.');
  }
  leaseHeld = true;
  if (await offscreenExists()) return;
  try {
    await chrome.offscreen.createDocument({
      url: chrome.runtime.getURL('offscreen.html'),
      // WORKERS : calcul WebGPU local ; DISPLAY_MEDIA : rendu WebGL (doc partagé).
      reasons: ['WORKERS', 'DISPLAY_MEDIA'] as chrome.offscreen.Reason[],
      justification: 'Inférence IA locale (WebGPU) et rendu de l’organisme, 100% sur le poste.',
    });
  } catch (error) {
    // « Only a single offscreen document may be created » → déjà présent : OK.
    if (error instanceof Error && /single offscreen/i.test(error.message)) return;
    leaseHeld = false;
    logger.error('CognitiveOffscreen: création offscreen échouée', error as Error);
    throw error;
  }
}

/** Installe le listener ENSURE_OFFSCREEN_LLM dans le service worker. */
export function installCognitiveOffscreen(): void {
  if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (!message || (message as { type?: unknown }).type !== ENSURE_OFFSCREEN_LLM) return false;
    ensureOffscreenForLLM()
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }));
    return true; // réponse asynchrone
  });
}

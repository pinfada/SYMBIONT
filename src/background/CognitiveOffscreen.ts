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

const LEASE_KEY = 'symbiont_offscreen_llm_lease';

// Cache mémoire du bail. La source de vérité est chrome.storage.session : le
// service worker MV3 est tué après ~30 s d'inactivité et une variable module
// repart à false au réveil — alors que le document offscreen, lui, survit avec
// le modèle chargé. storage.session a exactement la bonne durée de vie
// (survit aux redémarrages du SW, effacé au redémarrage du navigateur, comme
// le document offscreen).
let leaseHeld = false;

function leaseStore(): chrome.storage.StorageArea | null {
  if (typeof chrome === 'undefined' || !chrome.storage) return null;
  return (chrome.storage as { session?: chrome.storage.StorageArea }).session ?? null;
}

async function persistLease(value: boolean): Promise<void> {
  leaseHeld = value;
  const store = leaseStore();
  if (!store) return;
  try {
    if (value) {
      await store.set({ [LEASE_KEY]: true });
    } else {
      await store.remove(LEASE_KEY);
    }
  } catch (error) {
    logger.warn('CognitiveOffscreen: persistance du bail LLM impossible', error as Error);
  }
}

/**
 * Le module cognitif tient-il l'offscreen ? (consulté par le pont WebGL avant
 * de fermer le document.) Consulte storage.session si le cache mémoire dit
 * non : après un redémarrage du service worker, seul le stockage sait qu'un
 * modèle est encore chargé dans l'offscreen.
 */
export async function isOffscreenLLMLeaseHeld(): Promise<boolean> {
  if (leaseHeld) return true;
  const store = leaseStore();
  if (!store) return false;
  try {
    const stored = await store.get(LEASE_KEY);
    leaseHeld = stored?.[LEASE_KEY] === true;
  } catch (error) {
    logger.warn('CognitiveOffscreen: lecture du bail LLM impossible', error as Error);
  }
  return leaseHeld;
}

/** Libère explicitement le bail (ex. déchargement du modèle). */
export function releaseOffscreenLLMLease(): void {
  void persistLease(false);
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
  await persistLease(true);
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
    await persistLease(false);
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

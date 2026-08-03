// src/shared/llm/webllmRuntime.ts
//
// Point d'entrée unique vers @mlc-ai/web-llm. Deux raisons d'exister :
//
// 1. Backend de cache. Par défaut WebLLM persiste les poids via le Cache API.
//    Sur Firefox, rien n'est écrit pour une origine moz-extension:// — vérifié
//    sur un profil réel : aucun dossier `cache` sous storage/default/<origine>,
//    alors qu'`idb` y est bien peuplé pour la même origine. Conséquence : les
//    poids (350 Mo à 1,2 Go) étaient re-téléchargés à chaque ouverture du
//    popup. On force IndexedDB, qui fonctionne sur les deux navigateurs.
//
// 2. Import unique. L'`import()` dynamique met WebLLM dans un chunk séparé
//    (~5,7 Mo) ; le mémoriser évite de réévaluer le module à chaque moteur créé.

/** Backend de persistance des poids. Voir la note 1 ci-dessus avant de changer. */
const CACHE_BACKEND = 'indexeddb';

export interface WebLLMProgress {
  progress: number;
  text: string;
}

interface WebLLMModule {
  CreateMLCEngine: (id: string, config: Record<string, unknown>) => Promise<unknown>;
  prebuiltAppConfig: { model_list: unknown[]; cacheBackend?: string };
}

let modulePromise: Promise<WebLLMModule> | null = null;

/** Charge WebLLM (chunk séparé), une seule fois par document. */
function loadWebLLM(): Promise<WebLLMModule> {
  if (!modulePromise) {
    modulePromise = import('@mlc-ai/web-llm') as unknown as Promise<WebLLMModule>;
  }
  return modulePromise;
}

/**
 * Crée un moteur WebLLM configuré pour l'extension. Tout appel à
 * `CreateMLCEngine` doit passer par ici : un appel direct retomberait sur le
 * Cache API et perdrait la persistance des poids sur Firefox.
 *
 * @param modelId id de modèle WebLLM (déjà normalisé par l'appelant)
 * @param opts callback de progression du téléchargement/initialisation
 */
export async function createWebLLMEngine<T>(
  modelId: string,
  opts: { initProgressCallback?: (report: WebLLMProgress) => void } = {},
): Promise<T> {
  const webllm = await loadWebLLM();
  return (await webllm.CreateMLCEngine(modelId, {
    ...opts,
    appConfig: { ...webllm.prebuiltAppConfig, cacheBackend: CACHE_BACKEND },
  })) as T;
}

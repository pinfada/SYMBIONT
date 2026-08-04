// src/shared/llm/engineSession.ts
//
// Conserve le moteur cognitif au-delà du cycle de vie du composant.
//
// App.tsx rend l'onglet actif via un `switch` : changer d'onglet démonte
// LocalLLMPanel. Un moteur tenu dans un `useRef` disparaissait avec lui, et au
// retour l'UI repartait de « activer et télécharger » alors que le modèle était
// déjà chargé — poids en cache, mais réinitialisation GPU complète à refaire.
//
// Le moteur vit donc ici, à la durée de vie du document popup : l'état d'un
// modèle chargé n'appartient pas à un composant d'onglet.

import { logger } from '@shared/utils/secureLogger';
import { createCognitiveEngine, type CognitiveEngine } from './cognitiveEngine';

let engine: CognitiveEngine | null = null;
let pending: Promise<CognitiveEngine> | null = null;

/** Moteur déjà en session, sans en créer. Renvoie null si aucun. */
export function peekEngine(): CognitiveEngine | null {
  return engine;
}

/**
 * Moteur partagé de la session, créé au premier appel. Les appels concurrents
 * partagent la même promesse : deux montages rapprochés du panneau ne peuvent
 * pas créer deux moteurs (donc pas deux documents offscreen concurrents).
 */
export async function getEngine(): Promise<CognitiveEngine> {
  if (engine) return engine;

  if (!pending) {
    pending = createCognitiveEngine()
      .then((created) => {
        engine = created;
        return created;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

type LoadProgress = { progress: number; text: string };

let activeLoad: {
  modelId: string;
  promise: Promise<CognitiveEngine>;
  subscribers: Set<(p: LoadProgress) => void>;
} | null = null;

/**
 * Charge un modèle dans le moteur de session, en dé-dupliquant les appels
 * concurrents.
 *
 * `activate()` est déclenché automatiquement au montage du panneau quand les
 * poids sont déjà en cache ; un démontage/remontage (changement d'onglet)
 * pendant un chargement relancerait sinon un second `engine.load()` concurrent
 * sur le même moteur — aucune couche en aval (LocalLLMEngine,
 * OffscreenLLMClient, handler offscreen) n'est réentrante. Les appels
 * concurrents pour le même modèle partagent donc la même promesse, et chaque
 * appelant peut brancher son propre rapport de progression.
 */
export function loadEngine(
  modelId: string,
  onProgress?: (p: LoadProgress) => void
): Promise<CognitiveEngine> {
  if (activeLoad && activeLoad.modelId === modelId) {
    if (onProgress) activeLoad.subscribers.add(onProgress);
    return activeLoad.promise;
  }

  const subscribers = new Set<(p: LoadProgress) => void>();
  if (onProgress) subscribers.add(onProgress);

  // Si un chargement d'un AUTRE modèle est en cours, attendre sa fin (succès
  // ou échec) avant de lancer le nôtre : jamais deux load() simultanés.
  const previous = activeLoad ? activeLoad.promise.catch(() => undefined) : Promise.resolve(undefined);

  const promise = previous.then(async () => {
    const engine = await getEngine();
    await engine.load(modelId, (p) => {
      for (const subscriber of subscribers) {
        try {
          subscriber(p);
        } catch (error) {
          logger.warn('engineSession: rapport de progression en erreur', error as Error);
        }
      }
    });
    return engine;
  });

  const entry = { modelId, promise, subscribers };
  activeLoad = entry;
  promise
    .catch(() => undefined)
    .finally(() => {
      if (activeLoad === entry) activeLoad = null;
    });

  return promise;
}

/**
 * Reprend une session déjà en cours, sans rien recharger.
 *
 * Cas Chrome : le document offscreen survit à la fermeture du popup et garde le
 * modèle en mémoire ; le nouveau popup doit simplement le découvrir, ce que
 * `syncStatus()` permet. Sans ça, l'utilisateur revoyait l'écran de
 * téléchargement alors que le moteur était prêt.
 *
 * Ne recharge jamais de modèle : renvoie le moteur seulement s'il est déjà
 * prêt, sinon null (cas Firefox, où le moteur in-popup est mort avec le
 * document précédent).
 */
export async function resumeEngine(): Promise<CognitiveEngine | null> {
  try {
    const candidate = await getEngine();
    await candidate.syncStatus?.();
    return candidate.isReady() ? candidate : null;
  } catch (error) {
    logger.warn('engineSession: reprise impossible, activation manuelle', error as Error);
    return null;
  }
}

/** Oublie le moteur de session (déchargement, changement de contexte). */
export function resetEngineSession(): void {
  engine = null;
}

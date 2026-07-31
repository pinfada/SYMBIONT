/**
 * Détection d'environnement cross-navigateur.
 *
 * Le background SYMBIONT s'exécute dans deux contextes très différents :
 *  - Chrome MV3  : service worker (pas de DOM, pas de RTCPeerConnection,
 *                  pas de new Worker fiable → API offscreen)
 *  - Firefox MV3 : page d'événements (DOM complet, WebGL, WebRTC, Workers)
 *
 * Toute logique dépendante du contexte doit passer par ces helpers plutôt
 * que par un sniffing du user-agent.
 */

/** Le contexte courant possède-t-il un vrai DOM (page d'événements, popup, offscreen) ? */
export function hasDOM(): boolean {
  return typeof document !== 'undefined' && typeof document.createElement === 'function';
}

/** WebRTC est-il disponible dans ce contexte ? (absent des service workers Chrome) */
export function hasWebRTC(): boolean {
  return typeof RTCPeerConnection !== 'undefined';
}

/** L'API chrome.offscreen est-elle disponible ? (Chrome uniquement) */
export function hasOffscreenAPI(): boolean {
  return typeof chrome !== 'undefined'
    && !!chrome.offscreen
    && typeof chrome.offscreen.createDocument === 'function';
}

/** L'API chrome.alarms est-elle disponible ? */
export function hasAlarmsAPI(): boolean {
  return typeof chrome !== 'undefined'
    && !!(chrome as { alarms?: unknown }).alarms;
}

/** Heuristique Firefox : le namespace `browser` natif n'existe que sur Gecko. */
export function isFirefox(): boolean {
  return typeof (globalThis as { browser?: { runtime?: unknown } }).browser !== 'undefined'
    && typeof (globalThis as { browser?: { runtime?: unknown } }).browser?.runtime !== 'undefined';
}

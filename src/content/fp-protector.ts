/**
 * fp-protector — Protection anti-fingerprinting ACTIVE, exécutée dans le
 * MONDE PRINCIPAL (world: MAIN) pour pouvoir neutraliser réellement les
 * lectures d'empreinte des scripts de la page.
 *
 * Le module FingerprintProtection injecte un bruit DÉTERMINISTE (stable dans
 * la page, aléatoire entre sites/sessions) : le site continue de fonctionner,
 * mais l'empreinte qu'il obtient est fausse et différente sur chaque site →
 * le tracking par corrélation cross-site est cassé, sans blocage détectable.
 *
 * Activé par défaut (posture privacy-first). Le content script isolé peut le
 * désactiver via window.postMessage si l'utilisateur coupe le réglage.
 */
import { FingerprintProtection } from './countermeasures/FingerprintProtection';

(() => {
  try {
    const protection = new FingerprintProtection();
    protection.activate(); // ON par défaut

    window.addEventListener('message', (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data;
      if (!data || data.__symbiont !== 'fp-protect') return;
      if (data.active === false) {
        protection.deactivate();
      } else {
        protection.activate();
      }
    });
  } catch {
    // Ne jamais casser la page pour la protection
  }
})();

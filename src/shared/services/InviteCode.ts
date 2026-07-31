// src/shared/services/InviteCode.ts
// Codec de code d'invitation AUTO-PORTEUR.
//
// Problème résolu : un code opaque (ex. "A1B2C3D4") n'est utilisable que si
// le destinataire possède déjà, dans son propre stockage, la donnée génétique
// associée — ce qui n'est jamais le cas sur une autre installation. Sans
// serveur (distribution GitHub), le seul moyen fiable est d'embarquer la
// donnée DANS le code : le token contient la charge génétique, encodée en
// base64url, et se décode hors-ligne chez le destinataire.

export interface InvitePayload {
  v: 1;
  /** Identifiant court, lisible, pour référence/affichage. */
  code: string;
  creatorId: string;
  creatorName: string;
  generation: number;
  consciousness: number;
  traits: Record<string, number>;
  /** Expiration (timestamp ms) — vérifiable hors-ligne. */
  expiresAt: number;
}

const PREFIX = 'SYMB1-';

function toBase64Url(s: string): string {
  return btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  let b = s.replace(/-/g, '+').replace(/_/g, '/');
  while (b.length % 4) b += '=';
  return decodeURIComponent(escape(atob(b)));
}

/** Encode une charge génétique en token d'invitation partageable. */
export function encodeInvite(payload: InvitePayload): string {
  return PREFIX + toBase64Url(JSON.stringify(payload));
}

/**
 * Décode et valide un token d'invitation. Retourne null si le format est
 * invalide, corrompu ou tronqué (ne vérifie PAS l'expiration — voir isExpired).
 */
export function decodeInvite(token: string): InvitePayload | null {
  try {
    const t = (token || '').trim();
    if (!t.startsWith(PREFIX)) return null;
    const parsed = JSON.parse(fromBase64Url(t.slice(PREFIX.length)));
    if (
      !parsed
      || parsed.v !== 1
      || typeof parsed.code !== 'string'
      || typeof parsed.expiresAt !== 'number'
      || typeof parsed.traits !== 'object'
      || parsed.traits === null
    ) {
      return null;
    }
    return parsed as InvitePayload;
  } catch {
    return null;
  }
}

export function isExpired(payload: InvitePayload, now: number): boolean {
  return payload.expiresAt <= now;
}

/** Génère un identifiant court lisible (référence humaine, pas un secret). */
export function shortCode(random01: number): string {
  return Math.floor(random01 * 0xFFFFFF).toString(36).toUpperCase().padStart(5, '0');
}

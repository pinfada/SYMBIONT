/**
 * Tests du codec d'invitation auto-porteur : garantit qu'un code généré sur
 * une installation est décodable sur une autre (round-trip), et que les
 * tokens corrompus/tronqués/expirés sont rejetés proprement.
 */

import { encodeInvite, decodeInvite, isExpired, shortCode, InvitePayload } from './InviteCode';

const base: InvitePayload = {
  v: 1,
  code: 'AB12C',
  creatorId: 'org-123',
  creatorName: 'Lignée Æther · 世界',
  generation: 3,
  consciousness: 0.62,
  traits: { curiosity: 0.8, focus: 0.4, empathy: 0.55 },
  expiresAt: 2_000_000_000_000,
};

describe('InviteCode', () => {
  it('round-trip : encode puis decode restitue la charge à l\'identique', () => {
    const token = encodeInvite(base);
    const decoded = decodeInvite(token);
    expect(decoded).toEqual(base);
  });

  it('préserve les noms unicode et les traits', () => {
    const decoded = decodeInvite(encodeInvite(base));
    expect(decoded?.creatorName).toBe('Lignée Æther · 世界');
    expect(decoded?.traits.curiosity).toBe(0.8);
  });

  it('produit un token préfixé et transportable (copier-coller)', () => {
    const token = encodeInvite(base);
    expect(token.startsWith('SYMB1-')).toBe(true);
    expect(token).toMatch(/^[A-Za-z0-9_\-]+$/); // sûr en URL / presse-papier
  });

  it('rejette un token vide, mal préfixé ou corrompu', () => {
    expect(decodeInvite('')).toBeNull();
    expect(decodeInvite('HELLO')).toBeNull();
    expect(decodeInvite('SYMB1-not-valid-base64!!')).toBeNull();
    const token = encodeInvite(base);
    expect(decodeInvite(token.slice(0, token.length - 6))).toBeNull(); // tronqué
  });

  it('tolère les espaces autour du token', () => {
    const token = encodeInvite(base);
    expect(decodeInvite(`  ${token}\n`)).toEqual(base);
  });

  it('isExpired compare à l\'instant fourni', () => {
    expect(isExpired(base, base.expiresAt - 1)).toBe(false);
    expect(isExpired(base, base.expiresAt + 1)).toBe(true);
  });

  it('shortCode est déterministe et alphanumérique', () => {
    expect(shortCode(0.5)).toBe(shortCode(0.5));
    expect(shortCode(0.99)).toMatch(/^[0-9A-Z]+$/);
  });
});

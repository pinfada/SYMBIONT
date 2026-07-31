/**
 * Tests des helpers de détection d'environnement cross-navigateur.
 * Ces helpers pilotent le routage du rendu et le mode P2P — leur
 * exactitude conditionne le bon comportement sur Chrome ET Firefox.
 */

import {
  hasDOM,
  hasWebRTC,
  hasOffscreenAPI,
  hasAlarmsAPI,
  isFirefox,
} from './browser-env';

describe('browser-env', () => {
  describe('hasDOM', () => {
    it('retourne true dans jsdom (document présent)', () => {
      expect(hasDOM()).toBe(true);
    });
  });

  describe('hasWebRTC', () => {
    const original = (globalThis as { RTCPeerConnection?: unknown }).RTCPeerConnection;
    afterEach(() => {
      (globalThis as { RTCPeerConnection?: unknown }).RTCPeerConnection = original;
    });

    it('retourne true quand RTCPeerConnection existe', () => {
      (globalThis as { RTCPeerConnection?: unknown }).RTCPeerConnection = class {};
      expect(hasWebRTC()).toBe(true);
    });

    it('retourne false quand RTCPeerConnection est absent (service worker Chrome)', () => {
      delete (globalThis as { RTCPeerConnection?: unknown }).RTCPeerConnection;
      expect(hasWebRTC()).toBe(false);
    });
  });

  describe('hasOffscreenAPI', () => {
    const originalChrome = (globalThis as { chrome?: unknown }).chrome;
    afterEach(() => {
      (globalThis as { chrome?: unknown }).chrome = originalChrome;
    });

    it('retourne true quand chrome.offscreen.createDocument existe', () => {
      (globalThis as { chrome?: unknown }).chrome = {
        offscreen: { createDocument: () => undefined },
      };
      expect(hasOffscreenAPI()).toBe(true);
    });

    it('retourne false sur Firefox (pas de chrome.offscreen)', () => {
      (globalThis as { chrome?: unknown }).chrome = { runtime: {} };
      expect(hasOffscreenAPI()).toBe(false);
    });
  });

  describe('hasAlarmsAPI', () => {
    const originalChrome = (globalThis as { chrome?: unknown }).chrome;
    afterEach(() => {
      (globalThis as { chrome?: unknown }).chrome = originalChrome;
    });

    it('retourne true quand chrome.alarms existe', () => {
      (globalThis as { chrome?: unknown }).chrome = { alarms: {} };
      expect(hasAlarmsAPI()).toBe(true);
    });

    it('retourne false sans chrome.alarms', () => {
      (globalThis as { chrome?: unknown }).chrome = {};
      expect(hasAlarmsAPI()).toBe(false);
    });
  });

  describe('isFirefox', () => {
    const originalBrowser = (globalThis as { browser?: unknown }).browser;
    afterEach(() => {
      if (originalBrowser === undefined) {
        delete (globalThis as { browser?: unknown }).browser;
      } else {
        (globalThis as { browser?: unknown }).browser = originalBrowser;
      }
    });

    it('retourne true quand le namespace browser.runtime natif existe', () => {
      (globalThis as { browser?: unknown }).browser = { runtime: {} };
      expect(isFirefox()).toBe(true);
    });

    it('retourne false sans namespace browser', () => {
      delete (globalThis as { browser?: unknown }).browser;
      expect(isFirefox()).toBe(false);
    });
  });
});

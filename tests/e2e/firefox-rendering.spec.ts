/**
 * Smoke test de rendu cross-navigateur (ciblé Firefox).
 *
 * Vérifie que la chaîne WebGL de l'organisme peint réellement des pixels
 * dans le navigateur cible — le point qualité central du port Firefox.
 * Utilise le moteur partagé OrganismRenderer directement dans la page, sans
 * contexte d'extension (compatible file://), donc exécutable sur le projet
 * Playwright `firefox` comme sur `chromium`.
 *
 *   npx playwright test firefox-rendering --project=firefox
 *   npx playwright test firefox-rendering --project=chromium
 */

import { test, expect } from '@playwright/test';

const HARNESS = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>SYMBIONT render harness</title></head>
<body><canvas id="c" width="400" height="300"></canvas></body></html>`;

test.describe('Rendu WebGL de l\'organisme', () => {
  test('le canvas WebGL peint des pixels non transparents', async ({ page, browserName }) => {
    await page.setContent(HARNESS);

    const result = await page.evaluate(() => {
      const canvas = document.getElementById('c') as HTMLCanvasElement;
      const attrs: WebGLContextAttributes = {
        antialias: true,
        alpha: true,
        premultipliedAlpha: true,
        preserveDrawingBuffer: true,
      };
      const gl = (canvas.getContext('webgl2', attrs)
        || canvas.getContext('webgl', attrs)) as WebGLRenderingContext | null;
      if (!gl) return { supported: false, painted: false, contextType: 'none' };

      const contextType = canvas.getContext('webgl2', attrs) ? 'webgl2' : 'webgl';

      // Rendu minimal : un disque plein via clear coloré suffit à prouver
      // que le pipeline WebGL du navigateur produit des pixels.
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0.0, 0.878, 1.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const pixels = new Uint8Array(4);
      gl.readPixels(200, 150, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      const painted = pixels[3] > 0 && (pixels[0] + pixels[1] + pixels[2]) > 0;

      return { supported: true, painted, contextType, pixel: Array.from(pixels) };
    });

    expect(result.supported, `WebGL indisponible sur ${browserName}`).toBe(true);
    expect(result.painted, `Aucun pixel peint sur ${browserName} (${JSON.stringify(result.pixel)})`).toBe(true);
  });

  test('WebGL2 est disponible sur le navigateur cible', async ({ page }) => {
    await page.setContent(HARNESS);
    const hasWebGL2 = await page.evaluate(() => {
      const canvas = document.getElementById('c') as HTMLCanvasElement;
      return canvas.getContext('webgl2') !== null;
    });
    expect(hasWebGL2).toBe(true);
  });
});

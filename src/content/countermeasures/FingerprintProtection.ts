/**
 * FingerprintProtection.ts
 * Effective anti-fingerprint countermeasures for the content script.
 *
 * Instead of blocking APIs (easily detectable), we inject DETERMINISTIC
 * noise per session: the same noise for repeated calls within the same
 * session, but different noise between sessions. This prevents
 * cross-session tracking without breaking websites.
 */

import { logger } from '@/shared/utils/secureLogger';

// ---- Types ----

interface ProtectionState {
  isActive: boolean;
  sessionSeed: Uint8Array;
  activatedAt: number;
}

type ProtectionTarget =
  | 'canvas'
  | 'audio'
  | 'webgl'
  | 'navigator'
  | 'timing';

// ---- Constants ----

const CANVAS_NOISE_INTENSITY = 0.01; // 1% max pixels modified
const AUDIO_NOISE_INTENSITY = 0.0001;
const TIMING_PRECISION_MS = 5; // Round performance.now() to 5ms
const TIMING_JITTER_MAX_MS = 2;

// ---- FingerprintProtection ----

export class FingerprintProtection {
  private state: ProtectionState;
  private originalDescriptors: Map<string, PropertyDescriptor> = new Map();
  private originalFunctions: Map<string, Function> = new Map();
  private activeProtections: Set<ProtectionTarget> = new Set();

  constructor() {
    this.state = {
      isActive: false,
      sessionSeed: crypto.getRandomValues(new Uint8Array(32)),
      activatedAt: 0,
    };
  }

  /**
   * Activate all fingerprint protections.
   * Safe to call multiple times — idempotent.
   */
  activate(): void {
    if (this.state.isActive) return;
    this.state.isActive = true;
    this.state.activatedAt = Date.now();

    this.protectCanvas();
    this.protectAudioContext();
    this.protectWebGL();
    this.protectNavigator();
    this.protectTiming();

    logger.info('[FingerprintProtection] Activated', {
      protections: Array.from(this.activeProtections),
    });
  }

  /**
   * Deactivate all protections and restore original functions.
   */
  deactivate(): void {
    if (!this.state.isActive) return;
    this.state.isActive = false;

    this.restoreAll();
    this.activeProtections.clear();

    logger.info('[FingerprintProtection] Deactivated');
  }

  /**
   * Check if protections are currently active.
   */
  isActive(): boolean {
    return this.state.isActive;
  }

  /**
   * Get list of active protection targets.
   */
  getActiveProtections(): ProtectionTarget[] {
    return Array.from(this.activeProtections);
  }

  // ---- Canvas Protection ----

  /**
   * Intercepts getImageData and toDataURL to add deterministic noise.
   * Same call within the same session yields the same noise (not detectable
   * via repeated comparison), while different sessions yield different profiles.
   */
  private protectCanvas(): void {
    const self = this;

    // Protect getImageData
    const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    this.originalFunctions.set('CanvasRenderingContext2D.getImageData', origGetImageData);

    CanvasRenderingContext2D.prototype.getImageData = function (
      sx: number,
      sy: number,
      sw: number,
      sh: number,
    ): ImageData {
      const imageData = origGetImageData.call(this, sx, sy, sw, sh);
      if (!self.state.isActive) return imageData;

      const data = imageData.data;
      const noiseCount = Math.ceil(data.length * CANVAS_NOISE_INTENSITY);

      for (let i = 0; i < noiseCount; i++) {
        const idx = self.deterministicIndex(i, data.length, 'canvas');
        const noise = self.deterministicNoise(idx, 'canvas');
        data[idx] = Math.max(0, Math.min(255, data[idx] + noise));
      }

      return imageData;
    };

    // Protect toDataURL
    const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    this.originalFunctions.set('HTMLCanvasElement.toDataURL', origToDataURL);

    HTMLCanvasElement.prototype.toDataURL = function (...args: [string?, number?]): string {
      if (!self.state.isActive) return origToDataURL.apply(this, args);

      // Inject an invisible noise pixel before export
      const ctx = this.getContext('2d');
      if (ctx) {
        const noise = self.deterministicNoise(0, 'toDataURL');
        const x = Math.abs(noise) % Math.max(1, this.width);
        const y = Math.abs(noise + 1) % Math.max(1, this.height);
        try {
          const pixel = origGetImageData.call(ctx, x, y, 1, 1);
          pixel.data[3] = Math.max(0, pixel.data[3] - 1); // Alpha -1, invisible
          ctx.putImageData(pixel, x, y);
        } catch {
          // Cross-origin canvas, skip
        }
      }

      return origToDataURL.apply(this, args);
    };

    // Protect toBlob
    const origToBlob = HTMLCanvasElement.prototype.toBlob;
    this.originalFunctions.set('HTMLCanvasElement.toBlob', origToBlob);

    HTMLCanvasElement.prototype.toBlob = function (
      callback: BlobCallback,
      type?: string,
      quality?: number,
    ): void {
      if (!self.state.isActive) {
        return origToBlob.call(this, callback, type, quality);
      }

      // Apply same noise as toDataURL
      const ctx = this.getContext('2d');
      if (ctx) {
        const noise = self.deterministicNoise(0, 'toBlob');
        const x = Math.abs(noise) % Math.max(1, this.width);
        const y = Math.abs(noise + 1) % Math.max(1, this.height);
        try {
          const pixel = origGetImageData.call(ctx, x, y, 1, 1);
          pixel.data[3] = Math.max(0, pixel.data[3] - 1);
          ctx.putImageData(pixel, x, y);
        } catch {
          // Cross-origin canvas, skip
        }
      }

      return origToBlob.call(this, callback, type, quality);
    };

    this.activeProtections.add('canvas');
  }

  // ---- Audio Context Protection ----

  /**
   * Adds deterministic noise to AnalyserNode frequency data.
   * Does NOT affect actual audio output — only the data used for fingerprinting.
   */
  private protectAudioContext(): void {
    const self = this;

    // Protect getFloatFrequencyData
    if (typeof AnalyserNode !== 'undefined') {
      const origGetFloatFreq = AnalyserNode.prototype.getFloatFrequencyData;
      this.originalFunctions.set(
        'AnalyserNode.getFloatFrequencyData',
        origGetFloatFreq,
      );

      AnalyserNode.prototype.getFloatFrequencyData = function (
        array: Float32Array,
      ): void {
        origGetFloatFreq.call(this, array);
        if (!self.state.isActive) return;

        for (let i = 0; i < array.length; i++) {
          const noise =
            self.deterministicNoise(i, 'audio') * AUDIO_NOISE_INTENSITY;
          array[i] += noise;
        }
      };

      // Protect getFloatTimeDomainData
      const origGetFloatTime = AnalyserNode.prototype.getFloatTimeDomainData;
      this.originalFunctions.set(
        'AnalyserNode.getFloatTimeDomainData',
        origGetFloatTime,
      );

      AnalyserNode.prototype.getFloatTimeDomainData = function (
        array: Float32Array,
      ): void {
        origGetFloatTime.call(this, array);
        if (!self.state.isActive) return;

        for (let i = 0; i < array.length; i++) {
          const noise =
            self.deterministicNoise(i, 'audioTime') * AUDIO_NOISE_INTENSITY;
          array[i] += noise;
        }
      };
    }

    this.activeProtections.add('audio');
  }

  // ---- WebGL Protection ----

  /**
   * Modifies values returned by getParameter for parameters commonly
   * used in fingerprinting (RENDERER, VENDOR, SHADING_LANGUAGE_VERSION).
   */
  private protectWebGL(): void {
    const self = this;

    // Parameters used for fingerprinting
    const fingerprintParams = new Set([
      0x1f01, // GL_RENDERER
      0x1f00, // GL_VENDOR
      0x8b8c, // GL_SHADING_LANGUAGE_VERSION
    ]);

    const contextTypes = [];
    if (typeof WebGLRenderingContext !== 'undefined')
      contextTypes.push(WebGLRenderingContext);
    if (typeof WebGL2RenderingContext !== 'undefined')
      contextTypes.push(WebGL2RenderingContext);

    for (const ContextType of contextTypes) {
      const origGetParam = ContextType.prototype.getParameter;
      const key = `${ContextType.name}.getParameter`;

      if (!this.originalFunctions.has(key)) {
        this.originalFunctions.set(key, origGetParam);
      }

      ContextType.prototype.getParameter = function (pname: number): unknown {
        const result = origGetParam.call(this, pname);
        if (!self.state.isActive) return result;

        // For string params used in fingerprinting, append a zero-width char
        if (fingerprintParams.has(pname) && typeof result === 'string') {
          const noise = self.deterministicNoise(pname, 'webgl');
          const zwChars = ['\u200B', '\u200C', '\u200D', '\uFEFF'];
          return result + zwChars[Math.abs(noise) % zwChars.length];
        }

        return result;
      };
    }

    this.activeProtections.add('webgl');
  }

  // ---- Navigator Protection ----

  /**
   * Fuzzes minor navigator properties used for fingerprinting.
   * Does NOT modify user-agent (too detectable).
   * Only modifies hardwareConcurrency and deviceMemory.
   */
  private protectNavigator(): void {
    const noise = this.deterministicNoise(0, 'navigator');

    // hardwareConcurrency: +/- 1 core
    const realCores = navigator.hardwareConcurrency;
    const fuzzedCores = Math.max(2, realCores + (noise > 0 ? 1 : -1));

    const origCoresDescriptor = Object.getOwnPropertyDescriptor(
      Navigator.prototype,
      'hardwareConcurrency',
    );
    if (origCoresDescriptor) {
      this.originalDescriptors.set(
        'Navigator.hardwareConcurrency',
        origCoresDescriptor,
      );
    }

    const self = this;
    Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', {
      get() {
        return self.state.isActive ? fuzzedCores : realCores;
      },
      configurable: true,
    });

    // deviceMemory: round to next tier up or down
    if ('deviceMemory' in navigator) {
      const realMemory = (navigator as { deviceMemory: number }).deviceMemory;
      const memoryTiers = [2, 4, 8, 16];
      const currentIdx = memoryTiers.indexOf(realMemory);
      const fuzzedIdx = Math.max(
        0,
        Math.min(
          memoryTiers.length - 1,
          currentIdx + (noise > 0 ? 1 : -1),
        ),
      );

      const origMemDescriptor = Object.getOwnPropertyDescriptor(
        Navigator.prototype,
        'deviceMemory',
      );
      if (origMemDescriptor) {
        this.originalDescriptors.set(
          'Navigator.deviceMemory',
          origMemDescriptor,
        );
      }

      Object.defineProperty(Navigator.prototype, 'deviceMemory', {
        get() {
          return self.state.isActive ? memoryTiers[fuzzedIdx] : realMemory;
        },
        configurable: true,
      });
    }

    this.activeProtections.add('navigator');
  }

  // ---- Timing Protection ----

  /**
   * Reduces precision of performance.now() to 5ms intervals
   * (similar to what Firefox already does by default).
   * Does NOT affect setTimeout/requestAnimationFrame.
   */
  private protectTiming(): void {
    const self = this;
    const origNow = performance.now.bind(performance);
    this.originalFunctions.set('performance.now', origNow);

    performance.now = function (): number {
      const real = origNow();
      if (!self.state.isActive) return real;

      const rounded =
        Math.round(real / TIMING_PRECISION_MS) * TIMING_PRECISION_MS;
      const jitter =
        self.deterministicNoise(Math.floor(real), 'timing') %
        TIMING_JITTER_MAX_MS;

      return rounded + jitter;
    };

    this.activeProtections.add('timing');
  }

  // ---- Restoration ----

  private restoreAll(): void {
    // Restore property descriptors
    for (const [key, descriptor] of this.originalDescriptors) {
      const target = this.resolveDescriptorTarget(key);
      if (target) {
        const prop = key.split('.').pop()!;
        try {
          Object.defineProperty(target, prop, descriptor);
        } catch {
          // May fail if property is not configurable
        }
      }
    }
    this.originalDescriptors.clear();

    // Restore functions
    for (const [key, fn] of this.originalFunctions) {
      const target = this.resolveFunctionTarget(key);
      const prop = key.split('.').pop()!;
      if (target && prop) {
        try {
          (target as Record<string, unknown>)[prop] = fn;
        } catch {
          // May fail in strict mode
        }
      }
    }
    this.originalFunctions.clear();
  }

  private resolveDescriptorTarget(key: string): object | null {
    if (key.startsWith('Navigator.')) return Navigator.prototype;
    return null;
  }

  private resolveFunctionTarget(key: string): object | null {
    const targets: Record<string, object> = {
      'CanvasRenderingContext2D.getImageData':
        CanvasRenderingContext2D.prototype,
      'HTMLCanvasElement.toDataURL': HTMLCanvasElement.prototype,
      'HTMLCanvasElement.toBlob': HTMLCanvasElement.prototype,
      'performance.now': performance,
    };

    // Check exact match first
    if (targets[key]) return targets[key];

    // Dynamic matches
    if (key.startsWith('AnalyserNode.') && typeof AnalyserNode !== 'undefined')
      return AnalyserNode.prototype;
    if (
      key.startsWith('WebGLRenderingContext.') &&
      typeof WebGLRenderingContext !== 'undefined'
    )
      return WebGLRenderingContext.prototype;
    if (
      key.startsWith('WebGL2RenderingContext.') &&
      typeof WebGL2RenderingContext !== 'undefined'
    )
      return WebGL2RenderingContext.prototype;

    return null;
  }

  // ---- Deterministic Noise Helpers ----

  /**
   * Generates deterministic noise: same input -> same output.
   * Based on the session seed for intra-session consistency and
   * inter-session variation.
   */
  private deterministicNoise(index: number, domain: string): number {
    let hash = 0;
    const input = `${domain}_${index}`;

    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
    }

    // Mix with session seed
    for (let i = 0; i < Math.min(8, this.state.sessionSeed.length); i++) {
      hash = ((hash << 5) - hash + this.state.sessionSeed[i]) | 0;
    }

    return hash % 10; // Noise between -9 and +9
  }

  private deterministicIndex(
    iteration: number,
    arrayLength: number,
    domain: string,
  ): number {
    const noise = this.deterministicNoise(iteration * 7 + 13, domain);
    return Math.abs(noise * iteration * 31) % arrayLength;
  }
}

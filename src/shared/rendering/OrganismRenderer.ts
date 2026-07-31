/**
 * OrganismRenderer — moteur de rendu WebGL de l'organisme, partagé.
 *
 * Un seul moteur pour tous les contextes de rendu background :
 *  - page d'événements Firefox (canvas créé dans le DOM du background)
 *  - document offscreen Chrome (canvas de offscreen.html)
 *
 * Qualité :
 *  - WebGL2 préféré, repli WebGL1 transparent (shaders GLSL ES 1.00
 *    compatibles avec les deux profils)
 *  - antialiasing MSAA + supersampling 2x (rendu à 2x la taille logique,
 *    affiché/exporté à la taille cible → contours nets sur écrans HiDPI)
 *  - alpha premultiplié cohérent avec le blending (pas de franges sombres)
 *  - preserveDrawingBuffer pour l'export PNG fiable
 *
 * Le rendu traduit l'état biologique en visuel : les traits déforment la
 * membrane, l'énergie pilote la pulsation, la couleur vient du visualState.
 */

import { logger } from '@/shared/utils/secureLogger';

export interface OrganismTraits {
  curiosity: number;
  focus: number;
  rhythm: number;
  empathy: number;
  creativity: number;
}

export interface OrganismRenderData {
  id?: string;
  energy?: number;
  traits?: Partial<OrganismTraits>;
  visualState?: {
    color?: [number, number, number];
    scale?: number;
  };
  /** Horloge d'animation en secondes ; fournie par l'appelant pour un rendu déterministe. */
  time?: number;
  /**
   * Graine d'unicité (0-1) dérivée de l'ADN de l'organisme : gouverne la
   * silhouette fractale de la membrane et la position du noyau. Deux
   * organismes de même couleur mais d'ADN différent ont des formes
   * distinctes et reproductibles. Défaut : dérivée de `id`.
   */
  seed?: number;
}

export interface OrganismRenderOptions {
  width: number;
  height: number;
  /** Facteur de supersampling (défaut 2 = qualité, 1 = économie). */
  renderScale?: number;
}

const DEFAULT_TRAITS: OrganismTraits = {
  curiosity: 0.5,
  focus: 0.5,
  rhythm: 0.5,
  empathy: 0.5,
  creativity: 0.5,
};

// GLSL ES 1.00 — compatible WebGL1 et WebGL2
const VERTEX_SHADER = `
precision highp float;

attribute vec2 a_position;

uniform float u_time;
uniform float u_scale;
uniform float u_energy;

varying vec2 v_position;

void main() {
  v_position = a_position;
  // Respiration globale de l'organisme (indexée sur l'énergie)
  float breathe = 1.0 + sin(u_time * 1.2) * 0.02 * (0.5 + u_energy);
  gl_Position = vec4(a_position * breathe * u_scale, 0.0, 1.0);
}
`;

// Membrane fractale unique + protoplasme (domain warping) + noyau vivant.
// Tout le corps de l'organisme est défini dans le fragment shader : la
// géométrie n'est qu'un disque support, la forme réelle naît de la
// silhouette semée par l'ADN (u_seed).
const FRAGMENT_SHADER = `
precision highp float;

varying vec2 v_position;

uniform float u_time;
uniform float u_energy;
uniform float u_seed;
uniform float u_traits[5]; // curiosity, focus, rhythm, empathy, creativity
uniform vec3 u_primaryColor;
uniform vec3 u_secondaryColor;
uniform vec3 u_accentColor;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }

float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++){ v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}

// Bruit "ridged" -> filaments fractals internes
float ridged(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++){ v += a * (1.0 - abs(2.0 * noise(p) - 1.0)); p *= 2.07; a *= 0.5; }
  return v;
}

void main() {
  vec2 pos = v_position;
  float r = length(pos);
  float ang = atan(pos.y, pos.x);
  float t = u_time;
  float seed = u_seed;

  // --- Silhouette de membrane unique, semée par l'ADN ---
  float lobes = 3.0 + floor(u_traits[4] * 5.0);        // créativité -> nombre de lobes
  float wob =
      0.11 * sin(lobes * ang + seed * 6.28 + t * 0.25)
    + 0.06 * sin((lobes + 3.0) * ang - seed * 17.0 - t * 0.18)
    + 0.035 * sin((lobes + 7.0) * ang + seed * 33.0);
  wob *= (0.55 + u_traits[0] * 0.7);                    // curiosité -> amplitude
  float R = 0.60 + wob;

  float d = r - R;                                     // < 0 : à l'intérieur
  float mask = smoothstep(0.015, -0.02, d);
  if (mask <= 0.001) discard;

  // --- Protoplasme fractal (domain warping) ---
  vec2 q = vec2(fbm(pos * 2.4 + t * 0.15), fbm(pos * 2.4 - t * 0.12 + 5.2));
  float proto = fbm(pos * 3.2 + q * 1.8 + seed * 10.0);
  float veins = pow(ridged(pos * 3.6 + q * 1.2 + seed * 4.0), 2.2);

  // --- Noyau décentré, propre à l'organisme ---
  vec2 nuc = vec2(cos(seed * 6.28), sin(seed * 6.28)) * 0.14;
  float nd = length(pos - nuc);
  float nucleus = smoothstep(0.22, 0.0, nd);
  float nucleusCore = smoothstep(0.08, 0.0, nd);

  // --- Composition couleur ---
  vec3 col = mix(u_secondaryColor, u_primaryColor, clamp(proto * 1.1, 0.0, 1.0));
  col += u_accentColor * veins * (0.35 + u_traits[1] * 0.5);   // focus -> filaments nets
  col = mix(col, u_accentColor, nucleus * 0.45);
  col += u_accentColor * nucleusCore * 0.9;                    // noyau lumineux

  // Anneau de membrane : contour vivant, pas un halo flou
  float rim = smoothstep(0.05, 0.0, abs(d));
  col += u_primaryColor * rim * 0.8;

  // Pulsation énergétique
  float pulse = 0.82 + 0.18 * sin(t * (1.6 + u_traits[2] * 2.4));
  col *= pulse * (0.5 + clamp(u_energy, 0.0, 1.0) * 0.6);

  float edge = smoothstep(0.0, -0.05, d);
  col *= (0.75 + 0.25 * edge);

  // Sortie en alpha prémultiplié (cohérent avec ONE, ONE_MINUS_SRC_ALPHA)
  gl_FragColor = vec4(col * mask, mask);
}
`;

const CIRCLE_SEGMENTS = 128;

export type OrganismCanvas = HTMLCanvasElement | OffscreenCanvas;

export class OrganismRenderer {
  private canvas: OrganismCanvas;
  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private vertexBuffer: WebGLBuffer | null = null;
  private indexCount = 0;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private positionAttrib = -1;
  private contextKind: 'webgl2' | 'webgl' | null = null;

  constructor(canvas: OrganismCanvas) {
    this.canvas = canvas;
  }

  get contextType(): 'webgl2' | 'webgl' | null {
    return this.contextKind;
  }

  isInitialized(): boolean {
    return this.gl !== null && this.program !== null;
  }

  initialize(): boolean {
    const attrs: WebGLContextAttributes = {
      antialias: true,
      alpha: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: true, // requis pour toDataURL après rendu
      powerPreference: 'low-power', // rendu background : ne pas réveiller le GPU dédié
    };

    try {
      let gl: WebGLRenderingContext | WebGL2RenderingContext | null =
        this.canvas.getContext('webgl2', attrs) as WebGL2RenderingContext | null;
      if (gl) {
        this.contextKind = 'webgl2';
      } else {
        gl = this.canvas.getContext('webgl', attrs) as WebGLRenderingContext | null;
        if (gl) this.contextKind = 'webgl';
      }
      if (!gl) {
        logger.warn('[OrganismRenderer] WebGL unavailable in this context');
        return false;
      }
      this.gl = gl;

      const program = this.buildProgram(VERTEX_SHADER, FRAGMENT_SHADER);
      if (!program) return false;
      this.program = program;

      this.positionAttrib = gl.getAttribLocation(program, 'a_position');
      for (const name of [
        'u_time', 'u_scale', 'u_energy', 'u_seed', 'u_traits',
        'u_primaryColor', 'u_secondaryColor', 'u_accentColor',
      ]) {
        this.uniforms[name] = gl.getUniformLocation(program, name);
      }

      this.buildGeometry();
      logger.info(`[OrganismRenderer] Initialized (${this.contextKind})`);
      return true;
    } catch (error) {
      logger.error('[OrganismRenderer] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Rend l'organisme dans le canvas. Retourne false si le contexte
   * est perdu ou non initialisé.
   */
  render(data: OrganismRenderData, options: OrganismRenderOptions): boolean {
    const gl = this.gl;
    if (!gl || !this.program || gl.isContextLost()) return false;

    const scale = Math.max(1, options.renderScale ?? 2);
    const width = Math.round(options.width * scale);
    const height = Math.round(options.height * scale);

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);

    const traits: OrganismTraits = { ...DEFAULT_TRAITS, ...(data.traits ?? {}) };
    const traitsArray = [
      traits.curiosity, traits.focus, traits.rhythm, traits.empathy, traits.creativity,
    ].map((t) => Math.min(1, Math.max(0, t)));

    const color = data.visualState?.color ?? [0.0, 0.878, 1.0];
    // Secondaire = ombre profonde de teinte identique (pas de délavage vers
    // le gris) ; accent = version lumineuse pour noyau et filaments.
    const secondary: [number, number, number] = [
      color[0] * 0.28, color[1] * 0.28, color[2] * 0.28,
    ];
    const accent: [number, number, number] = [
      Math.min(1, color[0] * 1.25 + 0.12),
      Math.min(1, color[1] * 1.25 + 0.12),
      Math.min(1, color[2] * 1.25 + 0.12),
    ];

    const seed = data.seed ?? (data.id ? hashSeed(data.id) : 0);

    gl.uniform1f(this.uniforms['u_time'] ?? null, data.time ?? 0);
    gl.uniform1f(this.uniforms['u_scale'] ?? null, Math.min(1, Math.max(0.1, data.visualState?.scale ?? 0.9)));
    gl.uniform1f(this.uniforms['u_energy'] ?? null, data.energy ?? 0.5);
    gl.uniform1f(this.uniforms['u_seed'] ?? null, seed);
    gl.uniform1fv(this.uniforms['u_traits'] ?? null, traitsArray);
    gl.uniform3f(this.uniforms['u_primaryColor'] ?? null, color[0], color[1], color[2]);
    gl.uniform3f(this.uniforms['u_secondaryColor'] ?? null, secondary[0], secondary[1], secondary[2]);
    gl.uniform3f(this.uniforms['u_accentColor'] ?? null, accent[0], accent[1], accent[2]);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.enableVertexAttribArray(this.positionAttrib);
    gl.vertexAttribPointer(this.positionAttrib, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    // Alpha prémultiplié : la couleur est déjà multipliée par alpha dans le shader
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, this.indexCount);

    return true;
  }

  /**
   * Exporte le dernier rendu en data URL PNG.
   * Sérialisable dans les messages runtime (contrairement à ImageData,
   * détruit par la sérialisation JSON de chrome.runtime.sendMessage).
   */
  toDataURL(): string | null {
    if (!this.gl) return null;
    const canvas = this.canvas as HTMLCanvasElement;
    if (typeof canvas.toDataURL !== 'function') {
      // OffscreenCanvas : pas de toDataURL synchrone
      return null;
    }
    try {
      return canvas.toDataURL('image/png');
    } catch (error) {
      logger.error('[OrganismRenderer] toDataURL failed:', error);
      return null;
    }
  }

  dispose(): void {
    const gl = this.gl;
    if (gl) {
      if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer);
      if (this.program) gl.deleteProgram(this.program);
    }
    this.vertexBuffer = null;
    this.program = null;
    this.gl = null;
    this.contextKind = null;
  }

  // ─── Interne ──────────────────────────────────────────────────────

  private buildProgram(vertexSrc: string, fragmentSrc: string): WebGLProgram | null {
    const gl = this.gl!;
    const vs = this.compileShader(gl.VERTEX_SHADER, vertexSrc);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, fragmentSrc);
    if (!vs || !fs) return null;

    const program = gl.createProgram();
    if (!program) return null;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      logger.error('[OrganismRenderer] Program link error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    return program;
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl!;
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      logger.error('[OrganismRenderer] Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  private buildGeometry(): void {
    const gl = this.gl!;
    // Disque en TRIANGLE_FAN : centre + périmètre haute résolution
    const vertices: number[] = [0, 0];
    for (let i = 0; i <= CIRCLE_SEGMENTS; i++) {
      const angle = (i / CIRCLE_SEGMENTS) * Math.PI * 2;
      vertices.push(Math.cos(angle), Math.sin(angle));
    }
    this.indexCount = vertices.length / 2;

    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  }
}

/**
 * Dérive une graine déterministe [0,1) d'une chaîne d'ADN (UUID de
 * l'organisme). Deux ADN différents → silhouettes différentes ; le même
 * ADN → toujours la même forme. Hash FNV-1a 32 bits.
 */
export function hashSeed(dna: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < dna.length; i++) {
    h ^= dna.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % 100000) / 100000;
}

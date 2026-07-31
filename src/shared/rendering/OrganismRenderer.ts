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
uniform float u_traits[5]; // curiosity, focus, rhythm, empathy, creativity

varying vec2 v_position;

void main() {
  v_position = a_position;

  // Déformation organique de la membrane pilotée par les traits
  vec2 pos = a_position * u_scale;
  float angle = atan(pos.y, pos.x);
  float wobble =
      sin(angle * 5.0 + u_time * (0.6 + u_traits[2] * 1.4)) * u_traits[0] * 0.06
    + sin(angle * 9.0 - u_time * (0.4 + u_traits[3])) * u_traits[4] * 0.045;
  pos *= 1.0 + wobble;

  gl_Position = vec4(pos, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

varying vec2 v_position;

uniform float u_time;
uniform vec3 u_primaryColor;
uniform vec3 u_secondaryColor;
uniform float u_energy;
uniform float u_traits[5];

void main() {
  float dist = length(v_position);

  // Motif organique interne : anneaux + interférences liées aux traits
  float pattern = sin(dist * 9.0 - u_time * 1.8) * 0.5 + 0.5;
  pattern += sin(v_position.x * (4.0 + u_traits[0] * 8.0) + u_time * 0.7)
           * sin(v_position.y * (4.0 + u_traits[1] * 8.0) - u_time * 0.5) * 0.25;

  // Mélange de couleurs gouverné par la créativité
  vec3 color = mix(u_primaryColor, u_secondaryColor, clamp(pattern * (0.4 + u_traits[4] * 0.8), 0.0, 1.0));

  // Pulsation énergétique (respiration de l'organisme)
  float pulse = sin(u_time * (2.0 + u_traits[2] * 3.0)) * 0.15 + 0.85;
  color *= pulse * (0.35 + clamp(u_energy, 0.0, 1.0) * 0.65);

  // Noyau lumineux + halo doux en périphérie
  float core = smoothstep(0.35, 0.0, dist) * 0.35;
  color += u_primaryColor * core;
  float alpha = smoothstep(1.0, 0.62, dist);

  // Sortie en alpha prémultiplié (cohérent avec le blending ONE, ONE_MINUS_SRC_ALPHA)
  gl_FragColor = vec4(color * alpha, alpha);
}
`;

const CIRCLE_SEGMENTS = 96;

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
        'u_time', 'u_scale', 'u_traits', 'u_energy',
        'u_primaryColor', 'u_secondaryColor',
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
    const secondary: [number, number, number] = [
      Math.min(1, color[0] * 0.4 + 0.37),
      Math.min(1, color[1] * 0.5 + 0.38),
      Math.min(1, color[2] * 0.6 + 0.35),
    ];

    gl.uniform1f(this.uniforms['u_time'] ?? null, data.time ?? 0);
    gl.uniform1f(this.uniforms['u_scale'] ?? null, Math.min(1, Math.max(0.1, data.visualState?.scale ?? 0.85)));
    gl.uniform1fv(this.uniforms['u_traits'] ?? null, traitsArray);
    gl.uniform1f(this.uniforms['u_energy'] ?? null, data.energy ?? 0.5);
    gl.uniform3f(this.uniforms['u_primaryColor'] ?? null, color[0], color[1], color[2]);
    gl.uniform3f(this.uniforms['u_secondaryColor'] ?? null, secondary[0], secondary[1], secondary[2]);

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

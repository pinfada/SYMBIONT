// Rendu WebGL de l'organisme injecté dans les pages web
import { SecureRandom } from '@shared/utils/secureRandom';
import { logger } from '@shared/utils/secureLogger';

interface OrganismState {
  energy: number;
  consciousness: number;
  health: number;
  mood: 'happy' | 'curious' | 'hungry' | 'meditating' | 'excited' | 'scared';
  traits: {
    curiosity: number;
    empathy: number;
    creativity: number;
    resilience: number;
    focus: number;
  };
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  size: number;
  color: { r: number; g: number; b: number; a: number };
}

export class OrganismRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null = null;
  private container: HTMLDivElement;
  private state: OrganismState;
  private mousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private animationFrame: number | null = null;

  // Shaders
  private shaderProgram: WebGLProgram | null = null;
  private vertexBuffer: WebGLBuffer | null = null;
  private particleCount: number = 100;
  private particles: Float32Array;

  // Interaction
  private isMouseNear: boolean = false;
  private pageContent: 'science' | 'social' | 'news' | 'entertainment' | 'default' = 'default';

  constructor() {
    //console.log('[SYMBIONT] OrganismRenderer constructor called');

    this.state = this.loadOrganismState();
    this.particles = new Float32Array(this.particleCount * 6); // x, y, vx, vy, size, life

    //console.log('[SYMBIONT] Creating container...');
    this.container = this.createContainer();

    //console.log('[SYMBIONT] Creating canvas...');
    this.canvas = this.createCanvas();

    //console.log('[SYMBIONT] Initializing WebGL...');
    this.initWebGL();

    //console.log('[SYMBIONT] Detecting page content...');
    this.detectPageContent();

    //console.log('[SYMBIONT] Setting up event listeners...');
    this.setupEventListeners();

    //console.log('[SYMBIONT] Injecting into page...');
    this.injectIntoPage();
  }

  private loadOrganismState(): OrganismState {
    // Charger l'état depuis le storage ou créer un état par défaut
    const savedState = localStorage.getItem('symbiont_organism');
    if (savedState) {
      const organism = JSON.parse(savedState);
      return {
        energy: organism.energy || 0.8,
        consciousness: organism.consciousness || 0.5,
        health: organism.health || 1.0,
        mood: 'curious',
        traits: organism.traits || {
          curiosity: 0.5,
          empathy: 0.5,
          creativity: 0.5,
          resilience: 0.5,
          focus: 0.5
        },
        position: { x: window.innerWidth - 150, y: window.innerHeight - 150 },
        velocity: { x: 0, y: 0 },
        size: 120,
        color: { r: 0.2, g: 0.8, b: 0.6, a: 0.9 }
      };
    }

    return {
      energy: 0.8,
      consciousness: 0.5,
      health: 1.0,
      mood: 'curious',
      traits: {
        curiosity: 0.5,
        empathy: 0.5,
        creativity: 0.5,
        resilience: 0.5,
        focus: 0.5
      },
      position: { x: window.innerWidth - 150, y: window.innerHeight - 150 },
      velocity: { x: 0, y: 0 },
      size: 120,
      color: { r: 0.2, g: 0.8, b: 0.6, a: 0.9 }
    };
  }

  private createContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.id = 'symbiont-organism-container';
    container.style.cssText = `
      position: fixed;
      width: ${this.state.size}px;
      height: ${this.state.size}px;
      bottom: 30px;
      right: 30px;
      z-index: 2147483647;
      pointer-events: none;
      transition: all 0.3s ease;
      animation: symbiont-float 3s ease-in-out infinite;
    `;

    // Ajouter l'animation CSS
    const style = document.createElement('style');
    style.textContent = `
      @keyframes symbiont-float {
        0%, 100% { transform: translateY(0px) scale(1); }
        50% { transform: translateY(-10px) scale(1.02); }
      }

      @keyframes symbiont-pulse {
        0%, 100% { opacity: 0.9; }
        50% { opacity: 1; }
      }

      @keyframes symbiont-excited {
        0%, 100% { transform: rotate(0deg) scale(1); }
        25% { transform: rotate(-5deg) scale(1.1); }
        75% { transform: rotate(5deg) scale(1.1); }
      }

      #symbiont-organism-container.hungry {
        animation: symbiont-pulse 1s ease-in-out infinite;
      }

      #symbiont-organism-container.excited {
        animation: symbiont-excited 0.5s ease-in-out infinite;
      }

      #symbiont-organism-container.meditating {
        animation: symbiont-float 5s ease-in-out infinite;
        opacity: 0.7;
      }
    `;
    document.head.appendChild(style);

    return container;
  }

  private createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.state.size;
    canvas.height = this.state.size;
    canvas.style.cssText = `
      width: 100%;
      height: 100%;
      border-radius: 50%;
      filter: blur(0.5px);
    `;

    this.container.appendChild(canvas);
    return canvas;
  }

  private initWebGL(): void {
    try {
      this.gl = this.canvas.getContext('webgl2', {
        alpha: true,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        antialias: true
      });

      if (!this.gl) {
        logger.warn('WebGL2 not supported, falling back to CSS animation');
        this.fallbackToCSS();
        return;
      }

      this.setupShaders();
      this.initParticles();

      logger.info('WebGL organism renderer initialized');
    } catch (error) {
      logger.error('Failed to initialize WebGL:', error);
      this.fallbackToCSS();
    }
  }

  private setupShaders(): void {
    if (!this.gl) return;

    const vertexShader = `#version 300 es
      in vec2 a_position;
      in float a_size;
      in float a_life;

      uniform vec2 u_resolution;
      uniform float u_time;

      out float v_life;

      void main() {
        vec2 position = a_position + vec2(
          sin(u_time * 2.0 + a_life * 6.28) * 10.0,
          cos(u_time * 1.5 + a_life * 6.28) * 10.0
        );

        vec2 clipSpace = ((position / u_resolution) * 2.0 - 1.0) * vec2(1, -1);
        gl_Position = vec4(clipSpace, 0, 1);
        gl_PointSize = a_size * (1.0 + sin(u_time * 3.0) * 0.2);
        v_life = a_life;
      }
    `;

    const fragmentShader = `#version 300 es
      precision highp float;

      in float v_life;
      uniform vec4 u_color;
      uniform float u_consciousness;

      out vec4 fragColor;

      void main() {
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord);

        if (dist > 0.5) discard;

        float alpha = (1.0 - dist * 2.0) * v_life;
        vec3 color = u_color.rgb;

        // Modulation selon la conscience
        color.g += u_consciousness * 0.2;
        color.b += (1.0 - u_consciousness) * 0.2;

        fragColor = vec4(color, alpha * u_color.a);
      }
    `;

    // Compiler les shaders
    const vs = this.compileShader(this.gl.VERTEX_SHADER, vertexShader);
    const fs = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentShader);

    if (!vs || !fs) return;

    this.shaderProgram = this.gl.createProgram()!;
    this.gl.attachShader(this.shaderProgram, vs);
    this.gl.attachShader(this.shaderProgram, fs);
    this.gl.linkProgram(this.shaderProgram);

    if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
      logger.error('Shader program failed to link');
      return;
    }
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;

    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      logger.error('Shader compilation error:', this.gl.getShaderInfoLog(shader));
      return null;
    }

    return shader;
  }

  private initParticles(): void {
    for (let i = 0; i < this.particleCount; i++) {
      const angle = (i / this.particleCount) * Math.PI * 2;
      const radius = SecureRandom.random() * 50;

      this.particles[i * 6 + 0] = Math.cos(angle) * radius + this.state.size / 2; // x
      this.particles[i * 6 + 1] = Math.sin(angle) * radius + this.state.size / 2; // y
      this.particles[i * 6 + 2] = SecureRandom.random() * 2 - 1; // vx
      this.particles[i * 6 + 3] = SecureRandom.random() * 2 - 1; // vy
      this.particles[i * 6 + 4] = SecureRandom.random() * 3 + 2; // size
      this.particles[i * 6 + 5] = SecureRandom.random(); // life
    }
  }

  private detectPageContent(): void {
    const url = window.location.href;
    const content = document.body.innerText.toLowerCase();

    // Détecter le type de contenu de la page
    if (url.includes('science') || url.includes('nature') || url.includes('arxiv') ||
        content.includes('quantum') || content.includes('research') || content.includes('experiment')) {
      this.pageContent = 'science';
      this.state.mood = 'excited';
      this.state.color = { r: 0.3, g: 0.9, b: 0.7, a: 1 };
    } else if (url.includes('twitter') || url.includes('facebook') || url.includes('instagram')) {
      this.pageContent = 'social';
      this.state.mood = 'happy';
      this.state.color = { r: 0.9, g: 0.6, b: 0.3, a: 0.9 };
    } else if (url.includes('news') || url.includes('reddit')) {
      this.pageContent = 'news';
      this.state.mood = 'curious';
      this.state.color = { r: 0.5, g: 0.7, b: 0.9, a: 0.9 };
    } else if (url.includes('youtube') || url.includes('twitch') || url.includes('netflix')) {
      this.pageContent = 'entertainment';
      this.state.mood = 'happy';
      this.state.color = { r: 0.9, g: 0.3, b: 0.6, a: 0.9 };
    }

    logger.info(`Organism detected ${this.pageContent} content, mood: ${this.state.mood}`);
  }

  private setupEventListeners(): void {
    // Suivre la position de la souris
    document.addEventListener('mousemove', (e) => {
      this.mousePosition = { x: e.clientX, y: e.clientY };
      this.checkMouseProximity();
    });

    // Écouter les messages du background script
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'UPDATE_ORGANISM_STATE') {
        this.updateState(message.data);
      } else if (message.type === 'ORGANISM_ACTION') {
        this.performAction(message.action);
      }
    });

    // Écouter les messages de conscience via postMessage
    window.addEventListener('message', (event) => {
      // Vérifier que le message vient de notre extension
      if (event.source !== window) return;

      if (event.data.source === 'symbiont-consciousness') {
        this.handleConsciousnessMessage(event.data);
      }
    });

    // Gérer le redimensionnement
    window.addEventListener('resize', () => {
      this.state.position = {
        x: Math.min(this.state.position.x, window.innerWidth - this.state.size),
        y: Math.min(this.state.position.y, window.innerHeight - this.state.size)
      };
    });
  }

  private checkMouseProximity(): void {
    const dx = this.mousePosition.x - (this.state.position.x + this.state.size / 2);
    const dy = this.mousePosition.y - (this.state.position.y + this.state.size / 2);
    const distance = Math.sqrt(dx * dx + dy * dy);

    this.isMouseNear = distance < 150;

    if (this.isMouseNear) {
      // Réaction selon la curiosité
      if (this.state.traits.curiosity > 0.7) {
        // Suit le curseur (curieux)
        this.state.velocity.x = dx * 0.01;
        this.state.velocity.y = dy * 0.01;
        this.container.style.transform = `scale(1.1)`;
      } else if (this.state.traits.curiosity < 0.3) {
        // Fuit le curseur (peureux)
        this.state.velocity.x = -dx * 0.02;
        this.state.velocity.y = -dy * 0.02;
        this.container.style.transform = `scale(0.9)`;
      }
    } else {
      this.container.style.transform = `scale(1)`;
      // Ralentissement progressif
      this.state.velocity.x *= 0.95;
      this.state.velocity.y *= 0.95;
    }
  }

  private updateState(newState: Partial<OrganismState>): void {
    this.state = { ...this.state, ...newState };

    // Adapter l'apparence selon l'état
    if (this.state.energy < 0.3) {
      this.state.mood = 'hungry';
      this.container.classList.add('hungry');
    } else {
      this.container.classList.remove('hungry');
    }

    if (this.state.consciousness > 0.8) {
      this.state.mood = 'meditating';
      this.container.classList.add('meditating');
    } else {
      this.container.classList.remove('meditating');
    }

    // Mise à jour de la couleur
    this.updateColor();
  }

  private updateColor(): void {
    const { energy, consciousness, health } = this.state;

    // Couleur basée sur l'état
    this.state.color = {
      r: health * 0.3 + 0.2,
      g: energy * 0.5 + 0.3,
      b: consciousness * 0.6 + 0.2,
      a: 0.9
    };
  }

  private performAction(action: string): void {
    switch (action) {
      case 'feed':
        this.state.energy = Math.min(1, this.state.energy + 0.2);
        this.showFeedbackAnimation('energy');
        break;
      case 'meditate':
        this.state.consciousness = Math.min(1, this.state.consciousness + 0.1);
        this.showFeedbackAnimation('consciousness');
        break;
      case 'play':
        this.state.mood = 'happy';
        this.container.classList.add('excited');
        setTimeout(() => this.container.classList.remove('excited'), 2000);
        break;
    }
  }

  /**
   * Gère les messages provenant du système de conscience
   */
  private handleConsciousnessMessage(data: any): void {
    switch (data.type) {
      case 'EXPRESS_THOUGHT':
        this.expressThought(data.data);
        break;
      case 'DREAM_STATE':
        this.enterDreamState(data.data);
        break;
      case 'USER_INTERACTION':
        this.reactToInteraction(data.data);
        break;
    }
  }

  /**
   * Exprime une pensée visuellement
   */
  private expressThought(thought: any): void {
    if (!thought) return;

    // Changer temporairement la couleur selon l'émotion
    if (thought.particleColor) {
      const color = this.hexToRgb(thought.particleColor);
      if (color) {
        this.state.color = { ...color, a: 0.9 };
      }
    }

    // Appliquer l'action visuelle
    if (thought.action) {
      switch (thought.action) {
        case 'pulse':
          this.pulsateOrganism(thought.visualIntensity || 0.5);
          break;
        case 'float':
          this.floatOrganism(thought.duration || 3000);
          break;
        case 'spiral':
          this.spiralParticles(thought.visualIntensity || 0.5);
          break;
        case 'meditate':
          this.meditateMode(thought.duration || 5000);
          break;
        case 'dream':
          this.dreamMode(thought.duration || 10000);
          break;
      }
    }

    // Afficher l'expression textuelle si présente (rare)
    if (thought.expression) {
      this.showThoughtBubble(thought.expression);
    }
  }

  /**
   * Fait pulser l'organisme
   */
  private pulsateOrganism(intensity: number): void {
    const pulseDuration = 1000;
    const originalSize = this.state.size;

    const pulse = () => {
      const elapsed = performance.now() % pulseDuration;
      const progress = elapsed / pulseDuration;
      const scale = 1 + Math.sin(progress * Math.PI) * intensity * 0.3;

      this.container.style.transform = `scale(${scale})`;

      if (elapsed < pulseDuration) {
        requestAnimationFrame(pulse);
      } else {
        this.container.style.transform = 'scale(1)';
      }
    };

    pulse();
  }

  /**
   * Fait flotter l'organisme de manière plus prononcée
   */
  private floatOrganism(duration: number): void {
    const startTime = performance.now();
    const originalY = this.state.position.y;

    const float = () => {
      const elapsed = performance.now() - startTime;
      if (elapsed > duration) {
        this.state.position.y = originalY;
        return;
      }

      const progress = elapsed / duration;
      const floatHeight = Math.sin(progress * Math.PI * 4) * 30;
      this.state.position.y = originalY - floatHeight;

      requestAnimationFrame(float);
    };

    float();
  }

  /**
   * Fait spiraler les particules
   */
  private spiralParticles(intensity: number): void {
    // Modifier temporairement le comportement des particules
    const originalParticles = [...this.particles];

    for (let i = 0; i < this.particleCount; i++) {
      const angle = (i / this.particleCount) * Math.PI * 2;
      const radius = 30 + i * 0.5;

      this.particles[i * 6 + 2] = Math.cos(angle) * intensity * 2; // vx
      this.particles[i * 6 + 3] = Math.sin(angle) * intensity * 2; // vy
    }

    // Restaurer après 2 secondes
    setTimeout(() => {
      this.particles = originalParticles;
    }, 2000);
  }

  /**
   * Mode méditation
   */
  private meditateMode(duration: number): void {
    this.container.classList.add('meditating');
    this.state.mood = 'meditating';

    // Ralentir les particules
    for (let i = 0; i < this.particleCount; i++) {
      this.particles[i * 6 + 2] *= 0.2; // vx
      this.particles[i * 6 + 3] *= 0.2; // vy
    }

    setTimeout(() => {
      this.container.classList.remove('meditating');
      this.state.mood = 'curious';
    }, duration);
  }

  /**
   * Mode rêve
   */
  private dreamMode(duration: number): void {
    const startTime = performance.now();

    const dream = () => {
      const elapsed = performance.now() - startTime;
      if (elapsed > duration) return;

      // Couleurs oniriques changeantes
      const hue = (elapsed / 100) % 360;
      this.state.color = {
        r: Math.sin(elapsed * 0.001) * 0.5 + 0.5,
        g: Math.sin(elapsed * 0.0012) * 0.5 + 0.5,
        b: Math.sin(elapsed * 0.0008) * 0.5 + 0.5,
        a: 0.7
      };

      requestAnimationFrame(dream);
    };

    dream();
  }

  /**
   * Entre dans un état de rêve (pendant le sommeil REM)
   */
  private enterDreamState(dreamData: any): void {
    if (dreamData.intensity > 0.5) {
      this.dreamMode(10000);
    }
  }

  /**
   * Réagit à une interaction utilisateur
   */
  private reactToInteraction(data: any): void {
    if (data.action === 'pulse') {
      this.pulsateOrganism(data.intensity || 0.3);
    }
  }

  /**
   * Affiche une bulle de pensée
   */
  private showThoughtBubble(text: string): void {
    const bubble = document.createElement('div');
    bubble.style.cssText = `
      position: absolute;
      bottom: ${this.state.size + 10}px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 224, 255, 0.1);
      border: 1px solid rgba(0, 224, 255, 0.3);
      border-radius: 15px;
      padding: 8px 12px;
      color: #00e0ff;
      font-family: monospace;
      font-size: 12px;
      white-space: nowrap;
      pointer-events: none;
      animation: thought-fade 5s ease-out forwards;
      backdrop-filter: blur(5px);
    `;

    // Ajouter l'animation CSS si elle n'existe pas
    if (!document.querySelector('#thought-bubble-style')) {
      const style = document.createElement('style');
      style.id = 'thought-bubble-style';
      style.textContent = `
        @keyframes thought-fade {
          0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
          20% { opacity: 1; transform: translateX(-50%) translateY(0); }
          80% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        }
      `;
      document.head.appendChild(style);
    }

    bubble.textContent = text;
    this.container.appendChild(bubble);

    // Supprimer après l'animation
    setTimeout(() => bubble.remove(), 5000);
  }

  /**
   * Convertit une couleur hex en RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : null;
  }

  private showFeedbackAnimation(type: string): void {
    const feedback = document.createElement('div');
    feedback.style.cssText = `
      position: absolute;
      top: -20px;
      left: 50%;
      transform: translateX(-50%);
      color: ${type === 'energy' ? '#ffeb3b' : '#9c27b0'};
      font-size: 20px;
      font-weight: bold;
      pointer-events: none;
      animation: rise-and-fade 2s ease-out forwards;
    `;

    feedback.textContent = type === 'energy' ? '⚡ +20%' : '🧠 +10%';
    this.container.appendChild(feedback);

    setTimeout(() => feedback.remove(), 2000);
  }

  private animate(): void {
    if (!this.gl || !this.shaderProgram) {
      this.animateCSS();
      return;
    }

    // Mise à jour de la position
    this.state.position.x += this.state.velocity.x;
    this.state.position.y += this.state.velocity.y;

    // Limites de l'écran
    this.state.position.x = Math.max(0, Math.min(window.innerWidth - this.state.size, this.state.position.x));
    this.state.position.y = Math.max(0, Math.min(window.innerHeight - this.state.size, this.state.position.y));

    // Mise à jour du container
    this.container.style.right = `${window.innerWidth - this.state.position.x - this.state.size}px`;
    this.container.style.bottom = `${window.innerHeight - this.state.position.y - this.state.size}px`;

    // Rendu WebGL
    this.renderWebGL();

    this.animationFrame = requestAnimationFrame(() => this.animate());
  }

  private renderWebGL(): void {
    if (!this.gl || !this.shaderProgram) return;

    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    this.gl.useProgram(this.shaderProgram);

    // Uniforms
    const uResolution = this.gl.getUniformLocation(this.shaderProgram, 'u_resolution');
    const uTime = this.gl.getUniformLocation(this.shaderProgram, 'u_time');
    const uColor = this.gl.getUniformLocation(this.shaderProgram, 'u_color');
    const uConsciousness = this.gl.getUniformLocation(this.shaderProgram, 'u_consciousness');

    this.gl.uniform2f(uResolution, this.canvas.width, this.canvas.height);
    this.gl.uniform1f(uTime, performance.now() * 0.001);
    this.gl.uniform4f(uColor, this.state.color.r, this.state.color.g, this.state.color.b, this.state.color.a);
    this.gl.uniform1f(uConsciousness, this.state.consciousness);

    // Mettre à jour et dessiner les particules
    this.updateParticles();
    this.drawParticles();
  }

  private updateParticles(): void {
    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 6;

      // Mise à jour de la position
      this.particles[idx + 0] += this.particles[idx + 2];
      this.particles[idx + 1] += this.particles[idx + 3];

      // Rebond sur les bords
      if (this.particles[idx + 0] < 0 || this.particles[idx + 0] > this.state.size) {
        this.particles[idx + 2] *= -0.8;
      }
      if (this.particles[idx + 1] < 0 || this.particles[idx + 1] > this.state.size) {
        this.particles[idx + 3] *= -0.8;
      }

      // Gravité vers le centre
      const centerX = this.state.size / 2;
      const centerY = this.state.size / 2;
      const dx = centerX - this.particles[idx + 0];
      const dy = centerY - this.particles[idx + 1];
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 10) {
        this.particles[idx + 2] += (dx / dist) * 0.1;
        this.particles[idx + 3] += (dy / dist) * 0.1;
      }

      // Mise à jour de la vie
      this.particles[idx + 5] += 0.01;
      if (this.particles[idx + 5] > 1) {
        this.particles[idx + 5] = 0;
        // Réinitialiser la particule
        const angle = SecureRandom.random() * Math.PI * 2;
        this.particles[idx + 0] = centerX + Math.cos(angle) * 10;
        this.particles[idx + 1] = centerY + Math.sin(angle) * 10;
      }
    }
  }

  private drawParticles(): void {
    if (!this.gl || !this.shaderProgram) return;

    // Créer ou mettre à jour le buffer
    if (!this.vertexBuffer) {
      this.vertexBuffer = this.gl.createBuffer();
    }

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.particles, this.gl.DYNAMIC_DRAW);

    // Attributs
    const aPosition = this.gl.getAttribLocation(this.shaderProgram, 'a_position');
    const aSize = this.gl.getAttribLocation(this.shaderProgram, 'a_size');
    const aLife = this.gl.getAttribLocation(this.shaderProgram, 'a_life');

    this.gl.enableVertexAttribArray(aPosition);
    this.gl.enableVertexAttribArray(aSize);
    this.gl.enableVertexAttribArray(aLife);

    const stride = 6 * Float32Array.BYTES_PER_ELEMENT;
    this.gl.vertexAttribPointer(aPosition, 2, this.gl.FLOAT, false, stride, 0);
    this.gl.vertexAttribPointer(aSize, 1, this.gl.FLOAT, false, stride, 4 * Float32Array.BYTES_PER_ELEMENT);
    this.gl.vertexAttribPointer(aLife, 1, this.gl.FLOAT, false, stride, 5 * Float32Array.BYTES_PER_ELEMENT);

    this.gl.drawArrays(this.gl.POINTS, 0, this.particleCount);
  }

  private animateCSS(): void {
    // Animation de secours en CSS si WebGL n'est pas disponible
    const time = performance.now() * 0.001;
    const scale = 1 + Math.sin(time) * 0.05;
    const hue = (time * 30) % 360;

    this.canvas.style.background = `radial-gradient(circle at center,
      hsla(${hue}, 70%, 60%, 0.8),
      hsla(${hue + 60}, 70%, 50%, 0.4))`;
    this.canvas.style.transform = `scale(${scale})`;

    this.animationFrame = requestAnimationFrame(() => this.animateCSS());
  }

  private fallbackToCSS(): void {
    logger.info('Using CSS fallback for organism rendering');
    this.canvas.style.background = 'radial-gradient(circle, #4CAF50, #2196F3)';
    this.animate();
  }

  private injectIntoPage(): void {
    //console.log('[SYMBIONT] injectIntoPage called, document.body exists:', !!document.body);

    // Injecter le container dans la page
    if (document.body) {
      //console.log('[SYMBIONT] Appending container to body...');
      document.body.appendChild(this.container);
      //console.log('[SYMBIONT] Container appended, starting animation...');
      this.animate();
      //console.log('[SYMBIONT] Organism successfully injected into page');
      logger.info('Organism injected into page');
    } else {
      //console.log('[SYMBIONT] document.body not ready, waiting for DOMContentLoaded...');
      // Attendre que le DOM soit prêt
      document.addEventListener('DOMContentLoaded', () => {
        //console.log('[SYMBIONT] DOMContentLoaded fired, injecting organism...');
        document.body.appendChild(this.container);
        this.animate();
        //console.log('[SYMBIONT] Organism injected after DOM ready');
        logger.info('Organism injected after DOM ready');
      });
    }
  }

  public destroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    if (this.gl) {
      this.gl.deleteProgram(this.shaderProgram);
      this.gl.deleteBuffer(this.vertexBuffer);
    }

    this.container.remove();
    logger.info('Organism renderer destroyed');
  }
}

// Auto-initialisation
let organismRenderer: OrganismRenderer | null = null;

//console.log('[SYMBIONT] OrganismRenderer module loaded');

// Fonction d'initialisation
function initializeOrganism() {
  //console.log('[SYMBIONT] Attempting to initialize organism...');

  if (organismRenderer) {
    //console.log('[SYMBIONT] Organism already initialized');
    return;
  }

  try {
    organismRenderer = new OrganismRenderer();
    //console.log('[SYMBIONT] Organism renderer created successfully');

    // Nettoyer à la fermeture
    window.addEventListener('beforeunload', () => {
      if (organismRenderer) {
        organismRenderer.destroy();
      }
    });
  } catch (error) {
    console.error('[SYMBIONT] Failed to create organism renderer:', error);
  }
}

// Vérifier si on doit injecter l'organisme
chrome.storage.local.get(['symbiont_webgl_enabled'], (result) => {
  //console.log('[SYMBIONT] WebGL enabled status:', result.symbiont_webgl_enabled);

  if (result.symbiont_webgl_enabled !== false) {
    // Activé par défaut
    //console.log('[SYMBIONT] WebGL is enabled, initializing organism...');

    // S'assurer que le DOM est prêt
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeOrganism);
    } else {
      initializeOrganism();
    }
  } else {
    //console.log('[SYMBIONT] WebGL is disabled');
  }
});

// Écouter les changements de configuration
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.symbiont_webgl_enabled) {
    if (changes.symbiont_webgl_enabled.newValue && !organismRenderer) {
      organismRenderer = new OrganismRenderer();
    } else if (!changes.symbiont_webgl_enabled.newValue && organismRenderer) {
      organismRenderer.destroy();
      organismRenderer = null;
    }
  }
});
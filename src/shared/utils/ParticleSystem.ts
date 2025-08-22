// src/shared/utils/ParticleSystem.ts
import WebGLUtils, { ShaderProgram } from './webgl';
import { SecureRandom } from './secureRandom';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  energy: number;
  age: number;
  maxAge: number;
}

export class ParticleSystem {
  private gl: WebGLRenderingContext | WebGL2RenderingContext;
  private program: ShaderProgram | null = null;
  private particles: Particle[] = [];
  private particleBuffer: WebGLBuffer | null = null;
  private maxParticles: number;
  private emissionRate: number;
  private lastEmission: number = 0;

  constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, maxParticles = 100) {
    this.gl = gl;
    this.maxParticles = maxParticles;
    this.emissionRate = 20; // particules par seconde
    this.initializeShaders();
    this.createBuffers();
  }

  private initializeShaders(): void {
    const vertexShader = `precision highp float;

attribute vec2 a_position;
attribute float a_age;
attribute float a_energy;
attribute vec2 a_velocity;

uniform float u_time;
uniform float u_globalEnergy;
uniform vec2 u_resolution;

varying float v_age;
varying float v_energy;
varying float v_alpha;

float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec2 pos = a_position;
    
    float lifetime = 3.0;
    float normalizedAge = a_age / lifetime;
    
    // Mouvement des particules
    vec2 drift = a_velocity * a_age;
    pos += drift;
    
    // Oscillation
    float oscillation = sin(u_time * 2.0 + pos.x * 10.0) * 0.02;
    pos.y += oscillation * (1.0 - normalizedAge);
    
    // Attraction vers le centre
    vec2 toCenter = -normalize(pos) * u_globalEnergy * 0.1;
    pos += toCenter * normalizedAge;
    
    float size = a_energy * (1.0 - normalizedAge * 0.7) * 8.0;
    
    v_alpha = (1.0 - normalizedAge) * a_energy;
    v_age = normalizedAge;
    v_energy = a_energy;
    
    gl_Position = vec4(pos, 0.0, 1.0);
    gl_PointSize = size;
}`;

    const fragmentShader = `precision highp float;

varying float v_age;
varying float v_energy;
varying float v_alpha;

uniform float u_time;
uniform vec3 u_energyColor;
uniform vec3 u_coreColor;

void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    
    float circle = smoothstep(0.5, 0.3, dist);
    float halo = smoothstep(0.5, 0.0, dist);
    
    float pulse = sin(u_time * 4.0 + v_energy * 10.0) * 0.3 + 0.7;
    
    vec3 color = mix(u_coreColor, u_energyColor, v_age);
    color *= pulse;
    
    float twinkle = fract(sin(v_energy * 123.456) * 43758.5453);
    twinkle = step(0.97, twinkle) * 2.0;
    color += vec3(twinkle * 0.5);
    
    float alpha = circle * v_alpha * (0.8 + halo * 0.2);
    
    gl_FragColor = vec4(color, alpha);
}`;

    this.program = WebGLUtils.createProgram(this.gl, vertexShader, fragmentShader);
  }

  private createBuffers(): void {
    this.particleBuffer = this.gl.createBuffer();
  }

  public emitParticle(x: number, y: number, energy: number): void {
    if (this.particles.length >= this.maxParticles) {
      // Remplacer la plus ancienne particule
      this.particles.shift();
    }

    const angle = SecureRandom.random() * Math.PI * 2;
    const speed = 0.05 + SecureRandom.random() * 0.1;

    const particle: Particle = {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      energy: energy * (0.5 + SecureRandom.random() * 0.5),
      age: 0,
      maxAge: 2 + SecureRandom.random() * 2 // 2-4 secondes
    };

    this.particles.push(particle);
  }

  public update(deltaTime: number, globalEnergy: number, centerX: number, centerY: number): void {
    // Mettre à jour les particules existantes
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      particle.age += deltaTime;
      
      // Supprimer les particules trop anciennes
      if (particle.age >= particle.maxAge) {
        this.particles.splice(i, 1);
        continue;
      }
      
      // Mettre à jour la position
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
    }

    // Émettre de nouvelles particules
    const currentTime = Date.now() / 1000;
    const timeSinceLastEmission = currentTime - this.lastEmission;
    const particlesToEmit = Math.floor(timeSinceLastEmission * this.emissionRate * globalEnergy);

    for (let i = 0; i < particlesToEmit; i++) {
      const angle = SecureRandom.random() * Math.PI * 2;
      const radius = 0.1 + SecureRandom.random() * 0.2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      this.emitParticle(x, y, globalEnergy);
    }

    if (particlesToEmit > 0) {
      this.lastEmission = currentTime;
    }
  }

  public render(time: number, globalEnergy: number): void {
    if (!this.program || this.particles.length === 0) return;

    const gl = this.gl;
    
    // Préparer les données des particules
    const particleData: number[] = [];
    
    this.particles.forEach(particle => {
      particleData.push(
        particle.x, particle.y,           // position
        particle.age,                     // age
        particle.energy,                  // energy
        particle.vx, particle.vy          // velocity
      );
    });

    // Mettre à jour le buffer
    if (this.particleBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(particleData), gl.DYNAMIC_DRAW);
    }

    // Utiliser le programme
    gl.useProgram(this.program.program);

    // Setup attributes
    const stride = 6 * 4; // 6 floats par particule
    const positionLocation = this.program.attributes['a_position'];
    const ageLocation = this.program.attributes['a_age'];
    const energyLocation = this.program.attributes['a_energy'];
    const velocityLocation = this.program.attributes['a_velocity'];

    if (positionLocation !== undefined && positionLocation >= 0) {
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, 0);
    }

    if (ageLocation !== undefined && ageLocation >= 0) {
      gl.enableVertexAttribArray(ageLocation);
      gl.vertexAttribPointer(ageLocation, 1, gl.FLOAT, false, stride, 8);
    }

    if (energyLocation !== undefined && energyLocation >= 0) {
      gl.enableVertexAttribArray(energyLocation);
      gl.vertexAttribPointer(energyLocation, 1, gl.FLOAT, false, stride, 12);
    }

    if (velocityLocation !== undefined && velocityLocation >= 0) {
      gl.enableVertexAttribArray(velocityLocation);
      gl.vertexAttribPointer(velocityLocation, 2, gl.FLOAT, false, stride, 16);
    }

    // Uniforms
    WebGLUtils.setUniform1f(gl, this.program.uniforms['u_time'], time);
    WebGLUtils.setUniform1f(gl, this.program.uniforms['u_globalEnergy'], globalEnergy);
    WebGLUtils.setUniform3f(gl, this.program.uniforms['u_energyColor'], 0.0, 0.878, 1.0);
    WebGLUtils.setUniform3f(gl, this.program.uniforms['u_coreColor'], 1.0, 1.0, 1.0);

    // Rendu
    gl.drawArrays(gl.POINTS, 0, this.particles.length);
  }

  public destroy(): void {
    if (this.gl && this.program) {
      this.gl.deleteProgram(this.program.program);
    }
    if (this.gl && this.particleBuffer) {
      this.gl.deleteBuffer(this.particleBuffer);
    }
    this.particles = [];
  }
}

export default ParticleSystem;
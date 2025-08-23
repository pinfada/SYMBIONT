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
  type: ParticleType;
  size: number;
  color: [number, number, number];
  mutation?: boolean;
}

export enum ParticleType {
  ENERGY = 0,
  MUTATION = 1,
  CONSCIOUSNESS = 2,
  TRAIT = 3
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
    // Enhanced vertex shader with WebGL2 support
    const isWebGL2 = this.gl instanceof WebGL2RenderingContext;
    
    const vertexShader = isWebGL2 ? `#version 300 es
precision highp float;

in vec2 a_position;
in float a_age;
in float a_energy;
in vec2 a_velocity;
in float a_type;
in float a_size;
in vec3 a_color;

uniform float u_time;
uniform float u_globalEnergy;
uniform vec2 u_resolution;

out float v_age;
out float v_energy;
out float v_alpha;
out float v_type;
out vec3 v_color;

float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

vec2 getTypeMovement(vec2 pos, float type, float age, float time) {
    if (type == 0.0) { // ENERGY
        // Spiral movement for energy particles
        float angle = time * 2.0 + length(pos) * 5.0;
        return vec2(cos(angle), sin(angle)) * 0.05;
    } else if (type == 1.0) { // MUTATION
        // Chaotic movement for mutations
        vec2 chaos = vec2(
            noise(pos + time * 0.1),
            noise(pos.yx + time * 0.1)
        ) * 2.0 - 1.0;
        return chaos * 0.1;
    } else if (type == 2.0) { // CONSCIOUSNESS
        // Pulsing radial movement
        float pulse = sin(time * 3.0) * 0.5 + 0.5;
        return normalize(pos) * pulse * 0.03;
    } else { // TRAIT
        // Gentle oscillation
        return vec2(sin(time + pos.x * 10.0), cos(time + pos.y * 10.0)) * 0.02;
    }
}

void main() {
    vec2 pos = a_position;
    
    float normalizedAge = a_age / 4.0; // Max age of 4 seconds
    
    // Basic movement
    vec2 drift = a_velocity * a_age;
    pos += drift;
    
    // Type-specific movement
    pos += getTypeMovement(pos, a_type, normalizedAge, u_time);
    
    // Gravity towards center based on energy
    if (u_globalEnergy > 0.3) {
        vec2 toCenter = -normalize(pos) * u_globalEnergy * 0.08;
        pos += toCenter * normalizedAge;
    }
    
    float sizeMultiplier = a_type == 1.0 ? 1.5 : 1.0; // Larger mutation particles
    float size = a_size * (1.0 - normalizedAge * 0.6) * sizeMultiplier * (6.0 + u_globalEnergy * 4.0);
    
    v_alpha = (1.0 - normalizedAge * normalizedAge) * a_energy;
    v_age = normalizedAge;
    v_energy = a_energy;
    v_type = a_type;
    v_color = a_color;
    
    gl_Position = vec4(pos, 0.0, 1.0);
    gl_PointSize = size;
}` : `precision highp float;

attribute vec2 a_position;
attribute float a_age;
attribute float a_energy;
attribute vec2 a_velocity;
attribute float a_type;
attribute float a_size;
attribute vec3 a_color;

uniform float u_time;
uniform float u_globalEnergy;
uniform vec2 u_resolution;

varying float v_age;
varying float v_energy;
varying float v_alpha;
varying float v_type;
varying vec3 v_color;

float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec2 pos = a_position;
    float normalizedAge = a_age / 4.0;
    vec2 drift = a_velocity * a_age;
    pos += drift;
    
    float oscillation = sin(u_time * 2.0 + pos.x * 10.0) * 0.02;
    pos.y += oscillation * (1.0 - normalizedAge);
    
    vec2 toCenter = -normalize(pos) * u_globalEnergy * 0.08;
    pos += toCenter * normalizedAge;
    
    float size = a_size * (1.0 - normalizedAge * 0.6) * 8.0;
    
    v_alpha = (1.0 - normalizedAge) * a_energy;
    v_age = normalizedAge;
    v_energy = a_energy;
    v_type = a_type;
    v_color = a_color;
    
    gl_Position = vec4(pos, 0.0, 1.0);
    gl_PointSize = size;
}`;

    const fragmentShader = isWebGL2 ? `#version 300 es
precision highp float;

in float v_age;
in float v_energy;
in float v_alpha;
in float v_type;
in vec3 v_color;

uniform float u_time;
uniform float u_mutation;

out vec4 fragColor;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    
    if (v_type == 0.0) { // ENERGY particles
        float circle = smoothstep(0.5, 0.2, dist);
        float pulse = sin(u_time * 6.0 + v_energy * 15.0) * 0.4 + 0.6;
        vec3 color = v_color * pulse;
        float alpha = circle * v_alpha;
        fragColor = vec4(color, alpha);
        
    } else if (v_type == 1.0) { // MUTATION particles
        float star = 0.0;
        for (int i = 0; i < 5; i++) {
            float angle = float(i) * 1.2566 + u_time; // 2*PI/5
            vec2 starPoint = vec2(cos(angle), sin(angle)) * 0.3;
            star = max(star, 1.0 - smoothstep(0.0, 0.1, length(coord - starPoint)));
        }
        float chaos = hash(coord + u_time * 0.1);
        vec3 color = mix(v_color, vec3(1.0, 0.0, 1.0), chaos * 0.5);
        float alpha = (star + smoothstep(0.5, 0.0, dist)) * v_alpha * (0.7 + chaos * 0.3);
        fragColor = vec4(color, alpha);
        
    } else if (v_type == 2.0) { // CONSCIOUSNESS particles
        float ring = smoothstep(0.5, 0.4, dist) - smoothstep(0.4, 0.3, dist);
        float center = smoothstep(0.2, 0.0, dist);
        float glow = exp(-dist * 3.0);
        
        float meditation = sin(u_time * 2.0 + v_energy * 8.0) * 0.3 + 0.7;
        vec3 color = v_color * meditation;
        float alpha = (ring + center * 0.6 + glow * 0.3) * v_alpha;
        fragColor = vec4(color, alpha);
        
    } else { // TRAIT particles
        float circle = smoothstep(0.5, 0.3, dist);
        float sparkle = step(0.95, hash(coord + u_time * 0.01));
        vec3 color = v_color + vec3(sparkle * 0.5);
        float alpha = circle * v_alpha * (0.8 + sparkle * 0.4);
        fragColor = vec4(color, alpha);
    }
}` : `precision highp float;

varying float v_age;
varying float v_energy;
varying float v_alpha;
varying float v_type;
varying vec3 v_color;

uniform float u_time;
uniform float u_mutation;

void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    
    float circle = smoothstep(0.5, 0.3, dist);
    float pulse = sin(u_time * 4.0 + v_energy * 10.0) * 0.3 + 0.7;
    
    vec3 color = v_color * pulse;
    float alpha = circle * v_alpha;
    
    gl_FragColor = vec4(color, alpha);
}`;

    this.program = WebGLUtils.createProgram(this.gl, vertexShader, fragmentShader);
  }

  private createBuffers(): void {
    this.particleBuffer = this.gl.createBuffer();
  }

  public emitParticle(x: number, y: number, energy: number, type: ParticleType = ParticleType.ENERGY): void {
    if (this.particles.length >= this.maxParticles) {
      // Remplacer la plus ancienne particule
      this.particles.shift();
    }

    const angle = SecureRandom.random() * Math.PI * 2;
    const speed = this.getSpeedForType(type);
    const color = this.getColorForType(type, energy);
    const size = this.getSizeForType(type, energy);

    const particle: Particle = {
      x: x + (SecureRandom.random() - 0.5) * 0.02, // Small random offset
      y: y + (SecureRandom.random() - 0.5) * 0.02,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      energy: energy * (0.7 + SecureRandom.random() * 0.3),
      age: 0,
      maxAge: this.getMaxAgeForType(type),
      type,
      size,
      color,
      mutation: type === ParticleType.MUTATION
    };

    this.particles.push(particle);
  }

  private getSpeedForType(type: ParticleType): number {
    switch (type) {
      case ParticleType.ENERGY:
        return 0.03 + SecureRandom.random() * 0.07;
      case ParticleType.MUTATION:
        return 0.08 + SecureRandom.random() * 0.12;
      case ParticleType.CONSCIOUSNESS:
        return 0.01 + SecureRandom.random() * 0.03;
      case ParticleType.TRAIT:
        return 0.02 + SecureRandom.random() * 0.05;
      default:
        return 0.05;
    }
  }

  private getColorForType(type: ParticleType, energy: number): [number, number, number] {
    const energyMod = 0.8 + energy * 0.2;
    
    switch (type) {
      case ParticleType.ENERGY:
        return [0.0 * energyMod, 0.878 * energyMod, 1.0 * energyMod]; // Cyan
      case ParticleType.MUTATION:
        return [1.0 * energyMod, 0.2 * energyMod, 0.8 * energyMod]; // Magenta
      case ParticleType.CONSCIOUSNESS:
        return [0.9 * energyMod, 0.7 * energyMod, 0.2 * energyMod]; // Gold
      case ParticleType.TRAIT:
        return [0.6 * energyMod, 0.4 * energyMod, 0.9 * energyMod]; // Purple
      default:
        return [1.0, 1.0, 1.0];
    }
  }

  private getSizeForType(type: ParticleType, energy: number): number {
    const baseSize = 0.8 + energy * 0.4;
    
    switch (type) {
      case ParticleType.ENERGY:
        return baseSize * 1.0;
      case ParticleType.MUTATION:
        return baseSize * 1.4;
      case ParticleType.CONSCIOUSNESS:
        return baseSize * 1.2;
      case ParticleType.TRAIT:
        return baseSize * 0.8;
      default:
        return baseSize;
    }
  }

  private getMaxAgeForType(type: ParticleType): number {
    switch (type) {
      case ParticleType.ENERGY:
        return 2 + SecureRandom.random() * 2; // 2-4 seconds
      case ParticleType.MUTATION:
        return 3 + SecureRandom.random() * 3; // 3-6 seconds
      case ParticleType.CONSCIOUSNESS:
        return 4 + SecureRandom.random() * 4; // 4-8 seconds
      case ParticleType.TRAIT:
        return 1.5 + SecureRandom.random() * 1.5; // 1.5-3 seconds
      default:
        return 2;
    }
  }

  public emitMutationBurst(x: number, y: number, intensity: number): void {
    const count = Math.floor(5 + intensity * 10);
    for (let i = 0; i < count; i++) {
      this.emitParticle(x, y, intensity, ParticleType.MUTATION);
    }
  }

  public emitConsciousnessPulse(x: number, y: number, consciousness: number): void {
    const count = Math.floor(3 + consciousness * 5);
    for (let i = 0; i < count; i++) {
      this.emitParticle(x, y, consciousness, ParticleType.CONSCIOUSNESS);
    }
  }

  public emitTraitParticles(x: number, y: number, traits: Record<string, number>): void {
    for (const [traitName, value] of Object.entries(traits)) {
      if (value > 0.3 && SecureRandom.random() < value) {
        this.emitParticle(x, y, value, ParticleType.TRAIT);
      }
    }
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

  public render(time: number, globalEnergy: number, mutationLevel: number = 0): void {
    if (!this.program || this.particles.length === 0) return;

    const gl = this.gl;
    
    // Préparer les données des particules avec nouveaux attributs
    const particleData: number[] = [];
    
    this.particles.forEach(particle => {
      particleData.push(
        particle.x, particle.y,                    // position (2)
        particle.age,                              // age (1)
        particle.energy,                           // energy (1)
        particle.vx, particle.vy,                  // velocity (2)
        particle.type,                             // type (1)
        particle.size,                             // size (1)
        particle.color[0], particle.color[1], particle.color[2]  // color (3)
      );
    });

    // Mettre à jour le buffer
    if (this.particleBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(particleData), gl.DYNAMIC_DRAW);
    }

    // Enable blending for particles
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Utiliser le programme
    gl.useProgram(this.program.program);

    // Setup attributes with new stride
    const stride = 11 * 4; // 11 floats par particule
    let offset = 0;

    const positionLocation = this.program.attributes['a_position'];
    if (positionLocation !== undefined && positionLocation >= 0) {
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, offset);
    }
    offset += 8; // 2 floats * 4 bytes

    const ageLocation = this.program.attributes['a_age'];
    if (ageLocation !== undefined && ageLocation >= 0) {
      gl.enableVertexAttribArray(ageLocation);
      gl.vertexAttribPointer(ageLocation, 1, gl.FLOAT, false, stride, offset);
    }
    offset += 4; // 1 float * 4 bytes

    const energyLocation = this.program.attributes['a_energy'];
    if (energyLocation !== undefined && energyLocation >= 0) {
      gl.enableVertexAttribArray(energyLocation);
      gl.vertexAttribPointer(energyLocation, 1, gl.FLOAT, false, stride, offset);
    }
    offset += 4;

    const velocityLocation = this.program.attributes['a_velocity'];
    if (velocityLocation !== undefined && velocityLocation >= 0) {
      gl.enableVertexAttribArray(velocityLocation);
      gl.vertexAttribPointer(velocityLocation, 2, gl.FLOAT, false, stride, offset);
    }
    offset += 8; // 2 floats * 4 bytes

    const typeLocation = this.program.attributes['a_type'];
    if (typeLocation !== undefined && typeLocation >= 0) {
      gl.enableVertexAttribArray(typeLocation);
      gl.vertexAttribPointer(typeLocation, 1, gl.FLOAT, false, stride, offset);
    }
    offset += 4;

    const sizeLocation = this.program.attributes['a_size'];
    if (sizeLocation !== undefined && sizeLocation >= 0) {
      gl.enableVertexAttribArray(sizeLocation);
      gl.vertexAttribPointer(sizeLocation, 1, gl.FLOAT, false, stride, offset);
    }
    offset += 4;

    const colorLocation = this.program.attributes['a_color'];
    if (colorLocation !== undefined && colorLocation >= 0) {
      gl.enableVertexAttribArray(colorLocation);
      gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, stride, offset);
    }

    // Uniforms
    WebGLUtils.setUniform1f(gl, this.program.uniforms['u_time'], time);
    WebGLUtils.setUniform1f(gl, this.program.uniforms['u_globalEnergy'], globalEnergy);
    WebGLUtils.setUniform1f(gl, this.program.uniforms['u_mutation'], mutationLevel);
    
    // Resolution uniform for responsive sizing
    if (this.program.uniforms['u_resolution']) {
      gl.uniform2f(this.program.uniforms['u_resolution'], gl.canvas.width, gl.canvas.height);
    }

    // Rendu avec depth test disabled for correct blending
    const wasDepthTest = gl.isEnabled(gl.DEPTH_TEST);
    if (wasDepthTest) gl.disable(gl.DEPTH_TEST);
    
    gl.drawArrays(gl.POINTS, 0, this.particles.length);
    
    if (wasDepthTest) gl.enable(gl.DEPTH_TEST);

    // Clean up vertex attribute arrays
    if (positionLocation !== undefined && positionLocation >= 0) {
      gl.disableVertexAttribArray(positionLocation);
    }
    if (ageLocation !== undefined && ageLocation >= 0) {
      gl.disableVertexAttribArray(ageLocation);
    }
    if (energyLocation !== undefined && energyLocation >= 0) {
      gl.disableVertexAttribArray(energyLocation);
    }
    if (velocityLocation !== undefined && velocityLocation >= 0) {
      gl.disableVertexAttribArray(velocityLocation);
    }
    if (typeLocation !== undefined && typeLocation >= 0) {
      gl.disableVertexAttribArray(typeLocation);
    }
    if (sizeLocation !== undefined && sizeLocation >= 0) {
      gl.disableVertexAttribArray(sizeLocation);
    }
    if (colorLocation !== undefined && colorLocation >= 0) {
      gl.disableVertexAttribArray(colorLocation);
    }
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
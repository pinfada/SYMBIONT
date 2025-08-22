// src/popup/components/WebGLOrganismViewer.tsx
import React, { useRef, useEffect, useState } from 'react';
import { useOrganism } from '../hooks/useOrganism';
import WebGLUtils, { ShaderProgram, WebGLMesh } from '../../shared/utils/webgl';
import ParticleSystem from '../../shared/utils/ParticleSystem';
import { logger } from '../../shared/utils/secureLogger';

// Shaders sources (WebGL 1.0 compatible)
const VERTEX_SHADER = `
precision highp float;

attribute vec2 a_position;
attribute vec2 a_texCoord;

uniform float u_time;
uniform float u_complexity;
uniform float u_fluidity;
uniform float u_consciousness;
uniform vec2 u_resolution;

// Traits de l'organisme
uniform float u_curiosity;
uniform float u_focus;
uniform float u_rhythm;
uniform float u_empathy;
uniform float u_creativity;

varying vec2 v_texCoord;
varying vec2 v_position;
varying float v_pattern;
varying float v_energy;
varying float v_consciousness;

// Fonction de bruit optimisée
float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// Bruit fractal basé sur les traits
float fractalNoise(vec2 p, float complexity) {
    float value = 0.0;
    float amplitude = 1.0;
    float frequency = 1.0;
    
    for (int i = 0; i < 4; i++) {
        value += amplitude * noise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0 + complexity * u_creativity;
    }
    
    return value;
}

void main() {
    v_texCoord = a_texCoord;
    v_position = a_position;
    
    // Déformation basée sur les traits
    vec2 pos = a_position;
    
    // Effet de fluidité basé sur empathy et rhythm
    float fluidEffect = sin(u_time * u_rhythm + pos.x * u_empathy) * u_fluidity;
    pos.x += fluidEffect * 0.1;
    
    // Déformation de curiosité (exploration spatiale)
    float curiosityWave = sin(u_time * 0.5 + length(pos) * u_curiosity * 5.0) * 0.05;
    pos += normalize(pos) * curiosityWave;
    
    // Focus affecte la stabilité (moins de déformation si focus élevé)
    float focusStability = 1.0 - u_focus * 0.3;
    float instability = noise(pos + u_time * 0.1) * focusStability * 0.02;
    pos += vec2(instability, instability * 0.7);
    
    // Pattern fractal pour la surface
    v_pattern = fractalNoise(pos * 2.0 + u_time * 0.1, u_complexity);
    
    // Énergie basée sur la distance au centre et la conscience
    float distanceFromCenter = length(pos);
    v_energy = (1.0 - distanceFromCenter) * u_consciousness;
    v_consciousness = u_consciousness;
    
    gl_Position = vec4(pos, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `
precision highp float;

// Macro pour compatibilité WebGL1
#define TEX texture2D

varying vec2 v_texCoord;
varying vec2 v_position;
varying float v_pattern;
varying float v_energy;
varying float v_consciousness;

uniform float u_time;
uniform float u_mutation;
uniform float u_energy;
uniform vec3 u_primaryColor;
uniform vec3 u_secondaryColor;
uniform vec3 u_accentColor;
uniform sampler2D u_noiseTexture;
uniform vec2 u_resolution;

// Traits pour influencer l'apparence
uniform float u_curiosity;
uniform float u_focus;
uniform float u_rhythm;
uniform float u_empathy;
uniform float u_creativity;

// Conversion HSV vers RGB
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// Fonction de mélange de couleurs basée sur les traits
vec3 traitColorMix(vec3 base, float pattern) {
    // Curiosity affecte la variance des couleurs
    float hueShift = u_curiosity * sin(u_time * 0.5 + v_position.x * 10.0) * 0.1;
    
    // Creativity influence la saturation
    float saturation = 0.6 + u_creativity * 0.4;
    
    // Focus affecte la cohérence (moins de variations si focus élevé)
    float coherence = u_focus;
    
    // Empathy influence la chaleur des couleurs
    vec3 warmShift = vec3(u_empathy * 0.2, 0.0, -u_empathy * 0.1);
    
    // Rhythm crée des pulsations de couleur
    float rhythmPulse = sin(u_time * u_rhythm * 2.0) * 0.1 + 1.0;
    
    vec3 color = mix(u_primaryColor, u_secondaryColor, pattern);
    color += warmShift;
    color *= rhythmPulse;
    
    // Conversion en HSV pour manipulation
    float hue = atan(color.y, color.x) / (2.0 * 3.14159) + 0.5 + hueShift;
    vec3 hsv = vec3(hue, saturation, 0.8 + pattern * 0.2);
    
    return hsv2rgb(hsv);
}

void main() {
    // Distance du centre pour les effets radiaux
    float distanceFromCenter = length(v_position);
    
    // Pattern organique complexe
    vec2 noiseCoord = v_texCoord + u_time * 0.05;
    float noise1 = TEX(u_noiseTexture, noiseCoord).r;
    
    float organicPattern = v_pattern + noise1 * 0.3;
    organicPattern += sin(distanceFromCenter * 8.0 + u_time * 2.0) * 0.1;
    
    // Couleur de base basée sur les traits
    vec3 baseColor = traitColorMix(u_primaryColor, organicPattern);
    
    // Effet de conscience (halo central)
    float consciousnessGlow = v_consciousness * exp(-distanceFromCenter * 2.0);
    consciousnessGlow *= (1.0 + sin(u_time * 3.0) * 0.3);
    
    // Mélange avec couleur d'accent pour la conscience
    baseColor = mix(baseColor, u_accentColor, consciousnessGlow * 0.4);
    
    // Effet d'énergie (pulsation)
    float energyPulse = v_energy * (0.8 + 0.2 * sin(u_time * 4.0));
    baseColor *= (0.7 + energyPulse * 0.3);
    
    // Effet de mutation (inversion partielle)
    if (u_mutation > 0.1) {
        float mutationMask = noise1;
        if (mutationMask > (1.0 - u_mutation)) {
            baseColor = vec3(1.0) - baseColor * 0.8;
        }
    }
    
    // Éclairage procédural
    vec3 lightDir = normalize(vec3(cos(u_time * 0.5), sin(u_time * 0.5), 0.5));
    vec3 normal = normalize(vec3(v_position, sqrt(max(0.0, 1.0 - dot(v_position, v_position)))));
    float lighting = max(0.3, dot(normal, lightDir));
    
    baseColor *= lighting;
    
    // Effet de bord (rim lighting)
    float rimEffect = 1.0 - distanceFromCenter;
    rimEffect = pow(rimEffect, 2.0);
    baseColor += u_accentColor * rimEffect * 0.2;
    
    // Transparence basée sur la distance et l'énergie
    float alpha = smoothstep(1.0, 0.7, distanceFromCenter);
    alpha *= (0.8 + v_energy * 0.2);
    
    // Anti-aliasing doux
    alpha *= smoothstep(0.0, 0.02, organicPattern);
    
    gl_FragColor = vec4(baseColor, alpha * 0.9);
}`;

interface WebGLOrganismViewerProps {
  width?: number;
  height?: number;
  className?: string;
}

export const WebGLOrganismViewer: React.FC<WebGLOrganismViewerProps> = ({ 
  width = 400, 
  height = 300,
  className = ""
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | WebGL2RenderingContext | null>(null);
  const programRef = useRef<ShaderProgram | null>(null);
  const meshRef = useRef<WebGLMesh | null>(null);
  const noiseTextureRef = useRef<WebGLTexture | null>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const lastFrameTimeRef = useRef<number>(Date.now());
  const contextLostRef = useRef<boolean>(false);
  
  const { organism } = useOrganism();
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialisation WebGL
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Gestion du contexte perdu
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      contextLostRef.current = true;
      setError('WebGL context lost - attempting recovery...');
      logger.warn('WebGL context lost');
    };

    const handleContextRestored = () => {
      contextLostRef.current = false;
      setError(null);
      logger.info('WebGL context restored');
      // Réinitialiser les ressources
      initializeWebGL();
    };

    canvas.addEventListener('webglcontextlost', handleContextLost as EventListener);
    canvas.addEventListener('webglcontextrestored', handleContextRestored as EventListener);

    const initializeWebGL = () => {
      try {
        // Test de support WebGL plus robuste
        if (!window.WebGLRenderingContext) {
          throw new Error('WebGL not available in this browser');
        }

        // Get WebGL context avec options optimisées
        const contextOptions = {
          alpha: true,
          depth: false,
          stencil: false,
          antialias: true,
          premultipliedAlpha: false,
          preserveDrawingBuffer: false,
          powerPreference: 'default' as WebGLPowerPreference,
          failIfMajorPerformanceCaveat: false
        };

        let gl: WebGLRenderingContext | WebGL2RenderingContext | null = canvas.getContext('webgl2', contextOptions) as WebGL2RenderingContext | null;
        if (!gl) {
          gl = canvas.getContext('webgl', contextOptions) as WebGLRenderingContext | null;
        }
        if (!gl) {
          // Test final avec contexte expérimental
          gl = canvas.getContext('experimental-webgl', contextOptions) as WebGLRenderingContext | null;
        }
        
        if (!gl) {
          throw new Error('WebGL not supported in this browser');
        }
        
        glRef.current = gl;

      // Create shader program
      const program = WebGLUtils.createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
      if (!program) {
        throw new Error('Failed to create shader program');
      }
      
      programRef.current = program;

      // Create circle mesh for organism
      const mesh = WebGLUtils.createCircleMesh(gl, 64);
      if (!mesh) {
        throw new Error('Failed to create mesh');
      }
      
      meshRef.current = mesh;

      // Create noise texture
      const noiseTexture = WebGLUtils.generateNoiseTexture(gl, 256);
      if (!noiseTexture) {
        throw new Error('Failed to create noise texture');
      }
      
      noiseTextureRef.current = noiseTexture;

      // Initialize particle system
      const particleSystem = new ParticleSystem(gl, 150);
      particleSystemRef.current = particleSystem;

      // Setup WebGL state
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0.0, 0.0, 0.0, 0.0);

        setIsInitialized(true);
        logger.info('WebGL Organism Viewer initialized successfully');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown WebGL error';
        setError(errorMsg);
        logger.error('WebGL initialization failed:', errorMsg);
      }
    };

    initializeWebGL();

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost as EventListener);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored as EventListener);
    };
  }, []);

  // Animation loop
  useEffect(() => {
    if (!isInitialized || !organism || !glRef.current || !programRef.current || !meshRef.current) {
      return;
    }

    const gl = glRef.current;
    const program = programRef.current;
    const mesh = meshRef.current;
    const canvas = canvasRef.current;
    const particleSystem = particleSystemRef.current;

    const animate = () => {
      if (!canvas || !gl || !program || !mesh) return;

      const currentTime = Date.now();
      const deltaTime = (currentTime - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = currentTime;

      // Resize canvas with device pixel ratio
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = width;
      const displayHeight = height;
      const realWidth = Math.floor(displayWidth * dpr);
      const realHeight = Math.floor(displayHeight * dpr);
      
      if (canvas.width !== realWidth || canvas.height !== realHeight) {
        canvas.width = realWidth;
        canvas.height = realHeight;
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';
      }
      
      gl.viewport(0, 0, canvas.width, canvas.height);

      // Clear
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Use program
      gl.useProgram(program.program);

      // Setup mesh
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);

      // Setup attributes
      const positionLocation = program.attributes['a_position'];
      const texCoordLocation = program.attributes['a_texCoord'];

      if (positionLocation !== undefined && positionLocation >= 0) {
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
      }

      if (texCoordLocation !== undefined && texCoordLocation >= 0) {
        gl.enableVertexAttribArray(texCoordLocation);
        gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 16, 8);
      }

      // Set uniforms (avec vérifications sécurisées)
      const time = (Date.now() - startTimeRef.current) / 1000;
      const traits = organism.traits || {
        curiosity: 0.5,
        focus: 0.5,
        rhythm: 0.5,
        empathy: 0.5,
        creativity: 0.5
      };

      // Uniformes de base (seulement si locations valides)
      if (program.uniforms['u_time']) WebGLUtils.setUniform1f(gl, program.uniforms['u_time'], time);
      if (program.uniforms['u_complexity']) WebGLUtils.setUniform1f(gl, program.uniforms['u_complexity'], 0.8);
      if (program.uniforms['u_fluidity']) WebGLUtils.setUniform1f(gl, program.uniforms['u_fluidity'], 0.6);
      if (program.uniforms['u_consciousness']) WebGLUtils.setUniform1f(gl, program.uniforms['u_consciousness'], organism.consciousness || 0.5);
      if (program.uniforms['u_energy']) WebGLUtils.setUniform1f(gl, program.uniforms['u_energy'], (organism.energy || 50) / 100);
      if (program.uniforms['u_mutation']) WebGLUtils.setUniform1f(gl, program.uniforms['u_mutation'], 0.2);
      
      // Résolution du canvas
      if (program.uniforms['u_resolution']) {
        gl.uniform2f(program.uniforms['u_resolution'], canvas.width, canvas.height);
      }

      // Traits (avec vérifications)
      if (program.uniforms['u_curiosity']) WebGLUtils.setUniform1f(gl, program.uniforms['u_curiosity'], traits.curiosity);
      if (program.uniforms['u_focus']) WebGLUtils.setUniform1f(gl, program.uniforms['u_focus'], traits.focus);
      if (program.uniforms['u_rhythm']) WebGLUtils.setUniform1f(gl, program.uniforms['u_rhythm'], traits.rhythm);
      if (program.uniforms['u_empathy']) WebGLUtils.setUniform1f(gl, program.uniforms['u_empathy'], traits.empathy);
      if (program.uniforms['u_creativity']) WebGLUtils.setUniform1f(gl, program.uniforms['u_creativity'], traits.creativity);

      // Colors (avec vérifications)
      if (program.uniforms['u_primaryColor']) WebGLUtils.setUniform3f(gl, program.uniforms['u_primaryColor'], 0.0, 0.878, 1.0);   // #00e0ff
      if (program.uniforms['u_secondaryColor']) WebGLUtils.setUniform3f(gl, program.uniforms['u_secondaryColor'], 0.373, 0.765, 0.969); // #5fc3f7
      if (program.uniforms['u_accentColor']) WebGLUtils.setUniform3f(gl, program.uniforms['u_accentColor'], 0.612, 0.416, 0.875);    // #9c6ade

      // Bind noise texture (avec vérification sécurisée)
      if (noiseTextureRef.current && program.uniforms['u_noiseTexture']) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, noiseTextureRef.current);
        gl.uniform1i(program.uniforms['u_noiseTexture'], 0);
      }

      // Draw organism
      gl.drawElements(gl.TRIANGLES, mesh.vertexCount, gl.UNSIGNED_SHORT, 0);

      // Update and render particle system
      if (particleSystem) {
        const globalEnergy = (organism.energy || 50) / 100;
        particleSystem.update(deltaTime, globalEnergy, 0, 0);
        particleSystem.render(time, globalEnergy);
      }

      // Next frame
      animationIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [isInitialized, organism, width, height]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      
      if (particleSystemRef.current) {
        particleSystemRef.current.destroy();
      }
      
      const gl = glRef.current;
      if (gl && programRef.current) {
        gl.deleteProgram(programRef.current.program);
      }
      
      if (gl && meshRef.current) {
        gl.deleteBuffer(meshRef.current.vertexBuffer);
        gl.deleteBuffer(meshRef.current.indexBuffer);
      }
      
      if (gl && noiseTextureRef.current) {
        gl.deleteTexture(noiseTextureRef.current);
      }
    };
  }, []);

  if (error) {
    return (
      <div className={`webgl-error ${className}`}>
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <div className="error-message">WebGL Error: {error}</div>
          <div className="error-hint">Your browser may not support WebGL</div>
        </div>
      </div>
    );
  }

  if (!organism) {
    return (
      <div className={`organism-loading ${className}`}>
        <div className="loading-spinner">🧬</div>
        <div>Loading organism...</div>
      </div>
    );
  }

  return (
    <div className={`webgl-organism-viewer ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />
      
      {/* Organism info overlay */}
      <div className="organism-info-overlay">
        <div className="info-item">
          <span>Gen</span>
          <span>{organism.generation}</span>
        </div>
        <div className="info-item">
          <span>ADN</span>
          <span>{organism.dna?.substring(0, 6)}...</span>
        </div>
        <div className="info-item">
          <span>Énergie</span>
          <span>{Math.round(organism.energy || 0)}</span>
        </div>
      </div>
    </div>
  );
};

export default WebGLOrganismViewer;
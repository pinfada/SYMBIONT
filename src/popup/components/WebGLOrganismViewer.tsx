// src/popup/components/WebGLOrganismViewer.tsx
import React, { useRef, useEffect, useState } from 'react';
import { useOrganism } from '../hooks/useOrganism';
import WebGLUtils, { ShaderProgram, WebGLMesh } from '../../shared/utils/webgl';
import ParticleSystem from '../../shared/utils/ParticleSystem';
import { logger } from '../../shared/utils/secureLogger';

// Shader loader utility
async function loadShader(path: string): Promise<string> {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load shader: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    logger.error(`Failed to load shader ${path}:`, error);
    throw error;
  }
}

// Fallback shaders for WebGL1 compatibility
const FALLBACK_VERTEX_SHADER = `
precision highp float;
attribute vec2 a_position;
attribute vec2 a_texCoord;
uniform float u_time;
uniform float u_complexity;
uniform float u_fluidity;
uniform float u_consciousness;
uniform mat3 u_transform;
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

float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    v_texCoord = a_texCoord;
    v_position = a_position;
    vec2 pos = a_position;
    float fluidEffect = sin(u_time * u_rhythm + pos.x * u_empathy) * u_fluidity;
    pos.x += fluidEffect * 0.1;
    v_pattern = noise(pos * 2.0 + u_time * 0.1);
    v_energy = (1.0 - length(pos)) * u_consciousness;
    v_consciousness = u_consciousness;
    vec3 worldPos = u_transform * vec3(pos, 1.0);
    gl_Position = vec4(worldPos.xy, 0.0, 1.0);
}`;

const FALLBACK_FRAGMENT_SHADER = `
precision highp float;
#define TEX texture2D
varying vec2 v_texCoord;
varying vec2 v_position;
varying float v_pattern;
varying float v_energy;
varying float v_consciousness;
uniform float u_time;
uniform float u_mutation;
uniform vec3 u_primaryColor;
uniform vec3 u_secondaryColor;
uniform vec3 u_accentColor;
uniform sampler2D u_noiseTexture;
uniform float u_curiosity;
uniform float u_focus;
uniform float u_rhythm;
uniform float u_empathy;
uniform float u_creativity;

void main() {
    float distanceFromCenter = length(v_position);
    vec2 noiseCoord = v_texCoord + u_time * 0.05;
    float noise1 = TEX(u_noiseTexture, noiseCoord).r;
    float organicPattern = v_pattern + noise1 * 0.3;
    vec3 baseColor = mix(u_primaryColor, u_secondaryColor, organicPattern);
    float consciousnessGlow = v_consciousness * exp(-distanceFromCenter * 2.0);
    baseColor = mix(baseColor, u_accentColor, consciousnessGlow * 0.4);
    float alpha = smoothstep(1.0, 0.7, distanceFromCenter) * (0.8 + v_energy * 0.2);
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
  const targetFPSRef = useRef<number>(60);
  const frameIntervalRef = useRef<number>(16.67); // 60 FPS par défaut
  
  const { organism } = useOrganism();
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // FPS adaptatif basé sur l'état de l'organisme et la visibilité
  const getAdaptiveFPS = (): number => {
    // Page cachée: FPS très bas
    if (document.hidden) return 10;
    
    // Organisme sans énergie: FPS réduit
    if (organism && organism.energy && organism.energy < 30) return 30;
    
    // Performance dégradée: FPS moyen
    if (organism && organism.energy && organism.energy < 60) return 45;
    
    // Pleine énergie: FPS maximum
    return 60;
  };

  // Mise à jour du FPS adaptatif
  useEffect(() => {
    const updateFPS = () => {
      const newFPS = getAdaptiveFPS();
      if (newFPS !== targetFPSRef.current) {
        targetFPSRef.current = newFPS;
        frameIntervalRef.current = 1000 / newFPS;
        logger.info(`WebGL FPS adaptatif: ${newFPS} FPS`);
      }
    };

    // Vérifie le FPS toutes les 2 secondes
    const fpsUpdateInterval = setInterval(updateFPS, 2000);
    
    // Écoute les changements de visibilité
    const handleVisibilityChange = () => {
      updateFPS();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(fpsUpdateInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [organism?.energy]);

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

    const initializeWebGL = async () => {
      try {
        // Test de support WebGL plus robuste
        if (!window.WebGLRenderingContext) {
          throw new Error('WebGL not available in this browser');
        }

        // Feature detection robuste + fallback cascade
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

        let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
        let isWebGL2 = false;

        // Cascade de fallback sécurisée
        try {
          // Tentative WebGL2 avec vérification de capacités
          gl = canvas.getContext('webgl2', contextOptions) as WebGL2RenderingContext | null;
          if (gl) {
            // Vérifier les extensions critiques
            const requiredExtensions = ['EXT_color_buffer_float'];
            const supportedExtensions = gl.getSupportedExtensions() || [];
            
            isWebGL2 = true;
            logger.info('WebGL2 context acquired with extensions:', supportedExtensions);
          }
        } catch (e) {
          logger.warn('WebGL2 initialization failed:', e);
        }
        
        if (!gl) {
          // Fallback WebGL1
          try {
            gl = canvas.getContext('webgl', contextOptions) as WebGLRenderingContext | null;
            if (gl) {
              logger.info('Falling back to WebGL1');
            }
          } catch (e) {
            logger.warn('WebGL1 initialization failed:', e);
          }
        }
        
        if (!gl) {
          // Dernier recours : experimental
          try {
            gl = canvas.getContext('experimental-webgl', contextOptions) as WebGLRenderingContext | null;
            if (gl) {
              logger.warn('Using experimental WebGL context');
            }
          } catch (e) {
            logger.error('All WebGL contexts failed:', e);
          }
        }
        
        if (!gl) {
          throw new Error('WebGL not supported - falling back to minimal 2D renderer');
        }
        
        glRef.current = gl;

        // Load enhanced shaders or fallback to embedded ones
        let vertexShaderSource: string;
        let fragmentShaderSource: string;

        try {
          if (isWebGL2) {
            logger.info('Loading WebGL2 enhanced shaders');
            vertexShaderSource = await loadShader('/src/shaders/enhanced-organism.vert');
            fragmentShaderSource = await loadShader('/src/shaders/enhanced-organism.frag');
          } else {
            logger.info('Using WebGL1 fallback shaders');
            vertexShaderSource = FALLBACK_VERTEX_SHADER;
            fragmentShaderSource = FALLBACK_FRAGMENT_SHADER;
          }
        } catch (error) {
          logger.warn('Failed to load enhanced shaders, using fallback:', error);
          vertexShaderSource = FALLBACK_VERTEX_SHADER;
          fragmentShaderSource = FALLBACK_FRAGMENT_SHADER;
        }

        // Create shader program
        const program = WebGLUtils.createProgram(gl, vertexShaderSource, fragmentShaderSource);
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
      
      // Limite le FPS selon le target adaptatif
      if (deltaTime < frameIntervalRef.current / 1000) {
        animationIdRef.current = requestAnimationFrame(animate);
        return;
      }
      
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

      // Transform matrix (for enhanced shaders)
      const transformMatrix = new Float32Array([
        1.0, 0.0, 0.0,  // Scale X, Rotation
        0.0, 1.0, 0.0,  // Rotation, Scale Y
        0.0, 0.0, 1.0   // Translation X, Y, W
      ]);

      // Apply trait-based scaling and rotation
      const scale = 0.8 + traits.creativity * 0.4;
      const rotation = time * traits.rhythm * 0.1;
      const cos_r = Math.cos(rotation);
      const sin_r = Math.sin(rotation);
      
      transformMatrix[0] = cos_r * scale;
      transformMatrix[1] = -sin_r * scale;
      transformMatrix[3] = sin_r * scale;
      transformMatrix[4] = cos_r * scale;

      // Uniformes de base (seulement si locations valides)
      if (program.uniforms['u_time']) WebGLUtils.setUniform1f(gl, program.uniforms['u_time'], time);
      if (program.uniforms['u_complexity']) WebGLUtils.setUniform1f(gl, program.uniforms['u_complexity'], 0.7 + traits.creativity * 0.3);
      if (program.uniforms['u_fluidity']) WebGLUtils.setUniform1f(gl, program.uniforms['u_fluidity'], 0.4 + traits.empathy * 0.6);
      if (program.uniforms['u_consciousness']) WebGLUtils.setUniform1f(gl, program.uniforms['u_consciousness'], organism.consciousness || 0.5);
      if (program.uniforms['u_energy']) WebGLUtils.setUniform1f(gl, program.uniforms['u_energy'], (organism.energy || 50) / 100);
      if (program.uniforms['u_mutation']) WebGLUtils.setUniform1f(gl, program.uniforms['u_mutation'], 0.1 + (organism.generation || 0) * 0.01);
      
      // Transform matrix (for enhanced shaders only)
      if (program.uniforms['u_transform']) {
        WebGLUtils.setUniformMatrix3(gl, program.uniforms['u_transform'], transformMatrix);
      }
      
      // Résolution du canvas
      if (program.uniforms['u_resolution']) {
        gl.uniform2f(program.uniforms['u_resolution'], canvas.width, canvas.height);
      }

      // Traits (avec vérifications) - Now with enhanced trait mapping
      if (program.uniforms['u_curiosity']) WebGLUtils.setUniform1f(gl, program.uniforms['u_curiosity'], traits.curiosity);
      if (program.uniforms['u_focus']) WebGLUtils.setUniform1f(gl, program.uniforms['u_focus'], traits.focus);
      if (program.uniforms['u_rhythm']) WebGLUtils.setUniform1f(gl, program.uniforms['u_rhythm'], Math.max(0.1, traits.rhythm));
      if (program.uniforms['u_empathy']) WebGLUtils.setUniform1f(gl, program.uniforms['u_empathy'], traits.empathy);
      if (program.uniforms['u_creativity']) WebGLUtils.setUniform1f(gl, program.uniforms['u_creativity'], traits.creativity);

      // Dynamic colors based on traits
      const primaryColor = [
        0.0 + traits.curiosity * 0.3,      // Red channel influenced by curiosity
        0.878 - traits.focus * 0.2,        // Green channel reduced by focus for stability
        1.0 - traits.empathy * 0.3         // Blue channel reduced by empathy for warmth
      ];
      
      const secondaryColor = [
        0.373 + traits.creativity * 0.2,
        0.765 + traits.rhythm * 0.1,
        0.969 - traits.focus * 0.1
      ];
      
      const accentColor = [
        0.612 + traits.empathy * 0.3,
        0.416 + traits.curiosity * 0.2,
        0.875 - traits.creativity * 0.1
      ];

      // Colors (avec vérifications)
      if (program.uniforms['u_primaryColor']) WebGLUtils.setUniform3f(gl, program.uniforms['u_primaryColor'], ...primaryColor);
      if (program.uniforms['u_secondaryColor']) WebGLUtils.setUniform3f(gl, program.uniforms['u_secondaryColor'], ...secondaryColor);
      if (program.uniforms['u_accentColor']) WebGLUtils.setUniform3f(gl, program.uniforms['u_accentColor'], ...accentColor);

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
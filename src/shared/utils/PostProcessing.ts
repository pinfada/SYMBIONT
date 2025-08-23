// src/shared/utils/PostProcessing.ts
import { logger } from './secureLogger';
import WebGLUtils, { ShaderProgram, WebGLMesh } from './webgl';

export interface PostProcessingEffect {
  name: string;
  enabled: boolean;
  intensity: number;
  program: ShaderProgram;
  uniforms: Record<string, any>;
}

export interface PostProcessingFramebuffer {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
  width: number;
  height: number;
}

export class PostProcessingManager {
  private gl: WebGL2RenderingContext;
  private effects: Map<string, PostProcessingEffect> = new Map();
  private framebuffers: PostProcessingFramebuffer[] = [];
  private quadMesh: WebGLMesh | null = null;
  private currentFramebufferIndex = 0;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.initializeQuadMesh();
  }

  private initializeQuadMesh(): void {
    this.quadMesh = WebGLUtils.createQuadMesh(this.gl);
    if (!this.quadMesh) {
      logger.error('Failed to create quad mesh for post-processing');
    }
  }

  createFramebuffer(width: number, height: number, hdr: boolean = false): PostProcessingFramebuffer | null {
    const gl = this.gl;
    
    const framebuffer = gl.createFramebuffer();
    if (!framebuffer) {
      logger.error('Failed to create framebuffer');
      return null;
    }

    // Try to create HDR texture if supported and requested
    let texture: WebGLTexture | null = null;
    
    if (hdr && gl instanceof WebGL2RenderingContext) {
      try {
        // Try HDR formats (requires EXT_color_buffer_float)
        const ext = gl.getExtension('EXT_color_buffer_float');
        if (ext) {
          texture = gl.createTexture();
          if (texture) {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            logger.info('Created HDR framebuffer texture');
          }
        }
      } catch (error) {
        logger.warn('HDR texture creation failed, falling back to LDR:', error);
        if (texture) {
          gl.deleteTexture(texture);
          texture = null;
        }
      }
    }

    // Fallback to standard RGBA8
    if (!texture) {
      texture = WebGLUtils.createTexture(gl, width, height);
      if (!texture) {
        logger.error('Failed to create framebuffer texture');
        gl.deleteFramebuffer(framebuffer);
        return null;
      }
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      logger.error('Framebuffer is not complete:', status);
      gl.deleteFramebuffer(framebuffer);
      gl.deleteTexture(texture);
      return null;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return { framebuffer, texture, width, height };
  }

  setupFramebuffers(width: number, height: number): boolean {
    // Clean up existing framebuffers
    this.cleanup();

    // Create two framebuffers for ping-pong rendering
    for (let i = 0; i < 2; i++) {
      const fb = this.createFramebuffer(width, height);
      if (!fb) {
        logger.error(`Failed to create framebuffer ${i}`);
        return false;
      }
      this.framebuffers.push(fb);
    }

    return true;
  }

  async addBloomEffect(intensity: number = 1.0): Promise<boolean> {
    const vertexShader = `#version 300 es
    precision highp float;
    
    in vec2 a_position;
    in vec2 a_texCoord;
    
    out vec2 v_texCoord;
    
    void main() {
      v_texCoord = a_texCoord;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }`;

    const fragmentShader = `#version 300 es
    precision highp float;
    
    in vec2 v_texCoord;
    out vec4 fragColor;
    
    uniform sampler2D u_scene;
    uniform float u_intensity;
    uniform float u_threshold;
    uniform vec2 u_texelSize;
    
    // Gaussian blur weights for 5x5 kernel
    const float weights[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
    
    vec3 extractBright(vec3 color, float threshold) {
      float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
      float bright = smoothstep(threshold - 0.1, threshold + 0.1, luminance);
      return color * bright;
    }
    
    vec3 gaussianBlur(sampler2D tex, vec2 uv, vec2 direction) {
      vec3 result = texture(tex, uv).rgb * weights[0];
      
      for (int i = 1; i < 5; i++) {
        vec2 offset = direction * float(i);
        result += texture(tex, uv + offset).rgb * weights[i];
        result += texture(tex, uv - offset).rgb * weights[i];
      }
      
      return result;
    }
    
    void main() {
      vec3 scene = texture(u_scene, v_texCoord).rgb;
      
      // Extract bright areas
      vec3 bright = extractBright(scene, u_threshold);
      
      // Apply gaussian blur
      vec3 bloom = gaussianBlur(u_scene, v_texCoord, vec2(u_texelSize.x, 0.0)); // Horizontal
      bloom = mix(bloom, gaussianBlur(u_scene, v_texCoord, vec2(0.0, u_texelSize.y)), 0.5); // Vertical
      
      // Combine scene with bloom
      vec3 result = scene + bloom * u_intensity;
      
      fragColor = vec4(result, 1.0);
    }`;

    const program = WebGLUtils.createProgram(this.gl, vertexShader, fragmentShader);
    if (!program) {
      logger.error('Failed to create bloom shader program');
      return false;
    }

    const effect: PostProcessingEffect = {
      name: 'bloom',
      enabled: true,
      intensity,
      program,
      uniforms: {
        threshold: 0.8,
        texelSize: [1.0, 1.0]
      }
    };

    this.effects.set('bloom', effect);
    logger.info('Bloom effect added successfully');
    return true;
  }

  async addDepthOfFieldEffect(focusDistance: number = 0.5, blurStrength: number = 1.0): Promise<boolean> {
    const vertexShader = `#version 300 es
    precision highp float;
    
    in vec2 a_position;
    in vec2 a_texCoord;
    
    out vec2 v_texCoord;
    
    void main() {
      v_texCoord = a_texCoord;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }`;

    const fragmentShader = `#version 300 es
    precision highp float;
    
    in vec2 v_texCoord;
    out vec4 fragColor;
    
    uniform sampler2D u_scene;
    uniform float u_focusDistance;
    uniform float u_blurStrength;
    uniform vec2 u_texelSize;
    
    float getDepth(vec2 uv) {
      // Simple depth approximation based on distance from center
      vec2 center = vec2(0.5);
      float dist = length(uv - center);
      return smoothstep(0.0, 1.0, dist);
    }
    
    vec3 depthOfFieldBlur(sampler2D tex, vec2 uv, float blurRadius) {
      vec3 result = vec3(0.0);
      float totalWeight = 0.0;
      
      const int samples = 16;
      for (int i = 0; i < samples; i++) {
        float angle = float(i) * 6.28318 / float(samples);
        vec2 offset = vec2(cos(angle), sin(angle)) * blurRadius;
        vec2 sampleUV = uv + offset * u_texelSize;
        
        if (sampleUV.x >= 0.0 && sampleUV.x <= 1.0 && sampleUV.y >= 0.0 && sampleUV.y <= 1.0) {
          vec3 sampleColor = texture(tex, sampleUV).rgb;
          float weight = 1.0;
          result += sampleColor * weight;
          totalWeight += weight;
        }
      }
      
      return result / totalWeight;
    }
    
    void main() {
      float depth = getDepth(v_texCoord);
      float blur = abs(depth - u_focusDistance) * u_blurStrength;
      
      vec3 scene = texture(u_scene, v_texCoord).rgb;
      
      if (blur > 0.1) {
        vec3 blurred = depthOfFieldBlur(u_scene, v_texCoord, blur);
        scene = mix(scene, blurred, min(blur, 1.0));
      }
      
      fragColor = vec4(scene, 1.0);
    }`;

    const program = WebGLUtils.createProgram(this.gl, vertexShader, fragmentShader);
    if (!program) {
      logger.error('Failed to create depth of field shader program');
      return false;
    }

    const effect: PostProcessingEffect = {
      name: 'depthOfField',
      enabled: true,
      intensity: 1.0,
      program,
      uniforms: {
        focusDistance,
        blurStrength,
        texelSize: [1.0, 1.0]
      }
    };

    this.effects.set('depthOfField', effect);
    logger.info('Depth of field effect added successfully');
    return true;
  }

  beginFrame(): void {
    if (this.framebuffers.length === 0) return;
    
    const fb = this.framebuffers[0];
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fb.framebuffer);
    this.gl.viewport(0, 0, fb.width, fb.height);
    this.currentFramebufferIndex = 0;
  }

  applyEffects(): void {
    if (!this.quadMesh || this.framebuffers.length < 2) return;

    const gl = this.gl;
    
    // Setup quad mesh attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadMesh.vertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.quadMesh.indexBuffer);

    // Apply each enabled effect
    for (const [_name, effect] of this.effects) {
      if (!effect.enabled) continue;

      const sourceIndex = this.currentFramebufferIndex;
      const targetIndex = 1 - this.currentFramebufferIndex;
      
      // Bind target framebuffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[targetIndex].framebuffer);
      gl.viewport(0, 0, this.framebuffers[targetIndex].width, this.framebuffers[targetIndex].height);

      // Use effect shader
      gl.useProgram(effect.program.program);

      // Bind source texture
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.framebuffers[sourceIndex].texture);
      if (effect.program.uniforms['u_scene']) {
        gl.uniform1i(effect.program.uniforms['u_scene'], 0);
      }

      // Set effect uniforms
      if (effect.program.uniforms['u_intensity']) {
        WebGLUtils.setUniform1f(gl, effect.program.uniforms['u_intensity'], effect.intensity);
      }

      for (const [uniformName, value] of Object.entries(effect.uniforms)) {
        const location = effect.program.uniforms[`u_${uniformName}`];
        if (location) {
          if (Array.isArray(value)) {
            if (value.length === 2) {
              WebGLUtils.setUniform2f(gl, location, value[0], value[1]);
            } else if (value.length === 3) {
              WebGLUtils.setUniform3f(gl, location, value[0], value[1], value[2]);
            }
          } else {
            WebGLUtils.setUniform1f(gl, location, value);
          }
        }
      }

      // Setup vertex attributes
      const positionLocation = effect.program.attributes['a_position'];
      const texCoordLocation = effect.program.attributes['a_texCoord'];

      if (positionLocation !== undefined && positionLocation >= 0) {
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
      }

      if (texCoordLocation !== undefined && texCoordLocation >= 0) {
        gl.enableVertexAttribArray(texCoordLocation);
        gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 16, 8);
      }

      // Draw
      gl.drawElements(gl.TRIANGLES, this.quadMesh.vertexCount, gl.UNSIGNED_SHORT, 0);

      // Swap framebuffers
      this.currentFramebufferIndex = targetIndex;
    }
  }

  endFrame(): void {
    // Bind back to default framebuffer and copy final result
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    
    if (this.framebuffers.length === 0 || !this.quadMesh) return;

    const gl = this.gl;
    
    // Simple copy shader to display final result
    const copyVertexShader = `#version 300 es
    precision highp float;
    in vec2 a_position;
    in vec2 a_texCoord;
    out vec2 v_texCoord;
    void main() {
      v_texCoord = a_texCoord;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }`;

    const copyFragmentShader = `#version 300 es
    precision highp float;
    in vec2 v_texCoord;
    out vec4 fragColor;
    uniform sampler2D u_scene;
    void main() {
      fragColor = texture(u_scene, v_texCoord);
    }`;

    // This should be cached, but for now we create it each time
    const copyProgram = WebGLUtils.createProgram(gl, copyVertexShader, copyFragmentShader);
    if (!copyProgram) return;

    gl.useProgram(copyProgram.program);
    
    // Bind final framebuffer texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.framebuffers[this.currentFramebufferIndex].texture);
    if (copyProgram.uniforms['u_scene']) {
      gl.uniform1i(copyProgram.uniforms['u_scene'], 0);
    }

    // Setup vertex attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadMesh.vertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.quadMesh.indexBuffer);

    const positionLocation = copyProgram.attributes['a_position'];
    const texCoordLocation = copyProgram.attributes['a_texCoord'];

    if (positionLocation !== undefined && positionLocation >= 0) {
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
    }

    if (texCoordLocation !== undefined && texCoordLocation >= 0) {
      gl.enableVertexAttribArray(texCoordLocation);
      gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 16, 8);
    }

    // Draw to screen
    gl.drawElements(gl.TRIANGLES, this.quadMesh.vertexCount, gl.UNSIGNED_SHORT, 0);

    // Cleanup
    gl.deleteProgram(copyProgram.program);
  }

  setEffectEnabled(name: string, enabled: boolean): void {
    const effect = this.effects.get(name);
    if (effect) {
      effect.enabled = enabled;
    }
  }

  setEffectIntensity(name: string, intensity: number): void {
    const effect = this.effects.get(name);
    if (effect) {
      effect.intensity = Math.max(0, Math.min(2, intensity));
    }
  }

  updateEffectUniform(name: string, uniformName: string, value: any): void {
    const effect = this.effects.get(name);
    if (effect) {
      effect.uniforms[uniformName] = value;
    }
  }

  resize(width: number, height: number): boolean {
    this.cleanup();
    const success = this.setupFramebuffers(width, height);
    
    // Update texel size for all effects
    for (const effect of this.effects.values()) {
      effect.uniforms.texelSize = [1.0 / width, 1.0 / height];
    }
    
    return success;
  }

  cleanup(): void {
    const gl = this.gl;
    
    for (const fb of this.framebuffers) {
      gl.deleteFramebuffer(fb.framebuffer);
      gl.deleteTexture(fb.texture);
    }
    this.framebuffers = [];
    
    for (const effect of this.effects.values()) {
      gl.deleteProgram(effect.program.program);
    }
    this.effects.clear();

    if (this.quadMesh) {
      gl.deleteBuffer(this.quadMesh.vertexBuffer);
      gl.deleteBuffer(this.quadMesh.indexBuffer);
      this.quadMesh = null;
    }
  }

  destroy(): void {
    this.cleanup();
    logger.info('PostProcessingManager destroyed');
  }
}
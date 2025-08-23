// src/content/WebGLContentScript.ts
// Content Script WebGL Fallback pour MV3

import { logger } from '../shared/utils/secureLogger';

export class WebGLContentScriptRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private initialized = false;
  private hiddenContainer: HTMLDivElement | null = null;

  async initialize(): Promise<boolean> {
    try {
      // Create hidden canvas for WebGL rendering
      this.createHiddenCanvas();
      
      // Setup WebGL context
      const success = this.initializeWebGL();
      if (!success) {
        return false;
      }
      
      // Setup message listener for render requests
      this.setupMessageListener();
      
      this.initialized = true;
      logger.info('Content Script WebGL renderer initialized');
      return true;
      
    } catch (error) {
      logger.error('Content Script WebGL initialization failed:', error);
      return false;
    }
  }

  private createHiddenCanvas(): void {
    // Create hidden container
    this.hiddenContainer = document.createElement('div');
    this.hiddenContainer.style.cssText = `
      position: fixed;
      top: -1000px;
      left: -1000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
      pointer-events: none;
      opacity: 0;
      z-index: -1000;
    `;
    
    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = 400;
    this.canvas.height = 300;
    this.canvas.style.cssText = 'width: 100%; height: 100%;';
    
    this.hiddenContainer.appendChild(this.canvas);
    document.documentElement.appendChild(this.hiddenContainer);
    
    logger.debug('Hidden WebGL canvas created');
  }

  private initializeWebGL(): boolean {
    if (!this.canvas) return false;
    
    try {
      // Try WebGL2 first, then WebGL1
      this.gl = this.canvas.getContext('webgl2', {
        alpha: true,
        depth: false,
        stencil: false,
        antialias: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: true, // Important for image extraction
        powerPreference: 'default'
      }) as WebGL2RenderingContext | null;
      
      if (!this.gl) {
        this.gl = this.canvas.getContext('webgl', {
          alpha: true,
          depth: false,
          stencil: false,
          antialias: false,
          premultipliedAlpha: false,
          preserveDrawingBuffer: true,
          powerPreference: 'default'
        }) as WebGLRenderingContext | null;
      }
      
      if (!this.gl) {
        this.gl = this.canvas.getContext('experimental-webgl', {
          alpha: true,
          preserveDrawingBuffer: true
        }) as WebGLRenderingContext | null;
      }
      
      if (!this.gl) {
        throw new Error('WebGL not supported in this browser');
      }
      
      // Test basic WebGL functionality
      this.gl.clearColor(0, 0, 0, 1);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT);
      
      logger.info(`Content Script WebGL context: ${this.gl instanceof WebGL2RenderingContext ? 'WebGL2' : 'WebGL1'}`);
      return true;
      
    } catch (error) {
      logger.error('WebGL context creation failed:', error);
      return false;
    }
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'CONTENT_WEBGL_RENDER') {
        this.handleRenderRequest(message.data)
          .then(result => {
            sendResponse({ success: true, imageData: result });
          })
          .catch(error => {
            logger.error('Content script render failed:', error);
            sendResponse({ success: false, error: error.message });
          });
        return true; // Keep message port open for async response
      }
      
      if (message.type === 'CONTENT_RENDER_REQUEST') {
        this.handleRenderRequest(message.request.data)
          .then(result => {
            sendResponse({ success: true, imageData: result });
          })
          .catch(error => {
            logger.error('Content script render failed:', error);
            sendResponse({ success: false, error: error.message });
          });
        return true;
      }
      
      if (message.type === 'WEBGL_ACTIVATION_PING') {
        sendResponse({ available: this.initialized });
        return false;
      }
      
      return false;
    });
  }

  private async handleRenderRequest(organismData: any): Promise<ImageData | null> {
    if (!this.initialized || !this.gl || !this.canvas) {
      throw new Error('WebGL renderer not initialized');
    }
    
    try {
      // Simple organism rendering
      const gl = this.gl;
      
      // Setup viewport
      const width = 400;
      const height = 300;
      this.canvas.width = width;
      this.canvas.height = height;
      gl.viewport(0, 0, width, height);
      
      // Clear
      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      
      // Simple organism rendering (placeholder)
      await this.renderSimpleOrganism(organismData);
      
      // Extract image data
      const imageData = await this.extractImageData();
      
      logger.debug(`Content script rendered organism ${organismData.id || 'unknown'}`);
      return imageData;
      
    } catch (error) {
      logger.error('Content script render error:', error);
      throw error;
    }
  }

  private async renderSimpleOrganism(organismData: any): Promise<void> {
    if (!this.gl) return;
    
    const gl = this.gl;
    
    // Create simple shader program if not exists
    const program = this.createSimpleShaderProgram();
    if (!program) return;
    
    // Use program
    gl.useProgram(program);
    
    // Create simple geometry
    const vertices = new Float32Array([
      -0.5, -0.5,
       0.5, -0.5,
       0.0,  0.5
    ]);
    
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    
    // Setup attributes
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    if (positionLocation >= 0) {
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    }
    
    // Set uniforms
    const colorLocation = gl.getUniformLocation(program, 'u_color');
    if (colorLocation) {
      const energy = organismData.energy || 0.5;
      gl.uniform3f(colorLocation, 0.0, energy, 1.0);
    }
    
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    if (timeLocation) {
      gl.uniform1f(timeLocation, Date.now() / 1000);
    }
    
    // Draw
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    
    // Cleanup
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
  }

  private createSimpleShaderProgram(): WebGLProgram | null {
    if (!this.gl) return null;
    
    const gl = this.gl;
    
    const vertexShaderSource = `
      attribute vec2 a_position;
      uniform float u_time;
      varying vec2 v_position;
      
      void main() {
        v_position = a_position;
        vec2 pos = a_position;
        pos.x += sin(u_time + a_position.y * 3.0) * 0.1;
        gl_Position = vec4(pos, 0.0, 1.0);
      }
    `;
    
    const fragmentShaderSource = `
      precision mediump float;
      uniform vec3 u_color;
      uniform float u_time;
      varying vec2 v_position;
      
      void main() {
        float dist = length(v_position);
        float alpha = smoothstep(1.0, 0.0, dist);
        float pulse = sin(u_time * 2.0) * 0.3 + 0.7;
        gl_FragColor = vec4(u_color * pulse, alpha);
      }
    `;
    
    // Create shaders
    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    if (!vertexShader || !fragmentShader) return null;
    
    // Create program
    const program = gl.createProgram();
    if (!program) return null;
    
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      logger.error('Shader program link failed:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    
    return program;
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;
    
    const gl = this.gl;
    const shader = gl.createShader(type);
    
    if (!shader) return null;
    
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      logger.error('Shader compilation failed:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }

  private async extractImageData(): Promise<ImageData | null> {
    if (!this.canvas) return null;
    
    try {
      // Use 2D context to extract image data from WebGL canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.canvas.width;
      tempCanvas.height = this.canvas.height;
      
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return null;
      
      tempCtx.drawImage(this.canvas, 0, 0);
      
      return tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      
    } catch (error) {
      logger.error('Image data extraction failed:', error);
      return null;
    }
  }

  public cleanup(): void {
    if (this.hiddenContainer && this.hiddenContainer.parentNode) {
      this.hiddenContainer.parentNode.removeChild(this.hiddenContainer);
    }
    
    this.canvas = null;
    this.gl = null;
    this.hiddenContainer = null;
    this.initialized = false;
    
    logger.info('Content Script WebGL renderer cleaned up');
  }

  public isInitialized(): boolean {
    return this.initialized;
  }
}

// Auto-initialize if in content script context
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  const renderer = new WebGLContentScriptRenderer();
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      renderer.initialize();
    });
  } else {
    renderer.initialize();
  }
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    renderer.cleanup();
  });
  
  // Make globally available for debugging
  (window as any).symbiontWebGL = renderer;
}

export default WebGLContentScriptRenderer;
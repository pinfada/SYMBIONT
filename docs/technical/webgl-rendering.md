# WebGL Rendering System

**Dernière mise à jour**: Décembre 2024  
**Version WebGL**: 2.0 avec fallback WebGL1  
**Architecture**: Manifest V3 Compatible

## Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Architecture MV3](#architecture-mv3)
- [Pipeline de rendu](#pipeline-de-rendu)
- [Optimisations avancées](#optimisations-avancées)
- [Shaders et effets](#shaders-et-effets)
- [Performance et monitoring](#performance-et-monitoring)
- [Troubleshooting](#troubleshooting)

## Vue d'ensemble

Le système WebGL de SYMBIONT offre un rendu 3D avancé pour la visualisation d'organismes numériques évoluant en temps réel. L'architecture respecte parfaitement les contraintes Manifest V3 de Chrome tout en maximisant les performances graphiques.

### Fonctionnalités principales

- **Rendu temps réel** d'organismes 3D avec traits dynamiques
- **Particules avancées** (énergie, mutations, conscience, traits)  
- **Post-processing** avec bloom, depth of field, anti-aliasing
- **Textures procédurales** basées sur l'ADN des organismes
- **LOD adaptatif** selon la distance et les performances
- **Frustum culling** spatial et prédictif

## Architecture MV3

### Cascade de fallbacks robuste

```typescript
// Ordre de priorité pour le rendu WebGL
1. Offscreen API (Chrome 116+)    // Service Worker background
    ↓ fallback
2. Content Script WebGL          // Canvas caché dans la page
    ↓ fallback  
3. Popup UI Rendering           // Interface utilisateur
    ↓ fallback
4. 2D Canvas Minimal           // Rendu basique de secours
```

### WebGL Orchestrator

Le `WebGLOrchestrator` coordonne le rendu entre tous les contextes possibles :

```typescript
export class WebGLOrchestrator {
  private renderTargets: Map<string, RenderTarget> = new Map()
  private renderQueue: RenderRequest[] = []
  private webglBridge: WebGLBridgeManager
  
  // Sélectionne automatiquement le meilleur target disponible
  private selectBestRenderTarget(): RenderTarget | null
  
  // Queue de rendu avec priorités (high/medium/low)
  async queueRenderRequest(request: RenderRequest): Promise<void>
  
  // Optimisations adaptatives selon les performances
  async optimizePerformance(metrics: PerformanceMetrics): Promise<void>
}
```

### Offscreen API Implementation

```typescript
export class ServiceWorkerWebGLBridge {
  // Créé un document offscreen pour WebGL dans le service worker
  async initialize(): Promise<boolean> {
    await chrome.offscreen.createDocument({
      url: chrome.runtime.getURL('offscreen.html'),
      reasons: ['DISPLAY_MEDIA'],
      justification: 'WebGL rendering for organism evolution'
    })
  }
  
  // Rendu d'organisme avec réponse asynchrone
  async renderOrganism(organismData: any): Promise<ImageData | null>
}
```

## Pipeline de rendu

### 1. Initialisation WebGL

```typescript
// Feature detection robuste avec cascade de fallbacks
let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;

// Tentative WebGL2 avec vérification d'extensions
try {
  gl = canvas.getContext('webgl2', contextOptions);
  if (gl) {
    const requiredExtensions = ['EXT_color_buffer_float'];
    // Vérification support HDR
  }
} catch (e) {
  // Fallback WebGL1
  gl = canvas.getContext('webgl', contextOptions);
}
```

### 2. Resource Manager

Gestion intelligente de la mémoire GPU avec limites adaptatives :

```typescript
export class WebGLResourceManager {
  private memoryBudget: number // 64-256MB selon le device
  private resources: Map<string, GLResource> = new Map()
  
  // Nettoyage automatique selon l'usage
  private async garbageCollect(): Promise<void> {
    const unusedResources = Array.from(this.resources.values())
      .filter(resource => Date.now() - resource.lastUsed > this.maxAge)
      .sort((a, b) => a.lastUsed - b.lastUsed)
  }
  
  // Budget mémoire adaptatif
  private calculateMemoryBudget(): number {
    const deviceMemory = (navigator as any).deviceMemory || 4
    return Math.min(256, Math.max(64, deviceMemory * 32)) * 1024 * 1024
  }
}
```

### 3. Geometry et Mesh

```typescript
interface OrganismMesh {
  vertices: Float32Array    // Position + Normal + UV
  indices: Uint16Array     // Triangles optimisés
  traits: Float32Array     // Données de traits pour shaders
  boundingBox: BoundingBox // Pour frustum culling
}

// Génération procédurale basée sur l'ADN
generateOrganismGeometry(dna: string, traits: OrganismTraits): OrganismMesh
```

## Optimisations avancées

### LOD System (Level of Detail)

Système adaptatif avec 4 niveaux de détail :

```typescript
export class LODManager {
  private lodLevels = [
    { distance: 0,   detail: 1.0,  vertexCount: 10000 }, // High
    { distance: 50,  detail: 0.7,  vertexCount: 5000 },  // Medium
    { distance: 100, detail: 0.4,  vertexCount: 2000 },  // Low  
    { distance: 200, detail: 0.1,  vertexCount: 500 }    // Billboard
  ]
  
  // Sélection automatique selon distance et performance
  selectLOD(distance: number, performanceBudget: number): LODLevel
  
  // Budget de performance dynamique selon le FPS
  private updatePerformanceBudget(currentFPS: number): void {
    if (currentFPS < 30) {
      this.performanceBudget *= 0.8 // Réduire la qualité
    } else if (currentFPS > 50) {
      this.performanceBudget *= 1.1 // Augmenter la qualité
    }
  }
}
```

### Frustum Culling

Culling spatial et prédictif pour optimiser le rendu :

```typescript
export class FrustumCuller {
  // Culling adaptatif selon les performances
  performCulling(organisms: Organism[], camera: Camera): Organism[] {
    if (this.shouldUsePredictiveCulling()) {
      return this.predictiveCull(organisms, camera)
    } else {
      return this.basicCull(organisms, camera)  
    }
  }
  
  // Prédiction des objets visibles selon le mouvement
  private predictiveCull(organisms: Organism[], camera: Camera): Organism[] {
    const predictedPosition = camera.predictPosition(this.predictionTime)
    return organisms.filter(org => 
      this.isVisible(org.boundingBox, predictedPosition)
    )
  }
}
```

### Post-Processing Pipeline

Effets visuels avancés avec HDR et tone mapping :

```typescript
export class PostProcessingManager {
  private bloomPass: BloomEffect
  private depthOfFieldPass: DOFEffect
  private toneMappingPass: ToneMappingEffect
  
  // Pipeline HDR avec framebuffers
  async renderPostEffects(sourceTexture: WebGLTexture): Promise<WebGLTexture> {
    let currentTexture = sourceTexture
    
    // 1. Bloom (glow effects)
    currentTexture = await this.bloomPass.render(currentTexture)
    
    // 2. Depth of Field (bokeh)  
    currentTexture = await this.depthOfFieldPass.render(currentTexture)
    
    // 3. Tone Mapping (HDR → LDR)
    return await this.toneMappingPass.render(currentTexture)
  }
}
```

## Shaders et effets

### Shader principal d'organisme

**Vertex Shader** (`enhanced-organism.vert`) :
```glsl
#version 300 es
in vec3 a_position;
in vec3 a_normal;
in vec2 a_texCoord;

uniform mat4 u_modelViewProjection;
uniform float u_time;
uniform vec4 u_traits; // curiosity, focus, rhythm, empathy

// Animation basée sur les traits
vec3 animateVertex(vec3 pos) {
  float wave = sin(u_time * u_traits.z + pos.y) * u_traits.x * 0.1;
  return pos + vec3(wave, 0.0, 0.0);
}

void main() {
  vec3 animatedPos = animateVertex(a_position);
  gl_Position = u_modelViewProjection * vec4(animatedPos, 1.0);
  // ...
}
```

**Fragment Shader** (`enhanced-organism.frag`) :
```glsl
#version 300 es
precision highp float;

uniform vec4 u_traits;
uniform float u_energy;
uniform float u_time;

// Couleur procédurale basée sur les traits
vec3 calculateOrganismColor() {
  vec3 baseColor = mix(
    vec3(0.2, 0.8, 1.0), // Bleu (calme)
    vec3(1.0, 0.3, 0.2), // Rouge (énergie)
    u_traits.x // Curiosité
  );
  
  // Modulation par l'énergie
  return baseColor * (0.5 + 0.5 * u_energy);
}

void main() {
  vec3 color = calculateOrganismColor();
  
  // Effet de pulsation basé sur l'empathie
  float pulse = sin(u_time * 2.0) * 0.3 + 0.7;
  color *= mix(1.0, pulse, u_traits.w);
  
  gl_FragColor = vec4(color, 1.0);
}
```

### Système de particules avancé

4 types de particules avec comportements uniques :

```typescript
export class ParticleSystem {
  private particleTypes = {
    ENERGY: {
      count: 1000,
      behavior: 'orbital',   // Orbite autour de l'organisme
      color: [0.2, 1.0, 0.8, 1.0],
      lifespan: 5.0
    },
    MUTATION: {
      count: 500, 
      behavior: 'explosive', // Explosion depuis le centre
      color: [1.0, 0.5, 0.2, 0.8],
      lifespan: 2.0
    },
    CONSCIOUSNESS: {
      count: 200,
      behavior: 'flow',      // Flux continu
      color: [0.9, 0.9, 1.0, 0.6],
      lifespan: 8.0
    },
    TRAITS: {
      count: 300,
      behavior: 'spiral',    // Spirale ascendante
      color: [1.0, 1.0, 0.3, 0.7],
      lifespan: 6.0
    }
  }
}
```

## Performance et monitoring

### Métriques temps réel

```typescript
export interface PerformanceMetrics {
  fps: number                 // Images par seconde
  renderTime: number         // Temps de rendu (ms)
  memoryUsage: number        // Mémoire GPU utilisée (bytes)
  drawCalls: number          // Nombre d'appels de rendu
  triangleCount: number      // Triangles rendus
  culledObjects: number      // Objets éliminés par culling
  lodLevel: number          // Niveau de détail moyen
}

// Adaptation automatique des performances
class PerformanceManager {
  adaptQuality(metrics: PerformanceMetrics): void {
    if (metrics.fps < 30) {
      this.reduceQuality()
    } else if (metrics.fps > 50 && this.canIncreaseQuality()) {
      this.increaseQuality()
    }
  }
}
```

### Budget de performance

- **Mobile/Low-end** : 64MB VRAM, <50k particules, LOD agressif
- **Desktop/Medium** : 128MB VRAM, <100k particules, LOD équilibré  
- **High-end** : 256MB VRAM, <200k particules, qualité maximale

## Troubleshooting

### Problèmes courants

**WebGL context lost** :
```typescript
canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault()
  logger.warn('WebGL context lost, attempting recovery')
})

canvas.addEventListener('webglcontextrestored', () => {
  this.reinitializeResources()
  logger.info('WebGL context restored successfully')
})
```

**Memory leaks** :
```typescript
// Nettoyage systématique des ressources
dispose(): void {
  // Shaders
  this.shaderPrograms.forEach(program => gl.deleteProgram(program))
  
  // Textures
  this.textures.forEach(texture => gl.deleteTexture(texture))
  
  // Buffers
  this.buffers.forEach(buffer => gl.deleteBuffer(buffer))
  
  // Framebuffers
  this.framebuffers.forEach(fb => gl.deleteFramebuffer(fb))
}
```

**Performance dégradée** :
- Vérifier le budget mémoire GPU
- Réduire le nombre de particules
- Utiliser un LOD plus agressif
- Désactiver les post-effects coûteux

---

## Liens utiles

- [Architecture générale](./architecture.md)
- [Performance optimization](./performance.md) 
- [Organism Core](./organism-core.md)
- [Manifest V3 migration](../process/mv3-migration.md) 
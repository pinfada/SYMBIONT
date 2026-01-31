/**
 * RitualVisualEffects.ts
 * Gestionnaire des effets visuels WebGL pour les rituels
 * Intégration avec le WebGLRenderer existant
 */

import { RitualType } from './interfaces/IRitual';
import { logger } from '@/shared/utils/secureLogger';
import { MessageBus, MessageType } from '@/shared/messaging/MessageBus';

export interface RitualVisualEffect {
  type: RitualType;
  effect: string;
  shaderUniforms: Record<string, any>;
  duration: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce';
}

export class RitualVisualEffectsManager {
  private static instance: RitualVisualEffectsManager | null = null;
  private activeEffects: Map<string, RitualVisualEffect> = new Map();
  private messageBus: MessageBus;
  private animationFrameId: number | null = null;
  private startTimes: Map<string, number> = new Map();

  private constructor() {
    this.messageBus = new MessageBus('ritual-visual-effects');
    this.initializeListeners();
  }

  public static getInstance(): RitualVisualEffectsManager {
    if (!RitualVisualEffectsManager.instance) {
      RitualVisualEffectsManager.instance = new RitualVisualEffectsManager();
    }
    return RitualVisualEffectsManager.instance;
  }

  /**
   * Initialise les listeners pour les effets visuels
   */
  private initializeListeners(): void {
    this.messageBus.on('RITUAL_VISUAL_EFFECT' as MessageType, (message: any) => {
      const { ritualType, effect, duration, intensity, organismId, ...params } = message.payload;
      this.applyVisualEffect(ritualType, effect, duration, intensity, organismId, params);
    });
  }

  /**
   * Applique un effet visuel pour un rituel
   */
  public applyVisualEffect(
    ritualType: RitualType,
    effectName: string,
    duration: number,
    intensity: number,
    organismId: string,
    params: any = {}
  ): void {
    const effectId = `${ritualType}_${effectName}_${organismId}`;

    // Créer les uniforms selon le type d'effet
    const shaderUniforms = this.createShaderUniforms(ritualType, effectName, intensity, params);

    const effect: RitualVisualEffect = {
      type: ritualType,
      effect: effectName,
      shaderUniforms,
      duration,
      easing: this.determineEasing(effectName)
    };

    this.activeEffects.set(effectId, effect);
    this.startTimes.set(effectId, Date.now());

    // Envoyer au WebGL renderer
    this.sendToRenderer(organismId, effect);

    // Démarrer l'animation si nécessaire
    if (!this.animationFrameId) {
      this.startAnimation();
    }

    // Programmer la fin de l'effet
    setTimeout(() => {
      this.removeEffect(effectId, organismId);
    }, duration);

    logger.info(`[RitualVisualEffects] Applied effect ${effectName} for ${ritualType}`);
  }

  /**
   * Crée les uniforms pour le shader selon l'effet
   */
  private createShaderUniforms(
    ritualType: RitualType,
    effectName: string,
    intensity: number,
    params: any
  ): Record<string, any> {
    const baseUniforms = {
      u_effectIntensity: intensity,
      u_effectTime: 0,
      u_effectActive: 1.0
    };

    switch (ritualType) {
      case RitualType.TEMPORAL_DEPHASING:
        return this.createDephasingUniforms(effectName, intensity, params);

      case RitualType.FREQUENCY_COMMUNION:
        return this.createCommunionUniforms(effectName, intensity, params);

      case RitualType.STRUCTURE_INSTINCT:
        return this.createInstinctUniforms(effectName, intensity, params);

      default:
        return baseUniforms;
    }
  }

  /**
   * Uniforms pour le Déphasage Temporel
   */
  private createDephasingUniforms(
    effectName: string,
    intensity: number,
    params: any
  ): Record<string, any> {
    switch (effectName) {
      case 'VAPORIZE':
        return {
          u_effectIntensity: intensity,
          u_vaporizeAmount: intensity * 0.5,
          u_noiseScale: 10.0,
          u_noiseSpeed: 2.0,
          u_alphaFade: 1.0 - intensity * 0.3,
          u_distortion: intensity * 0.2,
          u_chromaticAberration: intensity * 0.05,
          u_effectTime: 0
        };

      case 'PHASE_SHIFT':
        return {
          u_effectIntensity: intensity,
          u_phaseOffset: 0,
          u_phaseSpeed: 3.0,
          u_waveAmplitude: intensity * 0.1,
          u_waveFrequency: 20.0,
          u_effectTime: 0
        };

      default:
        return { u_effectIntensity: intensity };
    }
  }

  /**
   * Uniforms pour la Communion de Fréquence
   */
  private createCommunionUniforms(
    effectName: string,
    intensity: number,
    params: any
  ): Record<string, any> {
    const mirrorCount = params.mirrorCount || 3;

    switch (effectName) {
      case 'MIRROR_MULTIPLY':
        return {
          u_effectIntensity: intensity,
          u_mirrorCount: mirrorCount,
          u_mirrorOffset: new Float32Array([
            -0.3, 0.3,  // Mirror 1
            0.3, 0.3,   // Mirror 2
            0, -0.3     // Mirror 3
          ]),
          u_mirrorAlpha: new Float32Array(
            Array(mirrorCount).fill(0.5 * intensity)
          ),
          u_mirrorScale: new Float32Array(
            Array(mirrorCount).fill(0).map((_, i) => 0.8 - i * 0.1)
          ),
          u_mirrorRotation: new Float32Array(
            Array(mirrorCount).fill(0).map((_, i) => i * Math.PI / 6)
          ),
          u_effectTime: 0
        };

      case 'FREQUENCY_WAVE':
        return {
          u_effectIntensity: intensity,
          u_waveOrigin: new Float32Array([0.5, 0.5]),
          u_waveSpeed: 5.0,
          u_waveAmplitude: intensity * 0.15,
          u_waveFrequency: 30.0,
          u_waveColor: new Float32Array([0.2, 0.8, 1.0]),
          u_effectTime: 0
        };

      default:
        return { u_effectIntensity: intensity };
    }
  }

  /**
   * Uniforms pour l'Instinct de Structure
   */
  private createInstinctUniforms(
    effectName: string,
    intensity: number,
    params: any
  ): Record<string, any> {
    const pulseData = params.pulseData || {};

    switch (effectName) {
      case 'NEURAL_PULSE':
        return {
          u_effectIntensity: intensity,
          u_pulseFrequency: pulseData.frequency || 2.0,
          u_pulseColor: new Float32Array(pulseData.color || [0.2, 0.8, 1.0]),
          u_pulseOrigin: new Float32Array([0.5, 0.5]),
          u_pulseRadius: 0,
          u_pulseIntensity: intensity,
          u_pulseGlow: intensity * 0.3,
          u_connectionHighlight: 1.0,
          u_effectTime: 0
        };

      case 'INSIGHT_FLASH':
        return {
          u_effectIntensity: intensity,
          u_flashColor: new Float32Array([1.0, 1.0, 0.8]),
          u_flashDuration: 0.2,
          u_flashDecay: 3.0,
          u_brightnessBoost: intensity * 2.0,
          u_effectTime: 0
        };

      case 'STRUCTURE_REVEAL':
        return {
          u_effectIntensity: intensity,
          u_gridVisible: 1.0,
          u_gridColor: new Float32Array([0.1, 0.3, 0.5]),
          u_gridOpacity: intensity * 0.4,
          u_gridScale: 20.0,
          u_connectionVisible: 1.0,
          u_nodeGlow: intensity * 0.5,
          u_effectTime: 0
        };

      default:
        return { u_effectIntensity: intensity };
    }
  }

  /**
   * Détermine le type d'easing selon l'effet
   */
  private determineEasing(effectName: string): RitualVisualEffect['easing'] {
    switch (effectName) {
      case 'VAPORIZE':
      case 'MIRROR_MULTIPLY':
        return 'ease-in-out';

      case 'NEURAL_PULSE':
      case 'FREQUENCY_WAVE':
        return 'linear';

      case 'INSIGHT_FLASH':
        return 'ease-out';

      case 'PHASE_SHIFT':
        return 'bounce';

      default:
        return 'ease-in-out';
    }
  }

  /**
   * Envoie l'effet au renderer WebGL
   */
  private sendToRenderer(organismId: string, effect: RitualVisualEffect): void {
    this.messageBus.send({
      type: 'WEBGL_RITUAL_EFFECT' as MessageType,
      payload: {
        organismId,
        effect: effect.effect,
        uniforms: effect.shaderUniforms,
        duration: effect.duration
      }
    });
  }

  /**
   * Démarre l'animation des effets
   */
  private startAnimation(): void {
    const animate = () => {
      const now = Date.now();
      let hasActiveEffects = false;

      for (const [effectId, effect] of this.activeEffects) {
        const startTime = this.startTimes.get(effectId) || now;
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / effect.duration, 1.0);

        // Appliquer l'easing
        const easedProgress = this.applyEasing(progress, effect.easing);

        // Mettre à jour les uniforms temporels
        effect.shaderUniforms.u_effectTime = elapsed / 1000; // En secondes

        // Effets spécifiques selon le type
        this.updateEffectUniforms(effect, easedProgress);

        // Envoyer la mise à jour
        const organismId = effectId.split('_').pop()!;
        this.sendToRenderer(organismId, effect);

        if (progress < 1.0) {
          hasActiveEffects = true;
        }
      }

      if (hasActiveEffects) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.animationFrameId = null;
      }
    };

    animate();
  }

  /**
   * Met à jour les uniforms selon la progression
   */
  private updateEffectUniforms(effect: RitualVisualEffect, progress: number): void {
    switch (effect.effect) {
      case 'VAPORIZE':
        effect.shaderUniforms.u_vaporizeAmount =
          effect.shaderUniforms.u_effectIntensity * progress * 0.5;
        effect.shaderUniforms.u_alphaFade =
          1.0 - effect.shaderUniforms.u_effectIntensity * progress * 0.3;
        break;

      case 'MIRROR_MULTIPLY':
        const mirrorAlpha = effect.shaderUniforms.u_mirrorAlpha;
        for (let i = 0; i < mirrorAlpha.length; i++) {
          mirrorAlpha[i] = 0.5 * effect.shaderUniforms.u_effectIntensity *
                          Math.sin(progress * Math.PI);
        }
        break;

      case 'NEURAL_PULSE':
        effect.shaderUniforms.u_pulseRadius = progress * 2.0;
        effect.shaderUniforms.u_pulseIntensity =
          effect.shaderUniforms.u_effectIntensity * (1.0 - progress);
        break;

      case 'PHASE_SHIFT':
        effect.shaderUniforms.u_phaseOffset = progress * Math.PI * 2;
        break;

      case 'INSIGHT_FLASH':
        const flashProgress = Math.min(progress * 5, 1.0); // Flash rapide
        effect.shaderUniforms.u_brightnessBoost =
          effect.shaderUniforms.u_effectIntensity * 2.0 * (1.0 - flashProgress);
        break;
    }
  }

  /**
   * Applique l'easing à la progression
   */
  private applyEasing(t: number, easing: RitualVisualEffect['easing']): number {
    switch (easing) {
      case 'linear':
        return t;

      case 'ease-in':
        return t * t;

      case 'ease-out':
        return t * (2 - t);

      case 'ease-in-out':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      case 'bounce':
        const n1 = 7.5625;
        const d1 = 2.75;
        if (t < 1 / d1) {
          return n1 * t * t;
        } else if (t < 2 / d1) {
          return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
          return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
          return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }

      default:
        return t;
    }
  }

  /**
   * Retire un effet
   */
  private removeEffect(effectId: string, organismId: string): void {
    this.activeEffects.delete(effectId);
    this.startTimes.delete(effectId);

    // Notifier le renderer de désactiver l'effet
    this.messageBus.send({
      type: 'WEBGL_RITUAL_EFFECT_END' as MessageType,
      payload: {
        organismId,
        effectId
      }
    });

    logger.debug(`[RitualVisualEffects] Removed effect ${effectId}`);
  }

  /**
   * Obtient les effets actifs
   */
  public getActiveEffects(): Map<string, RitualVisualEffect> {
    return new Map(this.activeEffects);
  }

  /**
   * Nettoie tous les effets
   */
  public clearAllEffects(): void {
    for (const [effectId] of this.activeEffects) {
      const organismId = effectId.split('_').pop()!;
      this.removeEffect(effectId, organismId);
    }

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
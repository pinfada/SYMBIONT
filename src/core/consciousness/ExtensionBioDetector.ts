/**
 * ExtensionBioDetector - Système de détection biologique des extensions
 * Traite les autres extensions comme des "organes" du navigateur
 */

import { SecureRandom } from '@shared/utils/secureRandom';
import { logger } from '@shared/utils/secureLogger';

// Type d'organe détecté
export enum OrganType {
  BLOCKER = 'blocker',        // Adblockers, privacy shields
  ENHANCER = 'enhancer',      // Productivity, UI enhancers
  TRANSLATOR = 'translator',  // Language tools
  DEVELOPER = 'developer',    // Dev tools, debuggers
  SOCIAL = 'social',          // Social media managers
  SECURITY = 'security',      // Password managers, VPNs
  CREATIVE = 'creative',      // Design tools, color pickers
  UNKNOWN = 'unknown'
}

// Signature biologique d'une extension
export interface ExtensionSignature {
  id: string;
  name: string;
  organType: OrganType;
  bioSignature: Float32Array;  // Vecteur 32D représentant l'empreinte
  symbiosis: number;           // -1 à 1 (parasitaire à symbiotique)
  activity: number;            // 0 à 1 (dormant à très actif)
  lastDetected: number;
  interactions: number;
}

// État du système immunitaire
export interface ImmuneResponse {
  threatLevel: number;          // 0 à 1
  antibodies: Map<string, number>; // Extensions bloquées
  tolerance: Map<string, number>;  // Extensions acceptées
  inflammation: number;         // Niveau d'inflammation global
}

export class ExtensionBioDetector {
  private detectedOrgans: Map<string, ExtensionSignature> = new Map();
  private immuneSystem: ImmuneResponse;
  private bioFieldRadius: number = 100; // Rayon de détection en "unités biologiques"
  private detectionThreshold: number = 0.3;
  private lastScanTime: number = 0;
  private scanInterval: number = 30000; // 30 secondes entre scans

  // Patterns de détection pour classifier les organes
  private readonly ORGAN_PATTERNS = {
    [OrganType.BLOCKER]: ['block', 'adblock', 'ublock', 'privacy', 'shield'],
    [OrganType.ENHANCER]: ['enhance', 'boost', 'productivity', 'speed', 'dark'],
    [OrganType.TRANSLATOR]: ['translate', 'language', 'dictionary'],
    [OrganType.DEVELOPER]: ['devtools', 'debug', 'inspector', 'react', 'vue'],
    [OrganType.SOCIAL]: ['facebook', 'twitter', 'linkedin', 'social'],
    [OrganType.SECURITY]: ['password', 'vpn', 'security', 'auth', '2fa'],
    [OrganType.CREATIVE]: ['color', 'design', 'font', 'screenshot', 'draw']
  };

  constructor() {
    this.immuneSystem = {
      threatLevel: 0,
      antibodies: new Map(),
      tolerance: new Map(),
      inflammation: 0
    };

    this.initializeDetection();
  }

  /**
   * Initialise le système de détection
   */
  private async initializeDetection(): Promise<void> {
    // Démarrer le scan passif
    this.startPassiveScan();

    // Écouter les événements d'installation/désinstallation
    if (chrome.management) {
      chrome.management.onInstalled.addListener((info) => {
        this.onExtensionDetected(info);
      });

      chrome.management.onUninstalled.addListener((id) => {
        this.onExtensionRemoved(id);
      });

      chrome.management.onEnabled.addListener((info) => {
        this.onExtensionActivated(info);
      });

      chrome.management.onDisabled.addListener((info) => {
        this.onExtensionDeactivated(info);
      });
    }

    // Scan initial
    await this.performActiveScan();
  }

  /**
   * Démarre le scan passif périodique
   */
  private startPassiveScan(): void {
    setInterval(async () => {
      await this.performActiveScan();
    }, this.scanInterval);
  }

  /**
   * Effectue un scan actif de toutes les extensions
   */
  private async performActiveScan(): Promise<void> {
    if (!chrome.management) {
      logger.warn('Extension management API not available');
      return;
    }

    try {
      const extensions = await chrome.management.getAll();
      const now = Date.now();

      // Analyser chaque extension
      for (const ext of extensions) {
        if (ext.id === chrome.runtime.id) continue; // Ignorer soi-même

        if (ext.enabled) {
          await this.analyzeExtension(ext);
        }
      }

      // Nettoyer les extensions non détectées depuis longtemps
      for (const [id, signature] of this.detectedOrgans) {
        if (now - signature.lastDetected > 300000) { // 5 minutes
          this.detectedOrgans.delete(id);
          logger.info(`Extension ${signature.name} no longer detected`);
        }
      }

      this.lastScanTime = now;
      this.updateImmuneResponse();

    } catch (error) {
      logger.error('Active scan failed:', error);
    }
  }

  /**
   * Analyse une extension et crée sa signature biologique
   */
  private async analyzeExtension(info: chrome.management.ExtensionInfo): Promise<void> {
    const organType = this.classifyOrgan(info);
    const bioSignature = this.generateBioSignature(info, organType);
    const symbiosis = this.calculateSymbiosis(info, organType);

    const signature: ExtensionSignature = {
      id: info.id,
      name: info.name,
      organType,
      bioSignature,
      symbiosis,
      activity: this.estimateActivity(info),
      lastDetected: Date.now(),
      interactions: this.detectedOrgans.get(info.id)?.interactions || 0
    };

    this.detectedOrgans.set(info.id, signature);

    // Déclencher une réponse immunitaire si nécessaire
    if (symbiosis < -0.5) {
      this.triggerImmuneResponse(signature);
    } else if (symbiosis > 0.5) {
      this.establishSymbiosis(signature);
    }
  }

  /**
   * Classifie le type d'organe
   */
  private classifyOrgan(info: chrome.management.ExtensionInfo): OrganType {
    const nameLower = info.name.toLowerCase();
    const descLower = (info.description || '').toLowerCase();
    const combined = `${nameLower} ${descLower}`;

    for (const [type, patterns] of Object.entries(this.ORGAN_PATTERNS)) {
      for (const pattern of patterns) {
        if (combined.includes(pattern)) {
          return type as OrganType;
        }
      }
    }

    // Classification par permissions
    if (info.permissions) {
      // MV3: webRequestBlocking n'existe plus, utiliser declarativeNetRequest
      if (info.permissions.includes('webRequest') ||
          info.permissions.includes('declarativeNetRequest')) {
        return OrganType.BLOCKER;
      }
      if (info.permissions.includes('identity') ||
          info.permissions.includes('passwords')) {
        return OrganType.SECURITY;
      }
    }

    return OrganType.UNKNOWN;
  }

  /**
   * Génère une signature biologique unique
   */
  private generateBioSignature(
    info: chrome.management.ExtensionInfo,
    organType: OrganType
  ): Float32Array {
    const signature = new Float32Array(32);

    // Encoder le type d'organe
    const typeIndex = Object.values(OrganType).indexOf(organType);
    signature[0] = typeIndex / Object.values(OrganType).length;

    // Encoder les permissions (complexité)
    const permissionCount = info.permissions?.length || 0;
    signature[1] = Math.tanh(permissionCount / 10);

    // Encoder l'ancienneté (installTime non disponible, utiliser un hash)
    let hash = 0;
    for (let i = 0; i < info.id.length; i++) {
      hash = ((hash << 5) - hash) + info.id.charCodeAt(i);
      hash = hash & hash;
    }
    signature[2] = Math.sin(hash);

    // Patterns basés sur le nom
    for (let i = 0; i < Math.min(info.name.length, 10); i++) {
      signature[3 + i] = info.name.charCodeAt(i) / 255;
    }

    // Ajouter du bruit biologique unique
    for (let i = 13; i < 32; i++) {
      signature[i] = Math.sin(hash * (i + 1)) * 0.5 +
                     SecureRandom.random() * 0.5;
    }

    return signature;
  }

  /**
   * Calcule le niveau de symbiose
   */
  private calculateSymbiosis(
    info: chrome.management.ExtensionInfo,
    organType: OrganType
  ): number {
    let symbiosis = 0;

    // Types généralement symbiotiques
    if (organType === OrganType.BLOCKER ||
        organType === OrganType.SECURITY ||
        organType === OrganType.ENHANCER) {
      symbiosis += 0.3;
    }

    // Types potentiellement parasitaires
    if (organType === OrganType.UNKNOWN) {
      symbiosis -= 0.2;
    }

    // Permissions intrusives
    if (info.permissions) {
      const intrusivePerms = ['tabs', 'webNavigation', 'history', 'cookies'];
      for (const perm of intrusivePerms) {
        if (info.permissions.includes(perm)) {
          symbiosis -= 0.1;
        }
      }

      // Permissions protectrices
      const protectivePerms = ['privacy', 'contentSettings'];
      for (const perm of protectivePerms) {
        if (info.permissions.includes(perm)) {
          symbiosis += 0.15;
        }
      }
    }

    // Host permissions trop larges = parasitaire
    if (info.hostPermissions) {
      if (info.hostPermissions.includes('<all_urls>') ||
          info.hostPermissions.includes('*://*/*')) {
        symbiosis -= 0.3;
      }
    }

    return Math.max(-1, Math.min(1, symbiosis));
  }

  /**
   * Estime l'activité de l'extension
   */
  private estimateActivity(info: chrome.management.ExtensionInfo): number {
    // Base sur l'état et le type
    let activity = info.enabled ? 0.5 : 0;

    // Extensions toujours actives
    if (info.type === 'extension') {
      activity += 0.3;
    }

    // Avec background script = plus actif
    if (info.permissions?.includes('background')) {
      activity += 0.2;
    }

    return Math.min(1, activity);
  }

  /**
   * Déclenche une réponse immunitaire
   */
  private triggerImmuneResponse(signature: ExtensionSignature): void {
    const currentAntibody = this.immuneSystem.antibodies.get(signature.id) || 0;
    this.immuneSystem.antibodies.set(signature.id, Math.min(1, currentAntibody + 0.2));

    this.immuneSystem.inflammation += 0.1;
    this.immuneSystem.threatLevel = Math.min(1, this.immuneSystem.threatLevel + 0.15);

    logger.warn(`Immune response triggered against ${signature.name}`);
  }

  /**
   * Établit une relation symbiotique
   */
  private establishSymbiosis(signature: ExtensionSignature): void {
    const currentTolerance = this.immuneSystem.tolerance.get(signature.id) || 0;
    this.immuneSystem.tolerance.set(signature.id, Math.min(1, currentTolerance + 0.3));

    this.immuneSystem.inflammation = Math.max(0, this.immuneSystem.inflammation - 0.05);

    logger.info(`Symbiosis established with ${signature.name}`);
  }

  /**
   * Met à jour la réponse immunitaire globale
   */
  private updateImmuneResponse(): void {
    // Réduire l'inflammation au fil du temps
    this.immuneSystem.inflammation *= 0.95;

    // Calculer le niveau de menace global
    let totalThreat = 0;
    let organCount = 0;

    for (const signature of this.detectedOrgans.values()) {
      if (signature.symbiosis < 0) {
        totalThreat += Math.abs(signature.symbiosis) * signature.activity;
      }
      organCount++;
    }

    this.immuneSystem.threatLevel = organCount > 0 ? totalThreat / organCount : 0;

    // Nettoyer les vieux anticorps
    for (const [id, level] of this.immuneSystem.antibodies) {
      if (!this.detectedOrgans.has(id)) {
        const newLevel = level * 0.9;
        if (newLevel < 0.1) {
          this.immuneSystem.antibodies.delete(id);
        } else {
          this.immuneSystem.antibodies.set(id, newLevel);
        }
      }
    }
  }

  /**
   * Callbacks pour les événements d'extension
   */
  private async onExtensionDetected(info: chrome.management.ExtensionInfo): Promise<void> {
    logger.info(`New extension detected: ${info.name}`);
    await this.analyzeExtension(info);
  }

  private onExtensionRemoved(id: string): void {
    const signature = this.detectedOrgans.get(id);
    if (signature) {
      logger.info(`Extension removed: ${signature.name}`);
      this.detectedOrgans.delete(id);
    }
  }

  private async onExtensionActivated(info: chrome.management.ExtensionInfo): Promise<void> {
    await this.analyzeExtension(info);
  }

  private onExtensionDeactivated(info: chrome.management.ExtensionInfo): void {
    const signature = this.detectedOrgans.get(info.id);
    if (signature) {
      signature.activity = 0;
      signature.lastDetected = Date.now();
    }
  }

  /**
   * Obtient la liste des organes détectés
   */
  public getDetectedOrgans(): ExtensionSignature[] {
    return Array.from(this.detectedOrgans.values())
      .sort((a, b) => b.activity - a.activity);
  }

  /**
   * Obtient l'état du système immunitaire
   */
  public getImmuneState(): ImmuneResponse {
    return {
      ...this.immuneSystem,
      antibodies: new Map(this.immuneSystem.antibodies),
      tolerance: new Map(this.immuneSystem.tolerance)
    };
  }

  /**
   * Calcule l'influence des organes sur la chimie
   */
  public getChemicalInfluence(): Partial<{
    adrenaline: number;
    dopamine: number;
    cortisol: number;
    oxytocin: number;
  }> {
    const influences: any = {};

    // Stress des extensions parasitaires
    if (this.immuneSystem.threatLevel > 0.3) {
      influences.adrenaline = this.immuneSystem.threatLevel * 0.3;
      influences.cortisol = this.immuneSystem.threatLevel * 0.2;
    }

    // Plaisir des extensions symbiotiques
    let symbioticCount = 0;
    for (const signature of this.detectedOrgans.values()) {
      if (signature.symbiosis > 0.5) {
        symbioticCount++;
      }
    }

    if (symbioticCount > 0) {
      influences.dopamine = Math.min(0.3, symbioticCount * 0.1);
      influences.oxytocin = Math.min(0.2, symbioticCount * 0.05);
    }

    return influences;
  }

  /**
   * Vérifie si une extension spécifique est détectée
   */
  public hasOrgan(organType: OrganType): boolean {
    for (const signature of this.detectedOrgans.values()) {
      if (signature.organType === organType && signature.activity > 0.3) {
        return true;
      }
    }
    return false;
  }

  /**
   * Calcule la distance biologique entre deux signatures
   */
  public calculateBioDistance(sig1: Float32Array, sig2: Float32Array): number {
    let distance = 0;
    const len = Math.min(sig1.length, sig2.length);

    for (let i = 0; i < len; i++) {
      distance += Math.pow(sig1[i] - sig2[i], 2);
    }

    return Math.sqrt(distance);
  }
}
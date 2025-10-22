// src/core/services/UserIdentityService.ts
import { generateSecureUUID } from '@/shared/utils/uuid';
import { logger } from '@/shared/utils/secureLogger';
import { SecureRandom } from '@/shared/utils/secureRandom';

export interface UserIdentity {
  id: string;
  createdAt: number;
  lastActive: number;
  invitationCode: string;
  generation: number;
}

/**
 * Storage adapter that works in both browser and service worker contexts
 */
class StorageAdapter {
  private static isServiceWorker(): boolean {
    return typeof window === 'undefined' && typeof chrome !== 'undefined' && !!chrome.storage;
  }

  static async getItem(key: string): Promise<string | null> {
    if (this.isServiceWorker()) {
      try {
        const result = await chrome.storage.local.get([key]);
        return result[key] || null;
      } catch (error) {
        logger.error('Service worker storage get failed:', error);
        return null;
      }
    } else {
      return localStorage.getItem(key);
    }
  }

  static async setItem(key: string, value: string): Promise<void> {
    if (this.isServiceWorker()) {
      try {
        await chrome.storage.local.set({ [key]: value });
      } catch (error) {
        logger.error('Service worker storage set failed:', error);
        throw error;
      }
    } else {
      localStorage.setItem(key, value);
    }
  }

  static async removeItem(key: string): Promise<void> {
    if (this.isServiceWorker()) {
      try {
        await chrome.storage.local.remove([key]);
      } catch (error) {
        logger.error('Service worker storage remove failed:', error);
      }
    } else {
      localStorage.removeItem(key);
    }
  }
}

export class UserIdentityService {
  private static readonly USER_ID_KEY = 'symbiont_user_id';
  private static readonly USER_IDENTITY_KEY = 'symbiont_user_identity';

  /**
   * Obtient ou crée un identifiant utilisateur unique
   */
  static async getUserId(): Promise<string> {
    try {
      let userId = await StorageAdapter.getItem(this.USER_ID_KEY);
      
      if (!userId) {
        userId = generateSecureUUID();
        await StorageAdapter.setItem(this.USER_ID_KEY, userId);
        
        // Créer l'identité complète
        await this.createUserIdentity(userId);
        
        logger.info('New user identity created:', { userId: userId.substring(0, 8) + '...' });
      }
      
      // Mettre à jour la dernière activité
      await this.updateLastActive(userId);
      
      return userId;
    } catch (error) {
      logger.error('Failed to get or create user ID:', error);
      // Fallback avec un UUID temporaire
      return generateSecureUUID();
    }
  }

  /**
   * Obtient l'identité complète de l'utilisateur
   */
  static async getUserIdentity(): Promise<UserIdentity> {
    try {
      const userId = await this.getUserId();
      const stored = await StorageAdapter.getItem(this.USER_IDENTITY_KEY);
      
      if (stored) {
        const identity: UserIdentity = JSON.parse(stored);
        
        // Vérifier la cohérence de l'ID
        if (identity.id === userId) {
          return identity;
        }
      }
      
      // Créer une nouvelle identité si nécessaire
      return await this.createUserIdentity(userId);
    } catch (error) {
      logger.error('Failed to get user identity:', error);
      // Fallback avec une identité temporaire
      const userId = await this.getUserId();
      return await this.createUserIdentity(userId);
    }
  }

  /**
   * Crée une nouvelle identité utilisateur
   */
  private static async createUserIdentity(userId: string): Promise<UserIdentity> {
    const now = Date.now();
    const identity: UserIdentity = {
      id: userId,
      createdAt: now,
      lastActive: now,
      invitationCode: this.generateInvitationCode(),
      generation: 1
    };

    try {
      await StorageAdapter.setItem(this.USER_IDENTITY_KEY, JSON.stringify(identity));
      logger.info('User identity created:', { 
        id: identity.id.substring(0, 8) + '...',
        invitationCode: identity.invitationCode
      });
    } catch (error) {
      logger.error('Failed to save user identity:', error);
    }

    return identity;
  }

  /**
   * Met à jour la dernière activité de l'utilisateur
   */
  static async updateLastActive(userId: string): Promise<void> {
    try {
      const identity = await this.getUserIdentity();
      if (identity.id === userId) {
        identity.lastActive = Date.now();
        await StorageAdapter.setItem(this.USER_IDENTITY_KEY, JSON.stringify(identity));
      }
    } catch (error) {
      logger.error('Failed to update last active:', error);
    }
  }

  /**
   * Génère un code d'invitation unique et mémorable (cryptographically secure)
   */
  private static generateInvitationCode(): string {
    // Génère un code de 6 caractères alphanumériques avec SecureRandom
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(SecureRandom.random() * chars.length);
      code += chars[randomIndex];
    }
    
    return code;
  }

  /**
   * Régénère le code d'invitation
   */
  static async regenerateInvitationCode(): Promise<string> {
    try {
      const identity = await this.getUserIdentity();
      identity.invitationCode = this.generateInvitationCode();
      await StorageAdapter.setItem(this.USER_IDENTITY_KEY, JSON.stringify(identity));
      
      logger.info('Invitation code regenerated:', { 
        userId: identity.id.substring(0, 8) + '...',
        newCode: identity.invitationCode 
      });
      
      return identity.invitationCode;
    } catch (error) {
      logger.error('Failed to regenerate invitation code:', error);
      return this.generateInvitationCode();
    }
  }

  /**
   * Incrémente la génération de l'utilisateur
   */
  static async incrementGeneration(): Promise<number> {
    try {
      const identity = await this.getUserIdentity();
      identity.generation += 1;
      await StorageAdapter.setItem(this.USER_IDENTITY_KEY, JSON.stringify(identity));
      
      logger.info('User generation incremented:', { 
        userId: identity.id.substring(0, 8) + '...',
        generation: identity.generation 
      });
      
      return identity.generation;
    } catch (error) {
      logger.error('Failed to increment generation:', error);
      return 1;
    }
  }

  /**
   * Obtient les statistiques de l'utilisateur
   */
  static async getUserStats(): Promise<{
    daysSinceCreation: number;
    daysActive: number;
    generation: number;
    invitationCode: string;
  }> {
    try {
      const identity = await this.getUserIdentity();
      const now = Date.now();
      const daysSinceCreation = Math.floor((now - identity.createdAt) / (24 * 60 * 60 * 1000));
      const daysActive = Math.floor((now - identity.lastActive) / (24 * 60 * 60 * 1000));
      
      return {
        daysSinceCreation,
        daysActive,
        generation: identity.generation,
        invitationCode: identity.invitationCode
      };
    } catch (error) {
      logger.error('Failed to get user stats:', error);
      return {
        daysSinceCreation: 0,
        daysActive: 0,
        generation: 1,
        invitationCode: 'ERROR'
      };
    }
  }

  /**
   * Valide un code d'invitation
   */
  static validateInvitationCode(code: string): boolean {
    // Valide le format : 6 caractères alphanumériques
    const regex = /^[A-Z0-9]{6}$/;
    return regex.test(code);
  }

  /**
   * Réinitialise l'identité utilisateur (pour debug/reset)
   */
  static async resetUserIdentity(): Promise<UserIdentity> {
    try {
      await StorageAdapter.removeItem(this.USER_ID_KEY);
      await StorageAdapter.removeItem(this.USER_IDENTITY_KEY);
      
      const newIdentity = await this.getUserIdentity();
      
      logger.info('User identity reset:', { 
        newId: newIdentity.id.substring(0, 8) + '...',
        newCode: newIdentity.invitationCode 
      });
      
      return newIdentity;
    } catch (error) {
      logger.error('Failed to reset user identity:', error);
      throw error;
    }
  }

  /**
   * Exporte l'identité pour sauvegarde/migration
   */
  static async exportIdentity(): Promise<string> {
    try {
      const identity = await this.getUserIdentity();
      return JSON.stringify(identity);
    } catch (error) {
      logger.error('Failed to export identity:', error);
      throw error;
    }
  }

  /**
   * Importe une identité depuis une sauvegarde
   */
  static async importIdentity(identityData: string): Promise<void> {
    try {
      const identity: UserIdentity = JSON.parse(identityData);
      
      // Valider la structure
      if (!identity.id || !identity.invitationCode || !identity.createdAt) {
        throw new Error('Invalid identity data structure');
      }
      
      await StorageAdapter.setItem(this.USER_ID_KEY, identity.id);
      await StorageAdapter.setItem(this.USER_IDENTITY_KEY, identityData);
      
      logger.info('User identity imported:', { 
        id: identity.id.substring(0, 8) + '...',
        generation: identity.generation 
      });
    } catch (error) {
      logger.error('Failed to import identity:', error);
      throw error;
    }
  }
}
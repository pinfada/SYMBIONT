/**
 * Tests de validation de sécurité pour SYMBIONT
 */

import { SecuritySanitizer } from '../../src/shared/utils/sanitizer';
import { SymbiontEncryption } from '../../src/shared/utils/encryption';
import { SecurityMonitor } from '../../src/shared/security/SecurityMonitor';
import { SecureMessageBus } from '../../src/shared/messaging/SecureMessageBus';
import { MessageType } from '../../src/shared/messaging/MessageBus';

describe('Security Tests Suite', () => {
  
  describe('XSS Prevention', () => {
    test('should sanitize malicious DNA strings', () => {
      const maliciousDNA = '<script>alert("XSS")</script>ATCG';
      const sanitized = SecuritySanitizer.sanitizeDNA(maliciousDNA);
      expect(sanitized).toBe('UNSAFE_DNA');
    });

    test('should sanitize HTML content', () => {
      const maliciousHTML = '<img src=x onerror=alert("XSS")>';
      const sanitized = SecuritySanitizer.sanitizeHTML(maliciousHTML);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('onerror');
    });

    test('should validate URLs safely', () => {
      expect(SecuritySanitizer.sanitizeURL('javascript:alert("XSS")')).toBeNull();
      expect(SecuritySanitizer.sanitizeURL('https://example.com')).toBe('https://example.com/');
    });
  });

  describe('Encryption Security', () => {
    test('should encrypt and decrypt data correctly', async () => {
      const testData = 'sensitive organism data';
      const encrypted = await SymbiontEncryption.encrypt(testData);
      const decrypted = await SymbiontEncryption.decrypt(encrypted);
      
      expect(decrypted).toBe(testData);
      expect(encrypted).not.toContain(testData);
      expect(encrypted.length).toBeGreaterThan(testData.length);
    });

    test('should fail on corrupted encrypted data', async () => {
      const testData = 'test data';
      const encrypted = await SymbiontEncryption.encrypt(testData);
      const corrupted = encrypted.slice(0, -5) + 'XXXXX';
      
      await expect(SymbiontEncryption.decrypt(corrupted))
        .rejects.toThrow('Failed to decrypt data');
    });

    test('should generate different outputs for same input', async () => {
      const testData = 'same data';
      const encrypted1 = await SymbiontEncryption.encrypt(testData);
      const encrypted2 = await SymbiontEncryption.encrypt(testData);
      
      expect(encrypted1).not.toBe(encrypted2); // Different salt/IV
    });
  });

  describe('Message Validation', () => {
    test('should reject invalid message types', () => {
      const invalidMessage = {
        type: 'INVALID_TYPE' as MessageType,
        payload: {}
      };
      
      expect(SecureMessageBus.validateMessage(invalidMessage)).toBe(false);
    });

    test('should reject oversized messages', () => {
      const oversizedMessage = {
        type: MessageType.ORGANISM_UPDATE,
        payload: {
          id: 'test',
          traits: {},
          // Données trop volumineuses
          largeData: 'x'.repeat(2000)
        }
      };
      
      expect(SecureMessageBus.validateMessage(oversizedMessage)).toBe(false);
    });

    test('should validate required fields', () => {
      const validMessage = {
        type: MessageType.ORGANISM_UPDATE,
        payload: {
          id: 'valid-id',
          traits: { curiosity: 0.5 }
        }
      };
      
      expect(SecureMessageBus.validateMessage(validMessage)).toBe(true);
    });
  });

  describe('Security Monitoring', () => {
    beforeEach(() => {
      // Reset monitoring state
      SecurityMonitor['events'] = [];
    });

    test('should log security events', () => {
      SecurityMonitor.logSecurityEvent({
        type: 'XSS_ATTEMPT',
        severity: 'HIGH',
        source: 'test',
        details: { test: true }
      });
      
      const events = SecurityMonitor.getRecentEvents(1);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('XSS_ATTEMPT');
    });

    test('should trigger lockdown on critical events', () => {
      SecurityMonitor.logSecurityEvent({
        type: 'DATA_BREACH',
        severity: 'CRITICAL',
        source: 'test',
        details: {}
      });
      
      // Vérifier que le lockdown est activé
      expect(SecurityMonitor.isInLockdown()).toBe(true);
    });

    test('should validate URLs and log threats', () => {
      const result = SecurityMonitor.validateURL('javascript:alert("hack")');
      
      expect(result).toBe(false);
      const events = SecurityMonitor.getRecentEvents(1);
      expect(events[0].type).toBe('XSS_ATTEMPT');
    });
  });

  describe('Permission Security', () => {
    test('should not have excessive host permissions', async () => {
      // Charger le manifest et vérifier les permissions
      const response = await fetch(chrome.runtime.getURL('manifest.json'));
      const manifest = await response.json();
      
      // Vérifier que host_permissions est vide (sécurisé)
      expect(manifest.host_permissions).toEqual([]);
      
      // Vérifier que les permissions obligatoires sont présentes
      const requiredPermissions = ['storage', 'activeTab', 'scripting'];
      for (const permission of requiredPermissions) {
        expect(manifest.permissions).toContain(permission);
      }
    });

    test('should have secure CSP configuration', async () => {
      const response = await fetch(chrome.runtime.getURL('manifest.json'));
      const manifest = await response.json();
      
      const csp = manifest.content_security_policy?.extension_pages;
      expect(csp).toBeDefined();
      
      // Vérifier que 'unsafe-inline' est retiré
      expect(csp).not.toContain("'unsafe-inline'");
      
      // Vérifier les sources sécurisées
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("object-src 'none'");
    });
  });
});

// Helper pour les tests d'intégration
export class SecurityTestHelper {
  
  /**
   * Simule une tentative d'attaque XSS
   */
  static async simulateXSSAttack(): Promise<boolean> {
    const maliciousPayloads = [
      '<script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src=x onerror=alert("XSS")>',
      'data:text/html,<script>alert("XSS")</script>'
    ];
    
    let attackBlocked = true;
    
    for (const payload of maliciousPayloads) {
      const sanitized = SecuritySanitizer.sanitizeHTML(payload);
      if (sanitized.includes('<script>') || sanitized.includes('javascript:')) {
        attackBlocked = false;
        break;
      }
    }
    
    return attackBlocked;
  }
  
  /**
   * Teste la résistance au brute force du chiffrement
   */
  static async testEncryptionStrength(): Promise<boolean> {
    const testData = 'secret organism data';
    const encrypted = await SymbiontEncryption.encrypt(testData);
    
    // Vérifier que les données sont vraiment chiffrées
    const entropy = this.calculateEntropy(encrypted);
    
    // Une chaîne bien chiffrée devrait avoir une entropie élevée
    return entropy > 3.5; // Seuil arbitraire pour l'entropie
  }
  
  private static calculateEntropy(str: string): number {
    const freq: Record<string, number> = {};
    
    for (const char of str) {
      freq[char] = (freq[char] || 0) + 1;
    }
    
    let entropy = 0;
    const len = str.length;
    
    for (const count of Object.values(freq)) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }
    
    return entropy;
  }
}
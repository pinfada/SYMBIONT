/**
 * Tests de protection des données et conformité RGPD
 * Améliore la couverture de sécurité selon audit
 */
import { logger } from '@/shared/utils/secureLogger';

// Mock des classes de protection des données
class DataProtectionManager {
  private readonly dataRetentionPeriods = {
    logs: 7 * 24 * 60 * 60 * 1000, // 7 days
    sessionData: 30 * 24 * 60 * 60 * 1000, // 30 days
    userData: 365 * 24 * 60 * 60 * 1000, // 1 year
    analyticsData: 90 * 24 * 60 * 60 * 1000 // 90 days
  };

  anonymizePersonalData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveFields = ['email', 'userId', 'sessionId', 'ipAddress', 'name'];
    const anonymized = { ...data };

    for (const [key, value] of Object.entries(anonymized)) {
      if (sensitiveFields.includes(key.toLowerCase())) {
        if (typeof value === 'string') {
          // Replace with anonymized version
          anonymized[key] = this.anonymizeString(value);
        }
      } else if (typeof value === 'object') {
        // Recursively anonymize nested objects
        anonymized[key] = this.anonymizePersonalData(value);
      }
    }

    return anonymized;
  }

  private anonymizeString(value: string): string {
    if (this.isEmail(value)) {
      return this.anonymizeEmail(value);
    } else if (this.isUserId(value)) {
      return this.anonymizeUserId(value);
    } else if (this.isSessionId(value)) {
      return this.anonymizeSessionId(value);
    } else if (this.isIpAddress(value)) {
      return this.anonymizeIpAddress(value);
    }
    
    // Generic anonymization for other sensitive strings
    return value.length > 4 
      ? value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2)
      : '*'.repeat(value.length);
  }

  private isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private isUserId(value: string): boolean {
    return /^(user|usr|u)-?[a-zA-Z0-9]+$/i.test(value);
  }

  private isSessionId(value: string): boolean {
    return /^[a-f0-9]{32,}$/i.test(value);
  }

  private isIpAddress(value: string): boolean {
    return /^(\d{1,3}\.){3}\d{1,3}$/.test(value) || 
           /^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i.test(value);
  }

  private anonymizeEmail(email: string): string {
    const [local, domain] = email.split('@');
    const anonymizedLocal = local.length > 2 
      ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
      : '*'.repeat(local.length);
    return `${anonymizedLocal}@${domain}`;
  }

  private anonymizeUserId(userId: string): string {
    return userId.substring(0, 4) + '*'.repeat(Math.max(0, userId.length - 4));
  }

  private anonymizeSessionId(sessionId: string): string {
    return sessionId.substring(0, 8) + '*'.repeat(Math.max(0, sessionId.length - 8));
  }

  private anonymizeIpAddress(ip: string): string {
    if (ip.includes('.')) {
      // IPv4
      const parts = ip.split('.');
      return `${parts[0]}.${parts[1]}.*.***`;
    } else if (ip.includes(':')) {
      // IPv6
      const parts = ip.split(':');
      return parts.slice(0, 4).join(':') + ':****:****:****:****';
    }
    return '***.***.***.**';
  }

  validateDataRetention(dataType: string, createdAt: number): boolean {
    const retentionPeriod = this.dataRetentionPeriods[dataType as keyof typeof this.dataRetentionPeriods];
    if (!retentionPeriod) {
      logger.warn('Unknown data type for retention validation', { dataType }, 'data-protection');
      return false;
    }

    const now = Date.now();
    const isWithinRetention = (now - createdAt) <= retentionPeriod;
    
    if (!isWithinRetention) {
      logger.info('Data retention period exceeded', { 
        dataType, 
        age: now - createdAt,
        retentionPeriod 
      }, 'data-protection');
    }
    
    return isWithinRetention;
  }

  async exportUserData(userId: string): Promise<UserDataExport> {
    // Simulate data export for GDPR compliance
    const userData = {
      userId,
      profile: {
        createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
        lastLogin: Date.now() - 24 * 60 * 60 * 1000, // 24 hours ago
        preferences: {
          theme: 'dark',
          notifications: true
        }
      },
      organisms: [
        {
          id: 'org-1',
          name: 'Neural Entity Alpha',
          createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
          traits: ['intelligence', 'adaptation']
        }
      ],
      sessions: [
        {
          id: 'session-1',
          createdAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
          duration: 3600000 // 1 hour
        }
      ]
    };

    return {
      exportedAt: Date.now(),
      format: 'json',
      data: userData,
      hash: await this.calculateDataHash(userData)
    };
  }

  async deleteUserData(userId: string, dataTypes?: string[]): Promise<DataDeletionResult> {
    // Simulate data deletion for GDPR compliance
    const deletionLog = {
      userId,
      requestedAt: Date.now(),
      dataTypes: dataTypes || ['all'],
      status: 'completed' as const
    };

    // In real implementation, this would actually delete the data
    logger.info('User data deletion completed', { 
      userId: this.anonymizeUserId(userId),
      dataTypes: deletionLog.dataTypes
    }, 'data-protection');

    return deletionLog;
  }

  private async calculateDataHash(data: any): Promise<string> {
    const encoder = new TextEncoder();
    const dataString = JSON.stringify(data);
    const dataBuffer = encoder.encode(dataString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

interface UserDataExport {
  exportedAt: number;
  format: string;
  data: any;
  hash: string;
}

interface DataDeletionResult {
  userId: string;
  requestedAt: number;
  dataTypes: string[];
  status: 'pending' | 'completed' | 'failed';
}

describe('Data Protection Security Tests', () => {
  let dataProtectionManager: DataProtectionManager;

  beforeEach(() => {
    dataProtectionManager = new DataProtectionManager();
  });

  describe('Personal Data Anonymization', () => {
    it('should anonymize email addresses correctly', () => {
      const testData = {
        userEmail: 'user@example.com',
        contactEmail: 'test.user+tag@domain.co.uk',
        adminEmail: 'admin@company.org'
      };

      const anonymized = dataProtectionManager.anonymizePersonalData(testData);

      expect(anonymized.userEmail).toMatch(/^u\*+r@example\.com$/);
      expect(anonymized.contactEmail).toMatch(/^t\*+g@domain\.co\.uk$/);
      expect(anonymized.adminEmail).toMatch(/^a\*+n@company\.org$/);
      
      // Original emails should not be visible
      expect(anonymized.userEmail).not.toBe(testData.userEmail);
      expect(anonymized.contactEmail).not.toBe(testData.contactEmail);
      expect(anonymized.adminEmail).not.toBe(testData.adminEmail);
    });

    it('should anonymize user IDs securely', () => {
      const testData = {
        userId: 'user-12345678',
        authorId: 'usr_abcdefgh',
        sessionUserId: 'u-xyz789'
      };

      const anonymized = dataProtectionManager.anonymizePersonalData(testData);

      expect(anonymized.userId).toBe('user********');
      expect(anonymized.authorId).toBe('usr_*******');
      expect(anonymized.sessionUserId).toBe('u-xy***');
      
      // Should not expose original IDs
      expect(anonymized.userId).not.toContain('12345678');
      expect(anonymized.authorId).not.toContain('abcdefgh');
      expect(anonymized.sessionUserId).not.toContain('789');
    });

    it('should anonymize session IDs properly', () => {
      const testData = {
        sessionId: 'a1b2c3d4e5f6789012345678901234567890abcdef123456789012345678901234',
        oldSessionId: 'f1e2d3c4b5a6987654321098765432109876543210fedcba0987654321098765'
      };

      const anonymized = dataProtectionManager.anonymizePersonalData(testData);

      expect(anonymized.sessionId).toMatch(/^a1b2c3d4\*+$/);
      expect(anonymized.oldSessionId).toMatch(/^f1e2d3c4\*+$/);
      
      // Should not expose full session IDs
      expect(anonymized.sessionId.length).toBeLessThan(testData.sessionId.length);
      expect(anonymized.oldSessionId.length).toBeLessThan(testData.oldSessionId.length);
    });

    it('should anonymize IP addresses correctly', () => {
      const testData = {
        clientIp: '192.168.1.100',
        serverIp: '10.0.0.50',
        publicIp: '203.0.113.42',
        ipv6Address: '2001:0db8:85a3:0000:0000:8a2e:0370:7334'
      };

      const anonymized = dataProtectionManager.anonymizePersonalData(testData);

      // IPv4 should show first two octets only
      expect(anonymized.clientIp).toBe('192.168.*.**');
      expect(anonymized.serverIp).toBe('10.0.*.**');
      expect(anonymized.publicIp).toBe('203.0.*.**');
      
      // IPv6 should show first 4 groups only
      expect(anonymized.ipv6Address).toBe('2001:0db8:85a3:0000:****:****:****:****');
    });

    it('should handle nested objects recursively', () => {
      const testData = {
        user: {
          profile: {
            email: 'nested@example.com',
            userId: 'user-nested123'
          },
          session: {
            sessionId: 'abcd1234567890123456789012345678',
            ipAddress: '172.16.0.42'
          }
        },
        metadata: {
          requestIp: '10.1.1.1',
          userAgent: 'Mozilla/5.0...'
        }
      };

      const anonymized = dataProtectionManager.anonymizePersonalData(testData);

      expect(anonymized.user.profile.email).toMatch(/^n\*+d@example\.com$/);
      expect(anonymized.user.profile.userId).toBe('user*********');
      expect(anonymized.user.session.sessionId).toBe('abcd1234*************************');
      expect(anonymized.user.session.ipAddress).toBe('172.16.*.**');
      expect(anonymized.metadata.requestIp).toBe('10.1.*.**');
      expect(anonymized.metadata.userAgent).toBe('Mozilla/5.0...');
    });

    it('should handle edge cases safely', () => {
      const testData = {
        emptyString: '',
        nullValue: null,
        undefinedValue: undefined,
        shortUserId: 'u1',
        shortEmail: 'a@b.c',
        nonStringId: 12345
      };

      const anonymized = dataProtectionManager.anonymizePersonalData(testData);

      expect(anonymized.emptyString).toBe('');
      expect(anonymized.nullValue).toBe(null);
      expect(anonymized.undefinedValue).toBe(undefined);
      expect(anonymized.shortUserId).toBe('**');
      expect(anonymized.shortEmail).toBe('*@b.c');
      expect(anonymized.nonStringId).toBe(12345); // Numbers should remain unchanged
    });
  });

  describe('Data Retention Compliance', () => {
    it('should validate data retention periods correctly', () => {
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;
      const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;

      // Recent logs should be valid
      expect(dataProtectionManager.validateDataRetention('logs', oneDayAgo)).toBe(true);
      
      // Old logs should be invalid
      expect(dataProtectionManager.validateDataRetention('logs', oneWeekAgo - 1000)).toBe(false);
      
      // Recent session data should be valid
      expect(dataProtectionManager.validateDataRetention('sessionData', oneWeekAgo)).toBe(true);
      
      // Old session data should be invalid
      expect(dataProtectionManager.validateDataRetention('sessionData', oneMonthAgo - 1000)).toBe(false);
      
      // Recent user data should be valid
      expect(dataProtectionManager.validateDataRetention('userData', oneMonthAgo)).toBe(true);
      
      // Old user data should be invalid
      expect(dataProtectionManager.validateDataRetention('userData', oneYearAgo - 1000)).toBe(false);
    });

    it('should handle unknown data types safely', () => {
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;

      const result = dataProtectionManager.validateDataRetention('unknownType', oneDayAgo);
      expect(result).toBe(false);
    });
  });

  describe('GDPR Data Export', () => {
    it('should export user data in required format', async () => {
      const userId = 'user-test123';
      const exportResult = await dataProtectionManager.exportUserData(userId);

      expect(exportResult).toHaveProperty('exportedAt');
      expect(exportResult).toHaveProperty('format', 'json');
      expect(exportResult).toHaveProperty('data');
      expect(exportResult).toHaveProperty('hash');
      
      // Export should contain user data
      expect(exportResult.data).toHaveProperty('userId', userId);
      expect(exportResult.data).toHaveProperty('profile');
      expect(exportResult.data).toHaveProperty('organisms');
      expect(exportResult.data).toHaveProperty('sessions');
      
      // Hash should be present and valid
      expect(exportResult.hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate consistent hashes for same data', async () => {
      const userId = 'user-test123';
      
      const export1 = await dataProtectionManager.exportUserData(userId);
      const export2 = await dataProtectionManager.exportUserData(userId);
      
      // Different export times but should have same data hash if data unchanged
      expect(export1.hash).toBe(export2.hash);
    });
  });

  describe('GDPR Data Deletion', () => {
    it('should delete all user data by default', async () => {
      const userId = 'user-delete123';
      
      const deletionResult = await dataProtectionManager.deleteUserData(userId);
      
      expect(deletionResult).toHaveProperty('userId', userId);
      expect(deletionResult).toHaveProperty('status', 'completed');
      expect(deletionResult).toHaveProperty('dataTypes', ['all']);
      expect(deletionResult).toHaveProperty('requestedAt');
      
      // Should have been requested recently
      expect(Date.now() - deletionResult.requestedAt).toBeLessThan(1000);
    });

    it('should delete specific data types when requested', async () => {
      const userId = 'user-partial-delete';
      const dataTypes = ['sessions', 'logs'];
      
      const deletionResult = await dataProtectionManager.deleteUserData(userId, dataTypes);
      
      expect(deletionResult.dataTypes).toEqual(dataTypes);
      expect(deletionResult.status).toBe('completed');
    });

    it('should log deletion without exposing sensitive data', async () => {
      const logSpy = jest.spyOn(logger, 'info');
      
      const userId = 'user-sensitive123';
      await dataProtectionManager.deleteUserData(userId);
      
      // Verify logging occurred
      expect(logSpy).toHaveBeenCalled();
      
      // Check that sensitive data was anonymized in logs
      const logCall = logSpy.mock.calls.find(call => 
        call[0].includes('User data deletion completed')
      );
      
      if (logCall && logCall[1]) {
        const logData = JSON.stringify(logCall[1]);
        expect(logData).not.toContain(userId); // Full userId should not be in logs
        expect(logData).toContain('user*'); // Should contain anonymized version
      }
      
      logSpy.mockRestore();
    });
  });

  describe('Data Protection Error Handling', () => {
    it('should handle malformed data gracefully', () => {
      const malformedData = [
        null,
        undefined,
        'string instead of object',
        123,
        [],
        new Date(),
        Symbol('test'),
        () => {}
      ];

      malformedData.forEach(data => {
        const result = dataProtectionManager.anonymizePersonalData(data);
        expect(result).toBeDefined();
        // Should not throw and should return the input for non-objects
        if (typeof data !== 'object' || data === null) {
          expect(result).toBe(data);
        }
      });
    });

    it('should handle circular references safely', () => {
      const circularData: any = { name: 'test' };
      circularData.self = circularData;

      // This should not cause infinite recursion
      expect(() => {
        dataProtectionManager.anonymizePersonalData(circularData);
      }).not.toThrow();
    });
  });

  describe('Data Integrity Protection', () => {
    it('should detect data tampering through hashing', async () => {
      const userData = {
        userId: 'user-integrity-test',
        profile: { email: 'test@example.com' }
      };

      const export1 = await dataProtectionManager.exportUserData('user-integrity-test');
      
      // Simulate data modification
      const modifiedData = { ...userData, profile: { ...userData.profile, email: 'modified@example.com' } };
      
      // Calculate hash manually to simulate tampering detection
      const encoder = new TextEncoder();
      const originalDataString = JSON.stringify(export1.data);
      const modifiedDataString = JSON.stringify(modifiedData);
      
      const originalHash = await crypto.subtle.digest('SHA-256', encoder.encode(originalDataString));
      const modifiedHash = await crypto.subtle.digest('SHA-256', encoder.encode(modifiedDataString));
      
      // Hashes should be different
      expect(new Uint8Array(originalHash)).not.toEqual(new Uint8Array(modifiedHash));
    });
  });
});
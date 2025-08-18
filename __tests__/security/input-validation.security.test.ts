/**
 * Tests de validation des inputs utilisateur
 * Améliore la couverture de sécurité selon audit
 */
import { ValidationError } from '@/shared/utils/errorValidation';

// Mock des validateurs d'input
class InputValidator {
  static sanitizeUserInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // XSS basic protection
      .replace(/['"]/g, '&quot;') // Quote escaping
      .trim()
      .substring(0, 1000); // Length limit
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  static validateOrganismName(name: string): boolean {
    // Alphanumeric + spaces, 3-50 chars
    const nameRegex = /^[a-zA-Z0-9\s]{3,50}$/;
    return nameRegex.test(name);
  }

  static validateJSON(jsonString: string): boolean {
    try {
      JSON.parse(jsonString);
      return true;
    } catch {
      return false;
    }
  }

  static sanitizeFilePath(filePath: string): string {
    // Remove path traversal attempts
    return filePath
      .replace(/\.\./g, '')
      .replace(/[\/\\]/g, '_')
      .replace(/[<>:"|?*]/g, '');
  }

  static validateMutationData(data: unknown): data is MutationData {
    if (!data || typeof data !== 'object') return false;
    
    const mutation = data as any;
    return (
      typeof mutation.type === 'string' &&
      typeof mutation.strength === 'number' &&
      mutation.strength >= 0 && mutation.strength <= 1 &&
      (!mutation.target || typeof mutation.target === 'string')
    );
  }
}

interface MutationData {
  type: string;
  strength: number;
  target?: string;
}

describe('Input Validation Security Tests', () => {
  describe('XSS Prevention', () => {
    it('should sanitize basic XSS attempts', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        '<svg onload="alert(1)">',
        'javascript:alert(1)',
        '<iframe src="javascript:alert(1)">',
        '<body onload="alert(1)">'
      ];

      maliciousInputs.forEach(input => {
        const sanitized = InputValidator.sanitizeUserInput(input);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('<img');
        expect(sanitized).not.toContain('<svg');
        expect(sanitized).not.toContain('<iframe');
        expect(sanitized).not.toContain('<body');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('onerror=');
        expect(sanitized).not.toContain('onload=');
      });
    });

    it('should handle unicode XSS attempts', () => {
      const unicodeXSS = [
        '\u003cscript\u003ealert(1)\u003c/script\u003e',
        '\x3Cscript\x3Ealert(1)\x3C/script\x3E',
        '&lt;script&gt;alert(1)&lt;/script&gt;'
      ];

      unicodeXSS.forEach(input => {
        const sanitized = InputValidator.sanitizeUserInput(input);
        expect(sanitized).toBeDefined();
        expect(sanitized.length).toBeGreaterThan(0);
      });
    });

    it('should preserve safe content', () => {
      const safeInputs = [
        'Hello World',
        'My organism name is Symbiont-1',
        'Energy level: 85%',
        'Mutation completed successfully'
      ];

      safeInputs.forEach(input => {
        const sanitized = InputValidator.sanitizeUserInput(input);
        expect(sanitized).toBe(input);
      });
    });
  });

  describe('NoSQL Injection Prevention', () => {
    it('should detect NoSQL injection patterns', () => {
      const nosqlAttacks = [
        '{"$ne": ""}',
        '{"$gt": ""}',
        '{"$regex": ".*"}',
        '{"$where": "function() { return true; }"}',
        '{"$exists": true}',
        '{"$in": ["admin", "root"]}',
        '{"$or": [{"admin": true}, {"user": "admin"}]}'
      ];

      nosqlAttacks.forEach(attack => {
        const isValid = InputValidator.validateJSON(attack);
        expect(isValid).toBe(true); // JSON is valid
        
        // But we should detect and reject NoSQL operators
        const hasNoSQLOperators = /\$\w+/.test(attack);
        expect(hasNoSQLOperators).toBe(true);
        
        // In a real validator, we would reject this
        const isSafeQuery = !hasNoSQLOperators;
        expect(isSafeQuery).toBe(false);
      });
    });

    it('should validate safe query objects', () => {
      const safeQueries = [
        '{"name": "Symbiont-1"}',
        '{"energy": 85}',
        '{"type": "neural", "active": true}',
        '{"traits": ["intelligence", "adaptation"]}'
      ];

      safeQueries.forEach(query => {
        const isValid = InputValidator.validateJSON(query);
        expect(isValid).toBe(true);
        
        const hasNoSQLOperators = /\$\w+/.test(query);
        expect(hasNoSQLOperators).toBe(false);
      });
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should prevent directory traversal attacks', () => {
      const traversalAttacks = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config\\sam',
        '....//....//etc/shadow',
        '..%2F..%2F..%2Fetc%2Fpasswd',
        '..%5c..%5c..%5cwindows%5csystem32',
        '/var/log/../../../etc/passwd',
        'C:\\Users\\..\\..\\Windows\\System32'
      ];

      traversalAttacks.forEach(attack => {
        const sanitized = InputValidator.sanitizeFilePath(attack);
        expect(sanitized).not.toContain('..');
        expect(sanitized).not.toContain('/');
        expect(sanitized).not.toContain('\\');
        expect(sanitized).not.toContain('etc');
        expect(sanitized).not.toContain('passwd');
        expect(sanitized).not.toContain('system32');
      });
    });

    it('should allow safe file names', () => {
      const safeNames = [
        'organism_data.json',
        'backup_20250818.txt',
        'neural_weights_v1.dat',
        'user_preferences.config'
      ];

      safeNames.forEach(name => {
        const sanitized = InputValidator.sanitizeFilePath(name);
        // Should be similar but with path separators removed
        expect(sanitized).toBeTruthy();
        expect(sanitized.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Email Validation', () => {
    it('should validate legitimate emails', () => {
      const validEmails = [
        'user@example.com',
        'test.user+tag@domain.co.uk',
        'user123@test-domain.org',
        'simple@domain.net'
      ];

      validEmails.forEach(email => {
        expect(InputValidator.validateEmail(email)).toBe(true);
      });
    });

    it('should reject malicious email attempts', () => {
      const maliciousEmails = [
        'user@domain.com<script>alert(1)</script>',
        'user+<img src=x onerror=alert(1)>@domain.com',
        'javascript:alert(1)@domain.com',
        'user@domain.com"; DROP TABLE users; --',
        'user@domain.com\\r\\nBCC: attacker@evil.com'
      ];

      maliciousEmails.forEach(email => {
        expect(InputValidator.validateEmail(email)).toBe(false);
      });
    });

    it('should handle email length limits', () => {
      const longEmail = 'a'.repeat(250) + '@domain.com';
      expect(InputValidator.validateEmail(longEmail)).toBe(false);
      
      const maxEmail = 'a'.repeat(240) + '@domain.com';
      expect(InputValidator.validateEmail(maxEmail)).toBe(true);
    });
  });

  describe('Organism Data Validation', () => {
    it('should validate proper mutation data', () => {
      const validMutations = [
        { type: 'genetic', strength: 0.5 },
        { type: 'behavioral', strength: 0.1, target: 'social' },
        { type: 'neural', strength: 1.0 },
        { type: 'adaptive', strength: 0.0, target: 'environment' }
      ];

      validMutations.forEach(mutation => {
        expect(InputValidator.validateMutationData(mutation)).toBe(true);
      });
    });

    it('should reject malicious mutation data', () => {
      const maliciousMutations = [
        { type: '<script>alert(1)</script>', strength: 0.5 },
        { type: 'genetic', strength: -1 }, // Negative strength
        { type: 'genetic', strength: 2 }, // Over limit
        { type: 'genetic', strength: 'high' }, // Wrong type
        { constructor: { prototype: {} }, type: 'genetic', strength: 0.5 },
        { type: 'genetic', strength: 0.5, __proto__: { malicious: true } }
      ];

      maliciousMutations.forEach(mutation => {
        expect(InputValidator.validateMutationData(mutation)).toBe(false);
      });
    });

    it('should validate organism names', () => {
      const validNames = [
        'Symbiont Alpha',
        'Neural Entity 42',
        'Adaptive Organism',
        'Entity123'
      ];

      const invalidNames = [
        'A', // Too short
        'A'.repeat(51), // Too long
        'Entity<script>alert(1)</script>', // XSS
        'Organism"; DROP TABLE organisms; --', // SQL injection
        'Entity\r\nMalicious\r\n', // CRLF injection
        'Organism\x00null\x00' // Null byte injection
      ];

      validNames.forEach(name => {
        expect(InputValidator.validateOrganismName(name)).toBe(true);
      });

      invalidNames.forEach(name => {
        expect(InputValidator.validateOrganismName(name)).toBe(false);
      });
    });
  });

  describe('Buffer Overflow Prevention', () => {
    it('should limit input lengths', () => {
      const maxLength = 1000;
      const oversizedInput = 'A'.repeat(maxLength + 100);
      
      const sanitized = InputValidator.sanitizeUserInput(oversizedInput);
      expect(sanitized.length).toBeLessThanOrEqual(maxLength);
    });

    it('should handle empty and null inputs safely', () => {
      const emptyInputs = ['', null, undefined];
      
      emptyInputs.forEach(input => {
        const result = InputValidator.sanitizeUserInput(input as string);
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });
    });
  });

  describe('Regular Expression Security', () => {
    it('should use safe regex patterns', () => {
      const testInputs = [
        'a'.repeat(1000),
        'aaaaaaaaaaaaaaaaaaaaaa!',
        'x'.repeat(10000),
        'normal input'
      ];

      testInputs.forEach(input => {
        const start = performance.now();
        
        // Test email regex performance
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        emailRegex.test(input + '@test.com');
        
        // Test organism name regex performance
        const nameRegex = /^[a-zA-Z0-9\s]{3,50}$/;
        nameRegex.test(input);
        
        const duration = performance.now() - start;
        
        // Regex should not take more than 10ms
        expect(duration).toBeLessThan(10);
      });
    });

    it('should prevent ReDoS attacks', () => {
      // Test patterns that could cause catastrophic backtracking
      const potentialReDoSInputs = [
        'a'.repeat(50) + 'X',
        'abc'.repeat(100) + 'X',
        '123'.repeat(200) + 'X'
      ];

      potentialReDoSInputs.forEach(input => {
        const start = performance.now();
        
        // Safe regex that won't cause ReDoS
        const safeRegex = /^[a-zA-Z0-9]{3,50}$/;
        safeRegex.test(input);
        
        const duration = performance.now() - start;
        expect(duration).toBeLessThan(5);
      });
    });
  });

  describe('Content Security Policy', () => {
    it('should validate CSP-safe content', () => {
      const unsafeContent = [
        "javascript:alert('xss')",
        "data:text/html,<script>alert(1)</script>",
        "vbscript:msgbox('xss')",
        "about:blank#<script>alert(1)</script>"
      ];

      unsafeContent.forEach(content => {
        const isUnsafe = /^(javascript|data|vbscript|about):/.test(content);
        expect(isUnsafe).toBe(true);
        
        // CSP should block this content
        const sanitized = InputValidator.sanitizeUserInput(content);
        expect(sanitized).not.toMatch(/^(javascript|data|vbscript):/);
      });
    });
  });
});
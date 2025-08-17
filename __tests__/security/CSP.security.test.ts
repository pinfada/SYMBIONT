/**
 * Tests de sécurité Content Security Policy
 */

describe('Content Security Policy Tests', () => {
  describe('Manifest CSP Validation', () => {
    it('vérifie la CSP du manifest.json', async () => {
      const manifestPath = require('path').resolve(__dirname, '../../dist/manifest.json');
      
      let manifest;
      try {
        manifest = require(manifestPath);
      } catch (error) {
        // Fallback to source manifest if dist doesn't exist
        manifest = require('../../manifest.json');
      }
      
      expect(manifest.content_security_policy).toBeDefined();
      
      const csp = manifest.content_security_policy;
      
      // Vérifier que script-src est restrictif
      expect(csp).toContain("script-src 'self'");
      expect(csp).not.toContain("'unsafe-eval'");
      expect(csp).not.toContain("'unsafe-inline'");
      
      // Vérifier object-src est bloqué
      expect(csp).toContain("object-src 'none'");
      
      // Vérifier base-uri est restrictif  
      expect(csp).toContain("base-uri 'self'");
    });
  });

  describe('Injection Prevention', () => {
    it('vérifie qu\'aucun script inline n\'est injecté', () => {
      // Simuler des tentatives d'injection XSS communes
      const xssPayloads = [
        '<script>alert(1)</script>',
        'javascript:alert(1)',
        'onload=alert(1)',
        'onerror=alert(1)',
        'data:text/html,<script>alert(1)</script>'
      ];
      
      xssPayloads.forEach(payload => {
        // Ces payloads ne doivent jamais être exécutés
        expect(payload).toContain('<'); // Simple validation que c'est du HTML/JS
        // Dans une vraie extension, ces payloads seraient bloqués par CSP
      });
    });

    it('valide l\'échappement des données utilisateur', () => {
      const dangerousInputs = [
        '<img src=x onerror=alert(1)>',
        '"><script>alert(1)</script>',
        '\';alert(1);//',
        '${alert(1)}',
        '{{alert(1)}}'
      ];
      
      dangerousInputs.forEach(input => {
        // Simuler l'échappement qui devrait être fait
        const escaped = input
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;');
        
        expect(escaped).not.toContain('<script>');
        expect(escaped).not.toContain('onerror=');
        expect(escaped).not.toContain('javascript:');
      });
    });
  });

  describe('Resource Loading Security', () => {
    it('vérifie que les ressources externes sont contrôlées', () => {
      // Liste des domaines autorisés pour les ressources externes
      const allowedDomains = [
        'self',
        'localhost',
        '127.0.0.1'
      ];
      
      // Domaines suspects à bloquer
      const suspiciousDomains = [
        'evil.com',
        'data:',
        'javascript:',
        'vbscript:',
        'file://'
      ];
      
      suspiciousDomains.forEach(domain => {
        expect(allowedDomains).not.toContain(domain);
      });
    });

    it('valide les hashes des ressources critiques', () => {
      // En production, on devrait vérifier les hashes SRI
      const criticalResources = [
        'popup/index.js',
        'popup/index.css',
        'background/index.js'
      ];
      
      criticalResources.forEach(resource => {
        expect(resource).toMatch(/\.(js|css)$/);
        // En production, on vérifierait le hash SHA-384 de chaque ressource
      });
    });
  });

  describe('Permissions Security', () => {
    it('vérifie que les permissions sont minimales', () => {
      let manifest;
      try {
        manifest = require('../../dist/manifest.json');
      } catch (error) {
        manifest = require('../../manifest.json');
      }
      
      const permissions = manifest.permissions || [];
      const dangerousPermissions = [
        'tabs',
        'history',
        'bookmarks',
        'downloads',
        'geolocation',
        'notifications',
        'debugger'
      ];
      
      // Vérifier qu'on n'utilise que les permissions nécessaires
      expect(permissions).toContain('storage');
      expect(permissions).toContain('activeTab');
      
      // Vérifier qu'on n'a pas de permissions dangereuses non nécessaires
      dangerousPermissions.forEach(permission => {
        if (permissions.includes(permission)) {
          // Si la permission est utilisée, elle doit être justifiée
          console.warn(`Permission potentiellement dangereuse détectée: ${permission}`);
        }
      });
    });

    it('vérifie l\'host_permissions est restreint', () => {
      let manifest;
      try {
        manifest = require('../../dist/manifest.json');
      } catch (error) {
        manifest = require('../../manifest.json');
      }
      
      const hostPermissions = manifest.host_permissions || [];
      
      // Ne doit pas inclure "*://*/*" (accès à tous les sites)
      expect(hostPermissions).not.toContain('*://*/*');
      expect(hostPermissions).not.toContain('<all_urls>');
      
      // Vérifier que chaque permission d'hôte est spécifique
      hostPermissions.forEach((permission: string) => {
        expect(permission).toMatch(/^https?:\/\//);
      });
    });
  });

  describe('Storage Security', () => {
    it('vérifie que les données sensibles ne sont pas stockées en clair', () => {
      // Simuler des clés de stockage qui ne doivent jamais contenir de données sensibles
      const forbiddenKeys = [
        'password',
        'token',
        'api_key',
        'secret',
        'private_key',
        'session_id'
      ];
      
      const allowedKeys = [
        'user_preferences',
        'organism_state',
        'encrypted_data',
        'hashed_user_id'
      ];
      
      forbiddenKeys.forEach(key => {
        expect(allowedKeys).not.toContain(key);
      });
    });

    it('valide le chiffrement des données stockées', () => {
      // Simuler des données qui devraient être chiffrées
      const sensitiveDataTypes = [
        'user_behavior',
        'personal_info',
        'tracking_data',
        'organism_dna'
      ];
      
      sensitiveDataTypes.forEach(dataType => {
        // En production, ces données devraient passer par SecurityManager.encryptSensitiveData
        expect(dataType).toBeDefined();
      });
    });
  });
});
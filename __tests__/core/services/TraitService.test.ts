/**
 * Tests pour TraitService - Service de gestion des traits d'organisme
 */

import { TraitService } from '../../../src/core/services/TraitService';
import { OrganismTraits } from '../../../src/shared/types/organism';

describe('TraitService', () => {
  let traitService: TraitService;

  beforeEach(() => {
    traitService = new TraitService();
  });

  afterEach(() => {
    traitService.cleanup();
  });

  describe('Initialization', () => {
    test('should initialize with default traits', () => {
      const traits = traitService.getAllTraits();
      
      expect(traits.curiosity).toBe(0.5);
      expect(traits.focus).toBe(0.5);
      expect(traits.empathy).toBe(0.5);
      expect(Object.keys(traits)).toHaveLength(10);
    });

    test('should initialize with custom traits', () => {
      const customTraits: Partial<OrganismTraits> = {
        curiosity: 0.8,
        creativity: 0.9
      };
      
      const service = new TraitService(customTraits);
      const traits = service.getAllTraits();
      
      expect(traits.curiosity).toBe(0.8);
      expect(traits.creativity).toBe(0.9);
      expect(traits.focus).toBe(0.5); // Valeur par défaut
      
      service.cleanup();
    });
  });

  describe('Trait Updates', () => {
    test('should update a single trait', () => {
      traitService.updateTrait('curiosity', 0.7);
      
      expect(traitService.getTrait('curiosity')).toBe(0.7);
    });

    test('should clamp trait values between 0 and 1', () => {
      traitService.updateTrait('curiosity', 1.5);
      expect(traitService.getTrait('curiosity')).toBe(1);
      
      traitService.updateTrait('focus', -0.5);
      expect(traitService.getTrait('focus')).toBe(0);
    });

    test('should update multiple traits', () => {
      const updates: Partial<OrganismTraits> = {
        curiosity: 0.8,
        creativity: 0.6,
        empathy: 0.9
      };
      
      traitService.updateTraits(updates);
      
      expect(traitService.getTrait('curiosity')).toBe(0.8);
      expect(traitService.getTrait('creativity')).toBe(0.6);
      expect(traitService.getTrait('empathy')).toBe(0.9);
    });

    test('should normalize traits to valid range', () => {
      // Force des valeurs invalides
      traitService.updateTrait('curiosity', 2.0);
      traitService.updateTrait('focus', -1.0);
      
      traitService.normalizeTraits();
      
      expect(traitService.getTrait('curiosity')).toBe(1.0);
      expect(traitService.getTrait('focus')).toBe(0.0);
    });
  });

  describe('History Tracking', () => {
    test('should track trait change history', () => {
      traitService.updateTrait('curiosity', 0.7, 'test_trigger');
      traitService.updateTrait('curiosity', 0.8, 'test_trigger');
      
      const history = traitService.getTraitHistory('curiosity');
      
      expect(history).toHaveLength(2);
      expect(history[0].value).toBe(0.7);
      expect(history[1].value).toBe(0.8);
      expect(history[0].trigger).toBe('test_trigger');
    });

    test('should get full history with limit', () => {
      // Ajoute plusieurs changements
      for (let i = 0; i < 20; i++) {
        traitService.updateTrait('curiosity', i / 20);
      }
      
      const history = traitService.getFullHistory(10);
      expect(history).toHaveLength(10);
    });

    test('should cleanup old history', () => {
      traitService.updateTrait('curiosity', 0.7);
      
      // Force un timestamp ancien
      const history = traitService.getTraitHistory('curiosity');
      if (history.length > 0) {
        history[0].timestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 heures
      }
      
      traitService.cleanup(24 * 60 * 60 * 1000); // 24 heures
      
      const remainingHistory = traitService.getTraitHistory('curiosity');
      expect(remainingHistory.length).toBeLessThan(history.length);
    });
  });

  describe('Event Listeners', () => {
    test('should notify listeners on trait changes', (done) => {
      let eventReceived = false;
      
      traitService.addTraitChangeListener((event) => {
        expect(event.traitName).toBe('curiosity');
        expect(event.newValue).toBe(0.8);
        expect(event.oldValue).toBe(0.5);
        eventReceived = true;
        done();
      });
      
      traitService.updateTrait('curiosity', 0.8);
      
      // Vérification de sécurité
      setTimeout(() => {
        if (!eventReceived) {
          done(new Error('Event listener not triggered'));
        }
      }, 100);
    });

    test('should remove listeners correctly', () => {
      let callCount = 0;
      
      const listener = () => { callCount++; };
      
      traitService.addTraitChangeListener(listener);
      traitService.updateTrait('curiosity', 0.8);
      expect(callCount).toBe(1);
      
      traitService.removeTraitChangeListener(listener);
      traitService.updateTrait('focus', 0.7);
      expect(callCount).toBe(1); // Pas d'augmentation
    });
  });

  describe('Balance Calculation', () => {
    test('should calculate balance for even traits', () => {
      // Traits équilibrés (tous à 0.5)
      const balance = traitService.calculateBalance();
      expect(balance).toBeCloseTo(1.0, 2); // Balance parfaite
    });

    test('should calculate balance for uneven traits', () => {
      traitService.updateTraits({
        curiosity: 1.0,
        focus: 0.0,
        empathy: 1.0,
        creativity: 0.0
      });
      
      const balance = traitService.calculateBalance();
      expect(balance).toBeLessThan(0.5); // Balance faible
    });
  });

  describe('Serialization', () => {
    test('should serialize and deserialize correctly', () => {
      traitService.updateTrait('curiosity', 0.8);
      traitService.updateTrait('creativity', 0.6);
      
      const serialized = traitService.toJSON();
      const newService = new TraitService();
      newService.fromJSON(serialized);
      
      expect(newService.getTrait('curiosity')).toBe(0.8);
      expect(newService.getTrait('creativity')).toBe(0.6);
      
      newService.cleanup();
    });

    test('should preserve history in serialization', () => {
      traitService.updateTrait('curiosity', 0.8, 'test');
      
      const serialized = traitService.toJSON();
      const newService = new TraitService();
      newService.fromJSON(serialized);
      
      const history = newService.getTraitHistory('curiosity');
      expect(history).toHaveLength(1);
      expect(history[0].trigger).toBe('test');
      
      newService.cleanup();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid trait names gracefully', () => {
      expect(() => {
        traitService.updateTrait('invalid_trait' as any, 0.5);
      }).not.toThrow();
    });

    test('should handle cleanup when no data exists', () => {
      expect(() => {
        traitService.cleanup();
      }).not.toThrow();
    });
  });
});
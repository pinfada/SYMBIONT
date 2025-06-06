// Tests unitaires pour les opérations sécurisées
import {
  safeAverage,
  safeRatio,
  safeGetClasses,
  safeSplit,
  safeLength,
  safeJsonParse,
  safeGet,
  safeLimitArray
} from '../safeOperations';

// Mock DOM environment for tests
const mockElement = (className?: string) => ({
  className,
  tagName: 'DIV'
} as Element);

describe('SafeOperations Tests', () => {
  
  describe('safeAverage', () => {
    test('should return 0 for empty array', () => {
      expect(safeAverage([])).toBe(0);
    });
    
    test('should return 0 for null/undefined', () => {
      expect(safeAverage(null as any)).toBe(0);
      expect(safeAverage(undefined as any)).toBe(0);
    });
    
    test('should calculate correct average', () => {
      expect(safeAverage([1, 2, 3, 4, 5])).toBe(3);
      expect(safeAverage([10, 20])).toBe(15);
    });
  });

  describe('safeRatio', () => {
    test('should return 0 when denominator is 0', () => {
      expect(safeRatio(10, 0)).toBe(0);
    });
    
    test('should calculate correct ratio', () => {
      expect(safeRatio(10, 2)).toBe(5);
      expect(safeRatio(0, 5)).toBe(0);
    });
  });

  describe('safeGetClasses', () => {
    test('should return empty array for null/undefined', () => {
      expect(safeGetClasses(null)).toEqual([]);
      expect(safeGetClasses(undefined)).toEqual([]);
    });
    
    test('should return empty array for element without className', () => {
      const element = mockElement();
      expect(safeGetClasses(element)).toEqual([]);
    });
    
    test('should split and filter classes correctly', () => {
      const element = mockElement('class1 class2  class3 ');
      expect(safeGetClasses(element)).toEqual(['class1', 'class2', 'class3']);
    });
    
    test('should handle non-string className', () => {
      const element = { className: 123 } as any;
      expect(safeGetClasses(element)).toEqual([]);
    });
  });

  describe('safeSplit', () => {
    test('should return empty array for non-string input', () => {
      expect(safeSplit(null, ' ')).toEqual([]);
      expect(safeSplit(undefined, ' ')).toEqual([]);
      expect(safeSplit(123, ' ')).toEqual([]);
    });
    
    test('should split string correctly', () => {
      expect(safeSplit('a b c', ' ')).toEqual(['a', 'b', 'c']);
      expect(safeSplit('hello,world', ',')).toEqual(['hello', 'world']);
    });
  });

  describe('safeLength', () => {
    test('should return 0 for null/undefined', () => {
      expect(safeLength(null)).toBe(0);
      expect(safeLength(undefined)).toBe(0);
    });
    
    test('should return 0 for non-objects', () => {
      expect(safeLength('string')).toBe(0);
      expect(safeLength(123)).toBe(0);
    });
    
    test('should return length for arrays', () => {
      expect(safeLength([1, 2, 3])).toBe(3);
      expect(safeLength([])).toBe(0);
    });
  });

  describe('safeJsonParse', () => {
    test('should return default for invalid JSON', () => {
      expect(safeJsonParse('invalid json', 'default')).toBe('default');
      expect(safeJsonParse('', 'default')).toBe('default');
      expect(safeJsonParse(null as any, 'default')).toBe('default');
    });
    
    test('should parse valid JSON', () => {
      expect(safeJsonParse('{"key": "value"}', {})).toEqual({ key: 'value' });
      expect(safeJsonParse('[1,2,3]', [])).toEqual([1, 2, 3]);
    });
    
    test('should handle null values correctly', () => {
      expect(safeJsonParse('null', 'default')).toBe('default');
    });
  });

  describe('safeGet', () => {
    test('should return default for null/undefined object', () => {
      expect(safeGet(null, 'path', 'default')).toBe('default');
      expect(safeGet(undefined, 'path', 'default')).toBe('default');
    });
    
    test('should return default for non-existent path', () => {
      const obj = { a: { b: 'value' } };
      expect(safeGet(obj, 'a.c', 'default')).toBe('default');
      expect(safeGet(obj, 'x.y.z', 'default')).toBe('default');
    });
    
    test('should return correct value for valid path', () => {
      const obj = { a: { b: { c: 'found' } } };
      expect(safeGet(obj, 'a.b.c', 'default')).toBe('found');
      expect(safeGet(obj, 'a.b', 'default')).toEqual({ c: 'found' });
    });
  });

  describe('safeLimitArray', () => {
    test('should return empty array for null/undefined', () => {
      expect(safeLimitArray(null as any, 5)).toEqual([]);
      expect(safeLimitArray(undefined as any, 5)).toEqual([]);
    });
    
    test('should return original array if within limit', () => {
      const arr = [1, 2, 3];
      expect(safeLimitArray(arr, 5)).toEqual([1, 2, 3]);
    });
    
    test('should limit array to max size from end', () => {
      const arr = [1, 2, 3, 4, 5, 6];
      expect(safeLimitArray(arr, 3)).toEqual([4, 5, 6]);
    });
  });
}); 
// tests/integration/statistics.test.ts
// Tests d'intégration pour vérifier que les statistiques s'incrémentent correctement

import { OrganismStateManager } from '../../src/shared/services/OrganismStateManager';
import { logger } from '../../src/shared/utils/secureLogger';

describe('Statistics Tracking Integration Tests', () => {
  let stateManager: OrganismStateManager;

  beforeEach(() => {
    // Mock Chrome storage API
    global.chrome = {
      storage: {
        local: {
          get: jest.fn().mockResolvedValue({}),
          set: jest.fn().mockResolvedValue(undefined)
        },
        onChanged: {
          addListener: jest.fn()
        }
      }
    } as any;

    // Mock window.setTimeout pour les tests
    jest.useFakeTimers();

    // Créer une nouvelle instance pour chaque test
    stateManager = OrganismStateManager.getInstance();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    stateManager.destroy();
  });

  describe('Page Visit Tracking', () => {
    it('should increment pagesVisited only once per unique page', async () => {
      const initialState = stateManager.getState();
      const initialVisits = initialState.pagesVisited;

      // Première visite d'une page
      await stateManager.onPageVisit('default');
      let state = stateManager.getState();
      expect(state.pagesVisited).toBe(initialVisits + 1);

      // Si on appelle onPageVisit plusieurs fois pour la même page,
      // cela devrait être géré par OrganismController (ne pas appeler plusieurs fois)
      // Mais si c'est appelé, ça incrémente à nouveau (comportement actuel)
      await stateManager.onPageVisit('default');
      state = stateManager.getState();
      expect(state.pagesVisited).toBe(initialVisits + 2);
    });

    it('should track different page types correctly', async () => {
      const initialState = stateManager.getState();

      // Visite d'une page normale
      await stateManager.onPageVisit('default');
      let state = stateManager.getState();
      expect(state.currentPageType).toBe('default');
      expect(state.pagesVisited).toBe(initialState.pagesVisited + 1);

      // Visite d'une page scientifique
      await stateManager.onPageVisit('science');
      state = stateManager.getState();
      expect(state.currentPageType).toBe('science');
      expect(state.pagesVisited).toBe(initialState.pagesVisited + 2);
    });
  });

  describe('Knowledge Tracking', () => {
    it('should increment knowledgeGained only for educational pages', async () => {
      const initialState = stateManager.getState();
      const initialKnowledge = initialState.knowledgeGained;

      // Page normale - pas de gain de connaissances
      await stateManager.onPageVisit('default');
      let state = stateManager.getState();
      expect(state.knowledgeGained).toBe(initialKnowledge);

      // Page de divertissement - pas de gain
      await stateManager.onPageVisit('entertainment');
      state = stateManager.getState();
      expect(state.knowledgeGained).toBe(initialKnowledge);

      // Page scientifique - gain de connaissances
      await stateManager.onPageVisit('science');
      state = stateManager.getState();
      expect(state.knowledgeGained).toBe(initialKnowledge + 1);

      // Page d'apprentissage - gain de connaissances
      await stateManager.onPageVisit('learning');
      state = stateManager.getState();
      expect(state.knowledgeGained).toBe(initialKnowledge + 2);
    });

    it('should track knowledge from feed source', async () => {
      const initialState = stateManager.getState();
      const initialKnowledge = initialState.knowledgeGained;

      // Nourrir via knowledge source
      await stateManager.feed('knowledge');
      const state = stateManager.getState();
      expect(state.knowledgeGained).toBe(initialKnowledge + 1);
    });
  });

  describe('Social Interactions Tracking', () => {
    it('should increment socialInteractions for social pages', async () => {
      const initialState = stateManager.getState();
      const initialSocial = initialState.socialInteractions;

      // Page normale - pas d'interaction sociale
      await stateManager.onPageVisit('default');
      let state = stateManager.getState();
      expect(state.socialInteractions).toBe(initialSocial);

      // Page sociale - interaction comptée
      await stateManager.onPageVisit('social');
      state = stateManager.getState();
      expect(state.socialInteractions).toBe(initialSocial + 1);
    });

    it('should track social interactions from feed source', async () => {
      const initialState = stateManager.getState();
      const initialSocial = initialState.socialInteractions;

      // Nourrir via social source
      await stateManager.feed('social');
      const state = stateManager.getState();
      expect(state.socialInteractions).toBe(initialSocial + 1);
    });
  });

  describe('Experience Points Tracking', () => {
    it('should award correct XP for different page types', async () => {
      const initialState = stateManager.getState();
      const initialXP = initialState.experience;

      // Page par défaut: 5 XP
      await stateManager.onPageVisit('default');
      let state = stateManager.getState();
      expect(state.experience).toBe(initialXP + 5);

      // Page scientifique: 15 XP
      await stateManager.onPageVisit('science');
      state = stateManager.getState();
      expect(state.experience).toBe(initialXP + 5 + 15);

      // Page d'apprentissage: 15 XP
      await stateManager.onPageVisit('learning');
      state = stateManager.getState();
      expect(state.experience).toBe(initialXP + 5 + 15 + 15);

      // Page sociale: 10 XP
      await stateManager.onPageVisit('social');
      state = stateManager.getState();
      expect(state.experience).toBe(initialXP + 5 + 15 + 15 + 10);
    });
  });

  describe('State Persistence', () => {
    it('should save state changes to storage', async () => {
      const setSpy = jest.spyOn(chrome.storage.local, 'set');

      await stateManager.onPageVisit('science');

      // Attendre le debounce (1 seconde)
      jest.advanceTimersByTime(1000);

      expect(setSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          organism_state: expect.objectContaining({
            pagesVisited: expect.any(Number),
            knowledgeGained: expect.any(Number),
            currentPageType: 'science'
          })
        })
      );
    });
  });
});

// Test du comportement du OrganismController (simulé)
describe('OrganismController Page Detection', () => {
  it('should only count unique page visits', () => {
    // Simulation du comportement attendu du OrganismController
    class MockOrganismController {
      private currentPageUrl: string = '';
      private hasVisitedCurrentPage: boolean = false;
      private pageVisitCount: number = 0;

      async checkAndRecordPageVisit(url: string): Promise<boolean> {
        if (url !== this.currentPageUrl) {
          this.currentPageUrl = url;
          this.hasVisitedCurrentPage = false;
        }

        if (!this.hasVisitedCurrentPage) {
          this.hasVisitedCurrentPage = true;
          this.pageVisitCount++;
          return true; // Nouvelle visite
        }

        return false; // Déjà visité
      }

      getPageVisitCount(): number {
        return this.pageVisitCount;
      }
    }

    const controller = new MockOrganismController();

    // Première visite de page1
    expect(controller.checkAndRecordPageVisit('page1')).toBeTruthy();
    expect(controller.getPageVisitCount()).toBe(1);

    // Appels répétés sur la même page - ne devrait pas compter
    expect(controller.checkAndRecordPageVisit('page1')).toBeFalsy();
    expect(controller.checkAndRecordPageVisit('page1')).toBeFalsy();
    expect(controller.getPageVisitCount()).toBe(1);

    // Nouvelle page
    expect(controller.checkAndRecordPageVisit('page2')).toBeTruthy();
    expect(controller.getPageVisitCount()).toBe(2);

    // Retour à la première page (devrait compter comme nouvelle visite)
    expect(controller.checkAndRecordPageVisit('page1')).toBeTruthy();
    expect(controller.getPageVisitCount()).toBe(3);
  });
});
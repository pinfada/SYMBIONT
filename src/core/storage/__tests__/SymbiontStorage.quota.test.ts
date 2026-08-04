import { SymbiontStorage } from '../SymbiontStorage';

/**
 * Régressions couvertes :
 * - « Failed to check storage quota: Error: Database not initialized » :
 *   checkStorageQuota s'exécute pendant l'initialisation, avant l'ouverture
 *   de la base — elle ne doit jamais lancer cleanup() en ligne.
 * - « STORAGE CRITICAL: Approaching maximum storage size limit » : l'usage
 *   mesuré par navigator.storage.estimate() couvre toute l'origine, y compris
 *   le cache du modèle LLM local (centaines de Mo). Le budget interne de
 *   50 Mo ne doit être comparé qu'à l'usage IndexedDB rapporté par le
 *   navigateur (Chromium), jamais à l'usage global.
 */

type QuotaEstimate = {
  usage: number;
  quota: number;
  usageDetails?: { indexedDB?: number };
};

const MB = 1024 * 1024;

function mockStorageEstimate(estimate: QuotaEstimate): void {
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: {
      estimate: jest.fn(async () => estimate)
    }
  });
}

/** Accès aux membres privés sous test, sans désactiver le typage ailleurs. */
type StorageInternals = {
  checkStorageQuota(): Promise<void>;
  runPendingCleanup(): Promise<void>;
  scheduleCleanup(retentionDays: number): void;
  pendingCleanupRetentionDays: number | null;
  cleanup(retentionDays?: number): Promise<void>;
  db: unknown;
};

function makeStorage(): { storage: SymbiontStorage; internals: StorageInternals } {
  const storage = new SymbiontStorage();
  return { storage, internals: storage as unknown as StorageInternals };
}

describe('SymbiontStorage — vérification du quota de stockage', () => {
  let storage: SymbiontStorage;
  let internals: StorageInternals;

  beforeEach(() => {
    ({ storage, internals } = makeStorage());
  });

  afterEach(() => {
    storage.close();
    jest.restoreAllMocks();
  });

  test('ne lance jamais cleanup() quand la base n’est pas encore initialisée', async () => {
    // Arrange — usage origine à 95 % du quota, base non ouverte
    mockStorageEstimate({ usage: 950 * MB, quota: 1000 * MB });
    const cleanupSpy = jest
      .spyOn(internals, 'cleanup')
      .mockRejectedValue(new Error('Database not initialized'));

    // Act
    await internals.checkStorageQuota();

    // Assert — pas d’appel en ligne, nettoyage simplement planifié
    expect(cleanupSpy).not.toHaveBeenCalled();
    expect(internals.pendingCleanupRetentionDays).toBe(15);
  });

  test('un gros usage origine (modèle LLM téléchargé) sans détail IndexedDB ne déclenche pas le budget interne', async () => {
    // Arrange — 500 Mo utilisés (modèle LLM) mais quota confortable, pas de
    // usageDetails (comportement Firefox)
    mockStorageEstimate({ usage: 500 * MB, quota: 10000 * MB });

    // Act
    await internals.checkStorageQuota();

    // Assert — aucun nettoyage agressif planifié
    expect(internals.pendingCleanupRetentionDays).toBeNull();
  });

  test('planifie le nettoyage agressif quand l’usage IndexedDB dépasse 90 % du budget interne', async () => {
    // Arrange — origine saine mais IndexedDB au-dessus de 45 Mo (Chromium)
    mockStorageEstimate({
      usage: 600 * MB,
      quota: 10000 * MB,
      usageDetails: { indexedDB: 48 * MB }
    });

    // Act
    await internals.checkStorageQuota();

    // Assert
    expect(internals.pendingCleanupRetentionDays).toBe(7);
  });

  test('conserve la rétention la plus stricte quand plusieurs nettoyages sont planifiés', () => {
    internals.scheduleCleanup(15);
    internals.scheduleCleanup(7);
    internals.scheduleCleanup(30);

    expect(internals.pendingCleanupRetentionDays).toBe(7);
  });

  test('scheduleCleanup exécute immédiatement quand la base est déjà ouverte (résolution tardive du contrôle de quota)', async () => {
    // Arrange — la base est ouverte : le contrôle de quota a dépassé son
    // timeout de 3 s et se résout après la fin de l'initialisation
    internals.db = {};
    const cleanupSpy = jest.spyOn(internals, 'cleanup').mockResolvedValue(undefined);

    // Act
    internals.scheduleCleanup(15);
    await Promise.resolve();
    await Promise.resolve();

    // Assert — le nettoyage ne reste pas orphelin jusqu'au prochain initialize()
    expect(cleanupSpy).toHaveBeenCalledWith(15);
    expect(internals.pendingCleanupRetentionDays).toBeNull();

    internals.db = null;
  });

  test('runPendingCleanup exécute le nettoyage différé une fois la base ouverte', async () => {
    // Arrange
    internals.scheduleCleanup(7);
    internals.db = {};
    const cleanupSpy = jest.spyOn(internals, 'cleanup').mockResolvedValue(undefined);

    // Act
    await internals.runPendingCleanup();

    // Assert
    expect(cleanupSpy).toHaveBeenCalledWith(7);
    expect(internals.pendingCleanupRetentionDays).toBeNull();

    internals.db = null;
  });

  test('runPendingCleanup ne propage pas un échec du nettoyage', async () => {
    // Arrange
    internals.scheduleCleanup(7);
    internals.db = {};
    jest.spyOn(internals, 'cleanup').mockRejectedValue(new Error('transaction aborted'));

    // Act / Assert — l’échec est journalisé, jamais propagé à l’initialisation
    await expect(internals.runPendingCleanup()).resolves.toBeUndefined();

    internals.db = null;
  });

  test('reste silencieuse quand navigator.storage.estimate est indisponible', async () => {
    // Arrange — environnement sans Storage API
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: undefined
    });

    // Act / Assert
    await expect(internals.checkStorageQuota()).resolves.toBeUndefined();
    expect(internals.pendingCleanupRetentionDays).toBeNull();
  });
});

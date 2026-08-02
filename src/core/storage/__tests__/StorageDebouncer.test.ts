import { StorageDebouncer } from '../StorageDebouncer';
import type { OrganismState } from '../../../shared/types/organism';
import type { IndexedDBCoordinator } from '../IndexedDBCoordinator';

/**
 * Coordinateur factice : compte les écritures et permet de les faire échouer.
 */
function makeCoordinator() {
  const saved: OrganismState[] = [];
  let failWith: Error | null = null;
  const coordinator = {
    saveOrganism: jest.fn(async (organism: OrganismState) => {
      if (failWith) throw failWith;
      saved.push(organism);
    }),
    saveBehavior: jest.fn(async () => {})
  };
  return {
    saved,
    coordinator: coordinator as unknown as IndexedDBCoordinator,
    spy: coordinator.saveOrganism,
    fail: (error: Error) => {
      failWith = error;
    }
  };
}

const organism = (id: string, energy: number): OrganismState =>
  ({ id, energy } as unknown as OrganismState);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Échoue avec un message clair plutôt que sur le timeout global de Jest. */
function withinDeadline<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  return Promise.race([
    promise,
    sleep(ms).then(() => {
      throw new Error(`${what} ne s'est jamais réglée (${ms} ms) — promesse pendante`);
    })
  ]) as Promise<T>;
}

// Debounce long + maxPending court : le flush par timer ne part jamais tout
// seul pendant un test, ce qui rend le chemin « flush immédiat » déterministe.
const DEBOUNCE_MS = 400;
const MAX_PENDING_MS = 50;

function freshDebouncer(coordinator: IndexedDBCoordinator): StorageDebouncer {
  StorageDebouncer.reset();
  const debouncer = StorageDebouncer.getInstance(DEBOUNCE_MS, MAX_PENDING_MS);
  void debouncer.setCoordinator(coordinator);
  return debouncer;
}

afterEach(() => {
  StorageDebouncer.reset();
});

describe('StorageDebouncer', () => {
  // Régression principale : la sauvegarde supplantée abandonnait son resolver,
  // laissant l'appelant suspendu pour toujours. `updateOrganismTraits` faisant
  // un await à chaque visite de page, chaque navigation rapide fuyait une frame.
  it('resolves a save that gets superseded by a newer one', async () => {
    const { coordinator, spy, saved } = makeCoordinator();
    const debouncer = freshDebouncer(coordinator);

    const first = debouncer.saveOrganism(organism('o1', 10));
    const second = debouncer.saveOrganism(organism('o1', 20));

    await withinDeadline(Promise.all([first, second]), 2000, 'La sauvegarde supplantée');

    expect(spy).toHaveBeenCalledTimes(1);
    expect(saved[0].energy).toBe(20);
  });

  it('coalesces a burst into a single write and resolves every caller', async () => {
    const { coordinator, spy, saved } = makeCoordinator();
    const debouncer = freshDebouncer(coordinator);

    const calls = Array.from({ length: 10 }, (_, i) =>
      debouncer.saveOrganism(organism('o1', i))
    );

    await withinDeadline(Promise.all(calls), 2000, 'Les sauvegardes coalescées');

    expect(spy).toHaveBeenCalledTimes(1);
    expect(saved[0].energy).toBe(9);
  });

  it('flushes immediately past the max pending time, resolving earlier callers', async () => {
    const { coordinator, spy, saved } = makeCoordinator();
    const debouncer = freshDebouncer(coordinator);

    const first = debouncer.saveOrganism(organism('o1', 1));
    await sleep(MAX_PENDING_MS + 30);
    const second = debouncer.saveOrganism(organism('o1', 2));

    await withinDeadline(Promise.all([first, second]), 2000, 'Le flush immédiat');

    expect(spy).toHaveBeenCalledTimes(1);
    expect(saved[0].energy).toBe(2);
  });

  it('resolves pending callers when flushAll runs', async () => {
    const { coordinator, spy } = makeCoordinator();
    const debouncer = freshDebouncer(coordinator);

    const pending = debouncer.saveOrganism(organism('o1', 5));
    await debouncer.flushAll();

    await withinDeadline(pending, 2000, 'La sauvegarde vidée par flushAll');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('rejects every waiter when the write fails', async () => {
    const { coordinator, fail } = makeCoordinator();
    const debouncer = freshDebouncer(coordinator);
    fail(new Error('disque plein'));

    const first = debouncer.saveOrganism(organism('o1', 1));
    const second = debouncer.saveOrganism(organism('o1', 2));

    await expect(withinDeadline(first, 2000, 'La sauvegarde en échec')).rejects.toThrow(
      'disque plein'
    );
    await expect(second).rejects.toThrow('disque plein');
  });

  it('leaves nothing pending once a burst has settled', async () => {
    const { coordinator } = makeCoordinator();
    const debouncer = freshDebouncer(coordinator);

    await Promise.all([
      debouncer.saveOrganism(organism('o1', 1)),
      debouncer.saveOrganism(organism('o1', 2)),
      debouncer.saveOrganism(organism('o2', 3))
    ]);

    expect(debouncer.getPendingCount().total).toBe(0);
  });
});

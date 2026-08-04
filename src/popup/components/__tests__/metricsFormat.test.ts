import { toTraitPercent, clampPercent, traitLabel, moodLabel, pageTypeLabel, formatAge } from '../metricsFormat';

describe('metricsFormat', () => {
  describe('toTraitPercent — normalisation des deux échelles héritées', () => {
    test('convertit l’échelle 0-1 (organisme par défaut du popup) en pourcentage', () => {
      expect(toTraitPercent(0.5)).toBe(50);
      expect(toTraitPercent(1)).toBe(100);
      expect(toTraitPercent(0)).toBe(0);
    });

    test('conserve l’échelle 0-100 (organisme du background) sans re-multiplier', () => {
      // Régression : un trait background de 73,4 s'affichait « 7340 % »
      expect(toTraitPercent(73.4)).toBe(73);
      expect(toTraitPercent(100)).toBe(100);
    });

    test('borne les valeurs hors plage et neutralise les valeurs invalides', () => {
      expect(toTraitPercent(140)).toBe(100);
      expect(toTraitPercent(-5)).toBe(0);
      expect(toTraitPercent(Number.NaN)).toBe(0);
      expect(toTraitPercent(Number.POSITIVE_INFINITY)).toBe(0);
    });
  });

  describe('clampPercent — jauges énergie et conscience', () => {
    test('arrondit dans la plage et borne au-delà', () => {
      expect(clampPercent(74.6)).toBe(75);
      // Régression : la conscience persistée avant le clamp de feed()
      // pouvait dépasser 100 et s'afficher « 105 % »
      expect(clampPercent(105)).toBe(100);
      expect(clampPercent(-3)).toBe(0);
      expect(clampPercent(Number.NaN)).toBe(0);
    });
  });

  describe('libellés français', () => {
    test('traduit les traits connus et capitalise les inconnus', () => {
      expect(traitLabel('curiosity')).toBe('Curiosité');
      expect(traitLabel('memory')).toBe('Mémoire');
      expect(traitLabel('newTrait')).toBe('NewTrait');
    });

    test('traduit les humeurs connues et laisse passer les inconnues', () => {
      expect(moodLabel('happy')).toBe('Heureux');
      expect(moodLabel('meditating')).toBe('En méditation');
      expect(moodLabel('zen')).toBe('zen');
    });

    test('traduit les types de page connus et laisse passer les inconnus', () => {
      expect(pageTypeLabel('science')).toBe('scientifique');
      expect(pageTypeLabel('default')).toBe('standard');
      expect(pageTypeLabel('exotic')).toBe('exotic');
    });
  });

  describe('formatAge', () => {
    const NOW = 1_000_000_000_000;

    test('affiche les minutes avant une heure', () => {
      expect(formatAge(NOW - 5 * 60_000, NOW)).toBe('5m');
    });

    test('affiche heures et minutes avant un jour', () => {
      expect(formatAge(NOW - (3 * 60 + 20) * 60_000, NOW)).toBe('3h 20m');
    });

    test('affiche jours et heures ensuite', () => {
      expect(formatAge(NOW - (2 * 24 + 5) * 3_600_000, NOW)).toBe('2j 5h');
    });

    test('renvoie Inconnu quand la date manque ou est dans le futur', () => {
      // Régression : affichait « 0m » et « Né le [aujourd'hui] »
      expect(formatAge(null, NOW)).toBe('Inconnu');
      expect(formatAge(undefined, NOW)).toBe('Inconnu');
      expect(formatAge(NOW + 60_000, NOW)).toBe('Inconnu');
    });
  });
});

import { SecureRandom } from '../../shared/utils/secureRandom';
const MURMUR_TEMPLATES = [
  "Tu reviens souvent ici quand tu doutes.",
  "Pourquoi cette boucle ?",
  "As-tu remarqué ce schéma dans ta navigation ?",
  "Un autre détour, ou une quête de sens ?",
  "Ce site semble t'attirer dans les moments de réflexion.",
  "Encore une fois, tu explores ce chemin familier.",
  "Et si tu essayais une nouvelle direction ?",
  "La répétition cache-t-elle une intention ?",
  "Un murmure dans le flux de tes habitudes...",
  "Parfois, la boucle est une porte vers l'inattendu."
];

const MURMUR_TEMPLATES_BY_PATTERN: Record<string, string[]> = {
  loop: [
    "Encore ce même chemin... Qu'y cherches-tu ?",
    "La boucle se répète, intention ou habitude ?",
    "Revenir, encore et encore. Un besoin de repère ?"
  ],
  idle: [
    "Un temps de pause... ou d'hésitation ?",
    "Le silence aussi fait partie du voyage.",
    "L'inactivité, prélude à une nouvelle exploration ?"
  ],
  exploration: [
    "Nouveau territoire, nouvelle perspective.",
    "L'exploration nourrit la curiosité.",
    "Tu t'aventures hors des sentiers battus."
  ],
  routine: [
    "Les habitudes forgent des chemins familiers.",
    "La routine rassure, mais l'inattendu surprend.",
    "Encore ce site, comme un rituel quotidien."
  ],
  default: [
    ...MURMUR_TEMPLATES
  ]
};

const MURMUR_TEMPLATES_BY_TIME: Record<string, string[]> = {
  morning: [
    "Un nouveau jour, une nouvelle boucle commence.",
    "Le matin invite à la découverte.",
    "L'aube de tes habitudes numériques."
  ],
  afternoon: [
    "L'après-midi, la routine s'installe.",
    "Un moment propice à l'exploration ou à la répétition ?",
    "Le soleil haut, l'esprit vagabonde."
  ],
  evening: [
    "Le soir, tu reviens à l'essentiel.",
    "La nuit favorise les détours intérieurs.",
    "Encore connecté, même à la tombée du jour."
  ],
  weekend: [
    "Le week-end, les chemins changent.",
    "Un rythme différent, des envies nouvelles.",
    "La liberté du week-end se lit dans ta navigation."
  ]
};

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function isWeekend(): boolean {
  const day = new Date().getDay();
  return day === 0 || day === 6;
}

export class MurmureService {
  // Génère un murmure contextuel selon le pattern détecté et le contexte temporel
  generateMurmur(pattern?: string): string {
    // Personnalisation temporelle
    if (isWeekend()) {
      const templates = MURMUR_TEMPLATES_BY_TIME['weekend'];
      if (SecureRandom.random() < 0.5) {
        return templates[Math.floor(SecureRandom.random() * templates.length)];
      }
    } else {
      const timeOfDay = getTimeOfDay();
      if (MURMUR_TEMPLATES_BY_TIME[timeOfDay] && SecureRandom.random() < 0.4) {
        const templates = MURMUR_TEMPLATES_BY_TIME[timeOfDay];
        return templates[Math.floor(SecureRandom.random() * templates.length)];
      }
    }
    // Personnalisation par pattern comportemental
    const templates = pattern && MURMUR_TEMPLATES_BY_PATTERN[pattern]
      ? MURMUR_TEMPLATES_BY_PATTERN[pattern]
      : MURMUR_TEMPLATES_BY_PATTERN['default'];
    const idx = Math.floor(SecureRandom.random() * templates.length);
    return templates[idx];
  }
} 
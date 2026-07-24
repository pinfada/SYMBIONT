// Organism Routes — vrai express.Router branché sur Prisma
import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { LoggerService } from '../services/LoggerService';

const router = Router();
const db = DatabaseService.getInstance();
const logger = LoggerService.getInstance();

function requireUserId(req: Request, res: Response): string | null {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: 'Non authentifié' });
    return null;
  }
  return userId;
}

/** Vérifie que l'organisme existe et appartient à l'utilisateur courant. */
async function findOwnedOrganism(req: Request, res: Response) {
  const userId = requireUserId(req, res);
  if (!userId) return null;

  const organism = await db.client.organism.findUnique({
    where: { id: req.params.id }
  });

  if (!organism || organism.userId !== userId) {
    res.status(404).json({ success: false, error: 'Organisme introuvable' });
    return null;
  }
  return organism;
}

// GET / — liste des organismes de l'utilisateur
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const organisms = await db.client.organism.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });
    res.json({ success: true, data: organisms });
  } catch (error: any) {
    logger.error('GET /organisms failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /:id — détail d'un organisme
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const organism = await findOwnedOrganism(req, res);
    if (!organism) return;
    res.json({ success: true, data: organism });
  } catch (error: any) {
    logger.error('GET /organisms/:id failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST / — création d'un organisme
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const { name, dna, visualDNA, traits } = req.body || {};
    if (!dna || typeof dna !== 'string') {
      res.status(400).json({ success: false, error: 'Champ "dna" requis' });
      return;
    }

    const organism = await db.client.organism.create({
      data: {
        userId,
        name: typeof name === 'string' ? name : null,
        dna,
        visualDNA: typeof visualDNA === 'string' ? visualDNA : dna,
        traits: traits && typeof traits === 'object' ? traits : {}
      }
    });
    res.status(201).json({ success: true, data: organism });
  } catch (error: any) {
    logger.error('POST /organisms failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /:id — mise à jour d'un organisme
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const organism = await findOwnedOrganism(req, res);
    if (!organism) return;

    const { name, traits, health, energy, consciousness } = req.body || {};
    const updated = await db.client.organism.update({
      where: { id: organism.id },
      data: {
        ...(typeof name === 'string' ? { name } : {}),
        ...(traits && typeof traits === 'object' ? { traits } : {}),
        ...(typeof health === 'number' ? { health } : {}),
        ...(typeof energy === 'number' ? { energy } : {}),
        ...(typeof consciousness === 'number' ? { consciousness } : {})
      }
    });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    logger.error('PUT /organisms/:id failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /:id/mutate — applique une mutation persistée
router.post('/:id/mutate', async (req: Request, res: Response) => {
  try {
    const organism = await findOwnedOrganism(req, res);
    if (!organism) return;

    const { mutationType, trigger, magnitude, data } = req.body || {};
    if (!mutationType || !trigger) {
      res.status(400).json({
        success: false,
        error: 'Champs "mutationType" et "trigger" requis'
      });
      return;
    }

    const mutation = await db.client.mutation.create({
      data: {
        organismId: organism.id,
        type: String(mutationType),
        trigger: String(trigger),
        magnitude: typeof magnitude === 'number' ? magnitude : 0.5,
        data: data && typeof data === 'object' ? data : {}
      }
    });

    await db.client.organism.update({
      where: { id: organism.id },
      data: { lastMutation: new Date() }
    });

    res.status(201).json({ success: true, data: mutation });
  } catch (error: any) {
    logger.error('POST /organisms/:id/mutate failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /:id/evolution — historique des mutations
router.get('/:id/evolution', async (req: Request, res: Response) => {
  try {
    const organism = await findOwnedOrganism(req, res);
    if (!organism) return;

    const limit = Math.min(200, parseInt(String(req.query.limit)) || 50);
    const mutations = await db.client.mutation.findMany({
      where: { organismId: organism.id },
      orderBy: { timestamp: 'desc' },
      take: limit
    });
    res.json({ success: true, data: mutations });
  } catch (error: any) {
    logger.error('GET /organisms/:id/evolution failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /:id/ritual — enregistre une session de rituel
router.post('/:id/ritual', async (req: Request, res: Response) => {
  try {
    const organism = await findOwnedOrganism(req, res);
    if (!organism) return;

    const { ritualType, duration, intensity, effects } = req.body || {};
    if (!ritualType) {
      res.status(400).json({ success: false, error: 'Champ "ritualType" requis' });
      return;
    }

    const session = await db.client.ritualSession.create({
      data: {
        organismId: organism.id,
        ritualType: String(ritualType),
        duration: typeof duration === 'number' ? duration : 0,
        intensity: typeof intensity === 'number' ? intensity : 0.5,
        effects: effects && typeof effects === 'object' ? effects : {}
      }
    });
    res.status(201).json({ success: true, data: session });
  } catch (error: any) {
    logger.error('POST /organisms/:id/ritual failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /:id/memories — fragments de mémoire
router.get('/:id/memories', async (req: Request, res: Response) => {
  try {
    const organism = await findOwnedOrganism(req, res);
    if (!organism) return;

    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    const memories = await db.client.memoryFragment.findMany({
      where: { organismId: organism.id, ...(type ? { type } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json({ success: true, data: memories });
  } catch (error: any) {
    logger.error('GET /organisms/:id/memories failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /:id/memories — ajoute un fragment de mémoire
router.post('/:id/memories', async (req: Request, res: Response) => {
  try {
    const organism = await findOwnedOrganism(req, res);
    if (!organism) return;

    const { content, type, strength, context } = req.body || {};
    if (!content || !type) {
      res.status(400).json({
        success: false,
        error: 'Champs "content" et "type" requis'
      });
      return;
    }

    const memory = await db.client.memoryFragment.create({
      data: {
        organismId: organism.id,
        content: String(content),
        type: String(type),
        strength: typeof strength === 'number' ? strength : 1.0,
        ...(context && typeof context === 'object' ? { context } : {})
      }
    });
    res.status(201).json({ success: true, data: memory });
  } catch (error: any) {
    logger.error('POST /organisms/:id/memories failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /:id/predictions — prédictions dérivées des données réelles
// (fréquence + récence des mutations et catégories comportementales stockées)
router.get('/:id/predictions', async (req: Request, res: Response) => {
  try {
    const organism = await findOwnedOrganism(req, res);
    if (!organism) return;

    const [recentMutations, behaviorTop] = await Promise.all([
      db.client.mutation.findMany({
        where: { organismId: organism.id },
        orderBy: { timestamp: 'desc' },
        take: 50
      }),
      db.client.behaviorData.groupBy({
        by: ['category'],
        where: { userId: organism.userId },
        _sum: { visitCount: true },
        orderBy: { _sum: { visitCount: 'desc' } },
        take: 3
      })
    ]);

    const predictions: Array<{ prediction: string; confidence: number; details?: unknown }> = [];

    // Tendance de mutation dominante (données réelles)
    if (recentMutations.length > 0) {
      const typeCounts = new Map<string, number>();
      for (const m of recentMutations) {
        typeCounts.set(m.type, (typeCounts.get(m.type) || 0) + 1);
      }
      const [topType, count] = [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0];
      predictions.push({
        prediction: `next_mutation_type:${topType}`,
        confidence: Math.min(0.95, count / recentMutations.length),
        details: { observedMutations: recentMutations.length }
      });
    }

    // Catégories comportementales dominantes (données réelles)
    const totalVisits = behaviorTop.reduce(
      (sum: number, b: { _sum: { visitCount: number | null } }) => sum + (b._sum.visitCount || 0),
      0
    );
    for (const b of behaviorTop) {
      const visits = b._sum.visitCount || 0;
      if (visits > 0 && totalVisits > 0) {
        predictions.push({
          prediction: `likely_category:${b.category}`,
          confidence: Math.min(0.95, visits / totalVisits),
          details: { visits }
        });
      }
    }

    res.json({ success: true, data: predictions });
  } catch (error: any) {
    logger.error('GET /organisms/:id/predictions failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export const organismRoutes = router;
export default router;

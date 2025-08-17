"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Mock router implementation
class Router {
    constructor() {
        this.routes = [];
    }
    get(path, ...handlers) {
        this.routes.push({ method: 'GET', path, handlers });
        return this;
    }
    post(path, ...handlers) {
        this.routes.push({ method: 'POST', path, handlers });
        return this;
    }
    put(path, ...handlers) {
        this.routes.push({ method: 'PUT', path, handlers });
        return this;
    }
    delete(path, ...handlers) {
        this.routes.push({ method: 'DELETE', path, handlers });
        return this;
    }
}
const router = new Router();
/**
 * GET /api/organisms
 * Récupérer tous les organismes de l'utilisateur
 */
router.get('/', async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Non authentifié' });
        }
        const organisms = await getOrganismsByUserId(userId);
        res.json({
            success: true,
            data: organisms,
            meta: {
                count: organisms.length,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/organisms/:id
 * Récupérer un organisme spécifique
 */
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const organism = await getOrganismById(id, userId);
        if (!organism) {
            return res.status(404).json({ error: 'Organisme non trouvé' });
        }
        res.json({
            success: true,
            data: organism
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/organisms
 * Créer un nouvel organisme
 */
router.post('/', async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        const { name, initialTraits } = req.body;
        // Validation
        if (!name || name.length < 2) {
            return res.status(400).json({ error: 'Nom requis (min 2 caractères)' });
        }
        // Générer ADN initial
        const dna = await generateInitialDNA(initialTraits);
        // Créer organisme
        const organism = await createOrganism({
            userId: userId,
            name,
            dna,
            traits: initialTraits || getDefaultTraits(),
            health: 1.0,
            energy: 0.8,
            consciousness: 0.5
        });
        res.status(201).json({
            success: true,
            data: organism,
            message: 'Organisme créé avec succès'
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * PUT /api/organisms/:id
 * Mettre à jour un organisme
 */
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const updates = req.body;
        const organism = await updateOrganism(id, userId, updates);
        if (!organism) {
            return res.status(404).json({ error: 'Organisme non trouvé' });
        }
        res.json({
            success: true,
            data: organism,
            message: 'Organisme mis à jour'
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/organisms/:id/mutate
 * Appliquer une mutation à un organisme
 */
router.post('/:id/mutate', async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const { mutationType, trigger, magnitude } = req.body;
        const mutation = await applyMutation(id, userId, {
            type: mutationType,
            trigger,
            magnitude: magnitude || 0.1,
            timestamp: new Date()
        });
        res.json({
            success: true,
            data: mutation,
            message: 'Mutation appliquée'
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/organisms/:id/evolution
 * Historique évolutif d'un organisme
 */
router.get('/:id/evolution', async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const { limit = 50 } = req.query;
        const evolution = await getEvolutionHistory(id, userId, parseInt(limit));
        res.json({
            success: true,
            data: evolution
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/organisms/:id/ritual
 * Initier un rituel pour l'organisme
 */
router.post('/:id/ritual', async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const { ritualType, duration, intensity } = req.body;
        const ritual = await initiateRitual(id, userId, {
            type: ritualType,
            duration: duration || 30000,
            intensity: intensity || 0.5
        });
        res.json({
            success: true,
            data: ritual,
            message: 'Rituel initié'
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/organisms/:id/memories
 * Récupérer les fragments de mémoire
 */
router.get('/:id/memories', async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const { type, limit = 20 } = req.query;
        const memories = await getMemoryFragments(id, userId, type, parseInt(limit));
        res.json({
            success: true,
            data: memories
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/organisms/:id/memories
 * Ajouter un fragment de mémoire
 */
router.post('/:id/memories', async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const { content, type, strength, context } = req.body;
        const memory = await addMemoryFragment(id, userId, {
            content,
            type,
            strength: strength || 1.0,
            context
        });
        res.json({
            success: true,
            data: memory,
            message: 'Mémoire ajoutée'
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/organisms/:id/predictions
 * Prédictions comportementales pour l'organisme
 */
router.get('/:id/predictions', async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const predictions = await generatePredictions(id, userId);
        res.json({
            success: true,
            data: predictions
        });
    }
    catch (error) {
        next(error);
    }
});
// Mock implementation functions
async function getOrganismsByUserId(userId) {
    return [
        {
            id: '1',
            name: 'Organisme Alpha',
            dna: 'ATCGATCGATCG',
            generation: 1,
            health: 0.9,
            energy: 0.7,
            consciousness: 0.6,
            traits: getDefaultTraits()
        }
    ];
}
async function getOrganismById(id, userId) {
    return {
        id,
        userId,
        name: 'Organisme Alpha',
        dna: 'ATCGATCGATCG',
        generation: 1,
        health: 0.9,
        energy: 0.7,
        consciousness: 0.6,
        traits: getDefaultTraits()
    };
}
async function createOrganism(data) {
    return {
        id: Date.now().toString(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
    };
}
async function updateOrganism(id, userId, updates) {
    return {
        id,
        userId,
        ...updates,
        updatedAt: new Date()
    };
}
async function generateInitialDNA(traits) {
    const bases = ['A', 'T', 'G', 'C'];
    let dna = '';
    for (let i = 0; i < 64; i++) {
        dna += bases[Math.floor(Math.random() * 4)];
    }
    return dna;
}
function getDefaultTraits() {
    return {
        curiosity: 0.5,
        focus: 0.5,
        social: 0.5,
        creativity: 0.5,
        analytical: 0.5,
        adaptability: 0.5
    };
}
async function applyMutation(id, userId, mutation) {
    return {
        id: Date.now().toString(),
        organismId: id,
        ...mutation
    };
}
async function getEvolutionHistory(id, userId, limit) {
    return [];
}
async function initiateRitual(id, userId, ritual) {
    return {
        id: Date.now().toString(),
        organismId: id,
        ...ritual,
        startedAt: new Date()
    };
}
async function getMemoryFragments(id, userId, type, limit) {
    return [];
}
async function addMemoryFragment(id, userId, memory) {
    return {
        id: Date.now().toString(),
        organismId: id,
        ...memory,
        createdAt: new Date()
    };
}
async function generatePredictions(id, userId) {
    return [
        {
            action: 'exploration',
            probability: 0.7,
            confidence: 0.8,
            reasoning: ['High curiosity trait', 'Recent learning activity']
        }
    ];
}
exports.default = router;
//# sourceMappingURL=organisms.js.map
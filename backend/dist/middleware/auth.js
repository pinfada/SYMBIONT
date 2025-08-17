"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token manquant' });
        }
        const token = authHeader.substring(7);
        // Mock validation - replace with real JWT verification
        const payload = await verifyToken(token);
        if (!payload) {
            return res.status(401).json({ error: 'Token invalide' });
        }
        req.user = payload;
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Erreur d\'authentification' });
    }
};
exports.authMiddleware = authMiddleware;
async function verifyToken(token) {
    // Mock implementation
    if (token && token.length > 10) {
        return {
            userId: 'user_123',
            email: 'user@example.com',
            username: 'testuser'
        };
    }
    return null;
}
//# sourceMappingURL=auth.js.map
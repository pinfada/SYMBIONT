// Authentication Middleware — vérification JWT réelle via AuthService
import { Request, Response, NextFunction } from 'express';
import { AuthService, JWTPayload } from '../services/AuthService';

declare module 'express-serve-static-core' {
  interface Request {
    user?: JWTPayload;
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const auth = AuthService.getInstance();
    const token = auth.extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      res.status(401).json({ error: 'Token manquant' });
      return;
    }

    const payload = auth.verifyToken(token);
    if (!payload) {
      res.status(401).json({ error: 'Token invalide ou expiré' });
      return;
    }

    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Erreur d'authentification" });
  }
};

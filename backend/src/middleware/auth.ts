// Authentication Middleware
interface Request {
  headers: { authorization?: string };
  user?: { userId: string; email: string; username: string };
}

interface Response {
  status: (code: number) => Response;
  json: (data: any) => void;
}

interface NextFunction {
  (error?: any): void;
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
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
  } catch (error) {
    res.status(401).json({ error: 'Erreur d\'authentification' });
  }
};

async function verifyToken(token: string): Promise<{ userId: string; email: string; username: string } | null> {
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
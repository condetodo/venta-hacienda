import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../config/jwt';

// Extender el tipo Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// Middleware de autenticación
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ 
        error: 'Token de acceso requerido',
        code: 'MISSING_TOKEN'
      });
      return;
    }

    // Verificar token
    const decoded = verifyToken(token);
    req.user = decoded;
    
    next();
  } catch (error) {
    res.status(401).json({ 
      error: 'Token inválido o expirado',
      code: 'INVALID_TOKEN'
    });
  }
};

// Middleware para verificar rol de administrador
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ 
      error: 'Usuario no autenticado',
      code: 'NOT_AUTHENTICATED'
    });
    return;
  }

  if (req.user.rol !== 'ADMIN') {
    res.status(403).json({ 
    error: 'Se requieren permisos de administrador',
    code: 'INSUFFICIENT_PERMISSIONS'
    });
    return;
  }

  next();
};

// Middleware opcional de autenticación (no falla si no hay token)
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = verifyToken(token);
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // Si hay error con el token, continuar sin usuario
    next();
  }
};


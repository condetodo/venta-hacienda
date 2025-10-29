import jwt from 'jsonwebtoken';
import { env } from './env';

export interface JWTPayload {
  userId: string;
  email: string;
  rol: string;
  iat?: number;
  exp?: number;
}

// Generar token JWT
export const generateToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
};

// Verificar token JWT
export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Token inválido o expirado');
  }
};

// Decodificar token sin verificar (para debugging)
export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    return null;
  }
};


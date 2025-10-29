import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { generateToken } from '../config/jwt';

export const authController = {
  // Login de usuario
  login: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          error: 'Email y contraseña son requeridos',
          code: 'MISSING_CREDENTIALS',
        });
        return;
      }

      // Buscar usuario
      const user = await prisma.usuario.findUnique({
        where: { email },
      });

      if (!user || !user.activo) {
        res.status(401).json({
          error: 'Credenciales inválidas',
          code: 'INVALID_CREDENTIALS',
        });
        return;
      }

      // Verificar contraseña
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        res.status(401).json({
          error: 'Credenciales inválidas',
          code: 'INVALID_CREDENTIALS',
        });
        return;
      }

      // Generar token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        rol: user.rol,
      });

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          rol: user.rol,
        },
      });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  // Registro de usuario (solo para desarrollo)
  register: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, nombre, rol = 'ADMIN' } = req.body;

      if (!email || !password || !nombre) {
        res.status(400).json({
          error: 'Email, contraseña y nombre son requeridos',
          code: 'MISSING_FIELDS',
        });
        return;
      }

      // Verificar si el usuario ya existe
      const existingUser = await prisma.usuario.findUnique({
        where: { email },
      });

      if (existingUser) {
        res.status(409).json({
          error: 'El usuario ya existe',
          code: 'USER_EXISTS',
        });
        return;
      }

      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(password, 12);

      // Crear usuario
      const user = await prisma.usuario.create({
        data: {
          email,
          password: hashedPassword,
          nombre,
          rol,
        },
      });

      // Generar token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        rol: user.rol,
      });

      res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          rol: user.rol,
        },
      });
    } catch (error) {
      console.error('Error en register:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },

  // Logout (invalidar token en el futuro)
  logout: async (req: Request, res: Response): Promise<void> => {
    res.json({ message: 'Logout exitoso' });
  },

  // Obtener perfil del usuario autenticado
  getProfile: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Usuario no autenticado',
          code: 'NOT_AUTHENTICATED',
        });
        return;
      }

      const user = await prisma.usuario.findUnique({
        where: { id: req.user.userId },
        select: {
          id: true,
          email: true,
          nombre: true,
          rol: true,
          activo: true,
          createdAt: true,
        },
      });

      if (!user) {
        res.status(404).json({
          error: 'Usuario no encontrado',
          code: 'USER_NOT_FOUND',
        });
        return;
      }

      res.json({ user });
    } catch (error) {
      console.error('Error en getProfile:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  },
};


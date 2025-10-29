import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

// Middleware de manejo de errores
export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Error de validación de Prisma
  if (error.message.includes('Unique constraint')) {
    res.status(409).json({
      error: 'El recurso ya existe',
      code: 'DUPLICATE_RESOURCE',
    });
    return;
  }

  // Error de conexión a base de datos
  if (error.message.includes('connect') || error.message.includes('timeout')) {
    res.status(503).json({
      error: 'Servicio temporalmente no disponible',
      code: 'SERVICE_UNAVAILABLE',
    });
    return;
  }

  // Error de validación
  if (error.message.includes('validation') || error.message.includes('required')) {
    res.status(400).json({
      error: 'Datos de entrada inválidos',
      code: 'VALIDATION_ERROR',
      details: error.message,
    });
    return;
  }

  // Error de autorización
  if (error.message.includes('unauthorized') || error.message.includes('permission')) {
    res.status(403).json({
      error: 'No autorizado para realizar esta acción',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  // Error de recurso no encontrado
  if (error.message.includes('not found') || error.message.includes('No record')) {
    res.status(404).json({
      error: 'Recurso no encontrado',
      code: 'NOT_FOUND',
    });
    return;
  }

  // Error genérico del servidor
  const statusCode = error.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Error interno del servidor' 
    : error.message;

  res.status(statusCode).json({
    error: message,
    code: error.code || 'INTERNAL_SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

// Middleware para manejar rutas no encontradas
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    error: `Ruta ${req.method} ${req.url} no encontrada`,
    code: 'ROUTE_NOT_FOUND',
  });
};


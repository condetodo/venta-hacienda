import multer from 'multer';
import { Request } from 'express';

// Configuración de multer para upload de archivos
const storage = multer.memoryStorage();

// Filtro de tipos de archivo permitidos
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void => {
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}. Tipos permitidos: PDF, JPG, JPEG, PNG`));
  }
};

// Configuración de multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
    files: 5, // Máximo 5 archivos por request
  },
});

// Middleware para manejar errores de multer
export const handleUploadError = (error: any, req: Request, res: any, next: any): void => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        error: 'El archivo es demasiado grande. Máximo 10MB',
        code: 'FILE_TOO_LARGE',
      });
      return;
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      res.status(400).json({
        error: 'Demasiados archivos. Máximo 5 archivos por request',
        code: 'TOO_MANY_FILES',
      });
      return;
    }
    
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      res.status(400).json({
        error: 'Campo de archivo inesperado',
        code: 'UNEXPECTED_FILE_FIELD',
      });
      return;
    }
  }
  
  if (error.message.includes('Tipo de archivo no permitido')) {
    res.status(400).json({
      error: error.message,
      code: 'INVALID_FILE_TYPE',
    });
    return;
  }
  
  next(error);
};


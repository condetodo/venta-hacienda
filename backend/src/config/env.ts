import { z } from 'zod';
import dotenv from 'dotenv';

// Cargar variables de entorno (solo en desarrollo, en producción vienen del entorno)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: './.env.local', override: true });
  dotenv.config();
}

// Schema de validación para variables de entorno
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es requerida'),
  
  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  
  // API Externa
  DOLAR_API_URL: z.string().url('DOLAR_API_URL debe ser una URL válida'),
  
  // Server
  PORT: z.string().default("3000").transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // CORS
  FRONTEND_URL: z.string().url('FRONTEND_URL debe ser una URL válida'),

  // Anthropic Claude Vision API (para extracción de DUTs)
  ANTHROPIC_API_KEY: z.string().optional(),

  // Clave que usa Atla para cargar documentos (si falta, la integración queda apagada)
  ATLA_API_KEY: z.string().min(32, 'ATLA_API_KEY debe tener al menos 32 caracteres').optional(),
});

// Valores por defecto para desarrollo
const defaultEnv = {
  DATABASE_URL: "file:./dev.db",
  JWT_SECRET: "dev-secret-muy-seguro-cambiar-en-produccion-12345678901234567890",
  JWT_EXPIRES_IN: "7d",
  DOLAR_API_URL: "https://dolarapi.com/v1",
  PORT: "3000",
  NODE_ENV: "development",
  FRONTEND_URL: "http://localhost:5173",
  ANTHROPIC_API_KEY: "",
};

// Combinar variables de entorno con valores por defecto
const envWithDefaults = { ...defaultEnv, ...process.env };

// Validar y parsear variables de entorno
export const env = envSchema.parse(envWithDefaults);

// Tipos derivados del schema
export type Env = z.infer<typeof envSchema>;


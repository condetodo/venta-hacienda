import { z } from 'zod';

// Schema de validación para variables de entorno
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es requerida'),
  
  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  
  // Supabase
  SUPABASE_URL: z.string().url('SUPABASE_URL debe ser una URL válida'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY es requerida'),
  SUPABASE_SERVICE_KEY: z.string().min(1, 'SUPABASE_SERVICE_KEY es requerida'),
  SUPABASE_STORAGE_BUCKET: z.string().min(1, 'SUPABASE_STORAGE_BUCKET es requerida'),
  
  // API Externa
  DOLAR_API_URL: z.string().url('DOLAR_API_URL debe ser una URL válida'),
  
  // Server
  PORT: z.string().transform(Number).default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // CORS
  FRONTEND_URL: z.string().url('FRONTEND_URL debe ser una URL válida'),
});

// Valores por defecto para desarrollo
const defaultEnv = {
  DATABASE_URL: "file:./dev.db",
  JWT_SECRET: "dev-secret-muy-seguro-cambiar-en-produccion-12345678901234567890",
  JWT_EXPIRES_IN: "7d",
  SUPABASE_URL: "http://localhost:54321",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
  SUPABASE_SERVICE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
  SUPABASE_STORAGE_BUCKET: "documentos-hacienda",
  DOLAR_API_URL: "https://dolarapi.com/v1",
  PORT: "3000",
  NODE_ENV: "development",
  FRONTEND_URL: "http://localhost:5173",
};

// Combinar variables de entorno con valores por defecto
const envWithDefaults = { ...defaultEnv, ...process.env };

// Validar y parsear variables de entorno
export const env = envSchema.parse(envWithDefaults);

// Tipos derivados del schema
export type Env = z.infer<typeof envSchema>;


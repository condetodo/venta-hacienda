import { z } from 'zod';

// Valores por defecto para desarrollo
const defaultEnv = {
  // En producción el backend sirve el frontend, así que la API es relativa
  VITE_API_URL: import.meta.env.DEV ? 'http://localhost:3000/api' : '/api',
};

// Combinar variables de entorno con valores por defecto
const envWithDefaults = {
  ...defaultEnv,
  ...import.meta.env
};

// Schema de validación para variables de entorno del frontend
const envSchema = z.object({
  VITE_API_URL: z.string().min(1, 'VITE_API_URL es requerida'),
});

// Validar y parsear variables de entorno
export const env = envSchema.parse(envWithDefaults);

// Tipos derivados del schema
export type Env = z.infer<typeof envSchema>;


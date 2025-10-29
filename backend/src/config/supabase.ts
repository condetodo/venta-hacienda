import { createClient } from '@supabase/supabase-js';
import { env } from './env';

// Cliente Supabase para Storage
export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_KEY, // Usar service key para operaciones del backend
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Función para subir archivo a Supabase Storage
export const uploadFile = async (
  bucket: string,
  path: string,
  file: Buffer,
  mimeType: string
): Promise<{ url: string; path: string }> => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType: mimeType,
        upsert: true, // Sobrescribir si existe
      });

    if (error) {
      throw new Error(`Error subiendo archivo: ${error.message}`);
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (error) {
    console.error('Error en uploadFile:', error);
    throw error;
  }
};

// Función para eliminar archivo de Supabase Storage
export const deleteFile = async (bucket: string, path: string): Promise<void> => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      throw new Error(`Error eliminando archivo: ${error.message}`);
    }
  } catch (error) {
    console.error('Error en deleteFile:', error);
    throw error;
  }
};

// Función para obtener URL firmada (para archivos privados)
export const getSignedUrl = async (
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string> => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      throw new Error(`Error generando URL firmada: ${error.message}`);
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error en getSignedUrl:', error);
    throw error;
  }
};



/**
 * @fileOverview Inicialización ultra-robusta del cliente de Supabase con validación de entorno.
 */
import { createClient } from '@supabase/supabase-js';

// Valores reales de producción como respaldo (Fallback)
const FALLBACK_URL = 'https://zpavojcvnmofltntmkhx.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwYXZvamN2bm1vZmx0bnRta2h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMDA0NDcsImV4cCI6MjA5MDY3NjQ0N30.1vSWf5WoG4f-icVXLqPEne7gU4KzDKsN6Ye_RVXnm9M';

/**
 * Obtiene una URL válida de Supabase, priorizando variables de entorno
 * pero asegurando un formato correcto de URL para evitar errores de inicialización.
 */
const getValidSupabaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || url === 'undefined' || url === 'null' || !url.startsWith('http')) {
    return FALLBACK_URL;
  }
  return url;
};

/**
 * Obtiene una clave válida de Supabase.
 */
const getValidSupabaseKey = (): string => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key || key === 'undefined' || key === 'null' || key.length < 50) {
    return FALLBACK_KEY;
  }
  return key;
};

const supabaseUrl = getValidSupabaseUrl();
const supabaseKey = getValidSupabaseKey();

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

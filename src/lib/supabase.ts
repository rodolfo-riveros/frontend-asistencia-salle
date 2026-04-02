
/**
 * @fileOverview Inicialización ultra-robusta del cliente de Supabase.
 * Prioriza las claves de producción reales para evitar errores de "Invalid API key".
 */
import { createClient } from '@supabase/supabase-js';

const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// TUS CLAVES REALES (Funcionan como base sólida)
const PRODUCTION_URL = 'https://zpavojcvnmofltntmkhx.supabase.co';
const PRODUCTION_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwYXZvamN2bm1vZmx0bnRta2h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMDA0NDcsImV4cCI6MjA5MDY3NjQ0N30.1vSWf5WoG4f-icVXLqPEne7gU4KzDKsN6Ye_RVXnm9M';

/**
 * Valida si un valor es una clave real y no un placeholder de configuración.
 */
const isRealValue = (val: string | undefined): val is string => {
  if (!val || val === 'undefined' || val === 'null' || val === '') return false;
  if (val.length < 30) return false; // Las claves de Supabase son significativamente largas
  if (val.includes('placeholder') || val.includes('YOUR_')) return false;
  return true;
};

/**
 * Valida si la URL tiene un formato correcto.
 */
const isRealUrl = (url: string | undefined): url is string => {
  if (!isRealValue(url)) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

// Selección final: Si el entorno no tiene una clave real válida, usamos la de producción.
const finalUrl = isRealUrl(envUrl) ? envUrl : PRODUCTION_URL;
const finalKey = isRealValue(envKey) ? envKey : PRODUCTION_KEY;

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});


/**
 * @fileOverview Inicialización segura del cliente de Supabase para autenticación.
 * Maneja casos donde las variables de entorno aún no están configuradas en tiempo de compilación.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Verificación robusta de URL para evitar errores de inicialización "Invalid supabaseUrl"
const isValidUrl = (url: string | undefined): url is string => {
  if (!url || url === 'undefined' || url.includes('placeholder')) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const finalUrl = isValidUrl(supabaseUrl) ? supabaseUrl : 'https://zpavojcvnmofltntmkhx.supabase.co';
const finalKey = (supabaseAnonKey && supabaseAnonKey !== 'undefined' && !supabaseAnonKey.includes('placeholder')) 
  ? supabaseAnonKey 
  : 'placeholder-key';

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

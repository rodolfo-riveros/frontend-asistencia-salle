
/**
 * @fileOverview Inicialización segura del cliente de Supabase para autenticación.
 * Utiliza las credenciales proporcionadas por el usuario para asegurar la conexión.
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

// Usamos tus credenciales reales como fallback para asegurar que el sistema funcione
const finalUrl = isValidUrl(supabaseUrl) ? supabaseUrl : 'https://zpavojcvnmofltntmkhx.supabase.co';
const finalKey = (supabaseAnonKey && supabaseAnonKey !== 'undefined' && !supabaseAnonKey.includes('placeholder')) 
  ? supabaseAnonKey 
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwYXZvamN2bm1vZmx0bnRta2h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMDA0NDcsImV4cCI6MjA5MDY3NjQ0N30.1vSWf5WoG4f-icVXLqPEne7gU4KzDKsN6Ye_RVXnm9M';

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

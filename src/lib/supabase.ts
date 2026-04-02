
/**
 * @fileOverview Inicialización segura del cliente de Supabase para autenticación.
 * Maneja casos donde las variables de entorno aún no están configuradas.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Usamos una URL de fallback que sea sintácticamente válida para evitar que createClient lance una excepción inmediata,
// pero manejamos la validación real en la lógica de negocio antes de realizar peticiones.
const finalUrl = (supabaseUrl && supabaseUrl !== 'undefined' && supabaseUrl.startsWith('http')) 
  ? supabaseUrl 
  : 'https://placeholder-project.supabase.co';

const finalKey = (supabaseAnonKey && supabaseAnonKey !== 'undefined') 
  ? supabaseAnonKey 
  : 'placeholder-key';

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

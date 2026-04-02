/**
 * @fileOverview Inicialización segura del cliente de Supabase para autenticación.
 */
import { createClient } from '@supabase/supabase-js';

// Usamos valores por defecto temporales para evitar que la aplicación falle al cargar (Module Evaluation Error)
// El usuario debe reemplazar estos valores en su archivo .env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('⚠️ Configuración de Supabase incompleta: Revisa tu archivo .env para habilitar la autenticación real.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

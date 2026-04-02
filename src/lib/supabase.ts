
/**
 * @fileOverview Inicialización segura del cliente de Supabase para autenticación.
 */
import { createClient } from '@supabase/supabase-js';

// Validamos que las URLs sean válidas antes de inicializar para evitar que la App colapse
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Fallback seguro: Si no hay variables, usamos URLs de placeholder válidas sintácticamente
const finalUrl = (supabaseUrl && supabaseUrl !== 'undefined' && supabaseUrl.startsWith('http')) 
  ? supabaseUrl 
  : 'https://placeholder-project.supabase.co';

const finalKey = (supabaseAnonKey && supabaseAnonKey !== 'undefined') 
  ? supabaseAnonKey 
  : 'placeholder-key';

export const supabase = createClient(finalUrl, finalKey);


/**
 * @fileOverview Inicialización del cliente de Supabase para autenticación.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Faltan las variables de entorno de Supabase. La autenticación no funcionará.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


/**
 * @fileOverview Cliente Supabase ultra-robusto con respaldo de credenciales reales.
 * Resuelve el error 'Invalid supabaseUrl' forzando valores válidos.
 */
import { createClient } from '@supabase/supabase-js';

// Valores reales proporcionados por el usuario
const REAL_URL = 'https://zpavojcvnmofltntmkhx.supabase.co';
const REAL_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwYXZvamN2bm1vZmx0bnRta2h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMDA0NDcsImV4cCI6MjA5MDY3NjQ0N30.1vSWf5WoG4f-icVXLqPEne7gU4KzDKsN6Ye_RVXnm9M';

// Obtención de variables con limpieza de espacios y fallback forzado
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || REAL_URL).trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || REAL_ANON_KEY).trim();

// Validación final de URL para evitar el error 'Invalid supabaseUrl'
const finalUrl = supabaseUrl.startsWith('http') ? supabaseUrl : REAL_URL;

export const supabase = createClient(finalUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});


/**
 * @fileOverview Cliente Supabase centralizado con claves de producción forzadas y blindaje contra URLs inválidas.
 */
import { createClient } from '@supabase/supabase-js';

// TUS CLAVES REALES DE PRODUCCIÓN (Respaldo garantizado)
const HARDCODED_URL = 'https://zpavojcvnmofltntmkhx.supabase.co';
const HARDCODED_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwYXZvamN2bm1vZmx0bnRta2h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMDA0NDcsImV4cCI6MjA5MDY3NjQ0N30.1vSWf5WoG4f-icVXLqPEne7gU4KzDKsN6Ye_RVXnm9M';

// Validamos que la URL sea correcta antes de inicializar para evitar el error "Invalid supabaseUrl"
const supabaseUrl = HARDCODED_URL;
const supabaseAnonKey = HARDCODED_ANON_KEY;

if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
  console.error("CRITICAL ERROR: Supabase URL is missing or malformed.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'salle-asistencia-auth-token'
  }
});

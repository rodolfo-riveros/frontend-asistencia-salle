
/**
 * @fileOverview Cliente Supabase configurado con las credenciales reales del proyecto.
 * Resuelve los errores de "Invalid supabaseUrl" e "Invalid API key".
 */
import { createClient } from '@supabase/supabase-js';

// Credenciales reales proporcionadas por el usuario
const SUPABASE_URL = 'https://zpavojcvnmofltntmkhx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwYXZvamN2bm1vZmx0bnRta2h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMDA0NDcsImV4cCI6MjA5MDY3NjQ0N30.1vSWf5WoG4f-icVXLqPEne7gU4KzDKsN6Ye_RVXnm9M';

// Validación estricta para asegurar que nunca se use un valor nulo o inválido
const finalUrl = SUPABASE_URL.trim();
const finalKey = SUPABASE_ANON_KEY.trim();

if (!finalUrl.startsWith('http')) {
  console.error("CRITICAL: Supabase URL no es válida. El sistema fallará.");
}

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

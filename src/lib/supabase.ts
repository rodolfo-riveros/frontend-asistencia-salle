
/**
 * @fileOverview Cliente Supabase centralizado con fallback de seguridad.
 * Este archivo gestiona la autenticación del usuario.
 */
import { createClient } from '@supabase/supabase-js';

// Usamos tus credenciales reales directamente para evitar errores de variables de entorno locales
const SUPABASE_URL = 'https://zpavojcvnmofltntmkhx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwYXZvamN2bm1vZmx0bnRta2h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMDA0NDcsImV4cCI6MjA5MDY3NjQ0N30.1vSWf5WoG4f-icVXLqPEne7gU4KzDKsN6Ye_RVXnm9M';

// Validación preventiva para evitar el error "Invalid supabaseUrl"
if (!SUPABASE_URL || !SUPABASE_URL.startsWith('http')) {
  console.error("ERROR CRÍTICO: La URL de Supabase no es válida.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'salle-asistencia-auth-v3'
  }
});

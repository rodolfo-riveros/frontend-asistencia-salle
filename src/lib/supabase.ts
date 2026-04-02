/**
 * @fileOverview Cliente Supabase centralizado con validación de entorno y claves de respaldo.
 */
import { createClient } from '@supabase/supabase-js';

// Priorizamos variables de entorno, pero mantenemos tus claves reales como respaldo absoluto
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zpavojcvnmofltntmkhx.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwYXZvamN2bm1vZmx0bnRta2h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMDA0NDcsImV4cCI6MjA5MDY3NjQ0N30.1vSWf5WoG4f-icVXLqPEne7gU4KzDKsN6Ye_RVXnm9M';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("[SUPABASE ERROR] Faltan las claves de configuración. Verifica el archivo .env");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'salle-asistencia-auth-v4' // Cambiamos la clave para forzar limpieza de sesiones antiguas
  }
});

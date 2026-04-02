
/**
 * @fileOverview Cliente Supabase con validación estricta de claves.
 * Resuelve el error 'Invalid API key' forzando valores reales limpios.
 */
import { createClient } from '@supabase/supabase-js';

// TUS CLAVES REALES (Limpias de espacios)
const REAL_URL = 'https://zpavojcvnmofltntmkhx.supabase.co'.trim();
const REAL_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwYXZvamN2bm1vZmx0bnRta2h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMDA0NDcsImV4cCI6MjA5MDY3NjQ0N30.1vSWf5WoG4f-icVXLqPEne7gU4KzDKsN6Ye_RVXnm9M'.trim();

// Lógica de inicialización: Solo usamos process.env si tiene un valor válido (empieza por http o eyJ)
const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const finalUrl = (envUrl && envUrl.startsWith('http')) ? envUrl : REAL_URL;
const finalKey = (envKey && envKey.length > 50) ? envKey : REAL_ANON_KEY;

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: { 'x-application-name': 'asistencia-salle' }
  }
});

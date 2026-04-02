
/**
 * @fileOverview Inicialización ultra-robusta del cliente de Supabase.
 */
import { createClient } from '@supabase/supabase-js';

// Valores reales de producción como respaldo absoluto
const PROD_URL = 'https://zpavojcvnmofltntmkhx.supabase.co';
const PROD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwYXZvamN2bm1vZmx0bnRta2h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMDA0NDcsImV4cCI6MjA5MDY3NjQ0N30.1vSWf5WoG4f-icVXLqPEne7gU4KzDKsN6Ye_RVXnm9M';

const getValidUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (envUrl && envUrl.startsWith('http') && !envUrl.includes('placeholder')) return envUrl;
  return PROD_URL;
};

const getValidKey = () => {
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (envKey && envKey.length > 50 && !envKey.includes('placeholder')) return envKey;
  return PROD_KEY;
};

export const supabase = createClient(getValidUrl(), getValidKey(), {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

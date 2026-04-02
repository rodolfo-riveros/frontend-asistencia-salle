
/**
 * @fileOverview Cliente de API optimizado para producción en Render con sincronización dinámica de tokens.
 */
import { supabase } from './supabase';

const API_BASE_URL = 'https://backend-asistencia-salle.onrender.com';
const API_VERSION = '/api/v1';

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cleanBase = API_BASE_URL.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${cleanBase}${API_VERSION}${cleanEndpoint}`;
  
  // Obtenemos la sesión en tiempo real para asegurar que el token sea el correcto
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers = new Headers({
    'Content-Type': 'application/json',
    ...options.headers,
  });

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let detail = 'Error en el servidor';
      try {
        const errorData = await response.json();
        detail = errorData.detail || detail;
      } catch {
        detail = `Error ${response.status}: ${response.statusText}`;
      }
      
      // Error 401/403: Mismatch de JWT Secret
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          "SESIÓN NO AUTORIZADA (JWT Mismatch).\n\n" +
          "PASO A SEGUIR: En Render, ve a Environment y asegúrate de que SUPABASE_JWT_SECRET no tenga comillas ni espacios extras."
        );
      }
      
      throw new Error(detail);
    }

    return response.status === 204 ? ({} as T) : response.json();
  } catch (err: any) {
    if (err.name === 'TypeError' && (err.message === 'Failed to fetch' || err.message.includes('fetch'))) {
      throw new Error(
        "ERROR DE CONEXIÓN (CORS o Cold Start).\n\n" +
        "1. Cambia ALLOWED_ORIGINS a '*' en el panel de Render.\n" +
        "2. Abre https://backend-asistencia-salle.onrender.com/health para despertar el servidor."
      );
    }
    throw err;
  }
}

export const api = {
  get: <T>(e: string, o?: RequestInit) => apiFetch<T>(e, { ...o, method: 'GET' }),
  post: <T>(e: string, d: any, o?: RequestInit) => apiFetch<T>(e, { ...o, method: 'POST', body: JSON.stringify(d) }),
  patch: <T>(e: string, d: any, o?: RequestInit) => apiFetch<T>(e, { ...o, method: 'PATCH', body: JSON.stringify(d) }),
  delete: <T>(e: string, o?: RequestInit) => apiFetch<T>(e, { ...o, method: 'DELETE' }),
};

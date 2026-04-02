
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
  
  // Obtenemos el token más reciente directamente de Supabase (Evitamos tokens expirados en localStorage)
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
      
      // Si el backend dice que el token es inválido, puede ser un desajuste de secretos en Render
      if (response.status === 401 || response.status === 403) {
        throw new Error("Sesión no autorizada. Verifique el JWT Secret en el panel de Render.");
      }
      
      throw new Error(detail);
    }

    return response.status === 204 ? ({} as T) : response.json();
  } catch (err: any) {
    if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
      throw new Error(
        "No se pudo conectar con el servidor. \n\n" +
        "1. Despierte el servidor entrando a: https://backend-asistencia-salle.onrender.com/health\n" +
        "2. Asegúrese de que el backend tenga ALLOWED_ORIGINS=*"
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


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
  
  // Obtenemos la sesión actual de forma asíncrona para asegurar que el token sea válido
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers = new Headers({
    'Content-Type': 'application/json',
    ...options.headers,
  });

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    console.warn("API Warning: No se encontró un token de acceso. La petición a " + endpoint + " podría ser rechazada.");
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
      
      // Manejo específico de errores de autorización (401 o 403)
      if (response.status === 401 || response.status === 403) {
        console.error("DEBUG - Error de Autorización:", {
          status: response.status,
          token_presente: !!token,
          backend_detail: detail
        });
        throw new Error(
          "Sesión no autorizada (Error " + response.status + "). \n\n" +
          "CAUSA PROBABLE: El 'SUPABASE_JWT_SECRET' en Render no coincide con el de tu proyecto Supabase. \n\n" +
          "SOLUCIÓN: Copia el JWT Secret exacto desde Supabase (Settings -> API) y pégalo en Render."
        );
      }
      
      throw new Error(detail);
    }

    return response.status === 204 ? ({} as T) : response.json();
  } catch (err: any) {
    if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
      throw new Error(
        "No se pudo conectar con el servidor. \n\n" +
        "1. Asegúrate de que el backend en Render esté encendido.\n" +
        "2. Verifica que ALLOWED_ORIGINS incluya esta URL en Render."
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

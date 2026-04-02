
/**
 * @fileOverview Cliente de API optimizado para producción en Render.
 */

const API_BASE_URL = 'https://backend-asistencia-salle.onrender.com';
const API_VERSION = '/api/v1';

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cleanBase = API_BASE_URL.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${cleanBase}${API_VERSION}${cleanEndpoint}`;
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('supabase_access_token') : null;

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
      throw new Error(detail);
    }

    return response.status === 204 ? ({} as T) : response.json();
  } catch (err: any) {
    if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
      throw new Error(
        "No se pudo conectar con el backend. \n\n" +
        "1. Verifica que el servidor en Render esté activo (despiértalo entrando a la URL de la API).\n" +
        "2. Asegúrate de que el CORS permita la URL de este navegador."
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


/**
 * @fileOverview Utilidad centralizada para realizar peticiones al backend de FastAPI en Render.
 */

// URL oficial de tu backend desplegado en Render
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-asistencia-salle.onrender.com';
const API_VERSION = '/api/v1';

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${API_VERSION}${cleanEndpoint}`;
  
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
      let detail = 'Error en el servidor académico';
      try {
        const errorData = await response.json();
        detail = errorData.detail || detail;
      } catch (e) {
        detail = `Error ${response.status}: ${response.statusText}`;
      }
      throw new Error(detail);
    }

    if (response.status === 204) return {} as T;
    return response.json();
  } catch (err: any) {
    // Diagnóstico detallado para errores de conexión
    if (err instanceof TypeError && (err.message === 'Failed to fetch' || err.message.includes('fetch'))) {
      console.error("Error de Red Crítico:", url);
      throw new Error(
        "No se pudo conectar con el servidor en: " + API_BASE_URL + ". \n\n" +
        "Acciones recomendadas: \n" +
        "1. Espere 1 minuto (Render suele tardar en despertar). \n" +
        "2. Verifique que la URL de este navegador esté en ALLOWED_ORIGINS de su backend. \n" +
        "3. Revise los logs de Render para ver si el servidor está activo."
      );
    }
    throw err;
  }
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) => apiFetch<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, data: any, options?: RequestInit) => 
    apiFetch<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data: any, options?: RequestInit) => 
    apiFetch<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(data) }),
  patch: <T>(endpoint: string, data: any, options?: RequestInit) => 
    apiFetch<T>(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(endpoint: string, options?: RequestInit) => 
    apiFetch<T>(endpoint, { ...options, method: 'DELETE' }),
};

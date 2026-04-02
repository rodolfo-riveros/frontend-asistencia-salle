
/**
 * @fileOverview Utilidad de red optimizada para el backend en Render.
 * Maneja Cold Starts y errores de CORS con mensajes informativos.
 */

const RAW_URL = 'https://backend-asistencia-salle.onrender.com';
const API_BASE_URL = RAW_URL.replace(/\/+$/, ''); 
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
    // Captura fallos de red (CORS, Servidor Apagado, Sin Internet)
    if (err instanceof TypeError && (err.message === 'Failed to fetch' || err.message.includes('fetch'))) {
      console.error("Error de Red Crítico:", url);
      throw new Error(
        "Error de Conexión: No se pudo contactar con Render. \n\n" +
        "1. Asegúrate de que el servidor esté encendido (visita /docs). \n" +
        "2. Verifica que el ALLOWED_ORIGINS de Render incluya esta URL."
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

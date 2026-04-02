
/**
 * @fileOverview Utilidad centralizada para realizar peticiones al backend de FastAPI v1.
 * Optimizado para producción (Render / Railway).
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-asistencia-salle.onrender.com';
const API_VERSION = '/api/v1';

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${API_VERSION}${cleanEndpoint}`;
  
  // Obtenemos el token almacenado por Supabase Auth en el cliente
  const token = typeof window !== 'undefined' ? localStorage.getItem('supabase_access_token') : null;

  const headers = new Headers({
    'Content-Type': 'application/json',
    ...options.headers,
  });

  // Si existe el token, lo enviamos en la cabecera como Bearer Token
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let detail = 'Error desconocido en el servidor';
      try {
        const errorData = await response.json();
        detail = errorData.detail || detail;
        if (Array.isArray(detail)) {
          detail = detail.map((d: any) => `${d.loc?.join('.') || 'error'}: ${d.msg}`).join(', ');
        }
      } catch (e) {
        detail = `Error ${response.status}: ${response.statusText}`;
      }
      throw new Error(detail);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  } catch (err: any) {
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error(`No se pudo conectar con el servidor de producción en ${API_BASE_URL}. Verifica que el servicio en Render esté activo.`);
    }
    throw err;
  }
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) => apiFetch<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, data: any, options?: RequestInit) => 
    apiFetch<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data: any, options?: RequestInit) => 
    apiFetch<T>(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(data) }),
  patch: <T>(endpoint: string, data: any, options?: RequestInit) => 
    apiFetch<T>(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(endpoint: string, options?: RequestInit) => 
    apiFetch<T>(endpoint, { ...options, method: 'DELETE' }),
};

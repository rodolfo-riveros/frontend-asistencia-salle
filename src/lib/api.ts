/**
 * @fileOverview Cliente de API optimizado para FastAPI en Render.
 */
import { supabase } from './supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-asistencia-salle.onrender.com';
const API_VERSION = '/api/v1';

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cleanBase = API_BASE_URL.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${cleanBase}${API_VERSION}${cleanEndpoint}`;
  
  // Obtenemos el token en tiempo real
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (token) {
    console.log(`[DEBUG] TOKEN PARA POSTMAN: Bearer ${token}`);
  }

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
      credentials: 'omit', // Importante para CORS con allow_origins="*"
    });

    if (response.status === 401) {
      console.error("[API ERROR] 401: El servidor rechazó el token. Verifica el SUPABASE_JWT_SECRET en Render.");
      throw new Error("Tu sesión no es válida en el servidor. Por favor, cierra sesión y vuelve a entrar.");
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[API ERROR] ${response.status}:`, errorData);
      throw new Error(errorData.detail || `Error del servidor (${response.status})`);
    }

    if (response.status === 204) return {} as T;
    return response.json();
  } catch (err: any) {
    console.error("[NETWORK ERROR]", err);
    throw err;
  }
}

export const api = {
  get: <T>(e: string, o?: RequestInit) => apiFetch<T>(e, { ...o, method: 'GET' }),
  post: <T>(e: string, d: any, o?: RequestInit) => apiFetch<T>(e, { ...o, method: 'POST', body: JSON.stringify(d) }),
  put: <T>(e: string, d: any, o?: RequestInit) => apiFetch<T>(e, { ...o, method: 'PUT', body: JSON.stringify(d) }),
  patch: <T>(e: string, d: any, o?: RequestInit) => apiFetch<T>(e, { ...o, method: 'PATCH', body: JSON.stringify(d) }),
  delete: <T>(e: string, o?: RequestInit) => apiFetch<T>(e, { ...o, method: 'DELETE' }),
};

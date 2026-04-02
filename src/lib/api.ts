/**
 * @fileOverview Cliente de API con herramientas de diagnóstico avanzadas.
 */
import { supabase } from './supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-asistencia-salle.onrender.com';
const API_VERSION = '/api/v1';

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cleanBase = API_BASE_URL.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${cleanBase}${API_VERSION}${cleanEndpoint}`;
  
  // Obtenemos la sesión actual
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (token) {
    // Log de depuración para el desarrollador (Postman)
    console.log(`[DEBUG] TOKEN PARA POSTMAN (Copia esto): ${token}`);
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
      // Importante: Si usas origins=["*"] en FastAPI, credentials debe ser "omit" o "same-origin"
      // Si el backend tiene allow_credentials=False, esto ayuda a evitar errores de CORS.
      credentials: 'omit', 
    });

    if (response.status === 401) {
      console.error("[API ERROR] 401: El backend rechazó el token. Verifica el JWT Secret en Render.");
      throw new Error("Sesión no autorizada. Verifica que el JWT Secret en Render sea idéntico al de Supabase.");
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Error ${response.status}`);
    }

    if (response.status === 204) return {} as T;
    return response.json();
  } catch (err: any) {
    console.error(`[NETWORK ERROR] No se pudo conectar a ${url}:`, err.message);
    throw err;
  }
}

export const api = {
  get: <T>(e: string, o?: RequestInit) => apiFetch<T>(e, { ...o, method: 'GET' }),
  post: <T>(e: string, d: any, o?: RequestInit) => apiFetch<T>(e, { ...o, method: 'POST', body: JSON.stringify(d) }),
  patch: <T>(e: string, d: any, o?: RequestInit) => apiFetch<T>(e, { ...o, method: 'PATCH', body: JSON.stringify(d) }),
  delete: <T>(e: string, o?: RequestInit) => apiFetch<T>(e, { ...o, method: 'DELETE' }),
};

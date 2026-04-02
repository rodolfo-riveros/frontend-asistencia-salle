/**
 * @fileOverview Cliente de API optimizado para FastAPI en Render.
 * Maneja la inyección de tokens JWT y diagnósticos de errores 401/CORS.
 */
import { supabase } from './supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-asistencia-salle.onrender.com';
const API_VERSION = '/api/v1';

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cleanBase = API_BASE_URL.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${cleanBase}${API_VERSION}${cleanEndpoint}`;
  
  // Obtener sesión fresca de Supabase
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

    // Manejo específico de 401 (Token inválido o secreto JWT incorrecto en Render)
    if (response.status === 401) {
      console.error("[API ERROR] 401: Sesión no válida en el servidor.");
      throw new Error("Tu sesión ha expirado o el servidor no reconoce tu acceso. Por favor, intenta cerrar sesión y volver a entrar.");
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[API ERROR] ${response.status}:`, errorData);
      throw new Error(errorData.detail || `Error del servidor (${response.status})`);
    }

    if (response.status === 204) return {} as T;
    return response.json();
  } catch (err: any) {
    if (err.name === 'TypeError' && (err.message.includes('fetch') || err.message.includes('Network'))) {
      throw new Error("No se pudo conectar con el backend. Verifica que el servidor en Render esté encendido (puede tardar 1 min en despertar).");
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

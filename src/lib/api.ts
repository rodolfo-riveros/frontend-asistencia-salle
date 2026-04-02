/**
 * @fileOverview Cliente de API con herramientas de diagnóstico avanzadas para errores 401.
 */
import { supabase } from './supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-asistencia-salle.onrender.com';
const API_VERSION = '/api/v1';

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cleanBase = API_BASE_URL.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${cleanBase}${API_VERSION}${cleanEndpoint}`;
  
  // 1. Obtenemos la sesión fresca directamente del SDK
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  // 2. LOG DE DIAGNÓSTICO (Presiona F12 para verlo)
  if (token) {
    console.log(`[DEBUG] TOKEN PARA POSTMAN: Bearer ${token}`);
  } else {
    console.warn("[API WARNING] No se encontró sesión activa de Supabase.");
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
      credentials: 'omit', 
    });

    // 3. MANEJO DE ERROR 401 (EL PROBLEMA ACTUAL)
    if (response.status === 401) {
      console.error("[API ERROR] El servidor de Render rechazó el token. Esto significa que el SUPABASE_JWT_SECRET en Render no coincide con el de tu proyecto de Supabase.");
      throw new Error("SESIÓN NO AUTORIZADA: Tu servidor en Render no pudo validar el acceso. Revisa el JWT Secret.");
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Error del servidor (${response.status})`);
    }

    if (response.status === 204) return {} as T;
    return response.json();
  } catch (err: any) {
    if (err.message.includes('Failed to fetch')) {
      console.error("[NETWORK ERROR] Fallo de conexión. Revisa si el servidor de Render está encendido o si hay un error de CORS.");
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

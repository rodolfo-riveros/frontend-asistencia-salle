/**
 * @fileOverview Cliente de API optimizado para FastAPI con diagnóstico mejorado.
 */
import { supabase } from './supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-asistencia-salle.onrender.com';
const API_VERSION = '/api/v1';

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cleanBase = API_BASE_URL.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${cleanBase}${API_VERSION}${cleanEndpoint}`;
  
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (token && process.env.NODE_ENV === 'development') {
    console.log(`[DEBUG] LLAMADA ${options.method || 'GET'}: ${url}`);
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

    if (response.status === 401) {
      console.error("[API ERROR] 401: Sesión no válida.");
      throw new Error("Sesión no autorizada. Por favor, cierra sesión y vuelve a entrar.");
    }

    if (!response.ok) {
      let errorMessage = `Error ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch (e) {
        const textError = await response.text();
        if (textError) errorMessage = textError;
      }
      console.error(`[API ERROR] ${response.status}:`, errorMessage);
      throw new Error(errorMessage);
    }

    if (response.status === 204) return {} as T;
    
    const text = await response.text();
    if (!text) return {} as T;
    
    try {
      return JSON.parse(text);
    } catch (e) {
      return text as unknown as T;
    }
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

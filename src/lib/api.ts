
/**
 * @fileOverview Cliente de API optimizado para FastAPI con diagnóstico mejorado y manejo de errores.
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

  if (process.env.NODE_ENV === 'development') {
    console.log(`[API REQUEST] ${options.method || 'GET'} ${url}`);
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

    // Manejo de éxito sin contenido (Común en DELETE de FastAPI)
    if (response.status === 204) {
      return {} as T;
    }

    if (!response.ok) {
      let errorMessage = `Error (${response.status})`;
      try {
        const errorData = await response.json();
        // Intentamos extraer el mensaje de error de FastAPI
        errorMessage = errorData.detail || errorMessage;
        if (typeof errorMessage === 'object') errorMessage = JSON.stringify(errorMessage);
      } catch (e) {
        const text = await response.text();
        if (text) errorMessage = text;
      }
      
      // En desarrollo, logueamos el error para depuración
      if (process.env.NODE_ENV === 'development') {
        console.error(`[API ERROR] ${response.status}:`, errorMessage);
      }
      
      throw new Error(errorMessage);
    }

    const text = await response.text();
    if (!text) return {} as T;
    
    try {
      return JSON.parse(text);
    } catch (e) {
      // Si no es JSON pero hay texto, lo devolvemos tal cual (útil para respuestas raw)
      return text as unknown as T;
    }
  } catch (err: any) {
    if (err.message === 'Failed to fetch') {
      throw new Error("No se pudo conectar con el servidor. Verifica que el backend en Render esté encendido.");
    }
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

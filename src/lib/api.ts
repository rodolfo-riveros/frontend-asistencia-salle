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
    console.log(`[DEBUG] TOKEN PARA POSTMAN: ${token}`);
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

    // Manejo específico de 401 (Token inválido o secreto JWT incorrecto en Render)
    if (response.status === 401) {
      console.error("[API ERROR] 401: Sesión no válida en el servidor.");
      throw new Error("Tu sesión ha expirado o el servidor no reconoce tu acceso. Por favor, intenta cerrar sesión y volver a entrar.");
    }

    if (!response.ok) {
      let errorMessage = `Error del servidor (${response.status})`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
        // Si el detalle es un objeto (común en errores de validación de FastAPI)
        if (typeof errorMessage === 'object') {
          errorMessage = JSON.stringify(errorMessage);
        }
      } catch (e) {
        const textError = await response.text();
        if (textError) errorMessage = textError;
      }
      
      console.error(`[API ERROR] ${response.status}:`, errorMessage);
      throw new Error(errorMessage);
    }

    // Para DELETE o respuestas sin contenido (204 No Content)
    if (response.status === 204) return {} as T;
    
    const text = await response.text();
    if (!text) return {} as T;
    
    try {
      return JSON.parse(text);
    } catch (e) {
      return text as unknown as T;
    }
  } catch (err: any) {
    // Si es un error de red (CORS o servidor apagado)
    if (err.message === 'Failed to fetch') {
      console.error("[NETWORK ERROR] No se pudo conectar con el servidor. Revisa el CORS en el backend o si el servidor está encendido.");
      throw new Error("No se pudo conectar con el servidor de FastAPI. Verifica tu conexión o si el servicio en Render está activo.");
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

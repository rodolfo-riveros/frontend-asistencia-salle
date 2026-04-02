/**
 * @fileOverview Cliente de API optimizado para FastAPI en Render.
 * Maneja la inyección de tokens JWT en tiempo real y diagnósticos de errores.
 */
import { supabase } from './supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-asistencia-salle.onrender.com';
const API_VERSION = '/api/v1';

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cleanBase = API_BASE_URL.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${cleanBase}${API_VERSION}${cleanEndpoint}`;
  
  // OBTENCIÓN CRÍTICA: Forzamos la obtención de la sesión más reciente
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error("[API AUTH ERROR] Error al obtener la sesión:", sessionError.message);
  }

  const token = session?.access_token;

  const headers = new Headers({
    'Content-Type': 'application/json',
    ...options.headers,
  });

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    console.warn("[API AUTH WARNING] No se encontró token de sesión. La petición podría fallar.");
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Diagnóstico específico para el error 401
    if (response.status === 401) {
      const errorDetail = await response.json().catch(() => ({}));
      console.error("[API ERROR] 401 No Autorizado. El servidor de Render rechazó el token.");
      console.log("Sugerencia: Verifica que SUPABASE_JWT_SECRET en Render sea idéntico al de Supabase Dashboard.");
      
      // Si el error persiste, cerramos sesión para limpiar el estado
      if (typeof window !== 'undefined') {
        // No cerramos sesión automáticamente para evitar loops, pero informamos al usuario
        throw new Error(
          "Error 401: Tu sesión no es reconocida por el servidor. \n\n" +
          "Solución: Haz clic en el botón de cerrar sesión y vuelve a ingresar."
        );
      }
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

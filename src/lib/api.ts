
/**
 * @fileOverview Cliente de API optimizado para producción con diagnóstico avanzado de errores JWT y CORS.
 */
import { supabase } from './supabase';

const API_BASE_URL = 'https://backend-asistencia-salle.onrender.com';
const API_VERSION = '/api/v1';

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cleanBase = API_BASE_URL.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${cleanBase}${API_VERSION}${cleanEndpoint}`;
  
  // Obtenemos la sesión actual de Supabase
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token && !endpoint.includes('health')) {
    console.warn("API Warning: No hay un token de sesión activo.");
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
    });

    // Si la respuesta no es exitosa (4xx o 5xx)
    if (!response.ok) {
      let detail = 'Error desconocido en el servidor';
      let serverErrorBody = null;

      try {
        serverErrorBody = await response.json();
        detail = serverErrorBody.detail || JSON.stringify(serverErrorBody);
      } catch {
        detail = `Error ${response.status}: ${response.statusText}`;
      }
      
      // Diagnóstico específico para 401/403
      if (response.status === 401 || response.status === 403) {
        console.error("Error de Autenticación:", {
          status: response.status,
          detail,
          tokenSent: !!token
        });
        
        throw new Error(
          `ACCESO DENEGADO (${response.status}): ${detail}\n\n` +
          "Sugerencia: Revisa que SUPABASE_JWT_SECRET en Render coincida con Supabase."
        );
      }
      
      throw new Error(detail);
    }

    // Manejo de respuestas vacías (204 No Content)
    if (response.status === 204) return {} as T;
    
    return response.json();
  } catch (err: any) {
    // Error de red (CORS, DNS, Servidor apagado)
    if (err instanceof TypeError && (err.message === 'Failed to fetch' || err.message.includes('fetch'))) {
      throw new Error(
        "ERROR DE CONEXIÓN: El servidor de Render no responde.\n\n" +
        "1. Asegúrate de que ALLOWED_ORIGINS en Render sea '*' o incluya esta URL.\n" +
        "2. El servidor podría estar despertando (Cold Start). Espera 30 segundos y reintenta."
      );
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

/**
 * @fileOverview Cliente de API optimizado para producción.
 */
import { supabase } from './supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://backend-asistencia-salle.onrender.com';
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || '/api/v1';

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cleanBase = API_BASE_URL.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${cleanBase}${API_VERSION}${cleanEndpoint}`;
  
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  console.log(`[API CALL] ${options.method || 'GET'} -> ${url}`);

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
      mode: 'cors', 
    });

    if (!response.ok) {
      let detail = '';
      try {
        const errorData = await response.json();
        detail = errorData.detail || JSON.stringify(errorData);
      } catch {
        detail = `Estado ${response.status}: ${response.statusText}`;
      }
      
      // Error de autorización: Casi siempre es el JWT Secret en Render
      if (response.status === 401 || response.status === 403) {
        throw new Error(`NO AUTORIZADO: El servidor de Render rechazó tu token. Verifica el SUPABASE_JWT_SECRET en el panel de Render.`);
      }
      
      throw new Error(`ERROR DEL SERVIDOR: ${detail}`);
    }

    if (response.status === 204) return {} as T;
    
    return response.json();
  } catch (err: any) {
    if (err instanceof TypeError && (err.message === 'Failed to fetch' || err.message.includes('fetch'))) {
      throw new Error(
        "FALLO DE CONEXIÓN: No se pudo contactar con tu Backend en Render.\n\n" +
        "1. Despierta el servidor: Abre " + API_BASE_URL + "/health en una pestaña nueva.\n" +
        "2. Verifica CORS: En Render, pon ALLOWED_ORIGINS=* y allow_credentials=False en FastAPI."
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

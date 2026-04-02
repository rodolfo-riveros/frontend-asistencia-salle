
/**
 * @fileOverview Cliente de API optimizado para producción con diagnóstico avanzado.
 * Este archivo es el responsable de enviar las peticiones a tu servidor FastAPI en Render.
 */
import { supabase } from './supabase';

const API_BASE_URL = 'https://backend-asistencia-salle.onrender.com';
const API_VERSION = '/api/v1';

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cleanBase = API_BASE_URL.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${cleanBase}${API_VERSION}${cleanEndpoint}`;
  
  // 1. Obtenemos el token de la sesión activa de Supabase
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  // Logging de diagnóstico para el desarrollador (ver en consola del navegador)
  console.log(`[API CALL] ${options.method || 'GET'} -> ${url}`);
  if (!token && !endpoint.includes('health')) {
    console.warn("API Warning: No hay token detectado. La petición podría fallar con 401.");
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
      // IMPORTANTE: Si en FastAPI usas allow_origins=["*"], mode debe ser 'cors'
      mode: 'cors', 
    });

    // 2. Si el servidor responde con error (4xx o 5xx)
    if (!response.ok) {
      let detail = '';
      try {
        const errorData = await response.json();
        detail = errorData.detail || JSON.stringify(errorData);
      } catch {
        detail = `Estado ${response.status}: ${response.statusText}`;
      }
      
      // Error 401/403: Problema con JWT o Permisos
      if (response.status === 401 || response.status === 403) {
        throw new Error(`ACCESO DENEGADO (${response.status}): ${detail}. Revisa el SUPABASE_JWT_SECRET en Render.`);
      }
      
      throw new Error(`ERROR DEL SERVIDOR: ${detail}`);
    }

    // Manejo de respuestas exitosas pero vacías
    if (response.status === 204) return {} as T;
    
    return response.json();
  } catch (err: any) {
    // 3. Errores de Red (CORS, Servidor apagado, Cold Start)
    if (err instanceof TypeError && (err.message === 'Failed to fetch' || err.message.includes('fetch'))) {
      console.error("Error de Red Crítico:", url);
      throw new Error(
        "NO SE PUDO CONECTAR CON EL SERVIDOR.\n\n" +
        "Causas probables:\n" +
        "1. CORS: En Render, ALLOWED_ORIGINS debe ser '*' y allow_credentials=False en FastAPI.\n" +
        "2. COLD START: Entra a " + API_BASE_URL + "/health para despertar el servidor.\n" +
        "3. SSL: Asegúrate de que la URL use HTTPS."
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

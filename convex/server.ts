
import { mutationGeneric, queryGeneric } from "convex/server";

// Re-exportamos usando los genéricos correctos de la librería para evitar errores de compilación
export const mutation = mutationGeneric;
export const query = queryGeneric;

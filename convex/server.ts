
import { mutationGeneric, queryGeneric } from "convex/server";
import { DataModel } from "./_generated/dataModel";

// Re-exportamos usando los genéricos correctos para asegurar estabilidad en producción
export const mutation = mutationGeneric<DataModel>;
export const query = queryGeneric<DataModel>;

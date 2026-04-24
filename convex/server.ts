import { mutation as rawMutation, query as rawQuery } from "convex/server";

// Re-exportamos para asegurar consistencia en las definiciones locales
export const mutation = rawMutation;
export const query = rawQuery;

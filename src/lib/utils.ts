
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Obtiene las iniciales de un nombre completo (Nombre y Apellido).
 * Maneja formatos como "Apellidos, Nombres" o "Nombres Apellidos".
 */
export function getInitials(name: string) {
  if (!name) return "??"
  
  // Limpiar posibles comas (de formatos Apellidos, Nombres)
  const cleanName = name.replace(',', ' ').trim().toUpperCase()
  const words = cleanName.split(/\s+/).filter(w => w.length > 0)
  
  if (words.length >= 2) {
    // Tomar la primera letra de las dos primeras palabras significativas
    return (words[0][0] + words[1][0])
  }
  
  if (words.length === 1) {
    return words[0].substring(0, 2)
  }
  
  return "??"
}

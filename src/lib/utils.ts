import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Obtiene las iniciales de un nombre completo (Nombre y Apellido).
 */
export function getInitials(name: string) {
  if (!name) return "??"
  const words = name.trim().toUpperCase().split(/\s+/)
  if (words.length >= 2) {
    // Primera letra del primer nombre y primera del primer apellido
    return (words[0][0] + words[1][0])
  }
  return words[0].substring(0, 2)
}

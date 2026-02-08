/**
 * URL base del backend (API + uploads).
 * En producción define NEXT_PUBLIC_API_URL con la URL de tu servidor
 * (ej: https://api.tudominio.com) para que mapas y API funcionen para todos los usuarios.
 */
export const API_BASE =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL || "https://writings-spring-homework-affair.trycloudflare.com")
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export function mapAssetUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  // Ensure we don't double slash
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
}

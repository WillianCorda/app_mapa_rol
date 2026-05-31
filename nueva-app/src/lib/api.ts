const DEFAULT_PORT = 29542;

/** Base URL de la API. Se lee en cada uso por si Electron inyecta __SERVER_PORT__ después de cargar la página. */
export function getApiBase(): string {
  if (typeof window === 'undefined') return `http://127.0.0.1:${DEFAULT_PORT}`;
  const port = (window as any).__SERVER_PORT__ != null ? (window as any).__SERVER_PORT__ : DEFAULT_PORT;
  return `http://127.0.0.1:${port}`;
}

/** @deprecated Usa getApiBase() para que el puerto se lea en el momento de la petición. */
export const API_BASE = typeof window !== 'undefined' && (window as any).__SERVER_PORT__ != null
  ? `http://127.0.0.1:${(window as any).__SERVER_PORT__}`
  : `http://127.0.0.1:${DEFAULT_PORT}`;

export function mapAssetUrl(assetPath: string): string {
  if (!assetPath) return '';
  if (assetPath.startsWith('http')) return assetPath;
  const clean = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  return `${getApiBase()}${clean}`;
}

/** Parsea el body de una respuesta como JSON. Si la respuesta es HTML (p. ej. SPA), lanza un error claro. */
export async function parseJsonResponse<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  if (trimmed.startsWith('<')) {
    throw new Error('La API no ha respondido (¿está la app abierta con Electron?). No se puede usar solo el navegador.');
  }
  if (!trimmed) return {} as T;
  return JSON.parse(text) as T;
}

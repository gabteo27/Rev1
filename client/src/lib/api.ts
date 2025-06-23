// En: client/src/lib/api.ts

// Lee la variable de entorno. Estará vacía en desarrollo o tendrá la URL en producción.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const apiFetch = async (path: string, options?: RequestInit) => {
  let fullUrl: string;

  // Si API_BASE_URL tiene un valor (estamos en producción), la usamos.
  if (API_BASE_URL) {
    // Usamos el constructor URL para unir de forma segura y evitar doble slash.
    fullUrl = new URL(path, API_BASE_URL).href;
  } else {
    // Si no (estamos en desarrollo), usamos la ruta relativa directamente.
    fullUrl = path;
  }

  console.log(`[apiFetch] Calling: ${fullUrl}`);
  return fetch(fullUrl, options);
};
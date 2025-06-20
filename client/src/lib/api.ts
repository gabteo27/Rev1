const API_BASE_URL = "https://digital-signage-manager-juanhectormedin.replit.app";

export const apiFetch = async (path: string, options?: RequestInit) => {
  // Usamos el constructor URL para unir la base y la ruta de forma segura.
  const url = new URL(path, API_BASE_URL).href;

  console.log(`[apiFetch] Calling: ${url}`); // Ahora esto DEBE imprimir la URL completa

  return fetch(url, options);
};
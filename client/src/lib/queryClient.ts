import { QueryClient } from "@tanstack/react-query";

// ✅ CORRECCIÓN: Convertida a una constante con una arrow function
const throwIfResponseNotOk = async (res: Response) => {
  if (!res.ok) {
    let errorMessage = `Error: ${res.status} ${res.statusText}`;
    try {
      // Intenta obtener un mensaje más detallado del cuerpo de la respuesta
      const errorBody = await res.json();
      errorMessage = errorBody.message || JSON.stringify(errorBody);
    } catch (e) {
      // Si el cuerpo no es JSON o está vacío, usa el texto de estado
    }
    throw new Error(errorMessage);
  }
};

// ✅ CORRECCIÓN: La función `apiRequest` ahora devuelve el JSON directamente
// Esto simplifica el código donde se llama.
export const apiRequest = async <T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  await throwIfResponseNotOk(res);

  // Devuelve el JSON directamente si la respuesta fue exitosa
  return res.json();
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ✅ CORRECCIÓN: La función `queryFn` ahora es mucho más simple
      // Simplemente llama a `apiRequest` y ya maneja errores y JSON.
      queryFn: ({ queryKey }) => apiRequest(queryKey[0] as string),

      // ✅ MEJORA: Lógica de reintento simplificada
      retry: (failureCount, error: any) => {
        // No reintentar en errores del cliente (4xx) o del servidor (5xx)
        if (error.message.includes('Error: 4') || error.message.includes('Error: 5')) {
          return false;
        }
        return failureCount < 2; // Reintentar hasta 2 veces para otros errores (ej. de red)
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 1000 * 60, // 1 minuto
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error: any) => {
        // Aquí podrías usar un toast para mostrar errores de mutación globalmente
        console.error("Mutation failed:", error.message);
      },
    },
  },
});
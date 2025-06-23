
import { QueryClient } from "@tanstack/react-query";

const throwIfResponseNotOk = async (res: Response) => {
  if (!res.ok) {
    let errorMessage = `Error: ${res.status} ${res.statusText}`;
    try {
      const errorBody = await res.json();
      errorMessage = errorBody.message || JSON.stringify(errorBody);
    } catch (e) {
      // Si el cuerpo no es JSON, usa el texto de estado
    }
    throw new Error(errorMessage);
  }
};

export const apiRequest = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  await throwIfResponseNotOk(res);
  return res;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        try {
          const response = await apiRequest(queryKey[0] as string);
          return response.json();
        } catch (error) {
          console.error("Query failed:", error);
          throw error;
        }
      },
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Reduce retries for better performance on mobile
        return failureCount < 2;
      },
      staleTime: 1000 * 60 * 15, // 15 minutes - más agresivo para Android
      refetchOnWindowFocus: false,
      refetchOnReconnect: false, // Evita requests al reconectar
      refetchInterval: false, // Disable automatic refetching by default
      // Optimizaciones para Android
      cacheTime: 1000 * 60 * 30, // 30 minutes cache
      refetchOnMount: false, // No refetch on component mount
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry mutations on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 1; // Solo 1 retry para mutations
      },
    },
  },
});

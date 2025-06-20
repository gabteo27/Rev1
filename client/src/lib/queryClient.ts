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
        return failureCount < 3;
      },
      staleTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchInterval: false, // Disable automatic refetching by default
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry mutations on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});
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
        if (error.message.includes('Error: 4') || error.message.includes('Error: 5')) {
          return false;
        }
        return failureCount < 1;
      },
      retryDelay: 1000,
      staleTime: 1000 * 60,
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error: any) => {
        console.error("Mutation failed:", error.message);
      },
    },
  },
});
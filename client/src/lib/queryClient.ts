import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({  
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const url = queryKey[0] as string;
        const response = await fetch(url, {
          credentials: 'include',
        });

        if (!response.ok) {
          const error = new Error(`${response.status}: ${response.statusText}`);
          error.message = `${response.status}: ${response.statusText}`;
          throw error;
        }

        return response.json();
      },
      staleTime: 30 * 1000, // 30 seconds
      retry: (failureCount, error) => {
        // Don't retry on 401 errors (unauthorized)
        if (error.message.includes('401')) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});
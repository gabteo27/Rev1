
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({  
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        try {
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
        } catch (error) {
          console.error('Query error:', error);
          throw error;
        }
      },
      staleTime: 30 * 1000, // 30 seconds
      retry: (failureCount, error) => {
        // Don't retry on 401 errors (unauthorized)
        if (error instanceof Error && error.message.includes('401')) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});

// Export helper function for API requests
export const apiRequest = async (url: string, options?: RequestInit) => {
  try {
    const response = await fetch(url, {
      credentials: 'include',
      ...options,
    });

    if (!response.ok) {
      throw new Error(`${response.status}: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};

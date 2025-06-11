import { QueryClient } from "@tanstack/react-query";

// API request helper function
export async function apiRequest(url: string, options: RequestInit = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return response;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Query client configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const url = queryKey[0] as string;
        const response = await apiRequest(url);
        return response.json();
      },
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error.message.includes('Request failed: 4')) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 1000 * 30, // 30 seconds
      refetchOnWindowFocus: false,
      onError: (error) => {
        console.warn('Query error:', error);
      },
    },
  },
});
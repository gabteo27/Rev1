import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        // Don't retry on other 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      queryFn: async ({ queryKey }) => {
        const url = Array.isArray(queryKey) ? queryKey[0] as string : String(queryKey);
        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as any;
          error.status = response.status;
          throw error;
        }

        return response.json();
      },
    },
    mutations: {
      retry: 1,
      onError: (error: any) => {
        console.error('Mutation error:', error);
        // Don't show error toasts for auth errors in silent mode
        if (error?.status !== 401) {
          console.error('Operation failed:', error.message || 'Unknown error');
        }
      },
    },
  },
});

// API request function
export const apiRequest = async (url: string, options?: RequestInit): Promise<Response> => {
  try {
    const token = localStorage.getItem('authToken');

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
    };

    const response = await fetch(url, config);

    if (!response.ok && response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      window.location.href = '/';
      throw new Error('Authentication failed');
    }

    return response;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Cannot connect to server');
    }
    throw error;
  }
};

// Global error boundary for unhandled query errors
queryClient.getQueryCache().subscribe((event) => {
  if (event?.type === 'error') {
    const error = event.error as any;

    // Handle auth errors globally
    if (error?.status === 401) {
      // Clear auth data and redirect to login
      localStorage.removeItem('authToken');
      localStorage.removeItem('screenName');
      localStorage.removeItem('playlistId');
      localStorage.removeItem('screenId');

      // Only redirect if we're not already on the player page
      if (!window.location.pathname.includes('/player')) {
        window.location.href = '/api/login';
      }
    }
  }
});

export default queryClient;
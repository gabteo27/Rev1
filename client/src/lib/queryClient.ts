import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        console.log(`Query failed (attempt ${failureCount + 1}):`, error);
        // Don't retry on 401, 403, 404 errors
        if (error?.status === 401 || error?.status === 403 || error?.status === 404) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      staleTime: 15000, // 15 seconds
      gcTime: 300000,  // 5 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
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
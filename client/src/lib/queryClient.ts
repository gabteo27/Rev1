import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute default
      gcTime: 300000, // 5 minutes default
      refetchOnReconnect: false,
      networkMode: 'online',
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
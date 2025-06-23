
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (except 401)
        if (error?.status >= 400 && error?.status < 500 && error?.status !== 401) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
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

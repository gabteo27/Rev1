
import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/auth/user", {
          credentials: 'include',
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            return null; // User is not authenticated
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return response.json();
      } catch (error) {
        console.error('Auth query error:', error);
        if (error instanceof Error && error.message.includes('Failed to fetch')) {
          // Network error, user might not be authenticated
          return null;
        }
        throw error;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    error,
  };
}

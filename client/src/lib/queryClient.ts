import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Helper function for API requests
export const apiRequest = async (url: string, options: RequestInit = {}) => {
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    if (res.status >= 500) {
      throw new Error(`Server error: ${res.status}`);
    }

    if (res.status === 404) {
      throw new Error('Not found');
    }

    if (res.status === 401) {
      // Handle unauthorized - redirect to login
      window.location.href = '/';
      throw new Error('Unauthorized');
    }

    throw new Error(`Request failed: ${res.status}`);
  }

  return res.json();
};

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const url = queryKey[0] as string;
        return apiRequest(url);
      },
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error.message.includes('Request failed: 4')) {
          return false;
        }
        return failureCount < 2;
      },
      staleTime: 1000 * 30, // 30 seconds
      refetchOnWindowFocus: false,
    },
  },
});
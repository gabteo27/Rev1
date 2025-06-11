import { queryClient } from "./queryClient";

class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  connect() {
      if (this.ws?.readyState === WebSocket.OPEN) {
        return;
      }

      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        // --- CORRECCIÓN ---
        // Usar window.location.host, que incluye el host y el puerto correctamente 
        // en la mayoría de los entornos, incluido Replit.
        const wsUrl = `<span class="math-inline">\{protocol\}//</span>{window.location.host}/ws`;

        this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log("WebSocket connected");
        this.reconnectAttempts = 0;
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };
      
      this.ws.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason);
        this.scheduleReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error("Max reconnection attempts reached");
    }
  }

  private handleMessage(message: any) {
    const { type, data } = message;
    
    switch (type) {
      case "alert":
        this.handleAlert(data);
        break;
      case "playlist_update":
        this.handlePlaylistUpdate(data);
        break;
      case "content_update":
        this.handleContentUpdate(data);
        break;
      case "screen_status":
        this.handleScreenStatus(data);
        break;
      default:
        console.log("Unknown message type:", type);
    }

    // Notify listeners
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      typeListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error("Error in WebSocket listener:", error);
        }
      });
    }
  }

  private handleAlert(alert: any) {
    // Invalidate alerts cache to refresh the UI
    queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    
    // Show alert notification in UI if needed
    if (alert.isActive) {
      this.showAlertNotification(alert);
    }
  }

  private handlePlaylistUpdate(data: any) {
    // Invalidate playlist-related caches
    queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
    if (data.playlistId) {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists", data.playlistId.toString()] });
    }
  }

  private handleContentUpdate(data: any) {
    // Invalidate content cache
    queryClient.invalidateQueries({ queryKey: ["/api/content"] });
  }

  private handleScreenStatus(data: any) {
    // Invalidate screens cache
    queryClient.invalidateQueries({ queryKey: ["/api/screens"] });
  }

  private showAlertNotification(alert: any) {
    // Create a visual notification for urgent alerts
    // This could be a toast notification or overlay
    console.log("New alert received:", alert);
  }

  // Public methods for subscribing to specific message types
  subscribe(type: string, listener: (data: any) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);

    // Return unsubscribe function
    return () => {
      const typeListeners = this.listeners.get(type);
      if (typeListeners) {
        typeListeners.delete(listener);
        if (typeListeners.size === 0) {
          this.listeners.delete(type);
        }
      }
    };
  }

  send(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket is not connected. Message not sent:", message);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }

  getConnectionState() {
    return this.ws?.readyState || WebSocket.CLOSED;
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Create singleton instance
export const wsManager = new WebSocketManager();

// Auto-connect when module is imported
if (typeof window !== "undefined") {
  wsManager.connect();
}

export default wsManager;

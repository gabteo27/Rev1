import { queryClient } from "./queryClient";

class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  connect() {
      if (this.ws?.readyState === WebSocket.OPEN) {
        console.log("WebSocket already connected");
        return;
      }

      if (this.ws?.readyState === WebSocket.CONNECTING) {
        console.log("WebSocket already connecting");
        return;
      }

      // Close any existing connection first
      if (this.ws) {
        try {
          this.ws.close(1000, 'Reconnecting');
        } catch (error) {
          console.error("Error closing existing WebSocket:", error);
        }
        this.ws = null;
      }

      try {
        // Simple URL construction for Replit environment
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        console.log("Connecting to WebSocket:", wsUrl);
        this.ws = new WebSocket(wsUrl);

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.ws?.readyState === WebSocket.CONNECTING) {
          console.log("Connection timeout, closing WebSocket");
          this.ws.close();
        }
      }, 10000); // 10 second timeout

      this.ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log("WebSocket connected successfully");
        this.reconnectAttempts = 0;
        this.emit('open');

        // Send pong response to server ping
        this.ws?.addEventListener('message', (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'ping') {
              this.send({ type: 'pong', timestamp: Date.now() });
            }
          } catch (error) {
            // Ignore ping/pong parsing errors
          }
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          // Skip ping messages in main handler
          if (message.type === 'ping') {
            return;
          }

          this.handleMessage(message);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`WebSocket disconnected: ${event.code} - ${event.reason}`);
        this.emit('close', event);
        this.ws = null;

        // Only reconnect if it wasn't a manual close
        if (event.code !== 1000) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        if (this.ws) {
          this.ws.close();
        }
      };
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), 10000);

      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      setTimeout(() => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          this.connect();
        }
      }, delay);
    } else {
      console.warn("Max reconnection attempts reached. Will retry in 30 seconds...");
      setTimeout(() => {
        this.reconnectAttempts = 0;
        this.connect();
      }, 30000);
    }
  }

  private handleMessage(message: any) {
    const { type, data } = message;

    // Emit the message event first
    this.emit('message', message);

    // Handle specific message types
    switch (type) {
      case "connection_established":
        this.emit('connection_established');
        break;
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

    // Notify type-specific listeners
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

  // Event listener methods for connection events
  on(event: string, callback: (data?: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => this.off(event, callback);
  }

  off(event: string, callback: (data?: any) => void) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  // Emit events to listeners
  private emit(event: string, data?: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }
}

// Create singleton instance
export const websocketManager = new WebSocketManager();

// Auto-connect when module is imported, but don't block on errors
if (typeof window !== "undefined") {
  // Use setTimeout to avoid blocking the main thread during module loading
  setTimeout(() => {
    try {
      websocketManager.connect();
    } catch (error) {
      console.warn('Failed to initialize WebSocket connection:', error);
    }
  }, 100);
}

export default websocketManager;
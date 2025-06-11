import { queryClient } from './queryClient';

type MessageListener = (data: any) => void;
type EventListener = () => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<MessageListener>>();
  private eventListeners = new Map<string, Set<EventListener>>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.connect();
  }

  private connect() {
    try {
      // Clear any existing timeout
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      console.log('Attempting WebSocket connection to:', wsUrl);

      this.ws = new WebSocket(wsUrl);

      // Set connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.log('WebSocket connection timed out');
          this.ws.close();
        }
      }, 10000); // 10 second timeout

      this.ws.onopen = () => {
        console.log('WebSocket connected successfully');
        this.reconnectAttempts = 0;

        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }

        this.startHeartbeat();
        this.emit('connection_established');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        this.cleanup();
        this.emit('close');

        if (event.code !== 1000) { // Not a normal closure
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Send ping every 30 seconds
  }

  private cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
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

  private handleMessage(data: any) {
    console.log('WebSocket message received:', data);

    // Emit to specific message type listeners
    if (data.type) {
      this.emit('message', data);

      // Handle specific message types
      switch (data.type) {
        case 'pong':
          // Handle pong response
          break;
        case 'alert':
          this.showAlertNotification(data.alert);
          break;
        case 'content_update':
          this.handleContentUpdate(data);
          break;
        case 'screen_status':
          this.handleScreenStatus(data);
          break;
      }
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
    console.log("New alert received:", alert);
  }

  // Event emitter functionality
  private emit(event: string, data?: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          if (data !== undefined) {
            (listener as any)(data);
          } else {
            listener();
          }
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  // Public methods for subscribing to events
  on(event: string, listener: EventListener | MessageListener) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener as EventListener);

    // Return unsubscribe function
    return () => {
      const eventListeners = this.eventListeners.get(event);
      if (eventListeners) {
        eventListeners.delete(listener as EventListener);
        if (eventListeners.size === 0) {
          this.eventListeners.delete(event);
        }
      }
    };
  }

  off(event: string, listener: EventListener | MessageListener) {
    const eventListeners = this.eventListeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener as EventListener);
      if (eventListeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  send(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket is not connected. Message not sent:", message);
    }
  }

  disconnect() {
    this.cleanup();
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    this.eventListeners.clear();
  }

  getConnectionState() {
    return this.ws?.readyState || WebSocket.CLOSED;
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const websocketManager = new WebSocketManager();
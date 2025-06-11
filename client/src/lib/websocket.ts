import { queryClient } from "./queryClient";

class WebSocketManager {
  private ws: WebSocket | null = null;
  private listeners: Map<string, ((data: any) => void)[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;
  private isConnecting = false;

  constructor() {
    this.connect();
  }

  private connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      console.log('Connecting to WebSocket:', wsUrl);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected successfully');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.isConnecting = false;
        this.reconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      this.reconnect();
    }
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(this.reconnectAttempts * this.reconnectInterval, 10000); // cap at 10 seconds
      console.log(`Attempting to reconnect in ${delay}ms`);
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  public subscribe(type: string, callback: (data: any) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(callback);
  }

  private handleMessage(message: any) {
    const { type, data } = message;
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      typeListeners.forEach(listener => listener(data));
    }
  }

  public unsubscribe(type: string, callback?: (data: any) => void) {
    const typeListeners = this.listeners.get(type);
    if (typeListeners && callback) {
      const index = typeListeners.indexOf(callback);
      if (index > -1) {
        typeListeners.splice(index, 1);
      }
    }
  }

  public send(type: string, data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN || false;
  }
}

// Export singleton instance
const wsManager = new WebSocketManager();
export default wsManager;
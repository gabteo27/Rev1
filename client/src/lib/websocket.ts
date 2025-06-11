type WebSocketMessage = {
  type: string;
  payload?: any;
  id?: string;
};

type EventHandler = (data: any) => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private eventHandlers = new Map<string, EventHandler[]>();
  private isConnecting = false;

  constructor() {
    this.connect();
  }

  private getWebSocketURL(): string {
    if (typeof window === 'undefined') return '';

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      return `${protocol}//${host}/ws`;
    } catch (error) {
      console.error('Error creating WebSocket URL:', error);
      return '';
    }
  }

  connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    const wsUrl = this.getWebSocketURL();

    if (!wsUrl) {
      console.error('Could not create WebSocket URL');
      this.isConnecting = false;
      return;
    }

    try {
      console.log('Connecting to WebSocket:', wsUrl);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit('connection_established', { connected: true });
      };

      this.ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          this.emit('message', data);
          if (data.type) {
            this.emit(data.type, data.payload || data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.isConnecting = false;
        this.ws = null;
        this.emit('close', { code: event.code, reason: event.reason });

        if (!event.wasClean) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
        this.emit('error', error);
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), 10000);

      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      setTimeout(() => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
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

  send(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
      }
    } else {
      console.warn('WebSocket is not connected. Cannot send message:', message);
    }
  }

  on(event: string, handler: EventHandler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: EventHandler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in WebSocket event handler for ${event}:`, error);
        }
      });
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  get readyState() {
    return this.ws?.readyState || WebSocket.CLOSED;
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const websocketManager = new WebSocketManager();
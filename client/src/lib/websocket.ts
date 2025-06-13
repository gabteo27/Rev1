import { queryClient } from './queryClient';

interface WebSocketMessage {
  type: string;
  data?: any;
  userId?: string;
  userType?: string;
}

class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;
  private subscribers = new Map<string, Array<(data: any) => void>>();
  private isReconnecting = false;
  private userId: string | null = null;
  private authToken: string | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
  }

  async connect(userId?: string, authToken?: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    this.userId = userId || null;
    this.authToken = authToken || null;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    console.log('Connecting to WebSocket:', wsUrl, this.authToken ? '(with player token)' : '(admin mode)');

    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  private setupEventHandlers() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected successfully');
      this.reconnectAttempts = 0;
      this.isReconnecting = false;

      // Authenticate after connection
      if (this.userId) {
        console.log('Authenticating WebSocket connection (admin)...');
        this.send({ type: 'auth', userId: this.userId });
      } else if (this.authToken) {
        console.log('Authenticating player WebSocket connection with token:', this.authToken?.substring(0, 8) + '...');
        this.send({ type: 'player-auth', token: this.authToken });
      }

      // Start heartbeat
      this.startHeartbeat();
    };

    this.ws.onmessage = this.handleMessage;

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      this.ws = null;
      this.stopHeartbeat();

      if (!this.isReconnecting && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private handleMessage(event: MessageEvent) {
    try {
      const message = JSON.parse(event.data);

      if (message.type === 'auth_success') {
        console.log('WebSocket authentication successful');
        return;
      }

      if (message.type === 'pong') {
        return;
      }

      // Log received messages for debugging
      console.log('WebSocket message received:', message.type, message.data);

      // Notify subscribers
      const callbacks = this.subscribers.get(message.type);
      if (callbacks) {
        callbacks.forEach(callback => {
          try {
            callback(message.data);
          } catch (error) {
            console.error('Error in WebSocket callback:', error);
          }
        });
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  private scheduleReconnect() {
    if (this.isReconnecting) return;

    this.isReconnecting = true;
    this.reconnectAttempts++;

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect(this.userId, this.authToken);
    }, delay);
  }

  subscribe(eventType: string, callback: (data: any) => void) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)?.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(eventType);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  send(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message:', message);
    }
  }

  disconnect() {
    this.isReconnecting = false;
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'ping' });
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

export const wsManager = new WebSocketManager();
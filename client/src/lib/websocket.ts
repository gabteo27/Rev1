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
  private reconnectTimeoutId: NodeJS.Timeout | null = null;

  constructor() {
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
  }

  connect(userId?: string, authToken?: string) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          console.log('WebSocket already connected');
          return;
      }
      if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.log('WebSocket connection already in progress');
          return;
      }

      this.userId = userId;
      this.authToken = authToken;

      if (this.reconnectTimeoutId) {
          clearTimeout(this.reconnectTimeoutId);
          this.reconnectTimeoutId = null;
      }

      try {
          // --- INICIA LA LÓGICA CORREGIDA ---
          const productionApiUrl = import.meta.env.VITE_API_BASE_URL;
          let wsUrl: string;

          if (productionApiUrl) {
            // MODO PRODUCCIÓN (cuando haces 'npm run build'): Construye la URL absoluta
            const wsBase = productionApiUrl.replace('https://', 'wss://');
            wsUrl = `${wsBase}/ws`;
          } else {
            // MODO DESARROLLO (preview de Replit): Construye la URL relativa
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            wsUrl = `${protocol}//${host}/ws`;
          }
          // --- FIN DE LA LÓGICA CORREGIDA ---

          console.log('🔌 Connecting to WebSocket:', wsUrl);

          this.ws = new WebSocket(wsUrl);
          this.setupEventListeners();

      } catch (error) {
          console.error('❌ Failed to create WebSocket connection:', error);
          this.reconnectWithBackoff();
      }
  }

  private setupEventListeners() {
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

      if (message.type === 'heartbeat-ack') {
        return;
      }

      if (message.type === 'connection_established') {
        console.log('WebSocket connection established');
        return;
      }

      if (message.type === 'screen-disconnected') {
        console.log('Screen disconnected by server:', message.data);
        // Reload page if this screen was disconnected
        if (message.data?.reason === 'Screen deleted') {
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
        return;
      }

      // Log received messages for debugging (excluding frequent messages)
      if (!['ping', 'pong', 'heartbeat-ack'].includes(message.type)) {
        console.log('WebSocket message received:', message.type, message.data);
      }

      // Notify subscribers with the entire message object
      const callbacks = this.subscribers.get(message.type);
      if (callbacks) {
        callbacks.forEach(callback => {
          try {
            callback({ type: message.type, data: message.data });
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

  private reconnectWithBackoff() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ Max reconnection attempts reached, giving up');
      return;
    }

    // Use exponential backoff with jitter
    const baseDelay = 1000 * Math.pow(2, this.reconnectAttempts);
    const jitter = Math.random() * 1000; // Add random jitter to prevent thundering herd
    const delay = Math.min(baseDelay + jitter, 30000);

    console.log(`🔄 Attempting to reconnect in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);

    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect(this.userId, this.authToken);
    }, delay);
  }
}

// Singleton instance
let wsInstance: WebSocketManager | null = null;

export class WebSocketClient {
  static getInstance(): WebSocketManager {
    if (!wsInstance) {
      wsInstance = new WebSocketManager();
    }
    return wsInstance;
  }
}

export const wsManager = new WebSocketManager();
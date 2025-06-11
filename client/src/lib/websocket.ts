
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
  private reconnectDelay = 1000;
  private isReconnecting = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private authUser: any = null;
  private connectionPromise: Promise<void> | null = null;
  private isConnecting = false;
  private subscribers: Map<string, ((data: any) => void)[]> = new Map();
  private isDestroyed = false;

  async connect(): Promise<void> {
    if (this.isDestroyed) {
      console.log('WebSocketManager is destroyed, cannot connect');
      return;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    this.connectionPromise = this._connect();
    return this.connectionPromise;
  }

  private async _connect(): Promise<void> {
    if (this.isConnecting || this.isDestroyed) {
      return;
    }

    this.isConnecting = true;

    try {
      // Close existing connection if any
      if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
        this.ws.close();
        this.ws = null;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      console.log('Connecting to WebSocket:', wsUrl);

      return new Promise((resolve, reject) => {
        if (this.isDestroyed) {
          reject(new Error('WebSocketManager destroyed'));
          return;
        }

        try {
          this.ws = new WebSocket(wsUrl);

          const connectionTimeout = setTimeout(() => {
            if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
              this.ws.close();
            }
            reject(new Error('WebSocket connection timeout'));
          }, 10000);

          this.ws.onopen = async () => {
            clearTimeout(connectionTimeout);
            console.log('WebSocket connected successfully');
            this.reconnectAttempts = 0;
            this.isReconnecting = false;
            this.isConnecting = false;
            this.connectionPromise = null;

            try {
              await this.authenticate();
              this.startHeartbeat();
              resolve();
            } catch (error) {
              console.error('Authentication failed:', error);
              resolve(); // Don't reject, just continue
            }
          };

          this.ws.onmessage = (event) => {
            try {
              const message: WebSocketMessage = JSON.parse(event.data);
              this.handleMessage(message);
            } catch (error) {
              console.error('Error parsing WebSocket message:', error);
            }
          };

          this.ws.onclose = (event) => {
            clearTimeout(connectionTimeout);
            this.isConnecting = false;
            this.connectionPromise = null;
            this.stopHeartbeat();

            console.log('WebSocket disconnected:', event.code, event.reason);

            // Only reconnect if not manually closed and not destroyed
            if (!this.isDestroyed && event.code !== 1000 && !this.isReconnecting && this.reconnectAttempts < this.maxReconnectAttempts) {
              this.scheduleReconnect();
            }
          };

          this.ws.onerror = (error) => {
            clearTimeout(connectionTimeout);
            console.error('WebSocket error:', error);
            this.isConnecting = false;
            this.connectionPromise = null;
            reject(error);
          };

        } catch (error) {
          this.isConnecting = false;
          reject(error);
        }
      });

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.isConnecting = false;
      this.connectionPromise = null;
      if (!this.isDestroyed) {
        this.scheduleReconnect();
      }
      throw error;
    }
  }

  private async authenticate(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.isDestroyed) return;

    try {
      console.log('Authenticating WebSocket connection...');

      // Get current user from React Query cache first
      let userData = queryClient.getQueryData(['/api/auth/user']);

      if (!userData) {
        // Try to fetch user data with timeout
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const response = await fetch('/api/auth/user', { 
            credentials: 'include',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            userData = await response.json();
            queryClient.setQueryData(['/api/auth/user'], userData);
          }
        } catch (fetchError) {
          console.warn('Could not fetch user data for WebSocket auth:', fetchError);
          return;
        }
      }

      if (userData && typeof userData === 'object' && 'id' in userData) {
        this.authUser = userData;
        
        // Send authentication message
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.send({
            type: 'auth',
            userId: userData.id,
            userType: 'admin'
          });
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
    }
  }

  private scheduleReconnect() {
    if (this.isReconnecting || this.isDestroyed) return;

    this.isReconnecting = true;
    this.reconnectAttempts++;

    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      this.isReconnecting = false;
      return;
    }

    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      if (!this.isDestroyed) {
        this.isReconnecting = false;
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN && !this.isDestroyed) {
        this.send({ type: 'ping' });
      }
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private handleMessage(message: WebSocketMessage) {
    if (this.isDestroyed) return;

    try {
      switch (message.type) {
        case 'pong':
          // Heartbeat response - no action needed
          break;
        case 'auth_success':
          console.log('WebSocket authentication successful');
          break;
        case 'auth_error':
          console.error('WebSocket authentication failed:', message.data);
          break;
        case 'content_updated':
          queryClient.invalidateQueries({ queryKey: ['/api/content'] });
          break;
        case 'playlist_updated':
          queryClient.invalidateQueries({ queryKey: ['/api/playlists'] });
          break;
        case 'screen_updated':
          queryClient.invalidateQueries({ queryKey: ['/api/screens'] });
          break;
        default:
          // Handle subscribed events
          if (this.subscribers.has(message.type)) {
            const callbacks = this.subscribers.get(message.type);
            callbacks?.forEach(callback => {
              try {
                callback(message.data);
              } catch (error) {
                console.error('Error in WebSocket subscriber callback:', error);
              }
            });
          }
          break;
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  send(message: WebSocketMessage) {
    if (this.ws?.readyState === WebSocket.OPEN && !this.isDestroyed) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
      }
    } else {
      console.warn('WebSocket not ready, message not sent:', message);
    }
  }

  subscribe(eventType: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    
    const callbacks = this.subscribers.get(eventType);
    callbacks?.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(eventType);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
        }
        if (callbacks.length === 0) {
          this.subscribers.delete(eventType);
        }
      }
    };
  }

  disconnect() {
    this.isDestroyed = true;
    this.stopHeartbeat();
    this.isReconnecting = false;
    this.connectionPromise = null;
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
    
    this.subscribers.clear();
    console.log('WebSocket disconnected and cleaned up');
  }

  getConnectionState() {
    return this.ws?.readyState || WebSocket.CLOSED;
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const wsManager = new WebSocketManager();

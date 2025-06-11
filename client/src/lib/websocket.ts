import { queryClient } from './queryClient';

interface WebSocketMessage {
  type: string;
  data?: any;
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

  async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this._connect();
    return this.connectionPromise;
  }

  private async _connect(): Promise<void> {
    try {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.connectionPromise = null;
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      console.log('Connecting to WebSocket:', wsUrl);

      return new Promise((resolve, reject) => {
        try {
          this.ws = new WebSocket(wsUrl);

          const connectionTimeout = setTimeout(() => {
            if (this.ws) {
              this.ws.close();
            }
            reject(new Error('WebSocket connection timeout'));
          }, 10000);

          this.ws.onopen = async () => {
            clearTimeout(connectionTimeout);
            console.log('WebSocket connected successfully');
            this.reconnectAttempts = 0;
            this.isReconnecting = false;
            this.connectionPromise = null;

            try {
              await this.authenticate();
              this.startHeartbeat();
              resolve();
            } catch (error) {
              console.error('Authentication failed:', error);
              resolve(); // Don't reject, just continue without auth
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
            console.log('WebSocket disconnected:', event.code, event.reason);
            this.stopHeartbeat();
            this.connectionPromise = null;

            if (!this.isReconnecting && this.reconnectAttempts < this.maxReconnectAttempts) {
              this.scheduleReconnect();
            }
          };

          this.ws.onerror = (error) => {
            clearTimeout(connectionTimeout);
            console.error('WebSocket error:', error);
            this.connectionPromise = null;
            reject(error);
          };

        } catch (error) {
          reject(error);
        }
      });

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.connectionPromise = null;
      this.scheduleReconnect();
      throw error;
    }
  }

  private async authenticate(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    try {
      console.log('Authenticating WebSocket connection...');

      // Get current user from React Query cache first
      let userData = queryClient.getQueryData(['/api/auth/user']);

      if (!userData) {
        // Try to fetch user data
        try {
          const response = await fetch('/api/auth/user', { 
            credentials: 'include',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            userData = await response.json();
          }
        } catch (fetchError) {
          console.warn('Could not fetch user data for WebSocket auth:', fetchError);
          return;
        }
      }

      if (userData && typeof userData === 'object' && 'id' in userData) {
        this.authUser = userData;
        this.send({
          type: 'auth',
          data: { 
            userId: userData.id,
            userType: 'admin'
          }
        });
      }
    } catch (error) {
      console.error('Authentication error:', error);
    }
  }

  private scheduleReconnect() {
    if (this.isReconnecting) return;

    this.isReconnecting = true;
    this.reconnectAttempts++;

    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      this.isReconnecting = false;
      return;
    }

    const delay = Math.min(this.reconnectDelay * this.reconnectAttempts, 10000);
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.isReconnecting = false;
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
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
          console.log('Unknown WebSocket message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  send(message: WebSocketMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
      }
    }
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
    this.connectionPromise = null;
  }

  getConnectionState() {
    return this.ws?.readyState || WebSocket.CLOSED;
  }
}

export const wsManager = new WebSocketManager();
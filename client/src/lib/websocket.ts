class WebSocketManager {
  private ws: WebSocket | null = null;
  private listeners: Map<string, ((data: any) => void)[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;
  private isConnecting = false;
  private wsUrl: string = "";

  constructor() {
    this.connect();
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (this.isConnecting) {
      return Promise.resolve();
    }

    this.isConnecting = true;

    return new Promise<void>((resolve, reject) => {
      try {
        // Generate WebSocket URL based on current location
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        this.wsUrl = `${protocol}//${host}/ws`;

        console.log('Connecting to WebSocket:', this.wsUrl);

        this.ws = new WebSocket(this.wsUrl);

        const connectionTimeout = setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            this.ws?.close();
            this.isConnecting = false;
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log('WebSocket connected successfully');
          this.reconnectAttempts = 0;
          this.isConnecting = false;
          this.authenticate();
          resolve();
        };

        this.ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        this.isConnecting = false;
        reject(error);
      }

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        console.log('WebSocket disconnected:', event.code, event.reason);
        if (event.code !== 1000) { // Not a normal closure
          this.handleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.error('WebSocket error:', error);
        reject(error);
      };
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * this.reconnectAttempts, 10000); // Max 10 seconds

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.handleReconnect();
        }
      });
    }, delay);
  }

  public subscribe(type: string, callback: (data: any) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(callback);
    return () => {
      this.unsubscribe(type, callback);
    };
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

  private authenticate() {
    // Implement your authentication logic here if needed.
    // For example, you might send an authentication token to the server.
    console.log('Authenticating WebSocket connection...');
  }
}

const wsManager = new WebSocketManager();
export default wsManager;
export { wsManager };
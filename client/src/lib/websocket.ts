export class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private eventListeners: Map<string, Set<Function>> = new Map();
  private isAuthenticated = false;

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        this.ws = new WebSocket(wsUrl);

        const timeout = setTimeout(() => {
          if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            this.ws.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          console.log('🔌 WebSocket connected successfully');
          this.reconnectAttempts = 0;
          resolve();
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
          clearTimeout(timeout);
          console.log('🔌 WebSocket disconnected', event.code, event.reason);
          this.isAuthenticated = false;
          if (event.code !== 1000) { // Not a normal closure
            this.attemptReconnect();
          }
        };

        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          console.error('WebSocket error:', error);
          // Don't reject immediately, let onclose handle reconnection
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  async authenticate(token: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    this.send({
      type: 'player-auth',
      token
    });

    this.isAuthenticated = true;
  }

  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  }

  on(eventType: string, callback: Function): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(callback);
  }

  off(eventType: string, callback: Function): void {
    const callbacks = this.eventListeners.get(eventType);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  private handleMessage(data: any): void {
    const callbacks = this.eventListeners.get(data.type);
    if (callbacks) {
      callbacks.forEach(callback => callback(data.data || data));
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);

      console.log(`🔄 Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

      setTimeout(async () => {
        try {
          await this.connect();
          console.log('✅ Reconnection successful');
        } catch (error) {
          console.error('Reconnection failed:', error);
          // Continue attempting if we haven't reached max attempts
        }
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached');
      // Reset attempts after a longer delay to allow future reconnection attempts
      setTimeout(() => {
        this.reconnectAttempts = 0;
        console.log('🔄 Reset reconnection attempts, will try again if needed');
      }, 60000);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.eventListeners.clear();
    this.isAuthenticated = false;
    this.reconnectAttempts = 0;
  }
}

// Create a singleton instance for global use
export const wsManager = new WebSocketManager();

// Export default for compatibility
export default WebSocketManager;
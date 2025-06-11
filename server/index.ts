
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic } from "./vite.js";
import { setupAuth } from "./replitAuth.js";
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

// Declare wss variable globally
let wss: WebSocketServer;

async function startApplication() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: false }));

  // Use Replit Auth
  setupAuth(app);

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyObj, ...args) {
      capturedJsonResponse = bodyObj;
      return originalResJson.apply(res, [bodyObj, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse).substring(0, 80)}…`;
        }

        console.log(logLine);
      }
    });

    next();
  });

  // Create HTTP server first
  const httpServer = createServer(app);

  // Setup WebSocket server for real-time communication
  wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws',
    port: undefined, // Use the same port as HTTP server
    perMessageDeflate: false,
    maxPayload: 16 * 1024 * 1024, // 16MB max payload
    verifyClient: (info) => {
      console.log('WebSocket connection attempt from:', info.origin);
      return true;
    }
  });

  // Setup Vite with the HTTP server after WebSocket
  await setupVite(app, httpServer);

  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection established from:', req.socket.remoteAddress || 'unknown');
    
    // Initialize connection state
    (ws as any).isAlive = true;

    // Send initial connection confirmation
    try {
      ws.send(JSON.stringify({ 
        type: 'connection_established', 
        timestamp: Date.now(),
        message: 'WebSocket connection successful'
      }));
    } catch (error) {
      console.error('Error sending initial message:', error);
    }

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle ping/pong for connection health
        if (data.type === 'pong') {
          (ws as any).isAlive = true;
          return;
        }
        
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          return;
        }
        
        console.log('WebSocket message received:', data);

        // Handle screen identification
        if (data.type === 'identify_screen') {
          (ws as any).screenId = data.screenId;
          console.log(`Screen ${data.screenId} identified`);
          ws.send(JSON.stringify({ 
            type: 'screen_identified', 
            screenId: data.screenId,
            timestamp: Date.now()
          }));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        // Send error response instead of closing
        try {
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Invalid message format',
            timestamp: Date.now()
          }));
        } catch (sendError) {
          console.error('Error sending error message:', sendError);
        }
      }
    });

    ws.on('close', (code, reason) => {
      console.log(`WebSocket connection closed: ${code} - ${reason || 'No reason provided'}`);
      if ((ws as any).screenId) {
        console.log(`Screen ${(ws as any).screenId} disconnected`);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error.message || error);
      // Don't terminate immediately, let the client handle reconnection
    });

    // Handle connection cleanup
    ws.on('pong', () => {
      (ws as any).isAlive = true;
    });
  });

  // Ping all clients every 30 seconds to keep connections alive
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if ((ws as any).isAlive === false) {
        return ws.terminate();
      }
      
      (ws as any).isAlive = false;
      try {
        ws.ping();
      } catch (error) {
        console.error('Error pinging client:', error);
        ws.terminate();
      }
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  await registerRoutes(app);

  const PORT = 5000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`WebSocket server running on port ${PORT}`);
  });
}

// Export wss outside the function
export { wss };

startApplication().catch(console.error);

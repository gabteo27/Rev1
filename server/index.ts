
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
    verifyClient: (info) => {
      // Accept all connections for now
      return true;
    }
  });

  // Setup Vite with the HTTP server after WebSocket
  await setupVite(app, httpServer);

  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection established from:', req.socket.remoteAddress);

    // Send initial ping to verify connection
    ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle ping/pong for connection health
        if (data.type === 'pong') {
          return; // Just acknowledge the pong
        }
        
        console.log('WebSocket message received:', data);

        // Handle screen identification
        if (data.type === 'identify_screen') {
          (ws as any).screenId = data.screenId;
          console.log(`Screen ${data.screenId} identified`);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        // Don't close connection on parse error, just log it
      }
    });

    ws.on('close', (code, reason) => {
      console.log(`WebSocket connection closed: ${code} - ${reason}`);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      // Try to close the connection gracefully
      try {
        ws.terminate();
      } catch (e) {
        console.error('Error terminating WebSocket:', e);
      }
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

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic } from "./vite.js";
import { setupAuth } from "./replitAuth.js";
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

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

// Setup Vite with the HTTP server
setupVite(app, httpServer);

// Setup WebSocket server for real-time communication
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection established');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('WebSocket message received:', data);

      // Handle screen identification
      if (data.type === 'identify_screen') {
        ws.screenId = data.screenId;
        console.log(`Screen ${data.screenId} identified`);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Make WebSocket server available to routes
export { wss };

registerRoutes(app);

const PORT = 5000;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server running on port ${PORT}`);
});
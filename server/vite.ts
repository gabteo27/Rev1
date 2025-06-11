import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server?: any): Promise<void> {
  try {
    const vite = await import("vite");
    const viteDevServer = await vite.createServer({
      server: { 
        middlewareMode: true,
        hmr: { 
          port: 24678,
          overlay: false
        }
      },
      appType: "spa",
      optimizeDeps: {
        exclude: ['@tanstack/react-query']
      }
    });

    // Use vite's connect instance as middleware since we already have http server
    app.use(viteDevServer.middlewares);

    console.log("Vite development server setup completed");
  } catch (error) {
    console.error("Error setting up Vite:", error);
    throw error;
  }
}


export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // En producción, el enrutamiento es más complejo y usualmente se maneja
  // para que las rutas apunten al index.html correcto o se use un enrutador del lado del servidor.
  // Por ahora, para el desarrollo, el cambio anterior es suficiente.
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
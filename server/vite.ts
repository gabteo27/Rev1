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

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  // --- INICIO DE LA SECCIÓN MODIFICADA ---
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      let templatePath;

      // Determinamos qué archivo HTML servir basado en la URL
      if (url === '/player.html') {
        templatePath = path.resolve(
          __dirname,
          "..",
          "client",
          "player.html"
        );
      } else {
        // Por defecto, para cualquier otra ruta, servimos el index.html principal
        templatePath = path.resolve(
          __dirname,
          "..",
          "client",
          "index.html"
        );
      }

      // Verificamos si el archivo existe
      if (!fs.existsSync(templatePath)) {
          return res.status(404).send("Not Found");
      }

      let template = await fs.promises.readFile(templatePath, "utf-8");

      // Aplicamos las transformaciones de Vite
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
  // --- FIN DE LA SECCIÓN MODIFICADA ---
}


export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

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
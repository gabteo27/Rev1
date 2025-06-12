import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import path from "path";
import fs from "fs-extra";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { validatePlayerAuth } from "./playerAuth";
import { randomBytes } from 'crypto';
import { isPlayerAuthenticated } from "./playerAuth";
import {
  insertContentItemSchema,
  insertPlaylistSchema,
  insertPlaylistItemSchema,
  insertScreenSchema,
  insertAlertSchema,
  insertWidgetSchema,
  insertScheduleSchema,
  insertDeploymentSchema,
} from "@shared/schema";
import { buildApk } from "./apk-builder";

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png", 
      "image/gif",
      "video/mp4",
      "application/pdf"
    ];
    cb(null, allowedTypes.includes(file.mimetype));
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get("/api/screens/pairing-status/:deviceHardwareId", async (req, res) => {
    try {
      const { deviceHardwareId } = req.params;
      console.log(`Checking pairing status for device: ${deviceHardwareId}`);

      // Decodificar el deviceHardwareId en caso de que venga codificado
      const decodedDeviceId = decodeURIComponent(deviceHardwareId);
      const screen = await storage.getScreenByDeviceHardwareId(decodedDeviceId);

      if (!screen) {
        console.log(`Screen not found for device: ${decodedDeviceId}`);
        return res.status(404).json({ status: 'not_found' });
      }

      // Si la pantalla tiene un authToken, significa que ya fue emparejada.
      if (screen.authToken) {
        console.log(`Screen paired successfully for device: ${decodedDeviceId}`);
        return res.json({
          status: 'paired',
          authToken: screen.authToken,
          playlistId: screen.playlistId,
          name: screen.name
        });
      }

      // Si no, sigue pendiente.
      console.log(`Screen still pending for device: ${decodedDeviceId}`);
      return res.json({ status: 'pending' });

    } catch (error) {
      console.error("Error checking pairing status:", error);
      res.status(500).json({ message: "Failed to check pairing status", error: error.message });
    }
  });

  // Content routes
  app.get("/api/content", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const items = await storage.getContentItems(userId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching content:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  app.post("/api/content", isAuthenticated, upload.single("file"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, description, type, url, duration, category, tags } = req.body;

      let contentData: any = {
        userId,
        title,
        description: description || null,
        duration: duration ? parseInt(duration, 10) : 30,
        category: category || null,
        tags: tags ? (Array.isArray(tags) ? tags : tags.split(",").map((t: string) => t.trim())) : [],
        thumbnailUrl: null, // ✅ Inicializamos thumbnailUrl
      };

      if (req.file) {
        // Manejo de archivos subidos
        const mimeType = req.file.mimetype;
        if (mimeType.startsWith('image/')) {
          contentData.type = 'image';
          contentData.thumbnailUrl = `/uploads/${req.file.filename}`; // La propia imagen es su miniatura
        } else if (mimeType.startsWith('video/')) {
          contentData.type = 'video';
        } else if (mimeType === 'application/pdf') {
          contentData.type = 'pdf';
        } else {
          contentData.type = 'file';
        }
        contentData.url = `/uploads/${req.file.filename}`;
        contentData.fileSize = req.file.size;

      } else if (url) {
        // Manejo de contenido web
        contentData.type = 'webpage';
        contentData.url = url;

        try {
          new URL(url);
          // ✅ 2. Llama a tu función local en lugar de una API externa
          //const thumbnailUrl = await takeScreenshot(url);
          //if (thumbnailUrl) {
          //  contentData.thumbnailUrl = thumbnailUrl;
          //}
        } catch (e) {
          console.error("Error procesando URL o generando miniatura con Puppeteer:", e);
          return res.status(400).json({ message: "URL inválida o no se pudo generar la miniatura." });
        }
        } else {
        return res.status(400).json({ message: "Se requiere un archivo o una URL." });
        }

      const validatedData = insertContentItemSchema.parse(contentData);
      const item = await storage.createContentItem(validatedData);
      res.status(201).json(item);

    } catch (error: any) {
      console.error("Error creating content:", error);
      if (error.name === 'ZodError') {
        res.status(400).json({ message: "Datos inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "No se pudo crear el contenido" });
      }
    }
  });

  app.put("/api/content/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const updates = req.body;

      const item = await storage.updateContentItem(id, updates, userId);
      if (!item) {
        return res.status(404).json({ message: "Content not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error updating content:", error);
      res.status(500).json({ message: "Failed to update content" });
    }
  });

  app.delete("/api/content/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);

      // First remove content from all playlists
      await storage.removeContentFromAllPlaylists(id, userId);

      // Then delete the content item
      const success = await storage.deleteContentItem(id, userId);
      if (!success) {
        return res.status(404).json({ message: "Content not found" });
      }

      // Broadcast content deletion to update UI
      broadcastToUser(userId, 'content-deleted', { contentId: id });

      // Also broadcast playlist updates to refresh all playlist views
      broadcastToUser(userId, 'playlists-updated', { timestamp: new Date() });

      res.json({ message: "Content deleted successfully" });
    } catch (error) {
      console.error("Error deleting content:", error);
      res.status(500).json({ message: "Failed to delete content" });
    }
  });

  // Playlist routes
  app.get("/api/playlists", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const playlists = await storage.getPlaylists(userId);
      res.json(playlists);
    } catch (error) {
      console.error("Error fetching playlists:", error);
      res.status(500).json({ message: "Failed to fetch playlists" });
    }
  });

  // For authenticated users (admin panel)
  app.get("/api/playlists/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);

      const playlist = await storage.getPlaylistWithItems(id, userId);

      if (!playlist) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      res.json(playlist);
    } catch (error) {
      console.error("Error fetching playlist:", error);
      res.status(500).json({ message: "Failed to fetch playlist" });
    }
  });

  // For player authentication (screens)
  app.get("/api/player/playlists/:id", isPlayerAuthenticated, async (req: any, res) => {
    try {
      const userId = req.screen.userId; 
      const id = parseInt(req.params.id);

      console.log(`Player requesting playlist ${id} for user ${userId}`);

      if (!userId) {
        return res.status(403).json({ message: "Screen is not associated with a user." });
      }

      const playlist = await storage.getPlaylistWithItems(id, userId);

      if (!playlist) {
        console.log(`Playlist ${id} not found for user ${userId}`);
        return res.status(404).json({ message: "Playlist not found" });
      }

      console.log(`Playlist ${id} found with ${playlist.items?.length || 0} items`);
      res.json(playlist);
    } catch (error) {
      console.error("Error fetching playlist for player:", error);
      res.status(500).json({ message: "Failed to fetch playlist" });
    }
  });


  app.post("/api/playlists", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const playlistData = { ...req.body, userId };

      const validatedData = insertPlaylistSchema.parse(playlistData);
      const playlist = await storage.createPlaylist(validatedData);
      res.json(playlist);
    } catch (error) {
      console.error("Error creating playlist:", error);
      res.status(500).json({ message: "Failed to create playlist" });
    }
  });

  app.put("/api/playlists/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const updates = req.body;

      const playlist = await storage.updatePlaylist(id, updates, userId);
      if (!playlist) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      res.json(playlist);
    } catch (error) {
      console.error("Error updating playlist:", error);
      res.status(500).json({ message: "Failed to update playlist" });
    }
  });

  app.delete("/api/playlists/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);

      const success = await storage.deletePlaylist(id, userId);
      if (!success) {
        return res.status(404).json({ message: "Playlist not found" });
      }
      res.json({ message: "Playlist deleted successfully" });
    } catch (error) {
      console.error("Error deleting playlist:", error);
      res.status(500).json({ message: "Failed to delete playlist" });
    }
  });

  // Playlist item routes
  app.post("/api/playlists/:id/items", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const playlistId = parseInt(req.params.id);
      const { contentItemId, order, zone, customDuration } = req.body;

      // First verify the playlist belongs to the user
      const playlist = await storage.getPlaylistWithItems(playlistId, userId);
      if (!playlist) {
        return res.status(404).json({ message: "Playlist not found" });
      }

      // Create the playlist item
      const itemData = {
        playlistId,
        contentItemId: parseInt(contentItemId),
        order: order || (playlist.items?.length || 0) + 1,
        zone: zone || 'main',
        customDuration: customDuration || null,
      };

      const validatedData = insertPlaylistItemSchema.parse(itemData);
      const item = await storage.addPlaylistItem(validatedData, userId);

      res.json(item);
    } catch (error: unknown) {
      console.error("Error adding playlist item:", error);
      res.status(500).json({ message: "Failed to add playlist item" });
    }
  });

  app.put("/api/playlist-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const updates = req.body;

      const item = await storage.updatePlaylistItem(id, updates, userId);
      if (!item) {
        return res.status(404).json({ message: "Playlist item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error updating playlist item:", error);
      res.status(500).json({ message: "Failed to update playlist item" });
    }
  });

  app.delete("/api/playlist-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);

      const success = await storage.deletePlaylistItem(id, userId);
      if (!success) {
        return res.status(404).json({ message: "Playlist item not found" });
      }
      res.json({ message: "Playlist item deleted successfully" });
    } catch (error) {
      console.error("Error deleting playlist item:", error);
      res.status(500).json({ message: "Failed to delete playlist item" });
    }
  });

  app.put("/api/playlists/:id/reorder", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const playlistId = parseInt(req.params.id);
      const { itemOrders } = req.body;

      await storage.reorderPlaylistItems(playlistId, itemOrders, userId);
      res.json({ message: "Playlist items reordered successfully" });
    } catch (error) {
      console.error("Error reordering playlist items:", error);
      res.status(500).json({ message: "Failed to reorder playlist items" });
    }
  });

  // Screen routes
  app.get("/api/screens", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const screens = await storage.getScreens(userId);
      res.json(screens);
    } catch (error) {
      console.error("Error fetching screens:", error);
      res.status(500).json({ message: "Failed to fetch screens" });
    }
  });

  app.get("/api/screens/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "El ID de la pantalla debe ser un número." });
      }

      const screen = await storage.getScreenById(id);

      if (!screen) {
        return res.status(404).json({ message: "Pantalla no encontrada." });
      }

      res.json(screen);
    } catch (error) {
      console.error("Error fetching single screen:", error);
      res.status(500).json({ message: "Error al obtener la información de la pantalla." });
    }
  });

  app.post("/api/screens", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log("Creating screen for user:", userId);
      console.log("Screen data received:", req.body);

      const screenData = { ...req.body, userId };

      const validatedData = insertScreenSchema.parse(screenData);
      console.log("Validated screen data:", validatedData);

      const screen = await storage.createScreen(validatedData);
      console.log("Screen created successfully:", screen);

      res.json(screen);
    } catch (error) {
      console.error("Error creating screen:", error);
      if (error.name === 'ZodError') {
        res.status(400).json({ message: "Invalid data provided", errors: error.errors });
      } else {
        res.status(500).json({ message: error.message || "Failed to create screen" });
      }
    }
  });

  app.post("/api/screens/heartbeat", isPlayerAuthenticated, async (req: any, res) => {
    try {
      const screenId = req.screen.id;
      const userId = req.screen.userId;

      if (!userId) {
        return res.status(400).json({ message: "Cannot update heartbeat for an unassigned screen." });
      }

      await storage.updateScreen(screenId, {
        isOnline: true,
        lastSeen: new Date(),
      }, userId);

      // Opcional: podrías devolver aquí una nueva playlist si ha cambiado
      res.status(200).json({ status: 'ok' });
    } catch (error) {
      console.error("Heartbeat error:", error);
      res.status(500).json({ message: "Heartbeat failed" });
    }
  });



  app.put("/api/screens/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id, 10);
      const updates = {
        name: req.body.name,
        location: req.body.location,
        playlistId: req.body.playlistId ? parseInt(req.body.playlistId, 10) : null,
      };

      const screen = await storage.updateScreen(id, updates, userId);
      if (!screen) {
        return res.status(404).json({ message: "Screen not found or access denied" });
      }

      // Broadcast screen update via WebSocket
      broadcastToUser(userId, 'screen-update', screen);

      // If playlist changed, also broadcast playlist change to connected players
      if (updates.playlistId !== undefined) {
        const wssInstance = app.get('wss') as WebSocketServer;
        wssInstance.clients.forEach((client: WebSocket) => {
          const clientWithId = client as WebSocketWithId;
          if (clientWithId.readyState === WebSocket.OPEN && 
              clientWithId.screenId === id) {
            clientWithId.send(JSON.stringify({
              type: 'playlist-change',
              data: { playlistId: updates.playlistId }
            }));
          }
        });
      }

      res.json(screen);
    } catch (error) {
      console.error("Error updating screen:", error);
      res.status(500).json({ message: "Failed to update screen" });
    }
  });

  app.delete("/api/screens/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id, 10);

      const success = await storage.deleteScreen(id, userId);
      if (!success) {
        return res.status(404).json({ message: "Screen not found or access denied" });
      }
      res.status(200).json({ message: "Screen deleted successfully" });
    } catch (error) {
      console.error("Error deleting screen:", error);
      res.status(500).json({ message: "Failed to delete screen" });
    }
  });

  // Playback control endpoint
  app.post("/api/screens/:id/playback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const screenId = parseInt(req.params.id, 10);
      const { playlistId, action } = req.body;

      // Verify screen ownership
      const screen = await storage.getScreens(userId).then(screens => 
        screens.find(s => s.id === screenId)
      );

      if (!screen) {
        return res.status(404).json({ message: "Screen not found" });
      }

      // Log the playback action
      console.log(`Playback ${action} on screen ${screenId} with playlist ${playlistId}`);

      // Here you would typically send the command to the actual screen
      // For now, we'll just acknowledge the command

      res.json({ 
        message: "Playback command sent",
        screenId,
        playlistId,
        action,
        timestamp: new Date()
      });
    } catch (error) {
      console.error("Error controlling playback:", error);
      res.status(500).json({ message: "Failed to control playback" });
    }
  });

  // Alerts routes
  app.get("/api/alerts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const alerts = await storage.getAlerts(userId);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  // Trigger alert endpoint for testing
  app.post("/api/alerts/trigger", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, message, type = 'info' } = req.body;

      // Broadcast alert via WebSocket
      const alertData = { title, message, type, userId, timestamp: new Date() };

      // Send to all connected clients for this user
      app.get('wss').clients.forEach((client: any) => {
        if (client.readyState === 1 && client.userId === userId) {
          client.send(JSON.stringify({
            type: 'alert',
            data: alertData
          }));
        }
      });

      res.json({ message: "Alert sent successfully" });
    } catch (error) {
      console.error("Error triggering alert:", error);
      res.status(500).json({ message: "Failed to trigger alert" });
    }
  });

  app.get("/api/alerts/active", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const alerts = await storage.getActiveAlerts(userId);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching active alerts:", error);
      res.status(500).json({ message: "Failed to fetch active alerts" });
    }
  });

  app.post("/api/alerts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const alertData = { ...req.body, userId };

      const validatedData = insertAlertSchema.parse(alertData);
      const alert = await storage.createAlert(validatedData);

      // ✅ Usa la nueva función para notificar solo a los clientes del usuario
      broadcastToUser(userId, 'alert', alert);

      res.json(alert);
    } catch (error) {
      console.error("Error creating alert:", error);
      res.status(500).json({ message: "Failed to create alert" });
    }
  });

  app.put("/api/alerts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const updates = req.body;

      const alert = await storage.updateAlert(id, updates, userId);
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }

      // Broadcast alert update via WebSocket
      if (alert.isActive) {
        broadcastAlert(alert);
      }

      res.json(alert);
    } catch (error) {
      console.error("Error updating alert:", error);
      res.status(500).json({ message: "Failed to update alert" });
    }
  });

  app.delete("/api/alerts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);

      const success = await storage.deleteAlert(id, userId);
      if (!success) {
        return res.status(404).json({ message: "Alert not found" });
      }
      res.json({ message: "Alert deleted successfully" });
    } catch (error) {
      console.error("Error deleting alert:", error);
      res.status(500).json({ message: "Failed to delete alert" });
    }
  });

  // Widget routes
  app.get("/api/widgets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const widgets = await storage.getWidgets(userId);
      res.json(widgets);
    } catch (error) {
      console.error("Error fetching widgets:", error);
      res.status(500).json({ message: "Failed to fetch widgets" });
    }
  });

  // Public widget endpoint for players
  app.get("/api/player/widgets", isPlayerAuthenticated, async (req: any, res) => {
    try {
      const userId = req.screen.userId;
      
      if (!userId) {
        return res.status(403).json({ message: "Screen is not associated with a user." });
      }

      const widgets = await storage.getWidgets(userId);
      res.json(widgets);
    } catch (error) {
      console.error("Error fetching widgets for player:", error);
      res.status(500).json({ message: "Failed to fetch widgets" });
    }
  });

  app.post("/api/widgets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const widgetData = { ...req.body, userId };

      const validatedData = insertWidgetSchema.parse(widgetData);
      const widget = await storage.createWidget(validatedData);
      res.json(widget);
    } catch (error) {
      console.error("Error creating widget:", error);
      res.status(500).json({ message: "Failed to create widget" });
    }
  });

  app.put("/api/widgets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const updates = req.body;

      const widget = await storage.updateWidget(id, updates, userId);
      if (!widget) {
        return res.status(404).json({ message: "Widget not found" });
      }
      res.json(widget);
    } catch (error) {
      console.error("Error updating widget:", error);
      res.status(500).json({ message: "Failed to update widget" });
    }
  });

  app.delete("/api/widgets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);

      const success = await storage.deleteWidget(id, userId);
      if (!success) {
        return res.status(404).json({ message: "Widget not found" });
      }
      res.json({ message: "Widget deleted successfully" });
    } catch (error) {
      console.error("Error deleting widget:", error);
      res.status(500).json({ message: "Failed to delete widget" });
    }
  });

  // Schedules routes
  app.get("/api/schedules", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const schedules = await storage.getSchedules(userId);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ message: "Failed to fetch schedules" });
    }
  });

  app.post("/api/schedules", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const scheduleData = { ...req.body, userId };

      const validatedData = insertScheduleSchema.parse(scheduleData);
      const schedule = await storage.createSchedule(validatedData);
      res.json(schedule);
    } catch (error) {
      console.error("Error creating schedule:", error);
      res.status(500).json({ message: "Failed to create schedule" });
    }
  });

  app.patch("/api/schedules/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const updates = req.body;

      const schedule = await storage.updateSchedule(id, updates, userId);
      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      res.json(schedule);
    } catch (error) {
      console.error("Error updating schedule:", error);
      res.status(500).json({ message: "Failed to update schedule" });
    }
  });

  app.delete("/api/schedules/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);

      const success = await storage.deleteSchedule(id, userId);
      if (!success) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      res.json({ message: "Schedule deleted successfully" });
    } catch (error) {
      console.error("Error deleting schedule:", error);
      res.status(500).json({ message: "Failed to delete schedule" });
    }
  });

      // Deployments routes
      app.get("/api/deployments", isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const deployments = await storage.getDeployments(userId);
          res.json(deployments);
        } catch (error) {
          console.error("Error fetching deployments:", error);
          res.status(500).json({ message: "Failed to fetch deployments" });
        }
      });

      app.post("/api/deployments", isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const deploymentData = { ...req.body, userId, status: 'pending' };

          const validatedData = insertDeploymentSchema.parse(deploymentData);
          const deployment = await storage.createDeployment(validatedData);
          res.json(deployment);
        } catch (error) {
          console.error("Error creating deployment:", error);
          res.status(500).json({ message: "Failed to create deployment" });
        }
      });

      app.post("/api/deployments/:id/build", isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const id = parseInt(req.params.id);

          const deployment = await storage.getDeployment(id, userId);
          if (!deployment) {
            return res.status(404).json({ message: "Deployment not found" });
          }

          await storage.updateDeployment(id, { status: "building" }, userId);

          buildApk(deployment.version).then(async (apkUrl) => {
            await storage.updateDeployment(id, {
              status: "ready",
              buildUrl: apkUrl,
            }, userId);
          }).catch(async (error) => {
            console.error("APK Build failed", error);
            await storage.updateDeployment(id, { status: "failed" }, userId);
          });

          res.json({ message: "Build started" });
        } catch (error) {
          console.error("Error starting build:", error);
          res.status(500).json({ message: "Failed to start build" });
        }
      });

  app.post("/api/deployments/:id/deploy", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);

      const deployment = await storage.updateDeployment(id, { status: "deployed" }, userId);
      if (!deployment) {
        return res.status(404).json({ message: "Deployment not found" });
      }

      res.json({ message: "Deployment completed" });
    } catch (error) {
      console.error("Error deploying:", error);
      res.status(500).json({ message: "Failed to deploy" });
    }
  });

 // Serve uploaded files and APKs
  app.use("/uploads", express.static("uploads"));
  app.use("/apks", express.static(path.resolve(process.cwd(), "dist/apks")));


  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  interface WebSocketWithId extends WebSocket {
    userId?: string;
  }

  wss.on("connection", (ws: WebSocket) => {
    console.log("Client connected to WebSocket");

    // Send immediate response to confirm connection
    ws.send(JSON.stringify({ type: 'connection_established' }));

    ws.on("message", async (message) => {
      try {
        const parsed = JSON.parse(message.toString());

        // Handle ping/pong for heartbeat
        if (parsed.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        // Handle admin panel authentication
        if (parsed.type === 'auth' && parsed.userId) {
          (ws as any).userId = parsed.userId;
          console.log(`WebSocket client authenticated for user: ${(ws as any).userId}`);

          // Send authentication success response
          ws.send(JSON.stringify({ 
            type: 'auth_success', 
            data: { userId: parsed.userId } 
          }));
          return;
        }

        // Handle player authentication
        if (parsed.type === 'player-auth' && parsed.token) {
          try {
            const screen = await storage.getScreenByAuthToken(parsed.token);
            if (screen && screen.userId) {
              (ws as any).userId = screen.userId;
              (ws as any).screenId = screen.id;
              console.log(`Player WebSocket authenticated for screen ${screen.id} (user: ${screen.userId})`);

              // Send authentication success response
              ws.send(JSON.stringify({ 
                type: 'auth_success', 
                data: { screenId: screen.id, userId: screen.userId } 
              }));
            } else {
              ws.send(JSON.stringify({ 
                type: 'auth_error', 
                data: { message: 'Invalid token or screen not found' } 
              }));
            }
          } catch (error) {
            console.error('Player authentication failed:', error);
            ws.send(JSON.stringify({ 
              type: 'auth_error', 
              data: { message: 'Authentication failed' } 
            }));
          }
        }
      } catch (e) {
        console.warn("Invalid WebSocket message received");
      }
    });

    ws.on("close", () => {
        console.log(`Client disconnected (User: ${(ws as any).userId || 'unauthenticated'}, Screen: ${(ws as any).screenId || 'none'})`);
      });
    });

  app.set('wss', wss);

  function broadcastToUser(userId: string, type: string, data: any) {
    const message = JSON.stringify({ type, data });
    const wssInstance = app.get('wss') as WebSocketServer;

    wssInstance.clients.forEach((client: WebSocket) => {
      const clientWithId = client as WebSocketWithId;
      // Envía si el cliente está abierto y pertenece al usuario correcto
      if (clientWithId.readyState === WebSocket.OPEN && clientWithId.userId === userId) {
        clientWithId.send(message);
      }
    });
  }

  // Function to broadcast alerts to all connected clients
  function broadcastAlert(alert: any) {
    const message = JSON.stringify({
      type: "alert",
      data: alert,
    });

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Function to broadcast screen updates
  function broadcastScreenUpdate(screen: any) {
    const message = JSON.stringify({
      type: "screen-update",
      data: screen,
    });

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Analytics routes
  app.get("/api/analytics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const timeRange = req.query.timeRange || "7d";

      // Mock data for analytics
      const analytics = {
        activeScreens: Math.floor(Math.random() * 10) + 1,
        totalViews: Math.floor(Math.random() * 10000) + 1000,
        avgPlaytime: Math.floor(Math.random() * 60) + 30,
        contentItems: Math.floor(Math.random() * 50) + 10,
        usageData: [],
        recentActivity: []
      };

      // Generate usage data
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        analytics.usageData.push({
          date: date.toISOString().split('T')[0],
          screens: Math.floor(Math.random() * 20) + 5,
          views: Math.floor(Math.random() * 500) + 100
        });
      }

      // Generate recent activity
      for (let i = 0; i < 5; i++) {
        analytics.recentActivity.push({
          description: `Actividad ${i + 1}`,
          timestamp: new Date(Date.now() - i * 1000 * 60 * 60).toISOString()
        });
      }

      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.get("/api/analytics/screens", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const screens = await storage.getScreens(userId);

      const screenMetrics = screens.map(screen => ({
        id: screen.id,
        name: screen.name,
        location: screen.location,
        uptime: Math.floor(Math.random() * 100),
        views: Math.floor(Math.random() * 1000) + 100,
        status: screen.isOnline ? 'online' : 'offline'
      }));

      res.json(screenMetrics);
    } catch (error) {
      console.error("Error fetching screen analytics:", error);
      res.status(500).json({ message: "Failed to fetch screen analytics" });
    }
  });

  app.get("/api/analytics/content", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const content = await storage.getContentItems(userId);

      const contentMetrics = content.map(item => ({
        id: item.id,
        title: item.title,
        type: item.type,
        views: Math.floor(Math.random() * 500) + 50,
        engagement: Math.floor(Math.random() * 100),
        duration: item.duration || 30
      }));

      res.json(contentMetrics);
    } catch (error) {
      console.error("Error fetching content analytics:", error);
      res.status(500).json({ message: "Failed to fetch content analytics" });
    }
  });

  app.get("/api/analytics/playback", isAuthenticated, async (req: any, res) => {
    try {
      // Mock playback data
      const playbackData = [];
      const today = new Date();

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        playbackData.push({
          date: date.toISOString().split('T')[0],
          plays: Math.floor(Math.random() * 200) + 100,
          views: Math.floor(Math.random() * 1000) + 500,
          duration: Math.floor(Math.random() * 10000) + 5000
        });
      }

      res.json(playbackData);
    } catch (error) {
      console.error("Error fetching playback analytics:", error);
      res.status(500).json({ message: "Failed to fetch playback analytics" });
    }
  });

  return httpServer;
}
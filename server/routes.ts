import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import path from "path";
import { storage } from "./storage";
import { randomBytes } from 'crypto';
import { isPlayerAuthenticated } from "./playerAuth";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertContentItemSchema,
  insertPlaylistSchema,
  insertPlaylistItemSchema,
  insertScreenSchema,
  insertAlertSchema,
  insertWidgetSchema,
  insertScheduleSchema,
  insertDeploymentSchema,
  users,
  contentItems,
  playlists,
  playlistItems,
  screens,
  alerts,
  widgets,
} from "@shared/schema";
import { buildApk } from "./apk-builder";
import { Request, Response } from "express";
import { db } from "./db.js";
import { eq, and, desc, asc } from "drizzle-orm";

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

export async function registerRoutes(app: Express): Promise<void> {

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
        description,
        duration: duration ? parseInt(duration) : 30,
        category: category || null,
        tags: tags ? (Array.isArray(tags) ? tags : tags.split(",").map((t: string) => t.trim())) : [],
      };

      if (req.file) {
        // File upload - determine type from file
        const mimeType = req.file.mimetype;
        if (mimeType.startsWith('image/')) {
          contentData.type = 'image';
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
        // URL content - set type as webpage
        contentData.type = 'webpage';
        contentData.url = url;
        // Validate URL format
        try {
          new URL(url);
        } catch (error) {
          return res.status(400).json({ message: "Invalid URL format" });
        }
      } else {
        return res.status(400).json({ message: "Either file or URL is required" });
      }

      const validatedData = insertContentItemSchema.parse(contentData);
      const item = await storage.createContentItem(validatedData);
      res.json(item);
    } catch (error) {
      console.error("Error creating content:", error);
      if (error.name === 'ZodError') {
        res.status(400).json({ message: "Invalid data provided", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create content" });
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

      const success = await storage.deleteContentItem(id, userId);
      if (!success) {
        return res.status(404).json({ message: "Content not found" });
      }
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
      const { contentItemId, order } = req.body;

      // First verify the playlist belongs to the user
      const playlist = await storage.getPlaylistWithItems(playlistId, userId);
      if (!playlist) {
        return res.status(404).json({ message: "Playlist not found" });
      }

      // Create the playlist item
      const itemData = {
        playlistId,
        contentItemId: parseInt(contentItemId),
        order: order || 0
      };

      const validatedData = insertPlaylistItemSchema.parse(itemData);
      const item = await storage.addPlaylistItem(validatedData, req.user.claims.sub);


      // Recalculate total duration
      await storage.updatePlaylistDuration(playlistId);

      res.json(item);
    } catch (error) {
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

  // Alert routes
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

      // Broadcast alert via WebSocket
      broadcastAlert(alert);

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

  // Endpoint para que el Fire TV pida un código
  app.post("/api/screens/initiate-pairing", async (req, res) => {
    try {
      const { deviceHardwareId } = req.body;
      if (!deviceHardwareId) {
        return res.status(400).json({ message: "Device Hardware ID is required." });
      }

      const pairingCode = Math.floor(100000 + Math.random() * 900000).toString();
      const pairingCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min de validez

      // Creamos un registro de pantalla "huérfano" sin userId.
      const screenData = {
        name: `Nueva Pantalla (${deviceHardwareId.slice(0, 6)})`,
        deviceHardwareId,
        pairingCode,
        pairingCodeExpiresAt,
        // userId se omite intencionadamente para que sea NULL
      };

      // Usaremos una función "upsert" para crear o actualizar el registro temporal
      await storage.upsertTemporaryScreen(screenData);

      res.json({ pairingCode });
    } catch (error) {
      console.error("Error initiating pairing:", error);
      res.status(500).json({ message: "Failed to initiate pairing." });
    }
  });

  // Endpoint para que el admin confirme el emparejamiento
  app.post("/api/screens/complete-pairing", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { pairingCode, name, location, playlistId } = req.body;

      if (!pairingCode || !name) {
        return res.status(400).json({ message: "El código y el nombre son requeridos." });
      }

      // Busca la pantalla temporal por su código. No necesita userId.
      const screen = await storage.findScreenByPairingCode(pairingCode);

      if (!screen || !screen.pairingCodeExpiresAt || new Date() > new Date(screen.pairingCodeExpiresAt)) {
        return res.status(404).json({ message: "Código de emparejamiento inválido o expirado." });
      }

      // El código es válido. Ahora la "reclamamos" para el usuario actual.
      const authToken = randomBytes(32).toString('hex');
      const screenId = screen.id;

      // Actualizamos el registro existente con los datos del admin
      const updatedScreen = await storage.updateScreenById(screenId, {
        userId,
        name,
        location,
        playlistId: playlistId ? parseInt(playlistId, 10) : null,
        authToken,
        pairingCode: null,
        pairingCodeExpiresAt: null,
      });

      return res.json({ message: "Pantalla emparejada exitosamente.", screen: updatedScreen });
    } catch (error) {
      console.error("Error completing pairing:", error);
      res.status(500).json({ message: "Failed to complete pairing" });
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
      res.status(500).json({ message: "Failed to deploy"});
    }
    });
  // Serve uploaded files
  app.use("/uploads", express.static("uploads"));
}

// Make WebSocket server available to routes
export { wss };

// Function to broadcast alerts to connected screens
function broadcastAlert(alert: any) {
  if (!wss) return;

  wss.clients.forEach((client) => {
    if (client.readyState === 1 && client.screenId) { // WebSocket.OPEN = 1
      try {
        client.send(JSON.stringify({
          type: 'alert',
          screenId: client.screenId,
          alert: alert
        }));
      } catch (error) {
        console.error('Error broadcasting alert to client:', error);
      }
    }
  });
}
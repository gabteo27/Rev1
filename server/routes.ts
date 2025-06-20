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
  insertScreenGroupSchema,
  type Alert,
  playlistItems,
  playlists
} from "@shared/schema";
import { buildApk } from "./apk-builder";
import { eq, and, desc, asc, exists, inArray, lt } from "drizzle-orm";
import { db } from "./db";

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

  // Route to initiate pairing for a device
  app.post("/api/screens/initiate-pairing", async (req, res) => {
    try {
      const { deviceHardwareId } = req.body;

      if (!deviceHardwareId) {
        return res.status(400).json({ message: "Device hardware ID is required" });
      }

      console.log(`Initiating pairing for device: ${deviceHardwareId}`);

      // Check if device already exists
      let screen = await storage.getScreenByDeviceHardwareId(deviceHardwareId);

      if (!screen) {
        // Generate a new pairing code
        const pairingCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Create a new screen entry with pairing code
        const screenData = {
          deviceHardwareId,
          pairingCode,
          pairingCodeExpiresAt: expiresAt,
          name: `Device ${deviceHardwareId.slice(-6)}`,
          userId: null, // Will be set when pairing is completed
          authToken: null,
          isOnline: false,
          playlistId: null
        };

        screen = await storage.createScreenForPairing(screenData);
        console.log(`Created new screen for pairing:`, screen);
      } else if (!screen.authToken) {
        // Device exists but not paired yet, generate new pairing code
        const pairingCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await storage.updateScreenById(screen.id, {
          pairingCode,
          pairingCodeExpiresAt: expiresAt
        });

        screen.pairingCode = pairingCode;
        console.log(`Updated pairing code for existing screen:`, screen.id);
      } else {
        // Device is already paired
        return res.json({ 
          status: 'already_paired',
          message: 'Device is already paired'
        });
      }

      res.json({ 
        pairingCode: screen.pairingCode,
        status: 'pairing_initiated'
      });

    } catch (error) {
      console.error("Error initiating pairing:", error);
      res.status(500).json({ message: "Failed to initiate pairing", error: error.message });
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

  // Complete pairing endpoint
  app.post("/api/screens/complete-pairing", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { pairingCode, name, location, playlistId } = req.body;

      if (!pairingCode) {
        return res.status(400).json({ message: "Pairing code is required" });
      }

      console.log(`Completing pairing with code: ${pairingCode} for user: ${userId}`);

      // Find screen by pairing code
      const screen = await storage.getScreenByPairingCode(pairingCode);

      if (!screen) {
        return res.status(404).json({ message: "Invalid pairing code" });
      }

      // Check if pairing code is expired
      if (screen.pairingCodeExpiresAt && new Date() > screen.pairingCodeExpiresAt) {
        return res.status(400).json({ message: "Pairing code has expired" });
      }

      // Generate auth token and complete pairing
      const authToken = randomBytes(32).toString('hex');

      console.log(`Completing pairing for screen ID: ${screen.id} with user: ${userId}`);

      const updatedScreen = await storage.updateScreenById(screen.id, {
        userId,
        name: name || screen.name,
        location,
        playlistId: playlistId || null,
        authToken,
        pairingCode: null,
        pairingCodeExpiresAt: null,
        isOnline: true,
        lastSeen: new Date()
      });

      console.log(`Screen updated successfully:`, updatedScreen);

      console.log(`Pairing completed for screen: ${updatedScreen?.id}`);

      // Broadcast pairing completion via WebSocket
      const wssInstance = app.get('wss') as WebSocketServer;
      wssInstance.clients.forEach((client: WebSocket) => {
        const clientWithId = client as any;
        if (clientWithId.readyState === WebSocket.OPEN && 
            clientWithId.pairingDeviceId === screen.deviceHardwareId) {
          clientWithId.send(JSON.stringify({
            type: 'pairing-completed',
            deviceId: screen.deviceHardwareId,
            authToken: authToken,
            name: updatedScreen?.name,
            playlistId: updatedScreen?.playlistId
          }));
          console.log(`Pairing completion sent to device ${screen.deviceHardwareId}`);
        }
      });

      res.json({
        message: "Pairing completed successfully",
        screen: updatedScreen
      });

    } catch (error) {
      console.error("Error completing pairing:", error);
      res.status(500).json({ message: "Failed to complete pairing", error: error.message });
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
        duration: duration ? parseInt(duration, 10) : 30, // Duración predeterminada de 30 segundos
        category: category || null,
        tags: tags ? (Array.isArray(tags) ? tags : tags.split(",").map((t: string) => t.trim())) : [],
        thumbnailUrl: null,
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

      // Ensure timestamps are properly formatted
      if (updates.updatedAt) {
        updates.updatedAt = new Date(updates.updatedAt);
      }

      const playlist = await storage.updatePlaylist(id, updates, userId);
      if (!playlist) {
        return res.status(404).json({ message: "Playlist not found" });
      }

      // --- ADDED: Notify connected players and admins of playlist change ---
      broadcastPlaylistUpdate(userId, id, 'playlist-updated');
      // --- END ADDED ---

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

      // Get all screens using this playlist before deletion
      const allScreens = await storage.getScreens(userId);
      const affectedScreenIds = allScreens.filter(screen => screen.playlistId === id).map(screen => screen.id);

      // First, remove this playlist from all screens that are using it
      for (const screenId of affectedScreenIds) {
        await storage.updateScreen(screenId, { playlistId: null }, userId);
      }

      const success = await storage.deletePlaylist(id, userId);
      if (!success) {
        return res.status(404).json({ message: "Playlist not found" });
      }

      // Broadcast playlist deletion to affected screens
      if (affectedScreenIds.length > 0) {
        const wssInstance = app.get('wss') as WebSocketServer;

        wssInstance.clients.forEach((client: WebSocket) => {
          const clientWithId = client as any;
          if (clientWithId.readyState === WebSocket.OPEN) {
            // Send to admin clients
            if (clientWithId.userId === userId) {
              clientWithId.send(JSON.stringify({
                type: 'playlist-deleted',
                data: { 
                  playlistId: id,
                  affectedScreens: affectedScreenIds,
                  timestamp: new Date().toISOString()
                }
              }));
            }
            // Send to affected player screens
            else if (clientWithId.screenId && affectedScreenIds.includes(clientWithId.screenId)) {
              console.log(`✅ Sending playlist deletion notice to player for screen ${clientWithId.screenId}`);
              clientWithId.send(JSON.stringify({
                type: 'playlist-deleted',
                data: { 
                  playlistId: id,
                  screenId: clientWithId.screenId,
                  timestamp: new Date().toISOString(),
                  action: 'stop-playback'
                }
              }));
            }
          }
        });
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

      // --- ADDED: Notify connected players and admins of playlist change ---
      broadcastPlaylistUpdate(userId, playlistId, 'playlist-item-added');
      // --- END ADDED ---

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

      // Validate customDuration if provided
      if (updates.customDuration !== undefined) {
        const duration = parseInt(updates.customDuration);
        if (isNaN(duration) || duration < 1 || duration > 86400) {
          return res.status(400).json({ 
            message: "La duración debe ser un número entre 1 y 86400 segundos" 
          });
        }
        updates.customDuration = duration;
      }

      const item = await storage.updatePlaylistItem(id, updates, userId);
      if (!item) {
        return res.status(404).json({ message: "Playlist item not found" });
      }

      // Get the playlistId associated with this item.
      const playlistItem = await storage.getPlaylistItem(id);
      const playlistId = playlistItem?.playlistId;

       // --- ADDED: Notify connected players and admins of playlist change ---
       if (playlistId) {
         broadcastPlaylistUpdate(userId, playlistId, 'playlist-item-updated');
       }
       // --- END ADDED ---

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

      console.log(`🗑️ DELETE request for playlist item ${id} from user ${userId}`);

      // Validate the ID
      if (isNaN(id) || id <= 0) {
        console.log(`❌ Invalid playlist item ID: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid playlist item ID" });
      }

      // Get playlist ID before deletion for broadcasting
      let playlistId: number | null = null;
      try {
        const playlistItem = await storage.getPlaylistItem(id);
        if (playlistItem) {
          // Verify ownership through playlist
          const playlist = await storage.getPlaylist(playlistItem.playlistId, userId);
          if (!playlist) {
            console.log(`❌ User ${userId} does not have access to playlist ${playlistItem.playlistId}`);
            return res.status(404).json({ message: "Playlist item not found" });
          }
          playlistId = playlistItem.playlistId;
        } else {
          console.log(`❌ Playlist item ${id} not found in database`);
          return res.status(404).json({ message: "Playlist item not found" });
        }
      } catch (error) {
        console.error(`Error checking playlist item ${id}:`, error);
        return res.status(404).json({ message: "Playlist item not found" });
      }

      // Perform the deletion
      const success = await storage.deletePlaylistItem(id, userId);

      if (!success) {
        console.log(`❌ Failed to delete playlist item ${id}`);
        return res.status(404).json({ message: "Failed to delete playlist item" });
      }

      console.log(`✅ Successfully deleted playlist item ${id} from playlist ${playlistId}`);

      // Broadcast updates
      if (playlistId) {
        try {
          broadcastToUser(userId, 'playlist-item-deleted', {
            itemId: id,
            playlistId: playlistId,
            timestamp: new Date().toISOString()
          });

          await broadcastPlaylistUpdate(userId, playlistId, 'playlist-item-deleted');
          console.log(`✅ Broadcasted deletion of item ${id}`);
        } catch (broadcastError) {
          console.warn(`⚠️ Broadcast failed:`, broadcastError);
        }
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

      // --- ADDED: Notify connected players and admins of playlist change ---
      broadcastPlaylistUpdate(userId, playlistId, 'playlist-reordered');
      // --- END ADDED ---

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
      console.log(`Fetching screens for user: ${userId}`);
      const screens = await storage.getScreens(userId);
      console.log(`Found ${screens.length} screens for user ${userId}:`, screens.map(s => ({ id: s.id, name: s.name, userId: s.userId })));
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

      const wasOffline = !req.screen.isOnline;

      await storage.updateScreen(screenId, {
        isOnline: true,
        lastSeen: new Date(),
      }, userId);

      // Broadcast status change if screen was offline and now online
      if (wasOffline) {
        console.log(`📡 Screen ${screenId} came online`);
        broadcastToUser(userId, 'screen-status-changed', {
          screenId,
          screenName: req.screen.name,
          isOnline: true,
          lastSeen: new Date().toISOString()
        });
      }

      res.status(200).json({ status: 'ok' });
    } catch (error) {
      console.error("Heartbeat error:", error);
      res.status(500).json({ message: "Heartbeat failed" });
    }
  });

  // Update screen
  app.put("/api/screens/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const screenId = parseInt(req.params.id);
      const { name, location, playlistId } = req.body;

      console.log(`Updating screen ${screenId} with data:`, { name, location, playlistId });

      const screen = await storage.updateScreen(screenId, {
        name,
        location,
        playlistId
      }, userId);

      if (!screen) {
        return res.status(404).json({ message: "Screen not found" });
      }

      console.log(`Screen ${screenId} updated successfully:`, screen);

      // Broadcast screen update to all connected clients
      broadcastScreenUpdate(screen);

      // If playlist changed, also broadcast playlist change to the specific screen
      if (req.body.hasOwnProperty('playlistId')) {
        console.log(`Broadcasting playlist change for screen ${screenId} to playlist ${playlistId}`);

        if (playlistId) {
          await broadcastPlaylistUpdate(userId, playlistId, 'screen-playlist-updated');
        }

        // Send direct update to the affected screen
        const wssInstance = app.get('wss') as WebSocketServer;
        let messageSent = false;

        wssInstance.clients.forEach((client: WebSocket) => {
          const clientWithId = client as WebSocketWithId;
          if (clientWithId.readyState === WebSocket.OPEN) {
            // Send to admin clients
            if (clientWithId.userId === userId) {
              clientWithId.send(JSON.stringify({
                type: 'screen-playlist-updated',
                data: { 
                  screenId: screenId,
                  playlistId: playlistId,
                  screen: screen,
                  timestamp: new Date().toISOString()
                }
              }));
            }
            // Send to the specific screen
            else if (clientWithId.screenId === screenId) {
              clientWithId.send(JSON.stringify({
                type: 'playlist-change',
                data: { 
                  newPlaylistId: playlistId,
                  screenId: screenId,
                  timestamp: new Date().toISOString(),
                  action: 'reload'
                }
              }));
              messageSent = true;
              console.log(`✅ Sent playlist change to screen ${screenId}`);
            }
          }
        });

        if (!messageSent && playlistId) {
          console.log(`⚠️ No connected screen found for screen ${screenId}`);
        }
      }

      res.json(screen);
    } catch (error) {
      console.error("Error updating screen:", error);
      res.status(500).json({ message: "Failed to update screen" });
    }
  });

  // Delete screen
  app.delete("/api/screens/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const screenId = parseInt(req.params.id);

      const success = await storage.deleteScreen(screenId, userId);
      if (!success) {
        return res.status(404).json({ message: "Screen not found" });
      }

      // Broadcast screen deletion to all connected clients
      const wssInstance = app.get('wss') as WebSocketServer;
      wssInstance.clients.forEach((client: WebSocket) => {
        const clientWithId = client as any;
        if (clientWithId.readyState === WebSocket.OPEN && clientWithId.userId === userId) {
          clientWithId.send(JSON.stringify({
            type: 'screen-deleted',
            data: { screenId, timestamp: new Date().toISOString() }
          }));
        }
      });

      res.json({ message: "Screen deleted successfully" });
    } catch (error) {
      console.error("Error deleting screen:", error);
      res.status(500).json({ message: "Failed to delete screen" });
    }
  });

  // Screen playback control
  app.post("/api/screens/:id/playback", isAuthenticated, async (req: any, res) => {
    try {
      const screenId = parseInt(req.params.id);
      const { playlistId, action } = req.body;

      // Verify screen belongs to user
      const screen = await storage.getScreenById(screenId, req.user.id);
      if (!screen) {
        return res.status(404).json({ message: "Screen not found" });
      }

      console.log(`🎮 Playback control: ${action} for screen ${screenId} with playlist ${playlistId}`);

      // Broadcast playback control to the specific screen
      const wssInstance = app.get('wss') as WebSocketServer;
      let messageSent = false;

      wssInstance.clients.forEach((client: WebSocket) => {
        const clientWithId = client as WebSocketWithId;
        if (clientWithId.readyState === WebSocket.OPEN && clientWithId.screenId === screenId) {
          clientWithId.send(JSON.stringify({
            type: 'playback-control',
            data: {
              action,
              playlistId: parseInt(playlistId),
              timestamp: new Date().toISOString()
            }
          }));
          messageSent = true;
          console.log(`✅ Playback control sent to screen ${screenId}`);
        }
      });

      if (!messageSent) {
        console.log(`⚠️ No connected clients found for screen ${screenId}`);
      }

      res.json({ 
        success: true, 
        message: `Playback ${action} command sent to screen`,
        screenConnected: messageSent
      });
    } catch (error) {
      console.error("Error controlling playback:", error);
      res.status(500).json({ message: "Failed to control playback" });
    }
  });

  // Alerts
  app.get("/api/alerts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const alerts = await storage.getAlerts(userId);
      // Filter out fixed alerts from regular alerts endpoint
      const regularAlerts = alerts.filter(alert => !alert.isFixed);
      res.json(regularAlerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      // Return empty array instead of error to prevent UI breakage
      res.json([]);
    }
  });

  // Fixed alerts endpoints
  app.get("/api/alerts/fixed", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const alerts = await storage.getAlerts(userId);
      // Filter only fixed alerts
      const fixedAlerts = alerts.filter(alert => alert.isFixed && alert.isActive);
      res.json(fixedAlerts);
    } catch (error) {
      console.error("Error fetching fixed alerts:", error);
      // Return empty array instead of error to prevent UI breakage
      res.json([]);
    }
  });

  app.post("/api/alerts/fixed", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const alertData = {
        ...req.body,
        userId,
        isFixed: true,
        duration: 0 // Fixed alerts don't have duration
      };

      const validatedData = insertAlertSchema.parse(alertData);
      const alert = await storage.createAlert(validatedData);

      console.log(`Created fixed alert ${alert.id} for user ${userId}`);

      // Broadcast alert to all user devices immediately
      await broadcastAlertToAllUserDevices(userId, alert);

      res.json(alert);
    } catch (error: any) {
      console.error("Error creating fixed alert:", error);
      res.status(500).json({ message: "Failed to create fixed alert" });
    }
  });

  app.delete("/api/alerts/fixed/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);

      const success = await storage.deleteAlert(id, userId);
      if (!success) {
        return res.status(404).json({ message: "Fixed alert not found" });
      }

      // Broadcast alert deletion
      await broadcastAlertToAllUserDevices(userId, { id, deleted: true, isFixed: true });

      res.json({ message: "Fixed alert deactivated successfully" });
    } catch (error) {
      console.error("Error deactivating fixed alert:", error);
      res.status(500).json({ message: "Failed to deactivate fixed alert" });
    }
  });

  app.post("/api/alerts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const alertData = {
        ...req.body,
        userId,
        isFixed: req.body.isFixed || false
      };

      const validatedData = insertAlertSchema.parse(alertData);
      const alert = await storage.createAlert(validatedData);

      console.log(`Created ${alert.isFixed ? 'fixed' : 'regular'} alert ${alert.id} for user ${userId}`);

      // Broadcast alert to all user devices immediately
      await broadcastAlertToAllUserDevices(userId, alert);

      res.json(alert);
    } catch (error: any) {
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

      // Broadcast updated alert
      await broadcastAlertToAllUserDevices(userId, alert);

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

      // Broadcast alert deletion
      await broadcastAlertToAllUserDevices(userId, { id, deleted: true });

      res.json({ message: "Alert deleted successfully" });
    } catch (error) {
      console.error("Error deleting alert:", error);
      res.status(500).json({ message: "Failed to delete alert" });
    }
  });

  // Get active alerts
  app.get("/api/alerts/active", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const alerts = await storage.getActiveAlerts(userId);
      res.json(alerts);
    } catch (error){
      console.error("Error fetching active alerts:", error);
      res.status(500).json({ message: "Failed to fetch active alerts" });
    }
  });

  // Player endpoint for alerts (no auth required, uses device token)
  app.get("/api/player/alerts", isPlayerAuthenticated, async (req: any, res) => {
    try {
      const screen = req.screen;
      if (!screen?.userId) {
        return res.status(400).json({ message: "Screen not properly configured" });
      }

      const alerts = await storage.getActiveAlerts(screen.userId);

      // Filter alerts for this specific screen if targetScreens is specified
      const filteredAlerts = alerts.filter(alert => {
        if (!alert.targetScreens || alert.targetScreens.length === 0) {
          return true; // Show to all screens if no specific targets
        }
        return alert.targetScreens.includes(screen.id);
      });

      res.json(filteredAlerts);
    } catch (error) {
      console.error("Error fetching player alerts:", error);
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

      // Broadcast widget change to all user's clients
      broadcastToUser(userId, 'widget-updated', { action: 'created', widget });

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

      // Broadcast widget change to all user's clients
      broadcastToUser(userId, 'widget-updated', { action: 'updated', widget });

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

      // Broadcast widget change to all user's clients
      broadcastToUser(userId, 'widget-updated', { action: 'deleted', widgetId: id });

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
  const wss = new WebSocketServer({
    server: httpServer,
    path: "/ws",
    handleProtocols: (protocols, req) => {
      // Acepta cualquier protocolo propuesto por el cliente
      return protocols.values().next().value || false;
    }
  });

  interface WebSocketWithId extends WebSocket {
    userId?: string;
    screenId?: number; // Add screenId to the WebSocket interface
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

        // Handle pairing device registration
        if (parsed.type === 'pairing-device' && parsed.deviceId) {
          (ws as any).pairingDeviceId = parsed.deviceId;
          console.log(`Device ${parsed.deviceId} registered for pairing updates`);
          return;
        }

        // Handle player heartbeat
        if (parsed.type === 'player-heartbeat' && (ws as any).screenId) {
          try {
            const screenId = (ws as any).screenId;
            const userId = (ws as any).userId;

            if (userId) {
              // Get current screen status
              const currentScreen = await storage.getScreenById(screenId);
              const wasOffline = !currentScreen?.isOnline;

              await storage.updateScreen(screenId, {
                isOnline: true,
                lastSeen: new Date(),
              }, userId);

              console.log(`💓 Heartbeat received from screen ${screenId}`);

              // Broadcast status change if screen was offline and now online
              if (wasOffline && currentScreen) {
                console.log(`📡 Screen ${screenId} came online via WebSocket heartbeat`);
                broadcastToUser(userId, 'screen-status-changed', {
                  screenId,
                  screenName: currentScreen.name,
                  isOnline: true,
                  lastSeen: new Date().toISOString()
                });
              }

              // Send heartbeat acknowledgment
              ws.send(JSON.stringify({ 
                type: 'heartbeat-ack', 
                timestamp: new Date().toISOString() 
              }));
            }
          } catch (error) {
            console.error('Error processing player heartbeat:', error);
          }
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

    ws.on("close", async () => {
        const clientUserId = (ws as any).userId;
        const clientScreenId = (ws as any).screenId;

        console.log(`Client disconnected (User: ${clientUserId || 'unauthenticated'}, Screen: ${clientScreenId || 'none'})`);

        // If this was a player client, mark screen as offline after a longer delay
        if (clientScreenId && clientUserId) {
          setTimeout(async () => {
            try {
              // Check if screen has reconnected by looking for active WebSocket connections
              let screenReconnected = false;
              const wssInstance = app.get('wss') as WebSocketServer;

              wssInstance.clients.forEach((client: WebSocket) => {
                const clientWithId = client as any;
                if (clientWithId.readyState === WebSocket.OPEN && 
                    clientWithId.screenId === clientScreenId && 
                    clientWithId.userId === clientUserId) {
                  screenReconnected = true;
                }
              });

              if (!screenReconnected) {
                const screen = await storage.getScreenById(clientScreenId);
                if (screen && screen.isOnline) {
                  await storage.updateScreen(clientScreenId, {
                    isOnline: false,
                    lastSeen: new Date(),
                  }, clientUserId);

                  console.log(`📡 Screen ${clientScreenId} went offline`);
                  broadcastToUser(clientUserId, 'screen-status-changed', {
                    screenId: clientScreenId,
                    screenName: screen.name,
                    isOnline: false,
                    lastSeen: new Date().toISOString()
                  });
                }
              }
            } catch (error) {
              console.error('Error handling screen disconnect:', error);
            }
          }, 15000); // 15 second grace period for reconnection
        }
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

  // Enhanced function to broadcast alerts to all user devices (admin and players)
  async function broadcastAlertToAllUserDevices(userId: string, alertData: any) {
    const wssInstance = app.get('wss') as WebSocketServer;

    try {
      console.log(`📡 Broadcasting alert to devices for user ${userId}`);
      console.log(`Alert target screens:`, alertData.targetScreens);

      let adminClientsNotified = 0;
      let playerClientsNotified = 0;

      // Get all screens for the user to check which ones should receive the alert
      const allUserScreens = await storage.getScreens(userId);
      const targetScreenIds = alertData.targetScreens && alertData.targetScreens.length > 0 
        ? alertData.targetScreens 
        : allUserScreens.map(screen => screen.id); // If no specific screens, send to all

      console.log(`Target screen IDs:`, targetScreenIds);

      wssInstance.clients.forEach((client: WebSocket) => {
        const clientWithId = client as WebSocketWithId;

        if (clientWithId.readyState === WebSocket.OPEN) {
          // Send to admin users (no screenId means it's an admin client)
          if (clientWithId.userId === userId && !clientWithId.screenId) {
            console.log(`✅ Sending alert to admin user ${userId}`);
            clientWithId.send(JSON.stringify({
              type: alertData.deleted ? 'alert-deleted' : 'alert',
              data: alertData
            }));
            adminClientsNotified++;
          }
          // Send to specific player screens for this user
          else if (clientWithId.screenId && clientWithId.userId === userId) {
            if (targetScreenIds.includes(clientWithId.screenId)) {
              console.log(`✅ Sending alert to player screen ${clientWithId.screenId}`);
              clientWithId.send(JSON.stringify({
                type: alertData.deleted ? 'alert-deleted' : 'alert',
                data: alertData
              }));
              playerClientsNotified++;
            } else {
              console.log(`⏭️ Skipping alert for screen ${clientWithId.screenId} (not in target list)`);
            }
          }
        }
      });

      console.log(`📊 Alert broadcast complete: ${adminClientsNotified} admin clients, ${playerClientsNotified} player clients notified`);

    } catch (error) {
      console.error(`Error broadcasting alert:`, error);
    }
  }

  // Enhanced function to broadcast playlist updates to relevant clients (admins and players)
  async function broadcastPlaylistUpdate(userId: string, playlistId: number, eventType: string) {
    const wssInstance = app.get('wss') as WebSocketServer;

    try {
      // Fetch the playlist to include in the update
      const playlist = await storage.getPlaylistWithItems(playlistId, userId);

      if (!playlist) {
        console.warn(`Playlist ${playlistId} not found, cannot broadcast update`);
        return;
      }

      console.log(`📡 Broadcasting playlist update: ${eventType} for playlist ${playlistId} to ${wssInstance.clients.size} clients`);

      // Get all screens that use this playlist
      const allScreens = await storage.getScreens(userId);
      const affectedScreenIds = allScreens.filter(screen => screen.playlistId === playlistId).map(screen => screen.id);

      console.log(`🎯 Affected screens for playlist ${playlistId}:`, affectedScreenIds);

      let adminClientsNotified = 0;
      let playerClientsNotified = 0;

      wssInstance.clients.forEach((client: WebSocket) => {
        const clientWithId = client as WebSocketWithId;

        if (clientWithId.readyState === WebSocket.OPEN) {
          // Send to admin users associated with the playlist
          if (clientWithId.userId === userId) {
            console.log(`✅ Sending playlist update (${eventType}) to admin user ${userId}`);
            clientWithId.send(JSON.stringify({
              type: 'playlist-content-updated',
              data: { 
                playlist, 
                event: eventType,
                playlistId: playlistId,
                timestamp: new Date().toISOString()
              }
            }));
            adminClientsNotified++;
          }
          // Send to players associated with the playlist
          else if (clientWithId.screenId && affectedScreenIds.includes(clientWithId.screenId)) {
            console.log(`✅ Sending playlist content update (${eventType}) to player for screen ${clientWithId.screenId}`);
            clientWithId.send(JSON.stringify({
              type: 'playlist-content-updated',
              data: { 
                playlist, 
                event: eventType,
                playlistId: playlistId,
                screenId: clientWithId.screenId,
                timestamp: new Date().toISOString()
              }
            }));
            playerClientsNotified++;
          }
        }
      });

      console.log(`📊 Broadcast complete: ${adminClientsNotified} admin clients, ${playerClientsNotified} player clients notified`);

    } catch (error) {
      console.error(`Error broadcasting playlist update:`, error);
    }
  }

  // Debug endpoint to check all screens (remove in production)
  app.get("/api/debug/screens", isAuthenticated, async (req: any, res) => {
    try {
      const allScreens = await db.select().from(screens);
      console.log("All screens in database:", allScreens);
      res.json(allScreens);
    } catch (error) {
      console.error("Error fetching all screens:", error);
      res.status(500).json({ message: "Failed to fetch all screens" });
    }
  });

  // Player token validation endpoint
  app.get("/api/player/validate-token", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ valid: false });
      }

      const token = authHeader.split(' ')[1];
      const screen = await storage.getScreenByAuthToken(token);

      if (screen && screen.userId) {
        res.json({ 
          valid: true, 
          screen: { 
            id: screen.id, 
            name: screen.name, 
            playlistId: screen.playlistId 
          } 
        });
      } else {
        res.status(401).json({ valid: false });
      }
    } catch (error) {
      console.error("Error validating token:", error);
      res.status(500).json({ valid: false });
    }
  });

  // Screen Groups routes
  app.get("/api/screen-groups", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const groups = await storage.getScreenGroups(userId);
      res.json(groups);
    } catch (error) {
      console.error("Error fetching screen groups:", error);
      res.status(500).json({ message: "Failed to fetch screen groups" });
    }
  });

  app.post("/api/screen-groups", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const groupData = { ...req.body, userId };

      const validatedData = insertScreenGroupSchema.parse(groupData);
      const group = await storage.createScreenGroup(validatedData);

      // Broadcast group creation to all user's clients
      broadcastToUser(userId, 'screen-group-created', group);

      res.json(group);
    } catch (error) {
      console.error("Error creating screen group:", error);
      res.status(500).json({ message: "Failed to create screen group" });
    }
  });

  app.put("/api/screen-groups/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const updates = req.body;

      const group = await storage.updateScreenGroup(id, updates, userId);
      if (!group) {
        return res.status(404).json({ message: "Screen group not found" });
      }

      // Broadcast group update to all user's clients
      broadcastToUser(userId, 'screen-group-updated', group);

      // If playlist changed, broadcast to affected screens
      if (updates.playlistId !== undefined && group.screenIds) {
        const wssInstance = app.get('wss') as WebSocketServer;

        group.screenIds.forEach(screenId => {
          wssInstance.clients.forEach((client: WebSocket) => {
            const clientWithId = client as any;
            if (clientWithId.readyState === WebSocket.OPEN && clientWithId.screenId === screenId) {
              console.log(`Sending playlist change to screen ${screenId} from group ${id}`);
              clientWithId.send(JSON.stringify({
                type: 'playlist-change',
                data: { 
                  playlistId: updates.playlistId,
                  screenId: screenId,
                  groupId: id,
                  timestamp: new Date().toISOString(),
                  action: 'reload'
                }
              }));
            }
          });
        });
      }

      res.json(group);
    } catch (error) {
      console.error("Error updating screen group:", error);
      res.status(500).json({ message: "Failed to update screen group" });
    }
  });

  app.delete("/api/screen-groups/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);

      const success = await storage.deleteScreenGroup(id, userId);
      if (!success) {
        return res.status(404).json({ message: "Screen group not found" });
      }

      // Broadcast group deletion to all user's clients
      broadcastToUser(userId, 'screen-group-deleted', { groupId: id });

      res.json({ message: "Screengroup deleted successfully" });
    } catch (error) {
      console.error("Error deleting screen group:", error);
      res.status(500).json({ message: "Failed to delete screen group" });
    }
  });

  app.post("/api/screen-groups/:id/play", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const groupId = parseInt(req.params.id);

      // Get group data
      const groups = await storage.getScreenGroups(userId);
      const group = groups.find(g => g.id === groupId);

      if (!group) {
        return res.status(404).json({ message: "Screen group not found" });
      }

      // Broadcast play command to all screens in the group
      const wssInstance = app.get('wss') as WebSocketServer;

      if (group.screenIds) {
        group.screenIds.forEach(screenId => {
          wssInstance.clients.forEach((client: WebSocket) => {
            const clientWithId = client as any;
            if (clientWithId.readyState === WebSocket.OPEN && clientWithId.screenId === screenId) {
              console.log(`Sending play command to screen ${screenId} from group ${groupId}`);
              clientWithId.send(JSON.stringify({
                type: 'group-play',
                data: { 
                  groupId: groupId,
                  screenId: screenId,
                  action: 'play',
                  timestamp: new Date().toISOString()
                }
              }));
            }
          });
        });
      }

      res.json({ message: "Play command sent to group", groupId });
    } catch (error) {
      console.error("Error playing group:", error);
      res.status(500).json({ message: "Failed to play group" });
    }
  });

  app.post("/api/screen-groups/:id/pause", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const groupId = parseInt(req.params.id);

      // Get group data
      const groups = await storage.getScreenGroups(userId);
      const group = groups.find(g => g.id === groupId);

      if (!group) {
        return res.status(404).json({ message: "Screen group not found" });
      }

      // Broadcast pause command to all screens in the group
      const wssInstance = app.get('wss') as WebSocketServer;

      if (group.screenIds) {
        group.screenIds.forEach(screenId => {
          wssInstance.clients.forEach((client: WebSocket) => {
            const clientWithId = client as any;
            if (clientWithId.readyState === WebSocket.OPEN && clientWithId.screenId === screenId) {
              console.log(`Sending pause command to screen ${screenId} from group ${groupId}`);
              clientWithId.send(JSON.stringify({
                type: 'group-pause',
                data: { 
                  groupId: groupId,
                  screenId: screenId,
                  action: 'pause',
                  timestamp: new Date().toISOString()
                }
              }));
            }
          });
        });
      }

      res.json({ message: "Pause command sent to group", groupId });
    } catch (error) {
      console.error("Error pausing group:", error);
      res.status(500).json({ message: "Failed to pause group" });
    }
  });

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
          plays: Math.floor(Math.random() * 200) + 100,          views: Math.floor(Math.random() * 1000) + 500,
          duration: Math.floor(Math.random() * 10000) + 5000
        });
      }

      res.json(playbackData);
    } catch (error) {
      console.error("Error fetching playback analytics:", error);
      res.status(500).json({ message: "Failed to fetch playback analytics" });
    }
  });
  
    // Update playlist item (custom duration, zone, etc.)
    app.put("/api/playlist-items/:id", isAuthenticated, async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const id = parseInt(req.params.id);
        const updates = req.body;
  
        // Validate customDuration if provided
        if (updates.customDuration !== undefined) {
          const duration = parseInt(updates.customDuration);
          if (isNaN(duration) || duration < 1 || duration > 86400) {
            return res.status(400).json({ 
              message: "La duración debe ser un número entre 1 y 86400 segundos" 
            });
          }
          updates.customDuration = duration;
        }
  
        const item = await storage.updatePlaylistItem(id, updates, userId);
        if (!item) {
          return res.status(404).json({ message: "Playlist item not found" });
        }
  
        // Get the playlistId associated with this item.
        const playlistItem = await storage.getPlaylistItem(id);
        const playlistId = playlistItem?.playlistId;
  
         // --- ADDED: Notify connected players and admins of playlist change ---
         if (playlistId) {
           broadcastPlaylistUpdate(userId, playlistId, 'playlist-item-updated');
         }
         // --- END ADDED ---
  
        res.json(item);
      } catch (error) {
        console.error("Error updating playlist item:", error);
        res.status(500).json({ message: "Failed to update playlist item" });
      }
    });
  
    // Broadcast playlist updates - Added
    app.post("/api/playlists/:id/broadcast", isAuthenticated, async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const playlistId = parseInt(req.params.id);
        const { action, itemId, timestamp } = req.body;
  
        // Verify the playlist belongs to the user
        const playlist = await storage.getPlaylistWithItems(playlistId, userId);
        if (!playlist) {
          return res.status(404).json({ message: "Playlist not found" });
        }
  
        // Get all screens using this playlist before deletion
        const allScreens = await storage.getScreens(userId);
        const affectedScreenIds = allScreens.filter(screen => screen.playlistId === playlistId).map(screen => screen.id);
  
        console.log(`📡 Manual broadcast: ${action} for playlist ${playlistId} to ${affectedScreenIds.length} screens`);
  
        // Broadcast to both admin and player clients
        broadcastToUser(userId, 'playlist-updated', {
          playlistId: playlistId,
          action,
          itemId,
          timestamp,
          affectedScreens: affectedScreenIds
        });
  
        res.json({ 
          success: true, 
          message: `Broadcast sent to ${affectedScreenIds.length} screens`,
          affectedScreens: affectedScreenIds
        });
      } catch (error) {
        console.error("Error broadcasting playlist update:", error);
        res.status(500).json({ message: "Failed to broadcast playlist update" });
      }
    });

  return httpServer;
}
// The code defines several API endpoints and integrates WebSocket for real-time updates, including playlist updates.
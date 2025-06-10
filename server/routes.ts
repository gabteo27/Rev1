
import express, { type Request, type Response } from 'express';
import expressWs from 'express-ws';
import { db } from './db';
import {
  screens,
  contentItems,
  playlists,
  playlistItems,
  schedules,
} from '../shared/schema';
import { eq, and, isNull, or } from 'drizzle-orm';
import { playerAuth } from './playerAuth';
import { storage } from './storage';
import { apkBuilder } from './apk-builder';

// Crear instancia de Express con WebSocket
const { app } = expressWs(express());

// --- NUEVO: Mapa para mantener conexiones WebSocket activas ---
const playerConnections = new Map<string, any>();

// --- Rutas existentes (sin cambios) ---
app.use('/api/player', playerAuth);
app.use('/api/storage', storage);
app.use('/api/apk', apkBuilder);

// Middleware de autenticación para rutas protegidas
app.use('/api/screens*', (req, res, next) => {
  // Simular req.user basado en headers o sesión
  const userId = req.headers['x-user-id'] as string || 'test-user-id';
  (req as any).userId = userId;
  next();
});

app.use('/api/content*', (req, res, next) => {
  const userId = req.headers['x-user-id'] as string || 'test-user-id';
  (req as any).userId = userId;
  next();
});

app.use('/api/playlists*', (req, res, next) => {
  const userId = req.headers['x-user-id'] as string || 'test-user-id';
  (req as any).userId = userId;
  next();
});

app.use('/api/schedules*', (req, res, next) => {
  const userId = req.headers['x-user-id'] as string || 'test-user-id';
  (req as any).userId = userId;
  next();
});

// --- NUEVA lógica de WebSocket ---
app.ws('/ws', (ws, req) => {
  const screenId = req.query.screenId as string;
  if (!screenId) {
    console.error('WebSocket connection rejected: No screenId provided.');
    ws.close();
    return;
  }

  console.log(`Player connected with screenId: ${screenId}`);
  playerConnections.set(screenId, ws);

  // Update screen status to online
  db.update(screens)
    .set({ isOnline: true, lastSeen: new Date() })
    .where(eq(screens.id, parseInt(screenId)))
    .then(() => {
      console.log(`Screen ${screenId} status updated to online.`);
    })
    .catch((error) => {
      console.error(`Failed to update screen ${screenId} to online:`, error);
    });

  ws.on('message', (message) => {
    console.log(`Message from ${screenId}:`, message.toString());
  });

  ws.on('close', () => {
    console.log(`Player disconnected: ${screenId}`);
    playerConnections.delete(screenId);

    // Update screen status to offline
    db.update(screens)
      .set({ isOnline: false, lastSeen: new Date() })
      .where(eq(screens.id, parseInt(screenId)))
      .then(() => {
        console.log(`Screen ${screenId} status updated to offline.`);
      })
      .catch((error) => {
        console.error(`Failed to update screen ${screenId} to offline:`, error);
      });
  });

  ws.on('error', (err) => {
    console.error(`WebSocket error for screenId ${screenId}:`, err);
  });
});

// --- Rutas de API existentes (con la modificación de /pair) ---

// Screens
app.get('/api/screens', async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }
  const allScreens = await db
    .select()
    .from(screens)
    .where(or(eq(screens.userId, userId), isNull(screens.userId)));
  return res.json(allScreens);
});

app.get('/api/screens/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const screen = await db.select().from(screens).where(eq(screens.id, parseInt(id)));
  return res.json(screen[0]);
});

app.delete('/api/screens/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  await db.delete(screens).where(eq(screens.id, parseInt(id)));
  return res.json({ success: true });
});

// --- MODIFICADO: Lógica de 'pair' movida aquí desde playerAuth.ts ---
app.post('/api/player/pair', async (req: Request, res: Response) => {
  const { code, name } = req.body;
  const userId = (req as any).userId;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const screenResult = await db
    .select()
    .from(screens)
    .where(eq(screens.pairingCode, code))
    .limit(1);

  if (screenResult.length === 0) {
    return res.status(404).json({ error: 'Invalid pairing code' });
  }

  const screen = screenResult[0];
  const screenId = screen.id.toString();

  if (screen.userId) {
    return res.status(400).json({ error: 'Screen already paired' });
  }

  const updatedScreen = await db
    .update(screens)
    .set({
      name: name,
      userId: userId,
      isOnline: true,
      lastSeen: new Date(),
      pairingCode: null,
      pairingCodeExpiresAt: null,
    })
    .where(eq(screens.id, screen.id))
    .returning();

  // Forzamos el estado a online si hay una conexión activa
  if (playerConnections.has(screenId)) {
    await db.update(screens).set({ isOnline: true, lastSeen: new Date() }).where(eq(screens.id, screen.id));
    updatedScreen[0].isOnline = true;
  }

  // Notificar al reproductor a través de WS que ha sido emparejado
  const playerSocket = playerConnections.get(screenId);
  if (playerSocket && playerSocket.readyState === 1) { // WebSocket.OPEN
    playerSocket.send(JSON.stringify({ type: 'paired', screen: updatedScreen[0] }));
    console.log(`Sent 'paired' confirmation to screen ${screenId}`);
  }

  return res.json(updatedScreen[0]);
});

// Content (Tu código original sin cambios)
app.get('/api/content', async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }
  const userContent = await db
    .select()
    .from(contentItems)
    .where(eq(contentItems.userId, userId));
  return res.json(userContent);
});

app.delete('/api/content/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).userId;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const contentItem = await db.select().from(contentItems).where(and(eq(contentItems.id, parseInt(id)), eq(contentItems.userId, userId)));
  if (contentItem.length === 0) {
    return res.status(404).json({ error: 'Content not found or you do not have permission to delete it' });
  }

  await db.delete(contentItems).where(eq(contentItems.id, parseInt(id)));
  await db.delete(playlistItems).where(eq(playlistItems.contentItemId, parseInt(id)));

  return res.json({ success: true });
});

// Playlists (Tu código original sin cambios)
app.get('/api/playlists', async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }
  const userPlaylists = await db
    .select()
    .from(playlists)
    .where(eq(playlists.userId, userId));
  return res.json(userPlaylists);
});

app.post('/api/playlists', async (req: Request, res: Response) => {
  const { name } = req.body;
  const userId = (req as any).userId;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }
  const newPlaylist = await db
    .insert(playlists)
    .values({ name, userId })
    .returning();
  return res.json(newPlaylist[0]);
});

app.get('/api/playlists/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const playlist = await db
    .select()
    .from(playlists)
    .where(eq(playlists.id, parseInt(id)))
    .limit(1);

  if (playlist.length === 0) {
    return res.status(404).json({ error: 'Playlist not found' });
  }

  const items = await db
    .select({
      id: playlistItems.id,
      order: playlistItems.order,
      customDuration: playlistItems.customDuration,
      content: {
        id: contentItems.id,
        title: contentItems.title,
        type: contentItems.type,
        url: contentItems.url,
      },
    })
    .from(playlistItems)
    .leftJoin(contentItems, eq(playlistItems.contentItemId, contentItems.id))
    .where(eq(playlistItems.playlistId, parseInt(id)))
    .orderBy(playlistItems.order);

  return res.json({ ...playlist[0], items });
});

app.put('/api/playlists/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, items } = req.body;
  const userId = (req as any).userId;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  await db
    .update(playlists)
    .set({ name })
    .where(and(eq(playlists.id, parseInt(id)), eq(playlists.userId, userId)));

  await db.delete(playlistItems).where(eq(playlistItems.playlistId, parseInt(id)));
  if (items && items.length > 0) {
    const newItems = items.map((item: any) => ({
      playlistId: parseInt(id),
      contentItemId: item.content.id,
      order: item.order,
      customDuration: item.customDuration,
    }));
    await db.insert(playlistItems).values(newItems);
  }

  return res.json({ success: true });
});

app.delete('/api/playlists/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).userId;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }
  await db.delete(playlists).where(and(eq(playlists.id, parseInt(id)), eq(playlists.userId, userId)));
  await db.delete(playlistItems).where(eq(playlistItems.playlistId, parseInt(id)));
  return res.json({ success: true });
});

// Schedules (Tu código original sin cambios)
app.get('/api/schedules', async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }
  const userSchedules = await db.select().from(schedules).where(eq(schedules.userId, userId));
  return res.json(userSchedules);
});

app.post('/api/schedules', async (req: Request, res: Response) => {
  const { name, screenIds, playlistId } = req.body;
  const userId = (req as any).userId;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }
  const newSchedule = await db.insert(schedules).values({ 
    name, 
    userId, 
    screenIds, 
    playlistId 
  }).returning();
  return res.json(newSchedule[0]);
});

// --- MODIFICADO: Notificación WebSocket específica ---
app.put('/api/screens/:id/schedule', async (req: Request, res: Response) => {
  const { id } = req.params; // screenId
  const { playlistId } = req.body;
  const userId = (req as any).userId;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const screen = await db.select().from(screens).where(and(eq(screens.id, parseInt(id)), eq(screens.userId, userId)));
  if (screen.length === 0) {
    return res.status(404).json({ error: 'Screen not found or permission denied' });
  }

  const updatedScreen = await db.update(screens).set({ playlistId }).where(eq(screens.id, parseInt(id))).returning();

  // Notificar al reproductor del cambio de playlist
  const playerSocket = playerConnections.get(id);
  if (playerSocket && playerSocket.readyState === 1) { // WebSocket.OPEN
    playerSocket.send(JSON.stringify({ type: 'playlist-update', playlistId: playlistId }));
  }

  return res.json(updatedScreen[0]);
});

export default app;

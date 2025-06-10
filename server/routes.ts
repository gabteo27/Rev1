// @ts-nocheck
import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { upgradeWebSocket } from 'hono/ws';
import { db } from './db';
import {
  screens,
  content,
  playlists,
  playlistItems,
  schedules,
} from '../shared/schema';
import { eq, and, isNull, or } from 'drizzle-orm';
import { playerAuth } from './playerAuth';
import { replitAuth } from './replitAuth';
import { storage } from './storage';
import { apkBuilder } from './apk-builder';

const app = new Hono();

// --- NUEVO: Mapa para mantener conexiones WebSocket activas ---
const playerConnections = new Map<string, WebSocket>();

// --- Rutas existentes (sin cambios) ---
app.route('/api/auth', replitAuth);
app.route('/api/player', playerAuth);
app.route('/api/storage', storage);
app.route('/api/apk', apkBuilder)

// --- NUEVA lógica de WebSocket ---
app.get(
  '/ws',
  upgradeWebSocket(async (c) => {
    const screenId = c.req.query('screenId');
    if (!screenId) {
      console.error('WebSocket connection rejected: No screenId provided.');
      return;
    }

    return {
      onOpen: async (ws) => {
        console.log(`Player connected with screenId: ${screenId}`);
        playerConnections.set(screenId, ws);

        try {
          await db
            .update(screens)
            .set({ status: 'online' })
            .where(eq(screens.id, screenId));
          console.log(`Screen ${screenId} status updated to online.`);
        } catch (error) {
          console.error(`Failed to update screen ${screenId} to online:`, error);
        }
      },
      onMessage: (ws, message) => {
        console.log(`Message from ${screenId}:`, message);
      },
      onClose: async () => {
        console.log(`Player disconnected: ${screenId}`);
        playerConnections.delete(screenId);

        try {
          await db
            .update(screens)
            .set({ status: 'offline' })
            .where(eq(screens.id, screenId));
          console.log(`Screen ${screenId} status updated to offline.`);
        } catch (error) {
          console.error(`Failed to update screen ${screenId} to offline:`, error);
        }
      },
      onError: (err) => {
        console.error(`WebSocket error for screenId ${screenId}:`, err);
      }
    };
  })
);

// --- Rutas de API existentes (con la modificación de /pair) ---

// Screens
app.get('/api/screens', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not authenticated' }, 401);
  }
  const allScreens = await db
    .select()
    .from(screens)
    .where(or(eq(screens.userId, userId), isNull(screens.userId)));
  return c.json(allScreens);
});

app.get('/api/screens/:id', async (c) => {
  const { id } = c.req.param();
  const screen = await db.select().from(screens).where(eq(screens.id, id));
  return c.json(screen[0]);
});

app.delete('/api/screens/:id', async (c) => {
  const { id } = c.req.param();
  await db.delete(screens).where(eq(screens.id, id));
  return c.json({ success: true });
});


// --- MODIFICADO: Lógica de 'pair' movida aquí desde playerAuth.ts ---
app.post('/api/player/pair', async (c) => {
    const { code, name } = await c.req.json();
    const userId = c.get('userId');

    if (!userId) {
        return c.json({ error: 'User not authenticated' }, 401);
    }

    const screenResult = await db
        .select()
        .from(screens)
        .where(eq(screens.pairingCode, code))
        .limit(1);

    if (screenResult.length === 0) {
        return c.json({ error: 'Invalid pairing code' }, 404);
    }

    const screen = screenResult[0];
    const screenId = screen.id;

    if (screen.userId) {
        return c.json({ error: 'Screen already paired' }, 400);
    }

    const updatedScreen = await db
        .update(screens)
        .set({
            name: name,
            userId: userId,
            // El estado se establece en 'online' a través del WS, aquí lo ponemos como 'paired'
            // para reflejar que el emparejamiento está completo. El siguiente latido del WS lo pondrá online.
            status: 'paired',
            pairingCode: null,
        })
        .where(eq(screens.id, screenId))
        .returning();

    // Forzamos el estado a online si hay una conexión activa
    if (playerConnections.has(screenId)) {
        await db.update(screens).set({ status: 'online' }).where(eq(screens.id, screenId));
        updatedScreen[0].status = 'online';
    }


    // Notificar al reproductor a través de WS que ha sido emparejado
    const playerSocket = playerConnections.get(screenId);
    if (playerSocket && playerSocket.readyState === WebSocket.OPEN) {
        playerSocket.send(JSON.stringify({ type: 'paired', screen: updatedScreen[0] }));
        console.log(`Sent 'paired' confirmation to screen ${screenId}`);
    }

    return c.json(updatedScreen[0]);
});


// Content (Tu código original sin cambios)
app.get('/api/content', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not authenticated' }, 401);
  }
  const userContent = await db
    .select()
    .from(content)
    .where(eq(content.userId, userId));
  return c.json(userContent);
});

app.delete('/api/content/:id', async (c) => {
    const { id } = c.req.param();
    const userId = c.get('userId');
    if (!userId) {
        return c.json({ error: 'User not authenticated' }, 401);
    }

    const contentItem = await db.select().from(content).where(and(eq(content.id, id), eq(content.userId, userId)));
    if (contentItem.length === 0) {
        return c.json({ error: 'Content not found or you do not have permission to delete it' }, 404);
    }

    await db.delete(content).where(eq(content.id, id));
    await db.delete(playlistItems).where(eq(playlistItems.contentId, id));

    return c.json({ success: true });
});


// Playlists (Tu código original sin cambios)
app.get('/api/playlists', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not authenticated' }, 401);
  }
  const userPlaylists = await db
    .select()
    .from(playlists)
    .where(eq(playlists.userId, userId));
  return c.json(userPlaylists);
});

app.post('/api/playlists', async (c) => {
  const { name } = await c.req.json();
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not authenticated' }, 401);
  }
  const newPlaylist = await db
    .insert(playlists)
    .values({ name, userId, id: `pl_${Math.random().toString(36).slice(2)}` })
    .returning();
  return c.json(newPlaylist[0]);
});

app.get('/api/playlists/:id', async (c) => {
  const { id } = c.req.param();
  const userId = c.get('userId');
  // Se permite acceso sin userId para que el reproductor pueda coger los datos
  // if (!userId) {
  //   return c.json({ error: 'User not authenticated' }, 401);
  // }

  const playlist = await db
    .select()
    .from(playlists)
    .where(eq(playlists.id, id))
    .limit(1);

  if (playlist.length === 0) {
    return c.json({ error: 'Playlist not found' }, 404);
  }

  const items = await db
    .select({
      id: playlistItems.id,
      order: playlistItems.order,
      duration: playlistItems.duration,
      content: {
        id: content.id,
        name: content.name,
        type: content.type,
        url: content.url,
      },
    })
    .from(playlistItems)
    .leftJoin(content, eq(playlistItems.contentId, content.id))
    .where(eq(playlistItems.playlistId, id))
    .orderBy(playlistItems.order);

  return c.json({ ...playlist[0], items });
});

app.put('/api/playlists/:id', async (c) => {
  const { id } = c.req.param();
  const { name, items } = await c.req.json();
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'User not authenticated' }, 401);
  }

  await db
    .update(playlists)
    .set({ name })
    .where(and(eq(playlists.id, id), eq(playlists.userId, userId)));

  await db.delete(playlistItems).where(eq(playlistItems.playlistId, id));
  if (items && items.length > 0) {
    const newItems = items.map((item) => ({
      playlistId: id,
      contentId: item.content.id,
      order: item.order,
      duration: item.duration,
      id: `pli_${Math.random().toString(36).slice(2)}`,
    }));
    await db.insert(playlistItems).values(newItems);
  }

  return c.json({ success: true });
});

app.delete('/api/playlists/:id', async (c) => {
    const { id } = c.req.param();
    const userId = c.get('userId');
    if (!userId) {
        return c.json({ error: 'User not authenticated' }, 401);
    }
    await db.delete(playlists).where(and(eq(playlists.id, id), eq(playlists.userId, userId)));
    await db.delete(playlistItems).where(eq(playlistItems.playlistId, id));
    return c.json({ success: true });
});

// Schedules (Tu código original sin cambios)
app.get('/api/schedules', async (c) => {
    const userId = c.get('userId');
    if (!userId) {
        return c.json({ error: 'User not authenticated' }, 401);
    }
    const userSchedules = await db.select().from(schedules).where(eq(schedules.userId, userId));
    return c.json(userSchedules);
});

app.post('/api/schedules', async (c) => {
    const { name, screenId, playlistId } = await c.req.json();
    const userId = c.get('userId');
    if (!userId) {
        return c.json({ error: 'User not authenticated' }, 401);
    }
    const newSchedule = await db.insert(schedules).values({ 
        id: `sch_${Math.random().toString(36).slice(2)}`,
        name, 
        userId, 
        screenId, 
        playlistId 
    }).returning();
    return c.json(newSchedule[0]);
});

// --- MODIFICADO: Notificación WebSocket específica ---
app.put('/api/screens/:id/schedule', async (c) => {
    const { id } = c.req.param(); // screenId
    const { playlistId } = await c.req.json();
    const userId = c.get('userId');

    if (!userId) {
        return c.json({ error: 'User not authenticated' }, 401);
    }

    const screen = await db.select().from(screens).where(and(eq(screens.id, id), eq(screens.userId, userId)));
    if (screen.length === 0) {
        return c.json({ error: 'Screen not found or permission denied' }, 404);
    }

    const updatedScreen = await db.update(screens).set({ playlistId }).where(eq(screens.id, id)).returning();

    // Notificar al reproductor del cambio de playlist
    const playerSocket = playerConnections.get(id);
    if (playerSocket && playerSocket.readyState === WebSocket.OPEN) {
        playerSocket.send(JSON.stringify({ type: 'playlist-update', playlistId: playlistId }));
    }

    return c.json(updatedScreen[0]);
});

// --- Servir estáticos (Tu código original sin cambios) ---
app.use('/*', serveStatic({ root: './client/dist' }));
app.get('*', serveStatic({ path: './client/dist/index.html' }));

export default app;
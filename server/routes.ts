
import express, { Router, Request, Response } from 'express';
import { WebSocket } from 'ws';
import { db } from './db';
import {
  screens,
  playlists,
  contentItems,
  playlistItems,
  alerts,
  widgets,
  schedules,
  deployments,
  type Screen,
  type Playlist,
  type ContentItem,
  type Alert,
  type Widget,
  type Schedule,
  type Deployment,
} from '../shared/schema';
import { eq, and, isNull, or } from 'drizzle-orm';
import { playerAuth } from './playerAuth';
import { storage } from './storage';
import { apkBuilder } from './apk-builder';

const router = Router();
const playerConnections = new Map<string, WebSocket>();

// --- Rutas existentes (sin cambios) ---
router.use('/api/player', playerAuth);
router.use('/api/storage', storage);
router.use('/api/apk', apkBuilder);

// Middleware de autenticación para rutas protegidas
router.use('/api/screens*', async (req: any, res, next) => {
  const userId = req.headers['x-user-id'] || 'test-user-id';
  req.userId = userId;
  next();
});

router.use('/api/content*', async (req: any, res, next) => {
  const userId = req.headers['x-user-id'] || 'test-user-id';
  req.userId = userId;
  next();
});

router.use('/api/playlists*', async (req: any, res, next) => {
  const userId = req.headers['x-user-id'] || 'test-user-id';
  req.userId = userId;
  next();
});

router.use('/api/schedules*', async (req: any, res, next) => {
  const userId = req.headers['x-user-id'] || 'test-user-id';
  req.userId = userId;
  next();
});

// --- NUEVA lógica de WebSocket ---
router.get('/api/ws/screen/:screenId', async (req: Request, res: Response) => {
  try {
    if (req.headers.upgrade !== 'websocket') {
      return res.status(400).json({ error: 'Expected websocket upgrade' });
    }

    const screenId = req.params.screenId;
    
    // Simulate WebSocket upgrade
    res.status(200).json({ 
      message: 'WebSocket endpoint ready',
      screenId: screenId 
    });
  } catch (error) {
    console.error('WebSocket setup error:', error);
    res.status(500).json({ error: 'Failed to setup WebSocket' });
  }
});

// --- Rutas de API ---

// Screens API
router.get('/api/screens', async (req: any, res: Response) => {
  try {
    const userId = req.userId || 'test-user-id';
    const userScreens = await db
      .select()
      .from(screens)
      .where(eq(screens.userId, userId));
    
    res.json(userScreens);
  } catch (error) {
    console.error('Error fetching screens:', error);
    res.status(500).json({ error: 'Failed to fetch screens' });
  }
});

router.post('/api/screens', async (req: any, res: Response) => {
  try {
    const userId = req.userId || 'test-user-id';
    const screenData = { ...req.body, userId };
    
    const [newScreen] = await db
      .insert(screens)
      .values(screenData)
      .returning();
    
    res.json(newScreen);
  } catch (error) {
    console.error('Error creating screen:', error);
    res.status(500).json({ error: 'Failed to create screen' });
  }
});

router.put('/api/screens/:id', async (req: any, res: Response) => {
  try {
    const userId = req.userId || 'test-user-id';
    const screenId = parseInt(req.params.id);
    
    const [updatedScreen] = await db
      .update(screens)
      .set({ ...req.body, updatedAt: new Date() })
      .where(and(eq(screens.id, screenId), eq(screens.userId, userId)))
      .returning();
    
    if (!updatedScreen) {
      return res.status(404).json({ error: 'Screen not found' });
    }
    
    res.json(updatedScreen);
  } catch (error) {
    console.error('Error updating screen:', error);
    res.status(500).json({ error: 'Failed to update screen' });
  }
});

router.delete('/api/screens/:id', async (req: any, res: Response) => {
  try {
    const userId = req.userId || 'test-user-id';
    const screenId = parseInt(req.params.id);
    
    const result = await db
      .delete(screens)
      .where(and(eq(screens.id, screenId), eq(screens.userId, userId)));
    
    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ error: 'Screen not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting screen:', error);
    res.status(500).json({ error: 'Failed to delete screen' });
  }
});

// Content API
router.get('/api/content', async (req: any, res: Response) => {
  try {
    const userId = req.userId || 'test-user-id';
    const content = await db
      .select()
      .from(contentItems)
      .where(eq(contentItems.userId, userId));
    
    res.json(content);
  } catch (error) {
    console.error('Error fetching content:', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

router.post('/api/content', async (req: any, res: Response) => {
  try {
    const userId = req.userId || 'test-user-id';
    const contentData = { ...req.body, userId };
    
    const [newContent] = await db
      .insert(contentItems)
      .values(contentData)
      .returning();
    
    res.json(newContent);
  } catch (error) {
    console.error('Error creating content:', error);
    res.status(500).json({ error: 'Failed to create content' });
  }
});

// Playlists API
router.get('/api/playlists', async (req: any, res: Response) => {
  try {
    const userId = req.userId || 'test-user-id';
    const userPlaylists = await db
      .select()
      .from(playlists)
      .where(eq(playlists.userId, userId));
    
    res.json(userPlaylists);
  } catch (error) {
    console.error('Error fetching playlists:', error);
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

router.post('/api/playlists', async (req: any, res: Response) => {
  try {
    const userId = req.userId || 'test-user-id';
    const playlistData = { ...req.body, userId };
    
    const [newPlaylist] = await db
      .insert(playlists)
      .values(playlistData)
      .returning();
    
    res.json(newPlaylist);
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

// Alerts API
router.get('/api/alerts', async (req: any, res: Response) => {
  try {
    const userId = req.userId || 'test-user-id';
    const userAlerts = await db
      .select()
      .from(alerts)
      .where(eq(alerts.userId, userId));
    
    res.json(userAlerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

router.post('/api/alerts', async (req: any, res: Response) => {
  try {
    const userId = req.userId || 'test-user-id';
    const alertData = { ...req.body, userId };
    
    const [newAlert] = await db
      .insert(alerts)
      .values(alertData)
      .returning();
    
    res.json(newAlert);
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

// Widgets API
router.get('/api/widgets', async (req: any, res: Response) => {
  try {
    const userId = req.userId || 'test-user-id';
    const userWidgets = await db
      .select()
      .from(widgets)
      .where(eq(widgets.userId, userId));
    
    res.json(userWidgets);
  } catch (error) {
    console.error('Error fetching widgets:', error);
    res.status(500).json({ error: 'Failed to fetch widgets' });
  }
});

router.post('/api/widgets', async (req: any, res: Response) => {
  try {
    const userId = req.userId || 'test-user-id';
    const widgetData = { ...req.body, userId };
    
    const [newWidget] = await db
      .insert(widgets)
      .values(widgetData)
      .returning();
    
    res.json(newWidget);
  } catch (error) {
    console.error('Error creating widget:', error);
    res.status(500).json({ error: 'Failed to create widget' });
  }
});

// Schedules API
router.get('/api/schedules', async (req: any, res: Response) => {
  try {
    const userId = req.userId || 'test-user-id';
    const userSchedules = await db
      .select()
      .from(schedules)
      .where(eq(schedules.userId, userId));
    
    res.json(userSchedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

router.post('/api/schedules', async (req: any, res: Response) => {
  try {
    const userId = req.userId || 'test-user-id';
    const scheduleData = { ...req.body, userId };
    
    const [newSchedule] = await db
      .insert(schedules)
      .values(scheduleData)
      .returning();
    
    res.json(newSchedule);
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

// Deployments API
router.get('/api/deployments', async (req: any, res: Response) => {
  try {
    const userId = req.userId || 'test-user-id';
    const userDeployments = await db
      .select()
      .from(deployments)
      .where(eq(deployments.userId, userId));
    
    res.json(userDeployments);
  } catch (error) {
    console.error('Error fetching deployments:', error);
    res.status(500).json({ error: 'Failed to fetch deployments' });
  }
});

router.post('/api/deployments', async (req: any, res: Response) => {
  try {
    const userId = req.userId || 'test-user-id';
    const deploymentData = { ...req.body, userId };
    
    const [newDeployment] = await db
      .insert(deployments)
      .values(deploymentData)
      .returning();
    
    res.json(newDeployment);
  } catch (error) {
    console.error('Error creating deployment:', error);
    res.status(500).json({ error: 'Failed to create deployment' });
  }
});

// Screen pairing endpoint
router.post('/api/screens/pair', async (req: Request, res: Response) => {
  try {
    const { pairingCode } = req.body;
    const userId = 'test-user-id'; // Simulated user
    
    if (!pairingCode) {
      return res.status(400).json({ error: 'Pairing code is required' });
    }

    const screenResult = await db
      .select()
      .from(screens)
      .where(and(
        eq(screens.pairingCode, pairingCode),
        isNull(screens.userId)
      ));

    if (screenResult.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired pairing code' });
    }

    const screen = screenResult[0];
    const screenId = screen.id.toString();

    if (screen.userId) {
      return res.status(400).json({ error: 'Screen already paired' });
    }

    const authToken = `auth_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    const [updatedScreen] = await db
      .update(screens)
      .set({
        userId: userId,
        authToken: authToken,
        pairingCode: null,
        pairingCodeExpiresAt: null,
      })
      .where(eq(screens.id, screen.id))
      .returning();

    if (playerConnections.has(screenId)) {
      await db.update(screens).set({ isOnline: true, lastSeen: new Date() }).where(eq(screens.id, screen.id));
      updatedScreen.isOnline = true;
    }

    res.json({
      success: true,
      screen: updatedScreen,
      authToken: authToken
    });
  } catch (error) {
    console.error('Error pairing screen:', error);
    res.status(500).json({ error: 'Failed to pair screen' });
  }
});

export default router;

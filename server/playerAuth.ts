import { Hono } from 'hono';
import { db } from './db';
import { screens } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const playerAuth = new Hono();

// Generar un nuevo código de emparejamiento para una pantalla
playerAuth.post('/code', async (c) => {
  try {
    const newScreen = await db
      .insert(screens)
      .values({
        id: `scr_${nanoid()}`, // Prefijo para claridad
        pairingCode: nanoid(6).toUpperCase(),
        status: 'offline',
      })
      .returning();
    return c.json(newScreen[0]);
  } catch (error) {
    console.error('Error creating new screen:', error);
    return c.json({ error: 'Failed to create new screen' }, 500);
  }
});

// Obtener el estado y la configuración de una pantalla (usado por el reproductor)
playerAuth.get('/status/:id', async (c) => {
    const { id } = c.req.param();
    try {
        const screen = await db
            .select()
            .from(screens)
            .where(eq(screens.id, id))
            .limit(1);

        if (screen.length === 0) {
            return c.json({ error: 'Screen not found' }, 404);
        }
        return c.json(screen[0]);
    } catch (error) {
        console.error(`Error fetching status for screen ${id}:`, error);
        return c.json({ error: 'Failed to fetch screen status' }, 500);
    }
});
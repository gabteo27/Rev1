import {
  users,
  contentItems,
  playlists,
  playlistItems,
  screens,
  alerts,
  widgets,
  schedules,
  deployments,
  type User,
  type UpsertUser,
  type ContentItem,
  type InsertContentItem,
  type Playlist,
  type InsertPlaylist,
  type PlaylistItem,
  type InsertPlaylistItem,
  type Screen,
  type InsertScreen,
  type Alert,
  type InsertAlert,
  type Widget,
  type InsertWidget,
  type Schedule,
  type InsertSchedule,
  type Deployment,
  type InsertDeployment,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, exists, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Screen authentication methods
  getScreenByAuthToken(token: string): Promise<Screen | undefined>;
  getScreenByDeviceHardwareId(deviceId: string): Promise<Screen | undefined>;
  findScreenByPairingCode(code: string): Promise<Screen | undefined>;
  upsertTemporaryScreen(data: { deviceHardwareId: string, pairingCode: string, pairingCodeExpiresAt: Date, name: string }): Promise<void>;

  // Content operations
  getContentItems(userId: string): Promise<ContentItem[]>;
  getContentItem(id: number, userId: string): Promise<ContentItem | undefined>;
  createContentItem(contentItem: InsertContentItem): Promise<ContentItem>;
  updateContentItem(
    id: number,
    contentItem: Partial<InsertContentItem>,
    userId: string,
  ): Promise<ContentItem | undefined>;
  deleteContentItem(id: number, userId: string): Promise<boolean>;

  // Playlist operations
  getPlaylists(userId: string): Promise<Playlist[]>;
  getPlaylist(id: number, userId: string): Promise<Playlist | undefined>;
  getPlaylistWithItems(
    id: number,
    userId: string,
  ): Promise<
    | (Playlist & { items: (PlaylistItem & { contentItem: ContentItem })[] })
    | undefined
  >;
  createPlaylist(playlist: InsertPlaylist): Promise<Playlist>;
  updatePlaylist(
    id: number,
    playlist: Partial<InsertPlaylist>,
    userId: string,
  ): Promise<Playlist | undefined>;
  deletePlaylist(id: number, userId: string): Promise<boolean>;

  // Playlist item operations
  addPlaylistItem(
    playlistItem: InsertPlaylistItem,
    userId: string,
  ): Promise<PlaylistItem>;
  updatePlaylistItem(
    id: number,
    playlistItem: Partial<InsertPlaylistItem>,
    userId: string,
  ): Promise<PlaylistItem | undefined>;
  deletePlaylistItem(id: number, userId: string): Promise<boolean>;
  reorderPlaylistItems(
    playlistId: number,
    itemOrders: { id: number; order: number }[],
    userId: string,
  ): Promise<void>;

  // Screen operations
  getScreens(userId: string): Promise<Screen[]>;
  getScreen(id: number, userId: string): Promise<Screen | undefined>;
  createScreen(screen: InsertScreen): Promise<Screen>;
  updateScreen(
    id: number,
    screen: Partial<InsertScreen>,
    userId: string,
  ): Promise<Screen | undefined>;
  deleteScreen(id: number, userId: string): Promise<boolean>;

  // Alert operations
  getAlerts(userId: string): Promise<Alert[]>;
  getActiveAlerts(userId: string): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  updateAlert(
    id: number,
    alert: Partial<InsertAlert>,
    userId: string,
  ): Promise<Alert | undefined>;
  deleteAlert(id: number, userId: string): Promise<boolean>;

  // Widget operations
  getWidgets(userId: string): Promise<Widget[]>;
  createWidget(widget: InsertWidget): Promise<Widget>;
  updateWidget(
    id: number,
    widget: Partial<InsertWidget>,
    userId: string,
  ): Promise<Widget | undefined>;
  deleteWidget(id: number, userId: string): Promise<boolean>;

  // Schedule operations
  getSchedules(userId: string): Promise<Schedule[]>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  updateSchedule(
    id: number,
    schedule: Partial<InsertSchedule>,
    userId: string,
  ): Promise<Schedule | undefined>;
  deleteSchedule(id: number, userId: string): Promise<boolean>;

  // Deployment operations
  getDeployments(userId: string): Promise<Deployment[]>;
  createDeployment(deployment: InsertDeployment): Promise<Deployment>;
  updateDeployment(
    id: number,
    deployment: Partial<InsertDeployment>,
    userId: string,
  ): Promise<Deployment | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  // En server/storage.ts, dentro de la clase DatabaseStorage

  async getScreenByAuthToken(token: string): Promise<Screen | undefined> {
    const [screen] = await db
      .select()
      .from(screens)
      .where(eq(screens.authToken, token));
    return screen;
  }

  async findScreenByPairingCode(code: string): Promise<Screen | undefined> {
    const [screen] = await db
      .select()
      .from(screens)
      .where(eq(screens.pairingCode, code));
    return screen;
  }

  async getScreenByDeviceHardwareId(deviceId: string): Promise<Screen | undefined> {
    const [screen] = await db
      .select()
      .from(screens)
      .where(eq(screens.deviceHardwareId, deviceId));
    return screen;
  }

  async upsertTemporaryScreen(data: { deviceHardwareId: string, pairingCode: string, pairingCodeExpiresAt: Date, name: string }): Promise<void> {
    const existing = await this.getScreenByDeviceHardwareId(data.deviceHardwareId);

    if (existing) {
      // Update existing screen
      await db.update(screens)
        .set({
          pairingCode: data.pairingCode,
          pairingCodeExpiresAt: data.pairingCodeExpiresAt,
          name: data.name,
          authToken: null,
          userId: null,
          playlistId: null,
          updatedAt: new Date()
        })
        .where(eq(screens.deviceHardwareId, data.deviceHardwareId));
    } else {
      // Insert new screen
      await db.insert(screens)
        .values({
          deviceHardwareId: data.deviceHardwareId,
          pairingCode: data.pairingCode,
          pairingCodeExpiresAt: data.pairingCodeExpiresAt,
          name: data.name
        });
    }
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Content operations
  async getContentItems(userId: string): Promise<ContentItem[]> {
    return await db
      .select()
      .from(contentItems)
      .where(eq(contentItems.userId, userId))
      .orderBy(desc(contentItems.createdAt));
  }

  async getContentItem(
    id: number,
    userId: string,
  ): Promise<ContentItem | undefined> {
    const [item] = await db
      .select()
      .from(contentItems)
      .where(and(eq(contentItems.id, id), eq(contentItems.userId, userId)));
    return item;
  }

  async createContentItem(
    contentItem: InsertContentItem,
  ): Promise<ContentItem> {
    const [item] = await db
      .insert(contentItems)
      .values(contentItem)
      .returning();
    return item;
  }

  async updateContentItem(
    id: number,
    contentItem: Partial<InsertContentItem>,
    userId: string,
  ): Promise<ContentItem | undefined> {
    const [item] = await db
      .update(contentItems)
      .set({ ...contentItem, updatedAt: new Date() })
      .where(and(eq(contentItems.id, id), eq(contentItems.userId, userId)))
      .returning();
    return item;
  }

  async deleteContentItem(id: number, userId: string): Promise<boolean> {
    // First delete any playlist items that reference this content
    await db.delete(playlistItems)
      .where(eq(playlistItems.contentItemId, id));

    // Then delete the content item
    const result = await db
      .delete(contentItems)
      .where(and(eq(contentItems.id, id), eq(contentItems.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Playlist operations  
  async getPlaylists(userId: string): Promise<any[]> {
    const playlistsData = await db
      .select()
      .from(playlists)
      .where(eq(playlists.userId, userId))
      .orderBy(desc(playlists.createdAt));

    // Get items count and total duration for each playlist
    const enrichedPlaylists = await Promise.all(
      playlistsData.map(async (playlist) => {
        const items = await db
          .select({
            id: playlistItems.id,
            customDuration: playlistItems.customDuration,
            contentItem: {
              duration: contentItems.duration,
            },
          })
          .from(playlistItems)
          .innerJoin(contentItems, eq(playlistItems.contentItemId, contentItems.id))
          .where(eq(playlistItems.playlistId, playlist.id));

        const totalDuration = items.reduce((total, item) => {
          return total + (item.customDuration || item.contentItem.duration || 0);
        }, 0);

        return {
          ...playlist,
          totalItems: items.length,
          totalDuration,
        };
      })
    );

    return enrichedPlaylists;
  }

  async getPlaylist(id: number, userId: string): Promise<Playlist | undefined> {
    const [playlist] = await db
      .select()
      .from(playlists)
      .where(and(eq(playlists.id, id), eq(playlists.userId, userId)));
    return playlist;
  }

  async getPlaylistWithItems(
    id: number,
    userId: string,
  ): Promise<
    | (Playlist & { items: (PlaylistItem & { contentItem: ContentItem })[] })
    | undefined
  > {
    const playlist = await this.getPlaylist(id, userId);
    if (!playlist) return undefined;

    const items = await db
      .select({
        playlistItem: playlistItems,
        contentItem: contentItems,
      })
      .from(playlistItems)
      .innerJoin(contentItems, eq(playlistItems.contentItemId, contentItems.id))
      .where(eq(playlistItems.playlistId, id))
      .orderBy(asc(playlistItems.order));

    return {
      ...playlist,
      items: items.map(({ playlistItem, contentItem }) => ({
        ...playlistItem,
        contentItem,
      })),
    };
  }

  async createPlaylist(playlist: InsertPlaylist): Promise<Playlist> {
    const [item] = await db.insert(playlists).values(playlist).returning();
    return item;
  }

  async updatePlaylist(
    id: number,
    playlist: Partial<InsertPlaylist>,
    userId: string,
  ): Promise<Playlist | undefined> {
    const [item] = await db
      .update(playlists)
      .set({ ...playlist, updatedAt: new Date() })
      .where(and(eq(playlists.id, id), eq(playlists.userId, userId)))
      .returning();
    return item;
  }

  async deletePlaylist(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(playlists)
      .where(and(eq(playlists.id, id), eq(playlists.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Playlist item operations
  async addPlaylistItem(
    playlistItem: InsertPlaylistItem,
    userId: string,
  ): Promise<PlaylistItem> {
    // Verify playlist belongs to user
    const playlist = await this.getPlaylist(playlistItem.playlistId, userId);
    if (!playlist) {
      throw new Error("Playlist not found or access denied");
    }

    const [item] = await db
      .insert(playlistItems)
      .values(playlistItem)
      .returning();
    return item;
  }

  async updatePlaylistItem(id: number, playlistItem: Partial<InsertPlaylistItem>, userId: string): Promise<PlaylistItem | undefined> {
    // First get the playlist item to verify ownership
    const [existing] = await db
      .select({ playlistItem: playlistItems, playlist: playlists })
      .from(playlistItems)
      .innerJoin(playlists, eq(playlistItems.playlistId, playlists.id))
      .where(and(eq(playlistItems.id, id), eq(playlists.userId, userId)));

    if (!existing) return undefined;

    const [item] = await db
      .update(playlistItems)
      .set(playlistItem)
      .where(eq(playlistItems.id, id))
      .returning();
    return item;
  }

  async deletePlaylistItem(id: number, userId: string): Promise<boolean> {
    // First get the playlist item to verify ownership
    const [existing] = await db
      .select({ playlistItem: playlistItems, playlist: playlists })
      .from(playlistItems)
      .innerJoin(playlists, eq(playlistItems.playlistId, playlists.id))
      .where(and(eq(playlistItems.id, id), eq(playlists.userId, userId)));

    if (!existing) return false;

    const result = await db
      .delete(playlistItems)
      .where(eq(playlistItems.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async reorderPlaylistItems(
    playlistId: number,
    itemOrders: { id: number; order: number }[],
    userId: string,
  ): Promise<void> {
    // Verify playlist belongs to user
    const playlist = await this.getPlaylist(playlistId, userId);
    if (!playlist) {
      throw new Error("Playlist not found or access denied");
    }

    // Update each item's order
    for (const { id, order } of itemOrders) {
      await db
        .update(playlistItems)
        .set({ order })
        .where(eq(playlistItems.id, id));
    }
  }

  // Screen operations
  async getScreens(userId: string): Promise<Screen[]> {
    return await db
      .select()
      .from(screens)
      .where(eq(screens.userId, userId))
      .orderBy(desc(screens.createdAt));
  }

  async getScreen(id: number, userId: string): Promise<Screen | undefined> {
    const [screen] = await db
      .select()
      .from(screens)
      .where(and(eq(screens.id, id), eq(screens.userId, userId)));
    return screen;
  }

  async createScreen(screen: InsertScreen): Promise<Screen> {
    const [item] = await db.insert(screens).values(screen).returning();
    return item;
  }

  async updateScreen(id: number, screen: Partial<InsertScreen>, userId: string): Promise<Screen | undefined> {
    const [item] = await db
      .update(screens)
      .set({ ...screen, updatedAt: new Date() })
      // ----- CORRECCIÓN CLAVE AQUÍ -----
      // La condición WHERE ahora solo busca por el ID de la pantalla.
      // Esto permite que el endpoint de emparejamiento asigne un userId a una pantalla que aún no lo tiene.
      .where(eq(screens.id, id))
      .returning();

    // Opcional: Una comprobación de seguridad extra después de actualizar
    if (item && item.userId !== userId) {
      // Esto no debería ocurrir en el flujo normal, pero es una buena salvaguarda
      throw new Error("Screen update permission denied.");
    }

    return item;
  }

  async updateScreenById(
    id: number,
    screen: Partial<InsertScreen>,
  ): Promise<Screen | undefined> {
    try {
      const [item] = await db
        .update(screens)
        .set({ ...screen, updatedAt: new Date() })
        .where(eq(screens.id, id))
        .returning();
      return item;
    } catch (error) {
      console.error('Error updating screen by ID:', error);
      throw error;
    }
  }

  async deleteScreen(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(screens)
      .where(and(eq(screens.id, id), eq(screens.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Alert operations
  async getAlerts(userId: string): Promise<Alert[]> {
    return await db
      .select()
      .from(alerts)
      .where(eq(alerts.userId, userId))
      .orderBy(desc(alerts.createdAt));
  }

  async getActiveAlerts(userId: string): Promise<Alert[]> {
    return await db
      .select()
      .from(alerts)
      .where(and(eq(alerts.userId, userId), eq(alerts.isActive, true)))
      .orderBy(desc(alerts.createdAt));
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [item] = await db.insert(alerts).values(alert).returning();
    return item;
  }

  async updateAlert(
    id: number,
    alert: Partial<InsertAlert>,
    userId: string,
  ): Promise<Alert | undefined> {
    const [item] = await db
      .update(alerts)
      .set({ ...alert, updatedAt: new Date() })
      .where(and(eq(alerts.id, id), eq(alerts.userId, userId)))
      .returning();
    return item;
  }

  async deleteAlert(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(alerts)
      .where(and(eq(alerts.id, id), eq(alerts.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Widget operations
  async getWidgets(userId: string): Promise<Widget[]> {
    return await db
      .select()
      .from(widgets)
      .where(eq(widgets.userId, userId))
      .orderBy(desc(widgets.createdAt));
  }

  async createWidget(widget: InsertWidget): Promise<Widget> {
    const [item] = await db.insert(widgets).values(widget).returning();
    return item;
  }

  async updateWidget(
    id: number,
    widget: Partial<InsertWidget>,
    userId: string,
  ): Promise<Widget | undefined> {
    const [item] = await db
      .update(widgets)
      .set({ ...widget, updatedAt: new Date() })
      .where(and(eq(widgets.id, id), eq(widgets.userId, userId)))
      .returning();
    return item;
  }

  async deleteWidget(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(widgets)
      .where(and(eq(widgets.id, id), eq(widgets.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Schedule operations
  async getSchedules(userId: string): Promise<Schedule[]> {
    return await db
      .select()
      .from(schedules)
      .where(eq(schedules.userId, userId))
      .orderBy(desc(schedules.createdAt));
  }

  async createSchedule(schedule: InsertSchedule): Promise<Schedule> {
    const [item] = await db.insert(schedules).values(schedule).returning();
    return item;
  }

  async updateSchedule(
    id: number,
    schedule: Partial<InsertSchedule>,
    userId: string,
  ): Promise<Schedule | undefined> {
    const [item] = await db
      .update(schedules)
      .set({ ...schedule, updatedAt: new Date() })
      .where(and(eq(schedules.id, id), eq(schedules.userId, userId)))
      .returning();
    return item;
  }

  async deleteSchedule(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(schedules)
      .where(and(eq(schedules.id, id), eq(schedules.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Deployment operations
  async getDeployments(userId: string): Promise<Deployment[]> {
    return await db
      .select()
      .from(deployments)
      .where(eq(deployments.userId, userId))
      .orderBy(desc(deployments.createdAt));
  }

  async createDeployment(deployment: InsertDeployment): Promise<Deployment> {
    const [item] = await db.insert(deployments).values(deployment).returning();
    return item;
  }

  async updateDeployment(
    id: number,
    deployment: Partial<InsertDeployment>,
    userId: string,
  ): Promise<Deployment | undefined> {
    const [item] = await db
      .update(deployments)
      .set({ ...deployment, updatedAt: new Date() })
      .where(and(eq(deployments.id, id), eq(deployments.userId, userId)))
      .returning();
    return item;
  }
  async createPlaylistItem(data: InsertPlaylistItem) {
    const [item] = await db
      .insert(playlistItems)
      .values(data)
      .returning();
    return item;
  }

  async updatePlaylistItem(id: number, updates: any, userId: string) {
    const [item] = await db
      .update(playlistItems)
      .set(updates)
      .where(
        and(
          eq(playlistItems.id, id),
          exists(
            db
              .select()
              .from(playlists)
              .where(
                and(
                  eq(playlists.id, playlistItems.playlistId),
                  eq(playlists.userId, userId)
                )
              )
          )
        )
      )
      .returning();

    if (item) {
      // Recalculate total duration when duration changes
      await this.updatePlaylistDuration(item.playlistId);
    }

    return item;
  }

  async updatePlaylistDuration(playlistId: number) {
    // Get all items in the playlist with their durations
    const items = await db
      .select({
        customDuration: playlistItems.customDuration,
        defaultDuration: contentItems.duration
      })
      .from(playlistItems)
      .innerJoin(contentItems, eq(playlistItems.contentItemId, contentItems.id))
      .where(eq(playlistItems.playlistId, playlistId));

    // Calculate total duration
    const totalDuration = items.reduce((total, item) => {
      return total + (item.customDuration || item.defaultDuration || 0);
    }, 0);

    // Update playlist with new total duration
    await db
      .update(playlists)
      .set({ totalDuration })
      .where(eq(playlists.id, playlistId));
  }
  async deletePlaylistItem(id: number, userId: string): Promise<boolean> {
    // First get the playlist ID before deleting
    const [itemToDelete] = await db
      .select({ playlistId: playlistItems.playlistId })
      .from(playlistItems)
      .where(
        and(
          eq(playlistItems.id, id),
          exists(
            db
              .select()
              .from(playlists)
              .where(
                and(
                  eq(playlists.id, playlistItems.playlistId),
                  eq(playlists.userId, userId)
                )
              )
          )
        )
      )
      .limit(1);

    if (!itemToDelete) {
      return false;
    }

    const result = await db
      .delete(playlistItems)
      .where(eq(playlistItems.id, id))
      .returning();

    if (result.length > 0) {
      // Recalculate total duration
      await this.updatePlaylistDuration(itemToDelete.playlistId);
      return true;
    }

    return false;
  }
  async reorderPlaylistItems(playlistId: number, itemOrders: { id: number; order: number }[], userId: string) {
    // Verify playlist ownership
    const playlist = await db
      .select()
      .from(playlists)
      .where(and(eq(playlists.id, playlistId), eq(playlists.userId, userId)))
      .limit(1);

    if (playlist.length === 0) {
      throw new Error("Playlist not found or access denied");
    }

    // Update each item's order
    for (const { id, order } of itemOrders) {
      await db
        .update(playlistItems)
        .set({ order })
        .where(eq(playlistItems.id, id));
    }

    // Recalculate total duration
    await this.updatePlaylistDuration(playlistId);
  }

  async getScreenByAuthToken(authToken: string) {
    const [screen] = await db
      .select()
      .from(screens)
      .where(eq(screens.authToken, authToken));
    return screen;
  }

  async removeContentFromAllPlaylists(contentItemId: number, userId: string): Promise<void> {
    // Get all playlists for this user
    const userPlaylists = await db
      .select({ id: playlists.id })
      .from(playlists)
      .where(eq(playlists.userId, userId));

    const playlistIds = userPlaylists.map(p => p.id);

    // Remove the content item from all playlist items where it appears
    if (playlistIds.length > 0) {
      await db
        .delete(playlistItems)
        .where(
          and(
            eq(playlistItems.contentItemId, contentItemId),
            inArray(playlistItems.playlistId, playlistIds)
          )
        );
    }
  }
}

export const storage = new DatabaseStorage();
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
  screenGroups,
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
  type ScreenGroup,
  type InsertScreenGroup,
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
  getDeployment(id: number, userId: string): Promise<Deployment | undefined>;
  createDeployment(deployment: InsertDeployment): Promise<Deployment>;
  updateDeployment(
    id: number,
    deployment: Partial<InsertDeployment>,
    userId: string,
  ): Promise<Deployment | undefined>;

    // Screen Group operations
    getScreenGroups(userId: string): Promise<ScreenGroup[]>;
    createScreenGroup(data: InsertScreenGroup): Promise<ScreenGroup>;
    updateScreenGroup(id: number, updates: Partial<InsertScreenGroup>, userId: string): Promise<ScreenGroup | undefined>;
    deleteScreenGroup(id: number, userId: string): Promise<boolean>;

    getPlaylistItem(id: number): Promise<PlaylistItem | undefined>
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
    let playlistsData;

    try {
      playlistsData = await db
        .select()
        .from(playlists)
        .where(eq(playlists.userId, userId))
        .orderBy(desc(playlists.createdAt));
    } catch (error) {
      console.error("Error fetching playlists with all columns:", error);
      // If there's a column error, try with basic fields only
      playlistsData = await db
        .select({
          id: playlists.id,
          userId: playlists.userId,
          name: playlists.name,
          description: playlists.description,
          layout: playlists.layout,
          isActive: playlists.isActive,
          totalDuration: playlists.totalDuration,
          createdAt: playlists.createdAt,
          updatedAt: playlists.updatedAt,
          // Set default values for missing columns
          carouselDuration: 5,
          scrollSpeed: 50
        })
        .from(playlists)
        .where(eq(playlists.userId, userId))
        .orderBy(desc(playlists.createdAt));
    }

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
          // Ensure these fields exist with defaults
          carouselDuration: playlist.carouselDuration || 5,
          scrollSpeed: playlist.scrollSpeed || 50
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

  async updatePlaylist(id: number, updates: any, userId: string): Promise<Playlist | undefined> {
    try {
      // Remove any existing updatedAt and add a proper one
      const { updatedAt, ...cleanUpdates } = updates;
      const updateData = { ...cleanUpdates, updatedAt: new Date() };

      const [item] = await db
        .update(playlists)
        .set(updateData)
        .where(and(eq(playlists.id, id), eq(playlists.userId, userId)))
        .returning();
      return item;
    } catch (error) {
      console.error("Error updating playlist:", error);
      throw error;
    }
  }

  async deletePlaylist(id: number, userId: string): Promise<boolean> {
    // First delete all playlist items associated with this playlist
    await db
      .delete(playlistItems)
      .where(eq(playlistItems.playlistId, id));

    // Then delete the playlist itself
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

  async updatePlaylistItem(
    id: number,
    playlistItem: Partial<InsertPlaylistItem>,
    userId: string,
  ): Promise<PlaylistItem | undefined> {
    // First verify the item belongs to a playlist owned by the user
    const itemCheck = await db
      .select({ playlistId: playlistItems.playlistId })
      .from(playlistItems)
      .innerJoin(playlists, eq(playlistItems.playlistId, playlists.id))
      .where(and(eq(playlistItems.id, id), eq(playlists.userId, userId)))
      .limit(1);

    if (!itemCheck.length) {
      return undefined;
    }

    const [item] = await db
      .update(playlistItems)
      .set(playlistItem)
      .where(eq(playlistItems.id, id))
      .returning();

    // Update playlist total duration after item update
    if (item && itemCheck[0].playlistId) {
      await this.updatePlaylistDuration(itemCheck[0].playlistId);
    }

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

    const playlistId = existing.playlistItem.playlistId;

    const result = await db
      .delete(playlistItems)
      .where(eq(playlistItems.id, id));

    const success = (result.rowCount ?? 0) > 0;

    if (success) {
      // Recalculate total duration
      await this.updatePlaylistDuration(playlistId);
    }

    return success;
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

    // Recalculate total duration
    await this.updatePlaylistDuration(playlistId);
  }

  // Screen operations
  async getScreens(userId: string): Promise<Screen[]> {
    console.log(`Fetching screens for user: ${userId}`);
    const result = await db
      .select()
      .from(screens)
      .where(eq(screens.userId, userId));
    console.log(`Found ${result.length} screens for user ${userId}:`, result.map(s => ({ id: s.id, name: s.name, userId: s.userId })));
    return result;
  }

  async getScreenById(screenId: number, userId: string): Promise<Screen | null> {
    const result = await db.select().from(screens)
      .where(and(eq(screens.id, screenId), eq(screens.userId, userId)))
      .limit(1);
    return result[0] || null;
  }

  async getScreen(id: number, userId: string): Promise<Screen | undefined> {
    const [screen] = await db
      .select()
      .from(screens)
      .where(and(eq(screens.id, id), eq(screens.userId, userId)));
    return screen;
  }

  async getScreenById(id: number): Promise<Screen | undefined> {
    const [screen] = await db
      .select()
      .from(screens)
      .where(eq(screens.id, id));
    return screen;
  }

  async createScreen(screen: InsertScreen): Promise<Screen> {
    const [item] = await db.insert(screens).values(screen).returning();
    return item;
  }

  async updateScreen(id: number, screen: Partial<InsertScreen>, userId: string): Promise<Screen | undefined> {
    // First check if screen belongs to user
    const existingScreen = await this.getScreenById(id);
    if (!existingScreen) {
      return undefined;
    }

    // Allow update if screen belongs to user or if it's being assigned to a user (pairing)
    if (existingScreen.userId && existingScreen.userId !== userId) {
      throw new Error("Screen update permission denied.");
    }

    const [item] = await db
      .update(screens)
      .set({ ...screen, updatedAt: new Date() })
      .where(eq(screens.id, id))
      .returning();

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

  async getDeployment(id: number, userId: string): Promise<Deployment | undefined> {
    const [deployment] = await db
      .select()
      .from(deployments)
      .where(and(eq(deployments.id, id), eq(deployments.userId, userId)));
    return deployment;
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
  async getPlaylistItemById(id: number, userId: string): Promise<any | undefined> {
    const [item] = await db
      .select()
      .from(playlistItems)
      .innerJoin(playlists, eq(playlistItems.playlistId, playlists.id))
      .where(and(eq(playlistItems.id, id), eq(playlists.userId, userId)));
    return item?.playlist_items;
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
  async getScreenByPairingCode(code: string): Promise<Screen | undefined> {
    const [screen] = await db
      .select()
      .from(screens)
      .where(eq(screens.pairingCode, code));
    return screen;
  }

  async createScreenForPairing(data: any): Promise<Screen> {
    const [screen] = await db
      .insert(screens)
      .values(data)
      .returning();
    return screen;
  }

  async getScreenByAuthToken(token: string): Promise<Screen | undefined> {
    const [screen] = await db
      .select()
      .from(screens)
      .where(eq(screens.authToken, token));
    return screen;
  }

    // Screen Group methods
    async getScreenGroups(userId: string): Promise<ScreenGroup[]> {
      return await db.select().from(screenGroups).where(eq(screenGroups.userId, userId));
    }

    async createScreenGroup(data: InsertScreenGroup): Promise<ScreenGroup> {
      const [group] = await db.insert(screenGroups).values(data).returning();
      return group;
    }

    async updateScreenGroup(id: number, updates: Partial<InsertScreenGroup>, userId: string): Promise<ScreenGroup | undefined> {
      const [group] = await db
        .update(screenGroups)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(eq(screenGroups.id, id), eq(screenGroups.userId, userId)))
        .returning();
      return group;
    }

    async deleteScreenGroup(id: number, userId: string): Promise<boolean> {
      const result = await db
        .delete(screenGroups)
        .where(and(eq(screenGroups.id, id), eq(screenGroups.userId, userId)));
      return (result.rowCount ?? 0) > 0;
    }

  async getPlaylistItem(id: number): Promise<PlaylistItem | undefined> {
    const [item] = await db
      .select()
      .from(playlistItems)
      .where(eq(playlistItems.id, id));
    return item;
  }

  async getPlaylistItemWithUser(id: number, userId: string): Promise<PlaylistItem | undefined> {
    const [item] = await db
      .select()
      .from(playlistItems)
      .innerJoin(playlists, eq(playlistItems.playlistId, playlists.id))
      .where(and(eq(playlistItems.id, id), eq(playlists.userId, userId)));
    return item?.playlist_items;
  }
}

export const storage = new DatabaseStorage();
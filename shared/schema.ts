import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { integer, pgTable, serial, text, varchar, boolean, pgEnum } from "drizzle-orm/pg-core";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);
export const layoutTypeEnum = pgEnum('layout_type', ['single_zone', 'split_vertical', 'split_horizontal', 'pip_bottom_right']);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Content items (images, videos, PDFs, web pages)
export const contentItems = pgTable("content_items", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  description: text("description"),
  type: varchar("type").notNull(), // 'image', 'video', 'pdf', 'webpage', 'text'
  url: text("url"), // File URL or web page URL
  fileSize: integer("file_size"), // In bytes
  duration: integer("duration"), // Default duration in seconds
  category: varchar("category"),
  tags: text("tags").array(), // Array of tags
  metadata: jsonb("metadata"), // Additional metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Playlists
export const playlists = pgTable("playlists", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  description: text("description"),
  layout: layoutTypeEnum('layout').default('single_zone').notNull(),

  isActive: boolean("is_active").default(false),
  totalDuration: integer("total_duration").default(0), // Calculated total duration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Playlist items (junction table with ordering and custom duration)
export const playlistItems = pgTable("playlist_items", {
  id: serial("id").primaryKey(),
  playlistId: integer("playlist_id").notNull().references(() => playlists.id),
  contentItemId: integer("content_item_id").notNull().references(() => contentItems.id),
  order: integer("order").notNull(),
  customDuration: integer("custom_duration"), // Override default duration
  zone: varchar('zone', { length: 50 }).default('main').notNull(),

  createdAt: timestamp("created_at").defaultNow(),
});

// Screens/displays
export const screens = pgTable("screens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  name: varchar("name").notNull(),
  description: text("description"),
  location: varchar("location"),
  playlistId: integer("playlist_id").references(() => playlists.id),
  isOnline: boolean("is_online").default(false),
  lastSeen: timestamp("last_seen"),
  settings: jsonb("settings"), // Screen-specific settings
  deviceHardwareId: varchar("device_hardware_id").unique(),
  pairingCode: varchar("pairing_code"),
  pairingCodeExpiresAt: timestamp("pairing_code_expires_at"),
  authToken: varchar("auth_token").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Alerts
export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  backgroundColor: varchar("background_color").default("#ef4444"),
  textColor: varchar("text_color").default("#ffffff"),
  duration: integer("duration").default(30), // Duration in seconds
  isActive: boolean("is_active").default(false),
  targetScreens: text("target_screens").array(), // Array of screen IDs
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Widgets
export const widgets = pgTable("widgets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type").notNull(), // 'clock', 'weather', 'rss', 'social', 'news'
  name: varchar("name").notNull(),
  isEnabled: boolean("is_enabled").default(true),
  position: varchar("position").default("top-right"), // Widget position on screen
  settings: jsonb("settings"), // Widget-specific settings
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Advanced scheduling system
export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  playlistId: integer("playlist_id").references(() => playlists.id, { onDelete: "cascade" }),
  screenIds: integer("screen_ids").array(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  startTime: varchar("start_time").notNull(), // HH:MM format
  endTime: varchar("end_time").notNull(),
  daysOfWeek: integer("days_of_week").array(), // 0=Sunday, 1=Monday, etc.
  priority: integer("priority").default(1),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Multi-screen groups for synchronized playback
export const screenGroups = pgTable("screen_groups", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  description: text("description"),
  screenIds: integer("screen_ids").array(),
  syncEnabled: boolean("sync_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Offline sync tracking
export const syncStatus = pgTable("sync_status", {
  id: serial("id").primaryKey(),
  screenId: integer("screen_id").references(() => screens.id, { onDelete: "cascade" }),
  lastSyncAt: timestamp("last_sync_at"),
  contentVersion: integer("content_version").default(1),
  isOnline: boolean("is_online").default(false),
  pendingUpdates: jsonb("pending_updates").default({}),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// APK deployment tracking
export const deployments = pgTable("deployments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  version: varchar("version").notNull(),
  buildUrl: varchar("build_url"),
  status: varchar("status").notNull(), // pending, building, ready, deployed, failed
  targetDevices: varchar("target_devices").array(), // screen IDs or device identifiers
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  contentItems: many(contentItems),
  playlists: many(playlists),
  screens: many(screens),
  alerts: many(alerts),
  widgets: many(widgets),
  schedules: many(schedules),
  screenGroups: many(screenGroups),
  deployments: many(deployments),
}));

export const contentItemsRelations = relations(contentItems, ({ one, many }) => ({
  user: one(users, {
    fields: [contentItems.userId],
    references: [users.id],
  }),
  playlistItems: many(playlistItems),
}));

export const playlistsRelations = relations(playlists, ({ one, many }) => ({
  user: one(users, {
    fields: [playlists.userId],
    references: [users.id],
  }),
  playlistItems: many(playlistItems),
  screens: many(screens),
}));

export const playlistItemsRelations = relations(playlistItems, ({ one }) => ({
  playlist: one(playlists, {
    fields: [playlistItems.playlistId],
    references: [playlists.id],
  }),
  contentItem: one(contentItems, {
    fields: [playlistItems.contentItemId],
    references: [contentItems.id],
  }),
}));

export const screensRelations = relations(screens, ({ one }) => ({
  user: one(users, {
    fields: [screens.userId],
    references: [users.id],
  }),
  playlist: one(playlists, {
    fields: [screens.playlistId],
    references: [playlists.id],
  }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  user: one(users, {
    fields: [alerts.userId],
    references: [users.id],
  }),
}));

export const widgetsRelations = relations(widgets, ({ one }) => ({
  user: one(users, {
    fields: [widgets.userId],
    references: [users.id],
  }),
}));

export const schedulesRelations = relations(schedules, ({ one }) => ({
  user: one(users, {
    fields: [schedules.userId],
    references: [users.id],
  }),
  playlist: one(playlists, {
    fields: [schedules.playlistId],
    references: [playlists.id],
  }),
}));

export const screenGroupsRelations = relations(screenGroups, ({ one }) => ({
  user: one(users, {
    fields: [screenGroups.userId],
    references: [users.id],
  }),
}));

export const syncStatusRelations = relations(syncStatus, ({ one }) => ({
  screen: one(screens, {
    fields: [syncStatus.screenId],
    references: [screens.id],
  }),
}));

export const deploymentsRelations = relations(deployments, ({ one }) => ({
  user: one(users, {
    fields: [deployments.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertContentItemSchema = createInsertSchema(contentItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlaylistSchema = createInsertSchema(playlists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlaylistItemSchema = createInsertSchema(playlistItems).omit({
  id: true,
  createdAt: true,
});

export const insertScreenSchema = createInsertSchema(screens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWidgetSchema = createInsertSchema(widgets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScheduleSchema = createInsertSchema(schedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScreenGroupSchema = createInsertSchema(screenGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDeploymentSchema = createInsertSchema(deployments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type ContentItem = typeof contentItems.$inferSelect;
export type InsertContentItem = z.infer<typeof insertContentItemSchema>;
export type Playlist = typeof playlists.$inferSelect;
export type InsertPlaylist = z.infer<typeof insertPlaylistSchema>;
export type PlaylistItem = typeof playlistItems.$inferSelect;
export type InsertPlaylistItem = z.infer<typeof insertPlaylistItemSchema>;
export type Screen = typeof screens.$inferSelect;
export type InsertScreen = z.infer<typeof insertScreenSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Widget = typeof widgets.$inferSelect;
export type InsertWidget = z.infer<typeof insertWidgetSchema>;
export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type ScreenGroup = typeof screenGroups.$inferSelect;
export type InsertScreenGroup = z.infer<typeof insertScreenGroupSchema>;
export type SyncStatus = typeof syncStatus.$inferSelect;
export type Deployment = typeof deployments.$inferSelect;
export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;

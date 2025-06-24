
-- Rename settings to config in widgets table
ALTER TABLE "widgets" RENAME COLUMN "settings" TO "config";
ALTER TABLE "widgets" ALTER COLUMN "config" TYPE text;

-- Create playlist_widgets table
CREATE TABLE "playlist_widgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"playlist_id" integer NOT NULL,
	"widget_id" integer NOT NULL,
	"position" varchar DEFAULT 'top-right',
	"is_enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE "playlist_widgets" ADD CONSTRAINT "playlist_widgets_playlist_id_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "playlists"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "playlist_widgets" ADD CONSTRAINT "playlist_widgets_widget_id_widgets_id_fk" FOREIGN KEY ("widget_id") REFERENCES "widgets"("id") ON DELETE cascade ON UPDATE no action;

CREATE TABLE `songs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`day` text DEFAULT 'N/A' NOT NULL,
	`link` text NOT NULL,
	`video_id` text DEFAULT '' NOT NULL,
	`raw_title` text DEFAULT '' NOT NULL,
	`cleaned_song` text DEFAULT '' NOT NULL,
	`cleaned_artist` text DEFAULT '' NOT NULL,
	`original_message` text DEFAULT '' NOT NULL,
	`author_name` text DEFAULT '' NOT NULL,
	`timestamp` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_songs_owner` ON `songs` (`owner`);
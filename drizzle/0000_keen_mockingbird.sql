CREATE TABLE `journal_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL,
	`user_name` text,
	`day` integer NOT NULL,
	`prompt` text NOT NULL,
	`card_id` text NOT NULL,
	`card_name` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `journal_user_day_idx` ON `journal_entries` (`user_email`,`day`);
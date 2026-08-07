CREATE TABLE IF NOT EXISTS `pendulum_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL,
	`user_name` text,
	`question` text NOT NULL,
	`result` text NOT NULL,
	`result_label` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `pendulum_entries` ADD `category` text DEFAULT '內在指引' NOT NULL;
--> statement-breakpoint
ALTER TABLE `pendulum_entries` ADD `note` text DEFAULT '' NOT NULL;

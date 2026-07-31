PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_workspace_snapshots` (
	`workspace_id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_workspace_snapshots`("workspace_id", "payload", "version", "updated_at") SELECT "workspace_id", "payload", "version", "updated_at" FROM `workspace_snapshots`;--> statement-breakpoint
DROP TABLE `workspace_snapshots`;--> statement-breakpoint
ALTER TABLE `__new_workspace_snapshots` RENAME TO `workspace_snapshots`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
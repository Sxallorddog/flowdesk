CREATE INDEX `idx_activities_workspace_entity` ON `activities` (`workspace_id`,`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_clients_workspace_name` ON `clients` (`workspace_id`,`name`);--> statement-breakpoint
CREATE INDEX `idx_deals_workspace_stage` ON `deals` (`workspace_id`,`stage`);--> statement-breakpoint
CREATE INDEX `idx_tasks_workspace_status_due` ON `tasks` (`workspace_id`,`status`,`due_date`);
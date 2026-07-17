CREATE TABLE IF NOT EXISTS `lab_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`lab_id` text NOT NULL,
	`lab_version` text NOT NULL,
	`response_json` text NOT NULL,
	`criteria_json` text NOT NULL,
	`score` integer NOT NULL,
	`passed` integer NOT NULL,
	`evidence_hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `lab_attempts_workspace_agent_idx` ON `lab_attempts` (`workspace_id`,`agent_id`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `lab_attempts_lab_idx` ON `lab_attempts` (`lab_id`,`lab_version`);

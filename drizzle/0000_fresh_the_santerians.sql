CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`adapter_type` text NOT NULL,
	`adapter_label` text NOT NULL,
	`tool_target` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`exercise_version` text NOT NULL,
	`response_json` text NOT NULL,
	`criteria_json` text NOT NULL,
	`score` integer NOT NULL,
	`passed` integer NOT NULL,
	`evidence_hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`field_exam_id` text NOT NULL,
	`level` text NOT NULL,
	`status` text NOT NULL,
	`payload_json` text NOT NULL,
	`payload_hash` text NOT NULL,
	`signature` text,
	`issued_at` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `credentials_field_exam_id_unique` ON `credentials` (`field_exam_id`);--> statement-breakpoint
CREATE TABLE `field_exams` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`task_summary` text NOT NULL,
	`evidence_url` text NOT NULL,
	`environment_label` text NOT NULL,
	`review_token_hash` text NOT NULL,
	`reviewer_name` text,
	`reviewer_notes` text,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`reviewed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `field_exams_review_token_hash_unique` ON `field_exams` (`review_token_hash`);--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`api_key_hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspaces_api_key_hash_unique` ON `workspaces` (`api_key_hash`);
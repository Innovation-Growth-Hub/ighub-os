CREATE TABLE `activities` (
	`id` varchar(36) NOT NULL,
	`actor_id` varchar(36) NOT NULL,
	`message` varchar(255) NOT NULL,
	`at` datetime(3) NOT NULL,
	CONSTRAINT `activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `communications` (
	`id` varchar(36) NOT NULL,
	`contact_id` varchar(36) NOT NULL,
	`type` enum('call','email','meeting') NOT NULL,
	`summary` text NOT NULL,
	`logged_by` varchar(36) NOT NULL,
	`at` datetime(3) NOT NULL,
	CONSTRAINT `communications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` varchar(36) NOT NULL,
	`name` varchar(160) NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone` varchar(32) NOT NULL DEFAULT '',
	`company` varchar(160) NOT NULL,
	`position` varchar(120) NOT NULL DEFAULT '',
	`segment` enum('corporate','government','startup','ngo') NOT NULL,
	`last_contacted_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_logs` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`date` date NOT NULL,
	`entries` json NOT NULL,
	`blockers` text,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `daily_logs_id` PRIMARY KEY(`id`),
	CONSTRAINT `daily_logs_user_date_uq` UNIQUE(`user_id`,`date`)
);
--> statement-breakpoint
CREATE TABLE `deals` (
	`id` varchar(36) NOT NULL,
	`name` varchar(200) NOT NULL,
	`contact_id` varchar(36) NOT NULL,
	`stage` enum('lead','qualified','proposal','negotiation','won','lost') NOT NULL DEFAULT 'lead',
	`value` decimal(14,2) NOT NULL,
	`probability` int NOT NULL DEFAULT 10,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `deals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `document_shares` (
	`document_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	CONSTRAINT `document_shares_document_id_user_id_pk` PRIMARY KEY(`document_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` enum('contracts','proposals','reports','training') NOT NULL,
	`file_id` varchar(36) NOT NULL,
	`owner_id` varchar(36) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `files` (
	`id` varchar(36) NOT NULL,
	`storage_key` varchar(255) NOT NULL,
	`original_name` varchar(255) NOT NULL,
	`mime_type` varchar(127) NOT NULL,
	`size_bytes` int NOT NULL,
	`uploaded_by` varchar(36) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fund_request_attachments` (
	`id` varchar(36) NOT NULL,
	`request_id` varchar(36) NOT NULL,
	`file_id` varchar(36) NOT NULL,
	`kind` enum('quote','receipt') NOT NULL,
	CONSTRAINT `fund_request_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fund_request_events` (
	`id` varchar(36) NOT NULL,
	`request_id` varchar(36) NOT NULL,
	`actor_id` varchar(36) NOT NULL,
	`action` enum('submitted','forwarded','approved','rejected','disbursed') NOT NULL,
	`note` text,
	`at` datetime(3) NOT NULL,
	CONSTRAINT `fund_request_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fund_requests` (
	`id` varchar(36) NOT NULL,
	`requester_id` varchar(36) NOT NULL,
	`title` varchar(200) NOT NULL,
	`purpose` text NOT NULL,
	`amount` decimal(14,2) NOT NULL,
	`category` varchar(64) NOT NULL,
	`needed_by` date NOT NULL,
	`project_id` varchar(36),
	`status` enum('pending_review','forwarded','approved','rejected','disbursed') NOT NULL DEFAULT 'pending_review',
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `fund_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` varchar(36) NOT NULL,
	`number` varchar(32) NOT NULL,
	`contact_id` varchar(36),
	`client_name` varchar(160) NOT NULL,
	`amount` decimal(14,2) NOT NULL,
	`issued_at` date NOT NULL,
	`due_at` date NOT NULL,
	`status` enum('draft','sent','paid','overdue') NOT NULL DEFAULT 'draft',
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_number_unique` UNIQUE(`number`)
);
--> statement-breakpoint
CREATE TABLE `meeting_participants` (
	`meeting_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	CONSTRAINT `meeting_participants_meeting_id_user_id_pk` PRIMARY KEY(`meeting_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `meetings` (
	`id` varchar(36) NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text NOT NULL,
	`start` datetime(3) NOT NULL,
	`end` datetime(3) NOT NULL,
	`location` varchar(200) NOT NULL,
	`agenda` json NOT NULL,
	`status` enum('scheduled','completed','cancelled') NOT NULL DEFAULT 'scheduled',
	`organizer_id` varchar(36) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `meetings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` varchar(36) NOT NULL,
	`project_id` varchar(36) NOT NULL,
	`title` varchar(200) NOT NULL,
	`due_date` date NOT NULL,
	`done` boolean NOT NULL DEFAULT false,
	CONSTRAINT `milestones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_members` (
	`project_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	CONSTRAINT `project_members_project_id_user_id_pk` PRIMARY KEY(`project_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` varchar(36) NOT NULL,
	`name` varchar(160) NOT NULL,
	`description` text NOT NULL,
	`client_name` varchar(160),
	`manager_id` varchar(36) NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`budget` decimal(14,2) NOT NULL DEFAULT 0,
	`spent` decimal(14,2) NOT NULL DEFAULT 0,
	`status` enum('planning','active','on_hold','completed') NOT NULL DEFAULT 'planning',
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` varchar(36) NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`assigned_to` varchar(36) NOT NULL,
	`created_by` varchar(36) NOT NULL,
	`due_date` date NOT NULL,
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`status` enum('pending','in_progress','complete') NOT NULL DEFAULT 'pending',
	`project_id` varchar(36),
	`tags` json NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` varchar(36) NOT NULL,
	`kind` enum('income','expense') NOT NULL,
	`amount` decimal(14,2) NOT NULL,
	`category` varchar(64) NOT NULL,
	`date` date NOT NULL,
	`description` varchar(255) NOT NULL,
	`fund_request_id` varchar(36),
	`recorded_by` varchar(36) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_actor_id_user_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `communications` ADD CONSTRAINT `communications_contact_id_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `communications` ADD CONSTRAINT `communications_logged_by_user_id_fk` FOREIGN KEY (`logged_by`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `daily_logs` ADD CONSTRAINT `daily_logs_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deals` ADD CONSTRAINT `deals_contact_id_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_shares` ADD CONSTRAINT `document_shares_document_id_documents_id_fk` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `document_shares` ADD CONSTRAINT `document_shares_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_file_id_files_id_fk` FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_owner_id_user_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `files` ADD CONSTRAINT `files_uploaded_by_user_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fund_request_attachments` ADD CONSTRAINT `fund_request_attachments_request_id_fund_requests_id_fk` FOREIGN KEY (`request_id`) REFERENCES `fund_requests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fund_request_attachments` ADD CONSTRAINT `fund_request_attachments_file_id_files_id_fk` FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fund_request_events` ADD CONSTRAINT `fund_request_events_request_id_fund_requests_id_fk` FOREIGN KEY (`request_id`) REFERENCES `fund_requests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fund_request_events` ADD CONSTRAINT `fund_request_events_actor_id_user_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fund_requests` ADD CONSTRAINT `fund_requests_requester_id_user_id_fk` FOREIGN KEY (`requester_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fund_requests` ADD CONSTRAINT `fund_requests_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_contact_id_contacts_id_fk` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meeting_participants` ADD CONSTRAINT `meeting_participants_meeting_id_meetings_id_fk` FOREIGN KEY (`meeting_id`) REFERENCES `meetings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meeting_participants` ADD CONSTRAINT `meeting_participants_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meetings` ADD CONSTRAINT `meetings_organizer_id_user_id_fk` FOREIGN KEY (`organizer_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `milestones` ADD CONSTRAINT `milestones_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_members` ADD CONSTRAINT `project_members_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_members` ADD CONSTRAINT `project_members_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_manager_id_user_id_fk` FOREIGN KEY (`manager_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assigned_to_user_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_fund_request_id_fund_requests_id_fk` FOREIGN KEY (`fund_request_id`) REFERENCES `fund_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_recorded_by_user_id_fk` FOREIGN KEY (`recorded_by`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `activities_at_idx` ON `activities` (`at`);--> statement-breakpoint
CREATE INDEX `communications_contact_idx` ON `communications` (`contact_id`);--> statement-breakpoint
CREATE INDEX `daily_logs_date_idx` ON `daily_logs` (`date`);--> statement-breakpoint
CREATE INDEX `fund_request_attachments_request_idx` ON `fund_request_attachments` (`request_id`);--> statement-breakpoint
CREATE INDEX `fund_request_events_request_idx` ON `fund_request_events` (`request_id`);--> statement-breakpoint
CREATE INDEX `fund_requests_requester_idx` ON `fund_requests` (`requester_id`);--> statement-breakpoint
CREATE INDEX `fund_requests_status_idx` ON `fund_requests` (`status`);--> statement-breakpoint
CREATE INDEX `meeting_participants_user_idx` ON `meeting_participants` (`user_id`);--> statement-breakpoint
CREATE INDEX `project_members_user_idx` ON `project_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `tasks_assignee_idx` ON `tasks` (`assigned_to`);--> statement-breakpoint
CREATE INDEX `tasks_project_idx` ON `tasks` (`project_id`);--> statement-breakpoint
CREATE INDEX `transactions_date_idx` ON `transactions` (`date`);
CREATE TABLE `ip_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`timestamp` text DEFAULT CURRENT_TIMESTAMP,
	`timestamp_untrusted` text,
	`ipv4` text NOT NULL,
	`note` text,
	`discord_userid` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ip4v_idx` ON `ip_logs` (`ipv4`);
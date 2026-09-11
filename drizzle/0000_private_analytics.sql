CREATE TABLE `visit_events` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `visited_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `day` text NOT NULL,
  `country_code` text NOT NULL,
  `region_code` text NOT NULL,
  `latitude_bucket` integer,
  `longitude_bucket` integer,
  `page` text NOT NULL,
  `visitor_hash` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_visit_events_day` ON `visit_events` (`day`);
--> statement-breakpoint
CREATE INDEX `idx_visit_events_country_day` ON `visit_events` (`country_code`, `day`);
--> statement-breakpoint
CREATE INDEX `idx_visit_events_location` ON `visit_events` (`latitude_bucket`, `longitude_bucket`);
--> statement-breakpoint
CREATE TABLE `analytics_owner` (
  `id` integer PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_analytics_owner_user_id` ON `analytics_owner` (`user_id`);
--> statement-breakpoint
PRAGMA optimize;

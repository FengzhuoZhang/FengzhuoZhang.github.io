CREATE TABLE IF NOT EXISTS visit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  visited_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  day TEXT NOT NULL,
  country_code TEXT NOT NULL,
  region_code TEXT NOT NULL,
  latitude_bucket INTEGER,
  longitude_bucket INTEGER,
  page TEXT NOT NULL,
  visitor_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_visit_events_day
  ON visit_events(day);

CREATE INDEX IF NOT EXISTS idx_visit_events_country_day
  ON visit_events(country_code, day);

CREATE INDEX IF NOT EXISTS idx_visit_events_location
  ON visit_events(latitude_bucket, longitude_bucket);

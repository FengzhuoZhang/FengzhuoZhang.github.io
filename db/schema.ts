export const analyticsSchema = {
  visitEvents: {
    table: "visit_events",
    retentionDays: 180,
    columns: [
      "id",
      "visited_at",
      "day",
      "country_code",
      "region_code",
      "latitude_bucket",
      "longitude_bucket",
      "page",
      "visitor_hash"
    ]
  },
  analyticsOwner: {
    table: "analytics_owner",
    columns: ["id", "user_id", "created_at"]
  }
} as const;

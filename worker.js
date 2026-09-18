const HTML_HEADERS = {
  "Cache-Control": "no-cache",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
};

const PRIVATE_HEADERS = {
  ...HTML_HEADERS,
  "Cache-Control": "private, no-store",
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  "X-Robots-Tag": "noindex, nofollow, noarchive"
};

const ASSET_HEADERS = {
  "Cache-Control": "public, max-age=3600, must-revalidate",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff"
};

const BOT_PATTERN = /bot|crawler|spider|preview|slurp|facebookexternalhit|whatsapp|telegram|discord|linkedinbot|twitterbot/i;
const VALID_PERIODS = new Set([7, 30, 90, 180]);
let schemaPromise;

function withHeaders(response, extraHeaders) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(extraHeaders)) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function fetchAsset(request, env, pathname) {
  const assetUrl = new URL(request.url);
  assetUrl.pathname = pathname;
  return env.ASSETS.fetch(new Request(assetUrl, request));
}

function ensureAnalyticsSchema(db) {
  if (!schemaPromise) {
    schemaPromise = db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS visit_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        visited_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
        day TEXT NOT NULL,
        country_code TEXT NOT NULL,
        region_code TEXT NOT NULL,
        latitude_bucket INTEGER,
        longitude_bucket INTEGER,
        page TEXT NOT NULL,
        visitor_hash TEXT NOT NULL
      )`),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_visit_events_day ON visit_events(day)"),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_visit_events_country_day ON visit_events(country_code, day)"),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_visit_events_location ON visit_events(latitude_bucket, longitude_bucket)"),
      db.prepare(`CREATE TABLE IF NOT EXISTS analytics_owner (
        id INTEGER PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL UNIQUE,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
      )`)
    ]).catch((error) => {
      schemaPromise = undefined;
      throw error;
    });
  }
  return schemaPromise;
}

async function digestVisitor(ipAddress, day, secret) {
  const source = new TextEncoder().encode(`${secret}:${day}:${ipAddress}`);
  const digest = await crypto.subtle.digest("SHA-256", source);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function shouldTrack(request) {
  if (request.headers.get("Sec-GPC") === "1" || request.headers.get("DNT") === "1") return false;
  return !BOT_PATTERN.test(request.headers.get("User-Agent") || "");
}

function normalizePage(value) {
  if (typeof value !== "string" || value.length > 120) return null;
  if (!/^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*$/.test(value) || value.startsWith("//")) return null;
  if (value === "/analytics" || value === "/analytics.html") return null;
  return value === "/index.html" ? "/" : value || "/";
}

async function recordVisit(request, env, pathname) {
  if (!env.DB || !env.ANALYTICS_HASH_SECRET) return;
  await ensureAnalyticsSchema(env.DB);

  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const ipAddress = request.headers.get("CF-Connecting-IP") || "unknown";
  const visitorHash = await digestVisitor(ipAddress, day, env.ANALYTICS_HASH_SECRET);
  const cf = request.cf || {};
  const countryCode = String(cf.country || "XX").slice(0, 2).toUpperCase();
  const regionCode = String(cf.regionCode || cf.region || "Unknown").slice(0, 80);
  const latitude = Number(cf.latitude);
  const longitude = Number(cf.longitude);
  const latitudeBucket = Number.isFinite(latitude) ? Math.round(latitude) : null;
  const longitudeBucket = Number.isFinite(longitude) ? Math.round(longitude) : null;
  const page = pathname === "/index.html" ? "/" : pathname.slice(0, 120);

  await env.DB.batch([
    env.DB.prepare("DELETE FROM visit_events WHERE visited_at < datetime('now', '-180 days')"),
    env.DB.prepare(`INSERT INTO visit_events
      (day, country_code, region_code, latitude_bucket, longitude_bucket, page, visitor_hash)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`)
      .bind(day, countryCode, regionCode, latitudeBucket, longitudeBucket, page, visitorHash)
  ]);
}

async function collectVisit(request, env, context) {
  const headers = {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff"
  };
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("Origin");
  const fetchSite = request.headers.get("Sec-Fetch-Site");

  if (origin !== requestUrl.origin || (fetchSite && fetchSite !== "same-origin")) {
    return new Response(null, { status: 403, headers });
  }
  if (!shouldTrack(request)) return new Response(null, { status: 204, headers });
  if (!env.DB || !env.ANALYTICS_HASH_SECRET) {
    return new Response(null, { status: 503, headers });
  }

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 1024) return new Response(null, { status: 413, headers });

  let payload;
  try {
    const text = await request.text();
    if (text.length > 1024) return new Response(null, { status: 413, headers });
    payload = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400, headers });
  }

  const page = normalizePage(payload?.page);
  if (!page) return new Response(null, { status: 400, headers });

  const task = recordVisit(request, env, page).catch((error) => {
    console.error(JSON.stringify({ event: "analytics_write_failed", message: String(error?.message || error) }));
  });
  if (context?.waitUntil) context.waitUntil(task);
  else await task;
  return new Response(null, { status: 204, headers });
}

async function authorizeAnalytics(request, env) {
  if (!env.DB) return { allowed: false, reason: "database" };
  await ensureAnalyticsSchema(env.DB);
  const userId = request.headers.get("oai-authenticated-user-id");
  if (!userId) return { allowed: false, reason: "signin" };

  let owner = await env.DB.prepare("SELECT user_id FROM analytics_owner WHERE id = 1").first();
  if (!owner) {
    await env.DB.prepare("INSERT OR IGNORE INTO analytics_owner (id, user_id) VALUES (1, ?1)").bind(userId).run();
    owner = await env.DB.prepare("SELECT user_id FROM analytics_owner WHERE id = 1").first();
  }
  return { allowed: owner?.user_id === userId, reason: owner?.user_id === userId ? "owner" : "forbidden" };
}

function hiddenNotFound() {
  return new Response("Not Found", { status: 404, headers: PRIVATE_HEADERS });
}

async function serveAnalyticsPage(request, env) {
  const auth = await authorizeAnalytics(request, env);
  if (auth.reason === "signin") {
    return Response.redirect(new URL("/signin-with-chatgpt?return_to=%2Fanalytics", request.url), 302);
  }
  if (!auth.allowed) return hiddenNotFound();
  const page = await fetchAsset(request, env, "/analytics.html");
  return withHeaders(page, PRIVATE_HEADERS);
}

async function serveAnalyticsData(request, env) {
  const auth = await authorizeAnalytics(request, env);
  if (!auth.allowed) {
    return new Response(JSON.stringify({ error: auth.reason === "signin" ? "Authentication required" : "Not found" }), {
      status: auth.reason === "signin" ? 401 : 404,
      headers: { ...PRIVATE_HEADERS, "Content-Type": "application/json" }
    });
  }

  const url = new URL(request.url);
  const requestedDays = Number.parseInt(url.searchParams.get("days") || "30", 10);
  const days = VALID_PERIODS.has(requestedDays) ? requestedDays : 30;
  const modifier = `-${days - 1} days`;
  const [summaryResult, dailyResult, locationsResult, countriesResult, pagesResult] = await env.DB.batch([
    env.DB.prepare(`SELECT
      COUNT(*) AS page_views,
      COUNT(DISTINCT day || ':' || visitor_hash) AS visitor_days,
      COUNT(DISTINCT CASE WHEN country_code != 'XX' THEN country_code END) AS countries,
      SUM(CASE WHEN day = date('now') THEN 1 ELSE 0 END) AS today
      FROM visit_events WHERE day >= date('now', ?1)`).bind(modifier),
    env.DB.prepare(`SELECT day, COUNT(*) AS views FROM visit_events
      WHERE day >= date('now', ?1) GROUP BY day ORDER BY day`).bind(modifier),
    env.DB.prepare(`SELECT country_code, region_code, latitude_bucket, longitude_bucket,
      COUNT(*) AS views, COUNT(DISTINCT day || ':' || visitor_hash) AS visitor_days
      FROM visit_events WHERE day >= date('now', ?1)
      AND latitude_bucket IS NOT NULL AND longitude_bucket IS NOT NULL
      GROUP BY country_code, region_code, latitude_bucket, longitude_bucket
      ORDER BY views DESC LIMIT 80`).bind(modifier),
    env.DB.prepare(`SELECT country_code, region_code, COUNT(*) AS views
      FROM visit_events WHERE day >= date('now', ?1)
      GROUP BY country_code, region_code ORDER BY views DESC LIMIT 10`).bind(modifier),
    env.DB.prepare(`SELECT page, COUNT(*) AS views FROM visit_events
      WHERE day >= date('now', ?1) GROUP BY page ORDER BY views DESC LIMIT 10`).bind(modifier)
  ]);

  const summaryRow = summaryResult.results?.[0] || {};
  const payload = {
    generatedAt: new Date().toISOString(),
    days,
    summary: {
      pageViews: Number(summaryRow.page_views || 0),
      visitorDays: Number(summaryRow.visitor_days || 0),
      countries: Number(summaryRow.countries || 0),
      today: Number(summaryRow.today || 0)
    },
    daily: (dailyResult.results || []).map((row) => ({ day: row.day, views: Number(row.views) })),
    locations: (locationsResult.results || []).map((row) => ({
      countryCode: row.country_code,
      regionCode: row.region_code,
      latitude: Number(row.latitude_bucket),
      longitude: Number(row.longitude_bucket),
      views: Number(row.views),
      visitorDays: Number(row.visitor_days)
    })),
    countries: (countriesResult.results || []).map((row) => ({
      countryCode: row.country_code,
      regionCode: row.region_code,
      views: Number(row.views)
    })),
    pages: (pagesResult.results || []).map((row) => ({ page: row.page, views: Number(row.views) }))
  };

  return new Response(JSON.stringify(payload), {
    headers: { ...PRIVATE_HEADERS, "Content-Type": "application/json; charset=utf-8" }
  });
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    if (url.pathname === "/api/analytics/collect") {
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
      }
      return collectVisit(request, env, context);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }

    if (url.pathname === "/analytics" || url.pathname === "/analytics.html") {
      return serveAnalyticsPage(request, env);
    }
    if (url.pathname === "/api/analytics") return serveAnalyticsData(request, env);

    let pathname = url.pathname;
    if (pathname.endsWith("/")) pathname += "index.html";

    let response = await fetchAsset(request, env, pathname);
    if (response.status === 404 && !pathname.split("/").pop().includes(".")) {
      response = await fetchAsset(request, env, `${pathname}.html`);
      if (response.status !== 404) pathname = `${pathname}.html`;
    }

    if (response.status === 404) {
      const notFound = await fetchAsset(request, env, "/404.html");
      return withHeaders(new Response(notFound.body, { status: 404, headers: notFound.headers }), HTML_HEADERS);
    }

    const isHtml = response.headers.get("content-type")?.includes("text/html");
    return withHeaders(response, isHtml ? HTML_HEADERS : ASSET_HEADERS);
  }
};

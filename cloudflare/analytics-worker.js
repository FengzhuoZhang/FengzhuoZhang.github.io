const PUBLIC_SITE = "https://fengzhuozhang.github.io";
const SESSION_COOKIE = "fz_analytics_session";
const SESSION_SECONDS = 12 * 60 * 60;
const VALID_PERIODS = new Set([7, 30, 90, 180]);
const BOT_PATTERN = /bot|crawler|spider|preview|slurp|facebookexternalhit|whatsapp|telegram|discord|linkedinbot|twitterbot/i;
const encoder = new TextEncoder();

const SECURITY_HEADERS = {
  "Cache-Control": "private, no-store",
  "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; form-action 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-Robots-Tag": "noindex, nofollow, noarchive"
};

const ASSET_MAP = new Map([
  ["/assets/style.css", "/style.css"],
  ["/assets/analytics.css", "/analytics.css"],
  ["/assets/analytics.js", "/analytics.js"],
  ["/assets/favicon.svg", "/assets/favicon.svg"],
  ["/assets/vendor/d3.min.js", "/assets/vendor/d3.min.js"],
  ["/assets/vendor/topojson-client.min.js", "/assets/vendor/topojson-client.min.js"],
  ["/assets/vendor/world-110m.mjs", "/assets/vendor/world-110m.mjs"]
]);

const LOGIN_HTML_START = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <meta name="theme-color" content="#17385f">
  <title>Private Analytics Sign In | Fengzhuo Zhang</title>
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/style.css">
  <link rel="stylesheet" href="/assets/analytics.css">
</head>
<body class="analytics-page">
  <main class="auth-shell">
    <section class="auth-card" aria-labelledby="signin-title">
      <p class="eyebrow">Owner-only dashboard</p>
      <h1 id="signin-title">Private analytics</h1>
      <p>Enter the dashboard password to view visitation statistics.</p>`;

const LOGIN_HTML_END = `
      <form class="auth-form" method="post" action="/login">
        <label for="password">Dashboard password</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
        <button type="submit">Sign in</button>
      </form>
      <p class="auth-note">The public website remains hosted on GitHub Pages. This private dashboard is protected separately.</p>
    </section>
  </main>
</body>
</html>`;

const DASHBOARD_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <meta name="theme-color" content="#17385f">
  <title>Private Analytics | Fengzhuo Zhang</title>
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/style.css">
  <link rel="stylesheet" href="/assets/analytics.css">
</head>
<body class="analytics-page">
  <a class="skip-link" href="#analytics-main">Skip to analytics</a>
  <div class="analytics-shell">
    <header class="analytics-header">
      <a class="site-brand" href="https://fengzhuozhang.github.io/">Fengzhuo Zhang</a>
      <div class="analytics-header-meta">
        <span class="private-label">Private analytics</span>
        <form method="post" action="/logout"><button class="signout-button" type="submit">Sign out</button></form>
      </div>
    </header>

    <main id="analytics-main">
      <div class="analytics-title-row">
        <div>
          <p class="eyebrow">Owner-only dashboard</p>
          <h1>Visitor geography</h1>
          <p class="analytics-intro">Coarse, privacy-preserving location statistics. Raw IP addresses are never stored.</p>
        </div>
        <label class="period-control" for="period-select">
          <span>Time period</span>
          <select id="period-select">
            <option value="7">Last 7 days</option>
            <option value="30" selected>Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="180">Last 180 days</option>
          </select>
        </label>
      </div>

      <p id="analytics-status" class="analytics-status" role="status" aria-live="polite">Loading visit statistics…</p>

      <section class="stats-grid" aria-label="Visit summary">
        <article class="stat-card"><span>Page views</span><strong id="metric-views">—</strong></article>
        <article class="stat-card"><span>Visitor-days</span><strong id="metric-visitors">—</strong></article>
        <article class="stat-card"><span>Countries</span><strong id="metric-countries">—</strong></article>
        <article class="stat-card"><span>Views today</span><strong id="metric-today">—</strong></article>
      </section>

      <section class="analytics-section map-section" aria-labelledby="map-title">
        <div class="section-heading-row">
          <div>
            <h2 id="map-title">Visit map</h2>
            <p>Circles show rounded geographic areas; larger circles indicate more page views.</p>
          </div>
          <div class="map-legend" aria-label="Map legend"><span></span> More visits</div>
        </div>
        <div id="map-wrap" class="map-wrap">
          <svg id="visit-map" role="img" aria-label="World map of website visits"></svg>
          <p id="map-empty" class="chart-empty" hidden>No visit locations have been recorded for this period.</p>
        </div>
      </section>

      <section class="analytics-section" aria-labelledby="trend-title">
        <div class="section-heading-row">
          <div>
            <h2 id="trend-title">Daily visits</h2>
            <p>Page views recorded each day.</p>
          </div>
        </div>
        <div class="trend-wrap">
          <svg id="visit-trend" role="img" aria-label="Line chart of daily website visits"></svg>
          <p id="trend-empty" class="chart-empty" hidden>No visits have been recorded for this period.</p>
        </div>
      </section>

      <div class="analytics-tables">
        <section class="analytics-section" aria-labelledby="locations-title">
          <h2 id="locations-title">Top locations</h2>
          <div class="table-scroll">
            <table>
              <thead><tr><th>Country</th><th>Region</th><th>Views</th></tr></thead>
              <tbody id="locations-body"></tbody>
            </table>
          </div>
        </section>

        <section class="analytics-section" aria-labelledby="pages-title">
          <h2 id="pages-title">Top pages</h2>
          <div class="table-scroll">
            <table>
              <thead><tr><th>Page</th><th>Views</th></tr></thead>
              <tbody id="pages-body"></tbody>
            </table>
          </div>
        </section>
      </div>

      <p class="analytics-privacy">Analytics exclude known bots and visitors who enable Global Privacy Control or Do Not Track. Location coordinates are rounded, and detailed records are retained for 180 days.</p>
    </main>
  </div>
  <script src="/assets/vendor/d3.min.js"></script>
  <script src="/assets/vendor/topojson-client.min.js"></script>
  <script type="module" src="/assets/analytics.js"></script>
</body>
</html>`;

function responseHeaders(contentType) {
  return { ...SECURITY_HEADERS, "Content-Type": contentType };
}

function htmlResponse(html, status = 200) {
  return new Response(html, { status, headers: responseHeaders("text/html; charset=utf-8") });
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: responseHeaders("application/json; charset=utf-8")
  });
}

function redirect(location, status = 302, setCookie) {
  const headers = new Headers(SECURITY_HEADERS);
  headers.set("Location", location);
  if (setCookie) headers.append("Set-Cookie", setCookie);
  return new Response(null, { status, headers });
}

function bytesToHex(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex) {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

async function sha256Hex(value) {
  return bytesToHex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

async function hmacHex(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return bytesToHex(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

function timingSafeHexEqual(left, right) {
  const leftBytes = hexToBytes(left);
  const rightBytes = hexToBytes(right);
  if (!leftBytes || !rightBytes || leftBytes.byteLength !== rightBytes.byteLength) return false;
  return crypto.subtle.timingSafeEqual(leftBytes, rightBytes);
}

function cookieValue(request, name) {
  const cookies = request.headers.get("Cookie") || "";
  for (const part of cookies.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return "";
}

async function hasValidSession(request, env) {
  const value = cookieValue(request, SESSION_COOKIE);
  const [expiresText, signature, extra] = value.split(".");
  if (extra || !/^[0-9]+$/.test(expiresText || "") || !signature) return false;
  const expires = Number(expiresText);
  if (!Number.isSafeInteger(expires) || expires <= Math.floor(Date.now() / 1000)) return false;
  const expected = await hmacHex(env.SESSION_SECRET, expiresText);
  return timingSafeHexEqual(signature, expected);
}

async function sessionCookie(env) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const signature = await hmacHex(env.SESSION_SECRET, String(expires));
  return SESSION_COOKIE + "=" + expires + "." + signature +
    "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=" + SESSION_SECONDS;
}

function clearedSessionCookie() {
  return SESSION_COOKIE + "=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0";
}

function sameOrigin(request) {
  return request.headers.get("Origin") === new URL(request.url).origin;
}

async function verifyPassword(password, env) {
  const supplied = await sha256Hex(password);
  return timingSafeHexEqual(supplied, env.DASHBOARD_PASSWORD_HASH);
}

function loginPage(hasError = false, status = 200) {
  const error = hasError
    ? '<p class="auth-error" role="alert">The password was not accepted. Please try again.</p>'
    : "";
  return htmlResponse(LOGIN_HTML_START + error + LOGIN_HTML_END, status);
}

async function serveAsset(request, pathname) {
  const sourcePath = ASSET_MAP.get(pathname);
  if (!sourcePath) return null;
  const upstream = await fetch(PUBLIC_SITE + sourcePath + "?v=20260917", {
    method: request.method === "HEAD" ? "HEAD" : "GET",
    headers: { Accept: request.headers.get("Accept") || "*/*" }
  });
  if (!upstream.ok) return new Response("Asset unavailable", { status: 502, headers: SECURITY_HEADERS });
  const headers = new Headers(upstream.headers);
  headers.set("Cache-Control", "public, max-age=3600");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.delete("Set-Cookie");
  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers
  });
}

function collectorHeaders() {
  return {
    "Access-Control-Allow-Origin": PUBLIC_SITE,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
    "Vary": "Origin"
  };
}

function normalizePage(value) {
  if (typeof value !== "string" || value.length > 160) return null;
  if (!/^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*$/.test(value) || value.startsWith("//")) return null;
  if (value === "/index.html") return "/";
  return value || "/";
}

function shouldIgnoreVisit(request) {
  if (request.headers.get("Sec-GPC") === "1" || request.headers.get("DNT") === "1") return true;
  return BOT_PATTERN.test(request.headers.get("User-Agent") || "");
}

async function recordVisit(request, env, page) {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const ipAddress = request.headers.get("CF-Connecting-IP") || "unknown";
  const visitorHash = await hmacHex(env.VISITOR_HASH_SECRET, day + ":" + ipAddress);
  const cf = request.cf || {};
  const countryCode = String(cf.country || "XX").slice(0, 2).toUpperCase();
  const regionCode = String(cf.regionCode || cf.region || "Unknown").slice(0, 80);
  const latitude = Number(cf.latitude);
  const longitude = Number(cf.longitude);
  const latitudeBucket = Number.isFinite(latitude) ? Math.round(latitude) : null;
  const longitudeBucket = Number.isFinite(longitude) ? Math.round(longitude) : null;

  await env.DB.batch([
    env.DB.prepare("DELETE FROM visit_events WHERE visited_at < datetime('now', '-180 days')"),
    env.DB.prepare(
      "INSERT INTO visit_events " +
      "(day, country_code, region_code, latitude_bucket, longitude_bucket, page, visitor_hash) " +
      "VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
    ).bind(day, countryCode, regionCode, latitudeBucket, longitudeBucket, page, visitorHash)
  ]);
}

async function collectVisit(request, env, context) {
  const headers = collectorHeaders();
  if (request.headers.get("Origin") !== PUBLIC_SITE) return new Response(null, { status: 403, headers });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { ...headers, Allow: "POST, OPTIONS" } });
  if (shouldIgnoreVisit(request)) return new Response(null, { status: 204, headers });

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

  context.waitUntil(
    recordVisit(request, env, page).catch((error) => {
      console.error(JSON.stringify({ event: "analytics_write_failed", message: String(error?.message || error) }));
    })
  );
  return new Response(null, { status: 204, headers });
}

async function analyticsPayload(env, days) {
  const modifier = "-" + (days - 1) + " days";
  const [summaryResult, dailyResult, locationsResult, countriesResult, pagesResult] = await env.DB.batch([
    env.DB.prepare(
      "SELECT COUNT(*) AS page_views, " +
      "COUNT(DISTINCT day || ':' || visitor_hash) AS visitor_days, " +
      "COUNT(DISTINCT CASE WHEN country_code != 'XX' THEN country_code END) AS countries, " +
      "SUM(CASE WHEN day = date('now') THEN 1 ELSE 0 END) AS today " +
      "FROM visit_events WHERE day >= date('now', ?1)"
    ).bind(modifier),
    env.DB.prepare(
      "SELECT day, COUNT(*) AS views FROM visit_events " +
      "WHERE day >= date('now', ?1) GROUP BY day ORDER BY day"
    ).bind(modifier),
    env.DB.prepare(
      "SELECT country_code, region_code, latitude_bucket, longitude_bucket, " +
      "COUNT(*) AS views, COUNT(DISTINCT day || ':' || visitor_hash) AS visitor_days " +
      "FROM visit_events WHERE day >= date('now', ?1) " +
      "AND latitude_bucket IS NOT NULL AND longitude_bucket IS NOT NULL " +
      "GROUP BY country_code, region_code, latitude_bucket, longitude_bucket " +
      "ORDER BY views DESC LIMIT 80"
    ).bind(modifier),
    env.DB.prepare(
      "SELECT country_code, region_code, COUNT(*) AS views FROM visit_events " +
      "WHERE day >= date('now', ?1) GROUP BY country_code, region_code " +
      "ORDER BY views DESC LIMIT 10"
    ).bind(modifier),
    env.DB.prepare(
      "SELECT page, COUNT(*) AS views FROM visit_events " +
      "WHERE day >= date('now', ?1) GROUP BY page ORDER BY views DESC LIMIT 10"
    ).bind(modifier)
  ]);

  const summary = summaryResult.results?.[0] || {};
  return {
    generatedAt: new Date().toISOString(),
    days,
    summary: {
      pageViews: Number(summary.page_views || 0),
      visitorDays: Number(summary.visitor_days || 0),
      countries: Number(summary.countries || 0),
      today: Number(summary.today || 0)
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
}

async function handleRequest(request, env, context) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (pathname === "/collect") return collectVisit(request, env, context);
  if (pathname === "/health" && request.method === "GET") {
    return jsonResponse({ status: "ok" });
  }

  if ((request.method === "GET" || request.method === "HEAD") && ASSET_MAP.has(pathname)) {
    return serveAsset(request, pathname);
  }

  if (pathname === "/login") {
    if (request.method === "GET" || request.method === "HEAD") {
      if (await hasValidSession(request, env)) return redirect("/analytics");
      return loginPage();
    }
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: { ...SECURITY_HEADERS, Allow: "GET, HEAD, POST" } });
    if (!sameOrigin(request)) return new Response("Forbidden", { status: 403, headers: SECURITY_HEADERS });
    const contentLength = Number(request.headers.get("Content-Length") || 0);
    if (contentLength > 2048) return new Response("Payload Too Large", { status: 413, headers: SECURITY_HEADERS });
    const form = await request.formData();
    const password = String(form.get("password") || "");
    if (password.length > 256 || !(await verifyPassword(password, env))) return loginPage(true, 401);
    return redirect("/analytics", 303, await sessionCookie(env));
  }

  if (pathname === "/logout") {
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: { ...SECURITY_HEADERS, Allow: "POST" } });
    if (!sameOrigin(request)) return new Response("Forbidden", { status: 403, headers: SECURITY_HEADERS });
    return redirect("/login", 303, clearedSessionCookie());
  }

  if (pathname === "/" && (request.method === "GET" || request.method === "HEAD")) {
    return redirect("/analytics");
  }

  if (pathname === "/analytics" || pathname === "/analytics.html") {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405, headers: { ...SECURITY_HEADERS, Allow: "GET, HEAD" } });
    }
    if (!(await hasValidSession(request, env))) return redirect("/login");
    return htmlResponse(DASHBOARD_HTML);
  }

  if (pathname === "/api/analytics") {
    if (request.method !== "GET") return new Response("Method Not Allowed", { status: 405, headers: { ...SECURITY_HEADERS, Allow: "GET" } });
    if (!(await hasValidSession(request, env))) return jsonResponse({ error: "Authentication required" }, 401);
    const requestedDays = Number.parseInt(url.searchParams.get("days") || "30", 10);
    const days = VALID_PERIODS.has(requestedDays) ? requestedDays : 30;
    return jsonResponse(await analyticsPayload(env, days));
  }

  return new Response("Not Found", { status: 404, headers: SECURITY_HEADERS });
}

export default {
  async fetch(request, env, context) {
    try {
      return await handleRequest(request, env, context);
    } catch (error) {
      console.error(JSON.stringify({ event: "request_failed", message: String(error?.message || error) }));
      return new Response("Internal Server Error", { status: 500, headers: SECURITY_HEADERS });
    }
  }
};

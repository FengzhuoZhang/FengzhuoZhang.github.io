const HTML_HEADERS = {
  "Cache-Control": "no-cache",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
};

const ASSET_HEADERS = {
  "Cache-Control": "public, max-age=3600, must-revalidate",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff"
};

function withHeaders(response, extraHeaders) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(extraHeaders)) {
    headers.set(name, value);
  }
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

export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD" }
      });
    }

    const url = new URL(request.url);
    let pathname = url.pathname;
    if (pathname.endsWith("/")) pathname += "index.html";

    let response = await fetchAsset(request, env, pathname);
    if (response.status === 404 && !pathname.split("/").pop().includes(".")) {
      response = await fetchAsset(request, env, `${pathname}.html`);
    }

    if (response.status === 404) {
      const notFound = await fetchAsset(request, env, "/404.html");
      return withHeaders(new Response(notFound.body, {
        status: 404,
        headers: notFound.headers
      }), HTML_HEADERS);
    }

    const isHtml = response.headers.get("content-type")?.includes("text/html");
    return withHeaders(response, isHtml ? HTML_HEADERS : ASSET_HEADERS);
  }
};

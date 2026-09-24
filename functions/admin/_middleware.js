const API_BASE = "https://connect.oneartisthub.site";

export async function onRequest(context) {
  const path = new URL(context.request.url).pathname;

  // The login page remains public. The dashboard HTML is never served
  // unless the Connect Worker confirms an authenticated admin session.
  if (path !== "/admin/dashboard" && path !== "/admin/dashboard.html") {
    return context.next();
  }

  const cookie = context.request.headers.get("cookie") || "";
  if (!cookie) {
    return Response.redirect(new URL("/admin/", context.request.url), 302);
  }

  let auth;
  try {
    const check = await fetch(API_BASE + "/admin/me", {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Cookie": cookie
      },
      cf: { cacheTtl: 0, cacheEverything: false }
    });

    auth = await check.json().catch(() => null);
  } catch {
    auth = null;
  }

  if (!auth?.ok) {
    return new Response(null, {
      status: 302,
      headers: {
        "Location": "/admin/",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache"
      }
    });
  }

  const response = await context.next();
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

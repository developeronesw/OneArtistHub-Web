const API_BASE = "https://connect.oneartisthub.site";

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.pathname !== "/admin/dashboard" && url.pathname !== "/admin/dashboard.html") {
    return context.next();
  }

  const cookie = context.request.headers.get("cookie") || "";
  if (!cookie) {
    return redirectToLogin();
  }

  try {
    const check = await fetch(API_BASE + "/admin/me", {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Cookie": cookie
      },
      cf: { cacheTtl: 0, cacheEverything: false }
    });

    const auth = await check.json().catch(() => null);
    if (!auth?.ok) return redirectToLogin();
  } catch {
    // Fail closed: if the auth service cannot confirm the session,
    // the private dashboard is not served.
    return redirectToLogin();
  }

  const response = await context.next();
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Frame-Options", "DENY");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function redirectToLogin() {
  return new Response(null, {
    status: 302,
    headers: {
      "Location": "/admin/",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache"
    }
  });
}

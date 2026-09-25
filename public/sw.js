/* Fast offline fallback + Web Push for pnk Почта PWA */
const CACHE = "pnk-mail-offline-v8";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [
  OFFLINE_URL,
  "/icon-192.png",
  "/favicon-32.png",
  "/apple-touch-icon.png",
];
const NET_TIMEOUT_MS = 2000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(
        PRECACHE.map(async (url) => {
          const res = await fetch(url, { cache: "reload" });
          await cache.put(url, res.clone());
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(id);
        resolve(value);
      },
      (err) => {
        clearTimeout(id);
        reject(err);
      },
    );
  });
}

async function offlineResponse() {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(OFFLINE_URL);
  if (cached) return cached;
  return new Response(
    "<!doctype html><html lang=ru><meta charset=utf-8><meta name=viewport content=\"width=device-width,initial-scale=1\"><title>Нет интернета</title><body style=\"margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0c0d10;color:#fff;font-family:system-ui,sans-serif\"><div style=\"text-align:center;padding:24px\"><h1 style=\"font-size:24px\">Нет интернета</h1><p style=\"color:#999\">Проверьте подключение или выключите VPN и обновите страницу.</p><button onclick=\"location.reload()\" style=\"margin-top:24px;height:48px;padding:0 20px;border:0;border-radius:14px;background:#0066ff;color:#fff;font-size:15px;font-weight:600\">Обновить страницу</button></div></body></html>",
    {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}

async function cachedAsset(pathname) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(pathname);
  if (hit) return hit;
  try {
    const res = await fetch(pathname, { cache: "reload" });
    if (res.ok) await cache.put(pathname, res.clone());
    return res;
  } catch {
    return null;
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (PRECACHE.includes(url.pathname) && url.pathname !== OFFLINE_URL) {
    event.respondWith(
      (async () => {
        const cached = await cachedAsset(url.pathname);
        if (cached) return cached;
        return Response.error();
      })(),
    );
    return;
  }

  const accept = req.headers.get("accept") || "";
  const isNav = req.mode === "navigate" || accept.includes("text/html");
  if (!isNav) return;

  if (url.pathname === OFFLINE_URL) {
    event.respondWith(
      fetch(req, { cache: "no-store" }).catch(() => offlineResponse()),
    );
    return;
  }

  event.respondWith(
    (async () => {
      try {
        return await withTimeout(fetch(req), NET_TIMEOUT_MS);
      } catch {
        return offlineResponse();
      }
    })(),
  );
});

self.addEventListener("push", (event) => {
  let data = {
    title: "Новое письмо",
    subject: "",
    body: "",
    url: "/mail",
    tag: "mail",
  };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch {
    try {
      const text = event.data && event.data.text();
      if (text) data.body = text;
    } catch {
      /* ignore */
    }
  }

  // Layout: sender (title) → subject → preview/body
  const lines = [data.subject, data.body].filter(
    (s) => typeof s === "string" && s.trim(),
  );
  const bodyText = lines.length ? lines.join("\n") : "Новое письмо";

  event.waitUntil(
    self.registration.showNotification(data.title || "Новое письмо", {
      body: bodyText,
      icon: "/icon-192.png",
      badge: "/favicon-32.png",
      tag: data.tag || "mail",
      renotify: true,
      data: { url: data.url || "/mail" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target =
    (event.notification.data && event.notification.data.url) || "/mail";
  const abs = new URL(target, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of all) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(abs);
            } catch {
              /* ignore */
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(abs);
      }
    })(),
  );
});

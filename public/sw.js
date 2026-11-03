/* Only the application shell and immutable static assets are cached. Account data and OAuth callbacks are never cached. */
const CACHE = "training-planner-shell-v2";
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(["/", "/icon-192.png", "/icon-512.png"])),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("training-planner-shell-") && key !== CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin)
    return;
  // OAuth return codes are one-use values. Never cache or fall back for auth routes.
  if (url.pathname.startsWith("/auth/")) return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok && url.pathname === "/" && !url.search) {
            const copy = response.clone();
            event.waitUntil(
              caches.open(CACHE).then((cache) => cache.put("/", copy)),
            );
          }
          return response;
        })
        .catch(() =>
          caches.match("/").then((response) => response || Response.error()),
        ),
    );
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              event.waitUntil(
                caches
                  .open(CACHE)
                  .then((cache) => cache.put(event.request, copy)),
              );
            }
            return response;
          }),
      ),
    );
  }
});

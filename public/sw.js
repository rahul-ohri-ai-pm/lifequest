/* LifeQuest service worker — one job now, zero dependencies.
 *
 * Offline. The app is offline-first by spec (§2) and makes zero network calls, so once
 * the shell is cached it must keep launching with the radio off.
 *
 * It used to have a second job: re-serving same-origin responses with COOP/COEP headers
 * attached, because the old expo-sqlite web build reached its worker over
 * SharedArrayBuffer and browsers only hand that to a cross-origin-isolated page — which
 * needs response headers a static host like GitHub Pages cannot set. The web rewrite
 * switched to SQLite's opfs-sahpool VFS, which uses synchronous access handles instead of
 * SharedArrayBuffer and needs no isolation at all, so that whole workaround is gone. Do
 * not add the headers back "just in case": COEP require-corp would start rejecting any
 * cross-origin subresource the app ever legitimately needs.
 *
 * Deliberately hand-rolled rather than pulling in Workbox: ~50 lines beats a dependency,
 * per the lightweight rule (§3).
 */

const CACHE = 'lifequest-shell-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return; // leave cross-origin alone
  event.respondWith(handle(event, request));
});

async function handle(event, request) {
  const cache = await caches.open(CACHE);
  const isNavigation = request.mode === 'navigate';

  // Content-hashed bundles/wasm never change under a given URL — cache-first.
  // Navigations go network-first so a redeploy is picked up on the next launch.
  if (!isNavigation) {
    const hit = await cache.match(request);
    if (hit) return hit;
  }

  try {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      event.waitUntil(cache.put(request, response.clone()));
    }
    // SPA build: unknown paths 404 on a static host, so serve the shell and let the
    // router resolve the route client-side.
    if (isNavigation && !response.ok) {
      const shell = await cache.match(self.registration.scope);
      if (shell) return shell;
    }
    return response;
  } catch {
    const fallback = isNavigation
      ? ((await cache.match(request)) ?? (await cache.match(self.registration.scope)))
      : await cache.match(request);
    if (fallback) return fallback;
    throw new Error('LifeQuest is offline and this resource is not cached.');
  }
}

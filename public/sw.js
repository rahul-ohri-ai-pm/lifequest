/* LifeQuest service worker — two jobs, zero dependencies.
 *
 * 1. Cross-origin isolation. expo-sqlite's web build runs SQLite as WebAssembly in
 *    a worker and talks to it over SharedArrayBuffer, which browsers only hand to a
 *    cross-origin-isolated page. That needs COOP/COEP *response headers* on the
 *    document, and static hosts like GitHub Pages cannot set headers. A service
 *    worker can: it re-serves same-origin responses with the headers attached.
 *    (Hosts that can set headers are covered by public/_headers too — that path is
 *    strictly better when available; this one is what makes GitHub Pages work.)
 *
 * 2. Offline. The app is offline-first by spec (§2) and makes zero network calls,
 *    so once the shell is cached it must keep launching with the radio off.
 *
 * Deliberately hand-rolled rather than pulling in Workbox/coi-serviceworker: ~70
 * lines beats a dependency, per the lightweight rule (§3).
 */

const CACHE = 'lifequest-shell-v1';

// Expo documents COEP `credentialless`, but `require-corp` is chosen here deliberately:
// it has the wider browser support (notably older Safari/iOS, where credentialless landed
// much later), and its stricter rule — every subresource must be same-origin or explicitly
// opt in — costs this app nothing, because §5 already forbids CDNs and remote assets. If a
// cross-origin resource is ever added, it needs CORP/CORS headers or this must change.
function withIsolationHeaders(response) {
  // Opaque (status 0) and bodyless (204/304) responses can't be rebuilt.
  if (!response || response.status === 0 || response.status === 204 || response.status === 304) {
    return response;
  }
  const headers = new Headers(response.headers);
  headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

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
    if (hit) return withIsolationHeaders(hit);
  }

  try {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      event.waitUntil(cache.put(request, response.clone()));
    }
    // SPA export ("single"): unknown paths 404 on a static host, so serve the shell
    // and let the router resolve the route client-side.
    if (isNavigation && !response.ok) {
      const shell = await cache.match(self.registration.scope);
      if (shell) return withIsolationHeaders(shell);
    }
    return withIsolationHeaders(response);
  } catch {
    const fallback = isNavigation
      ? (await cache.match(request)) ?? (await cache.match(self.registration.scope))
      : await cache.match(request);
    if (fallback) return withIsolationHeaders(fallback);
    throw new Error('LifeQuest is offline and this resource is not cached.');
  }
}

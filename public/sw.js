// Build placeholders are replaced by scripts/precache.mjs.
const CACHE_PREFIX = 'markdown-studio-pro-'
const CACHE = CACHE_PREFIX + '__BUILD_VERSION__'
const ASSETS = /* __PRECACHE_MANIFEST__ */ []
const INDEX = new URL('index.html', self.registration.scope).href

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache =>
    cache.addAll(ASSETS.map(path => new Request(
      new URL(path, self.registration.scope), { cache: 'reload' }
    )))
  ))
})

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      // msp-v1 and timestamp caches were used exclusively by earlier releases.
      const belongsToApp = key.startsWith(CACHE_PREFIX) || /^msp-(?:v1|\d+)$/.test(key)
      if (belongsToApp && key !== CACHE) await caches.delete(key)
    }
    await self.clients.claim()
  })())
})

async function networkFirst(request, html) {
  const cache = await caches.open(CACHE)
  try {
    const response = await fetch(new Request(request, { cache: 'no-store' }))
    if (!response.ok) throw new Error('Network response unavailable')
    await cache.put(html ? INDEX : request, response.clone())
    return response
  } catch {
    const cached = await cache.match(html ? INDEX : request)
    return cached || Response.error()
  }
}

self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin ||
      !url.href.startsWith(self.registration.scope)) return
  const html = request.mode === 'navigate' || url.pathname.endsWith('.html')
  if (html) {
    event.respondWith(networkFirst(request, true))
    return
  }
  // All Vite assets (including lazy modules and font files) are precached.
  if (url.pathname.startsWith(new URL('assets/', self.registration.scope).pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE)
      // Static files are identical for this origin; dev/preview servers may
      // emit Vary: Origin, while precache and module requests differ in headers.
      const cached = await cache.match(request, { ignoreVary: true })
      if (cached) return cached
      // A newer build may be fully installed but waiting for user approval.
      for (const key of await caches.keys()) {
        if (key.startsWith(CACHE_PREFIX) && key !== CACHE) {
          const pending = await (await caches.open(key)).match(request, { ignoreVary: true })
          if (pending) return pending
        }
      }
      const response = await fetch(request)
      if (response.ok) await cache.put(request, response.clone())
      return response
    })())
    return
  }
  event.respondWith(networkFirst(request, false))
})

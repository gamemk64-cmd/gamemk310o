/* Music Player — оптимизированный офлайн-кэш. Музыка и API не кэшируются. */
const VER = 'mp-v17-karaoke-syllables';
const SHELL = ['./', 'index.html', 'spotify-home.js', 'v12.js', 'shop.js', 'v12.css', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VER)
      .then(cache => Promise.all(SHELL.map(path => cache.add(path).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== VER).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || request.headers.has('range')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(VER).then(cache => cache.put('index.html', copy));
        }
        return response;
      }).catch(async () => (await caches.match('index.html')) || (await caches.match('./')))
    );
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) {
      event.waitUntil(fetch(request).then(response => {
        if (response.ok) return caches.open(VER).then(cache => cache.put(request, response.clone()));
      }).catch(() => {}));
      return cached;
    }
    try {
      const response = await fetch(request);
      if (response.ok) event.waitUntil(caches.open(VER).then(cache => cache.put(request, response.clone())));
      return response;
    } catch {
      return Response.error();
    }
  })());
});

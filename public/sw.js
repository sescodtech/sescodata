const CACHE_NAME = 'datahub-v1';
const STATIC_ASSETS = [
  '/datahub/',
  '/datahub/index.html',
  'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js',
  'https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@400;500;600;700;800;900&family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,400;12..96,500;12..96,600&display=swap'
];

// Install: cache static assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS.filter(url => !url.startsWith('http') || url.includes('jsdelivr') || url.includes('fonts')));
    }).catch(() => {})
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network first for API, cache first for assets
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Always fetch API calls from network
  if (url.hostname.includes('railway.app') || url.pathname.includes('/api/')) {
    e.respondWith(fetch(e.request).catch(() => new Response(JSON.stringify({error:'offline'}), {headers:{'Content-Type':'application/json'}})));
    return;
  }

  // Cache first for fonts and static assets
  if (url.hostname.includes('fonts.') || url.hostname.includes('jsdelivr')) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      }))
    );
    return;
  }

  // Network first for everything else
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

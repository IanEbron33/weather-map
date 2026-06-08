const CACHE_NAME = 'cloudly-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through request fetch handler required for PWA installation/caching guidelines
  event.respondWith(
    fetch(event.request).catch(() => {
      // Offline fallback handling if desired in future
      return new Response('Offline content not available.', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({ 'Content-Type': 'text/plain' })
      });
    })
  );
});

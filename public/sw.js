// Upgrade old installations without caching API responses or personal readings.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil(caches.delete('palmistry-cache-v1').then(() => self.clients.claim()).then(() => self.registration.unregister()));
});

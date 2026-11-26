importScripts('/offline-assets.js?v=29f2fbb4acf711a1');

const {version, assets} = self.PITCHVIVA_OFFLINE;
const CACHE = 'dayzero-shell-local-' + version;
const SHELL = new Set(assets);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(async cache => {
    // A failed install leaves the last working release available offline.
    await cache.addAll(assets.map(path => new Request(path, {cache: 'reload'})));
    await self.skipWaiting();
  }));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('dayzero-shell-') && key !== CACHE)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const path = url.pathname === '/' ? '/index.html' : url.pathname;
  if (!SHELL.has(path)) return;
  event.respondWith((async () => {
    // The manifest fingerprints a complete release. Cache-first lets an installed
    // workspace open immediately on stalled connections as well as fully offline.
    const cached = await caches.match(path, {cacheName: CACHE}).catch(() => null);
    if (cached) return cached;
    try {
      const response = await fetch(event.request, {cache: 'no-store'});
      if (response.ok) {
        try {
          const cache = await caches.open(CACHE);
          await cache.put(path, response.clone());
        } catch { /* A full cache must not discard a usable network response. */ }
      }
      return response;
    } catch {
      return new Response(
        'This file is not saved offline yet. Open the workspace once while connected.',
        {status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8'}});
    }
  })());
});

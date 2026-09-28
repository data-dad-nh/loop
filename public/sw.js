// Minimal service worker: caches the app shell for offline loads and
// stays out of the way otherwise. This is deliberately simple — if you
// add vite-plugin-pwa later it will generate a more robust one for you.
const CACHE = 'loop-shell-v1'
const APP_SHELL = ['./', './index.html', './manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => {}))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const clone = res.clone()
        caches.open(CACHE).then((cache) => cache.put(event.request, clone))
        return res
      })
      .catch(() => caches.match(event.request))
  )
})

// Handles a push event if you wire up Firebase Cloud Messaging later
// (see README.md). Safe to leave in place even if you never use FCM.
self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.notification?.title ?? 'Loop', {
      body: data.notification?.body ?? '',
      icon: './icon-192.png',
    })
  )
})

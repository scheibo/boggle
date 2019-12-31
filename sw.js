'use strict';

const CACHE = 'boggle-cache-1';
const DATA = 'boggle-data-1';

self.addEventListener('install', e => {
    self.skipWaiting(); // TODO: is this safe?
    e.waitUntil(
        caches.open(CACHE).then(cache =>
            cache.addAll([
                '/',
                '/index.html',
                '/longpress.js',
                '/boggle.js',
                '/manifest.json',
                '/favicon.ico',
                '/img/refresh.svg',
                '/img/back.svg',
                '/img/android-chrome-192x192.png',
                '/img/android-chrome-512x512.png',
                '/img/apple-touch-icon.png',
            ])))
});

self.addEventListener('activate', e =>
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.map(key => {
                if (key !== CACHE && key !== DATA) return caches.delete(key);
            })))));

self.addEventListener('fetch', e => {
    if (e.request.url.includes('/data/dict.json')) {
        e.respondWith(
            caches.open(DATA).then(async cache => {
                const cached = await cache.match(e.request);
                if (cached) return cached;
                const response = await fetch(e.request);
                if (response.status === 200) cache.put(e.request.url, response.clone());
                return response;
            }));
        return;
      }

    e.respondWith(
        caches.open(CACHE).then(cache => cache.match(e.request).then(
            response => response || fetch(e.request))));
});
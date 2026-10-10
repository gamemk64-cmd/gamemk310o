/* Music Player — service worker v12: оболочка сайта работает без сети, музыка и API не трогаются */
const VER = 'mp-v13-smart-voice-real-ai';
const SHELL = ['./', 'index.html', 'voice.js', 'v12.js', 'v12.css', 'smart-voice.js', 'smart-voice.css', 'smart-voice-config.js', 'karaoke.js', 'karaoke.css', 'lyrics-config.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || r.headers.has('range')) return;   // чужие сайты, аудио и API — напрямую
  if (r.mode === 'navigate') {                       // страница: сначала сеть, без сети — копия
    e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(VER).then(c => c.put('index.html', cp)); return res; }).catch(() => caches.match('index.html').then(m => m || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(r).then(m => {          // файлы сайта: из кэша и тихо обновляем
    const net = fetch(r).then(res => { if (res && res.ok) { const cp = res.clone(); caches.open(VER).then(c => c.put(r, cp)); } return res; }).catch(() => m);
    return m || net;
  }));
});

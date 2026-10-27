var CACHE_NAME = 'dashboard-shell-v1';
var SHELL_FILES = ['./index.html', './manifest.json'];

self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(SHELL_FILES);
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE_NAME; }).map(function(k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

// index.html（アプリの外枠）だけをネットワーク優先でキャッシュする。
// 天気・カレンダー・ニュースなど外部APIへのリクエストはキャッシュせず、そのままネットワークに任せる。
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);
  var isShellRequest = event.request.mode === 'navigate' || url.pathname.endsWith('/index.html');
  if (!isShellRequest) return;

  event.respondWith(
    fetch(event.request).then(function(res) {
      var resClone = res.clone();
      caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, resClone); });
      return res;
    }).catch(function() {
      return caches.match(event.request);
    })
  );
});

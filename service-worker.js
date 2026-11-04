var SHELL_FILES = ['./index.html', './manifest.json'];

// index.html・manifest.jsonの実際の中身からハッシュ値を計算し、キャッシュ名として使う。
// これによりファイルの中身が変わるたびに自動で新しいキャッシュ名になり、
// CACHE_NAMEの手動バージョンアップを忘れて古いキャッシュが残り続けることを防ぐ。
var cacheNamePromise = null;
function getCacheName() {
  if (cacheNamePromise) return cacheNamePromise;
  cacheNamePromise = Promise.all(
    SHELL_FILES.map(function(f) { return fetch(f, { cache: 'no-store' }).then(function(res) { return res.text(); }); })
  ).then(function(texts) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(texts.join('\u0000')));
  }).then(function(buf) {
    var hex = Array.from(new Uint8Array(buf)).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
    return 'dashboard-shell-' + hex.slice(0, 12);
  });
  return cacheNamePromise;
}

self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    getCacheName().then(function(name) {
      return caches.open(name).then(function(cache) { return cache.addAll(SHELL_FILES); });
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    getCacheName().then(function(name) {
      return caches.keys().then(function(keys) {
        return Promise.all(keys.filter(function(k) { return k !== name; }).map(function(k) { return caches.delete(k); }));
      });
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
      getCacheName().then(function(name) {
        caches.open(name).then(function(cache) { cache.put(event.request, resClone); });
      });
      return res;
    }).catch(function() {
      return caches.match(event.request);
    })
  );
});

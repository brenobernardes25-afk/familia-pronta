// Guarda o app no celular para funcionar offline. MUDE A VERSÃO a cada atualização.
const V = 'fp-v4';
const ARQ = ['./', 'index.html', 'css/style.css', 'js/data.js', 'js/calc.js', 'js/app.js', 'manifest.webmanifest',
  'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', (e) => e.waitUntil(caches.open(V).then((c) => c.addAll(ARQ)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())));

// Primeiro o que está guardado (funciona sem internet); se não tiver, busca na rede.
// Abrir uma página do app sem internet sempre cai no index.html guardado.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((r) => r || fetch(e.request).catch(() =>
    e.request.mode === 'navigate' ? caches.match('index.html') : Response.error())));
});

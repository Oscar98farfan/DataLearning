// Service worker: guarda la app en el dispositivo para usarla sin internet.
// Estrategia: responde desde la caché al instante y, si hay internet, la actualiza
// en segundo plano (la versión nueva aparece la siguiente vez que abras la app).
// Si agregas un archivo nuevo, inclúyelo en ARCHIVOS (npm test lo verifica).
const CACHE = 'taller-datos-v2';
const ARCHIVOS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'js/app.js',
  'js/util.js',
  'js/practica.js',
  'js/laboratorio.js',
  'js/conceptos.js',
  'js/sql-engine.js',
  'js/highlight.js',
  'data/temas.js',
  'data/contextos.js',
  'data/conceptos.js',
  'data/dataset.sql',
  'data/ejercicios/index.js',
  'data/ejercicios/python.js',
  'data/ejercicios/pandas.js',
  'data/ejercicios/sql.js',
  'data/ejercicios/powerbi.js',
  'data/ejercicios/git.js',
  'data/ejercicios/arquitectura.js',
  'data/ejercicios/ia.js',
  'vendor/sql-wasm.js',
  'vendor/sql-wasm.wasm',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req)
        .then((res) => { if (res.ok) cache.put(req, res.clone()); return res; })
        .catch(() => cached || (req.mode === 'navigate' ? cache.match('index.html') : undefined));
      return cached || network;
    })
  );
});

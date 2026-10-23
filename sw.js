// Service worker: guarda la app en el dispositivo para usarla sin internet.
// Estrategia: responde desde la caché al instante y, si hay internet, la actualiza
// en segundo plano (la versión nueva aparece la siguiente vez que abras la app).
// Si agregas un archivo nuevo, inclúyelo en ARCHIVOS (npm test lo verifica).
// Python (vendor/pyodide, ~50 MB) va en una caché aparte que se llena la primera vez que lo usas
// y no se borra al actualizar la app.
const CACHE = 'taller-datos-v3';
const CACHE_PY = 'taller-datos-python-0.26.4';
const ARCHIVOS_PYTHON = [
  'vendor/pyodide/pyodide.mjs',
  'vendor/pyodide/pyodide.asm.js',
  'vendor/pyodide/pyodide.asm.wasm',
  'vendor/pyodide/python_stdlib.zip',
  'vendor/pyodide/pyodide-lock.json',
  'vendor/pyodide/numpy-1.26.4-cp312-cp312-pyodide_2024_0_wasm32.whl',
  'vendor/pyodide/pandas-2.2.0-cp312-cp312-pyodide_2024_0_wasm32.whl',
  'vendor/pyodide/python_dateutil-2.9.0.post0-py2.py3-none-any.whl',
  'vendor/pyodide/pytz-2024.1-py2.py3-none-any.whl',
  'vendor/pyodide/six-1.16.0-py2.py3-none-any.whl',
];
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
  'js/python-engine.js',
  'js/laboratorio-python.js',
  'js/claves.js',
  'data/temas.js',
  'data/contextos.js',
  'data/conceptos.js',
  'data/dataset.sql',
  'data/python-lab.js',
  'data/claves.js',
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
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== CACHE_PY).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // Python: primero la caché; si no está, se descarga una vez y se guarda.
  if (url.pathname.includes('/vendor/pyodide/')) {
    e.respondWith(caches.open(CACHE_PY).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) return cached;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    }));
    return;
  }
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

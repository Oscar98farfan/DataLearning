// Valida todo el contenido antes de subir cambios:  npm test
//  1. IDs únicos y campos obligatorios en cada ejercicio.
//  2. Cada solución escrita pasa su propio corrector.
//  3. Cada solución SQL ejecutable corre sin error en data/dataset.sql.
//  4. Los términos relacionados del glosario existen.
//  5. El service worker incluye todos los archivos de la app.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { BANK } from '../data/ejercicios/index.js';
import { TOPICS } from '../data/temas.js';
import { GLOS, FLOW } from '../data/conceptos.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errores = [];
const err = (m) => errores.push(m);
const norm = (s) => s.toLowerCase().replace(/["“”‘’`´]/g, "'").replace(/\s+/g, '').replace(/;+$/, '');

// 1 y 2
const ids = new Set();
for (const x of BANK) {
  if (!x.id) err(`Ejercicio sin id: ${x.q}`);
  if (ids.has(x.id)) err(`id repetido: ${x.id}`);
  ids.add(x.id);
  if (!TOPICS[x.t]) err(`${x.id}: tema desconocido ${x.t}`);
  if (![1, 2, 3].includes(x.l)) err(`${x.id}: nivel inválido`);
  if (x.k === 'w') {
    if (!x.s || !Array.isArray(x.r) || !x.r.length) { err(`${x.id}: falta solución o corrector`); continue; }
    const sol = norm(x.s.replace(/#.*$/gm, ''));
    if (!x.r.every((re) => re.test(sol))) err(`${x.id}: la solución no pasa su propio corrector`);
  } else if (x.k === 'm') {
    if (!Array.isArray(x.o) || !(x.c >= 0 && x.c < x.o.length)) err(`${x.id}: opción correcta fuera de rango`);
  } else err(`${x.id}: tipo desconocido ${x.k}`);
}

// 3
const require = createRequire(import.meta.url);
const initSqlJs = require(path.join(root, 'vendor/sql-wasm.js'));
const SQL = await initSqlJs({ locateFile: (f) => path.join(root, 'vendor', f) });
const db = new SQL.Database();
db.exec(readFileSync(path.join(root, 'data/dataset.sql'), 'utf8'));
let ejecutables = 0;
for (const x of BANK.filter((e) => e.run)) {
  ejecutables++;
  try {
    const r = db.exec(x.s);
    if (!r.length || !r[r.length - 1].values.length) err(`${x.id}: la solución SQL no devuelve filas con los datos de práctica`);
  } catch (e) { err(`${x.id}: la solución SQL falla: ${e.message}`); }
}

// 4
const terms = new Set(GLOS.map((g) => g.t));
for (const r of [...GLOS.flatMap((g) => g.r), ...FLOW.flatMap((f) => f.r)]) if (!terms.has(r)) err(`Glosario: término relacionado inexistente "${r}"`);

// 5
const sw = readFileSync(path.join(root, 'sw.js'), 'utf8');
const listar = (d) => readdirSync(path.join(root, d)).flatMap((f) => {
  const rel = path.posix.join(d, f);
  return statSync(path.join(root, rel)).isDirectory() ? listar(rel) : [rel];
});
for (const f of ['index.html', 'manifest.webmanifest', ...['css', 'js', 'data', 'vendor'].flatMap(listar)].filter((f) => !f.endsWith('package.json'))) {
  if (!sw.includes(`'${f}'`)) err(`sw.js no incluye ${f} (no funcionaría sin internet)`);
}

const porTema = Object.keys(TOPICS).map((t) => `${t}:${BANK.filter((x) => x.t === t).length}`).join(' ');
console.log(`Ejercicios: ${BANK.length} (${porTema}) · SQL ejecutables: ${ejecutables} · Glosario: ${GLOS.length}`);
if (errores.length) { console.error(`\n✗ ${errores.length} problema(s):\n- ` + errores.join('\n- ')); process.exit(1); }
console.log('✓ Todo en orden');

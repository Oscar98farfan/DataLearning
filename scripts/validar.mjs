// Valida todo el contenido antes de subir cambios:  npm test
//  1. IDs únicos y campos obligatorios en cada ejercicio.
//  2. Cada solución escrita pasa su propio corrector.
//  3. Cada solución SQL ejecutable corre sin error en data/dataset.sql.
//  4. Los términos relacionados del glosario existen.
//  5. El service worker incluye todos los archivos de la app.
//  6. Los ejemplos del laboratorio de Python y las soluciones de Python/Pandas corren sin error.
//  7. Las claves usan áreas válidas.
//  8. index.html tiene los contenedores bien cerrados y cada pestaña al nivel correcto.
//  9. Cada reto de Git se resuelve con su solución (y no viene resuelto).
// 10. El RAG del laboratorio de IA responde las preguntas de ejemplo.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { BANK } from '../data/ejercicios/index.js';
import { TOPICS } from '../data/temas.js';
import { GLOS, FLOWS } from '../data/conceptos.js';
import { SETUP_LAB, SETUP_PRACTICA, EJEMPLOS_PY, CATS_PY } from '../data/python-lab.js';
import { CLAVES, AREAS_CLAVES } from '../data/claves.js';
import { HELPERS } from '../js/python-engine.js';
import { Repo } from '../js/git-engine.js';
import { RETOS } from '../data/git-retos.js';
import { recuperar, responder } from '../js/ia-engine.js';
import { PREGUNTAS } from '../data/ia-lab.js';

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
for (const r of [...GLOS.flatMap((g) => g.r), ...FLOWS.flatMap((fl) => fl.steps).flatMap((f) => f.r)]) if (!terms.has(r)) err(`Glosario: término relacionado inexistente "${r}"`);

// 5
const sw = readFileSync(path.join(root, 'sw.js'), 'utf8');
const listar = (d) => readdirSync(path.join(root, d)).flatMap((f) => {
  const rel = path.posix.join(d, f);
  return statSync(path.join(root, rel)).isDirectory() ? listar(rel) : [rel];
});
for (const f of ['index.html', 'manifest.webmanifest', ...['css', 'js', 'data', 'vendor'].flatMap(listar)].filter((f) => !f.endsWith('package.json'))) {
  if (!sw.includes(`'${f}'`)) err(`sw.js no incluye ${f} (no funcionaría sin internet)`);
}

// 6
console.log('Probando Python (Pyodide)…');
const { loadPyodide } = await import(path.join(root, 'vendor/pyodide/pyodide.mjs'));
const py = await loadPyodide({ indexURL: path.join(root, 'vendor/pyodide') + path.sep, stdout: () => {}, stderr: () => {} });
await py.loadPackage(['pandas'], { messageCallback: () => {} });
py.runPython(HELPERS);
const ejecutar = py.globals.get('__ejecutar');
const tablas = {};
for (const t of ['empleados', 'ventas', 'ventas_mes', 'ventas_mes_region']) {
  const r = db.exec(`SELECT * FROM ${t}`)[0];
  tablas[t] = JSON.stringify(r.values.map((row) => Object.fromEntries(r.columns.map((c, i) => [c, row[i]]))));
}
const nuevoNs = (setup, extra = {}) => {
  const G = py.globals.get('dict')();
  for (const [k, v] of Object.entries(extra)) G.set(k, py.toPy(v));
  const [, e] = ejecutar(setup, G).toJs();
  if (e) err(`Python: el código de arranque falla: ${e[0]}: ${e[1]}`);
  return G;
};
let pyOk = 0;
for (const ej of EJEMPLOS_PY) {
  if (!CATS_PY[ej.c]) err(`Ejemplo de Python "${ej.t}": categoría desconocida ${ej.c}`);
  const [, e] = ejecutar(ej.code, nuevoNs(SETUP_LAB, { _tablas: tablas })).toJs();
  if (e) err(`Ejemplo de Python "${ej.t}" falla en la línea ${e[2]}: ${e[0]}: ${e[1]}`); else pyOk++;
}
for (const x of BANK.filter((e) => (e.t === 'py' || e.t === 'pd') && e.k === 'w')) {
  const [, e] = ejecutar(x.s, nuevoNs(SETUP_PRACTICA + (x.pre ? '\n' + x.pre : ''))).toJs();
  if (e) err(`${x.id}: la solución falla en Python: ${e[0]}: ${e[1]}`); else pyOk++;
}

// 7
for (const c of CLAVES) if (!AREAS_CLAVES[c.a]) err(`Clave "${c.t}": área desconocida ${c.a}`);

// 8
{
  const html = readFileSync(path.join(root, 'index.html'), 'utf8');
  let prof = 0;
  for (const m of html.matchAll(/<(\/?)div\b([^>]*)>/g)) {
    if (m[1]) { prof--; continue; }
    const id = (m[2].match(/id="([^"]+)"/) || [])[1] || '';
    if (id.startsWith('view-') && prof !== 1) err(`index.html: la pestaña ${id} quedó dentro de otro contenedor (nivel ${prof}); falta cerrar un </div>`);
    if (id.startsWith('lab-') && prof !== 2) err(`index.html: el laboratorio ${id} quedó en el nivel ${prof}; revisa los </div>`);
    prof++;
  }
  if (prof !== 0) err(`index.html: hay ${prof > 0 ? prof + ' <div> sin cerrar' : -prof + ' </div> de más'}`);
}

// 9
for (const r of RETOS) {
  const repo = new Repo();
  try {
    for (const x of r.setup) { if (typeof x === 'function') x(repo); else { const o = repo.run(x); if (/^(error|fatal)/m.test(o)) throw new Error(`${x} → ${o}`); } }
    if (r.check(repo)) err(`Reto de Git ${r.id}: ya viene resuelto antes de empezar`);
    for (const x of r.solucion) { if (typeof x === 'function') x(repo); else if (!x.startsWith('#')) repo.run(x); }
    if (!r.check(repo)) err(`Reto de Git ${r.id}: la solución no cumple el objetivo`);
  } catch (e) { err(`Reto de Git ${r.id}: falla la preparación: ${e.message}`); }
}

// 10
for (const q of PREGUNTAS) {
  const rol = /quincena|nómina/i.test(q) ? 'rrhh' : 'empleado';
  const { elegidos } = recuperar(q, { rol, k: 2 });
  if (!responder(q, elegidos).fuente) err(`Laboratorio de IA: la pregunta "${q}" no encuentra respuesta`);
}

const porTema = Object.keys(TOPICS).map((t) => `${t}:${BANK.filter((x) => x.t === t).length}`).join(' ');
console.log(`Ejercicios: ${BANK.length} (${porTema}) · SQL ejecutables: ${ejecutables} · Python probado: ${pyOk} · Glosario: ${GLOS.length} · Claves: ${CLAVES.length} · Retos Git: ${RETOS.length}`);
if (errores.length) { console.error(`\n✗ ${errores.length} problema(s):\n- ` + errores.join('\n- ')); process.exit(1); }
console.log('✓ Todo en orden');

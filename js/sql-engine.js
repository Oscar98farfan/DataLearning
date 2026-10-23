// Motor SQL en el navegador: SQLite compilado a WebAssembly (sql.js).
// Funciona sin internet porque vendor/ trae el motor y data/dataset.sql los datos.
import { esc } from './util.js';

let SQLPromise = null;
let seedSql = null;

function loadScript(src) {
  return new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = () => fail(new Error('No se pudo cargar ' + src));
    document.head.append(s);
  });
}

async function engine() {
  if (!SQLPromise) {
    SQLPromise = (async () => {
      if (!window.initSqlJs) await loadScript('vendor/sql-wasm.js');
      const SQL = await window.initSqlJs({ locateFile: (f) => 'vendor/' + f });
      const res = await fetch('data/dataset.sql');
      if (!res.ok) throw new Error('No se pudo leer data/dataset.sql');
      seedSql = await res.text();
      return SQL;
    })();
    SQLPromise.catch(() => { SQLPromise = null; });
  }
  return SQLPromise;
}

// Crea una base nueva con los datos de práctica.
export async function newDatabase() {
  const SQL = await engine();
  const db = new SQL.Database();
  db.exec(seedSql);
  return db;
}

// Ejecuta y devuelve el último resultado: { columns, values } · { columns:[], values:[], changes } · { error }
export function run(db, sql) {
  try {
    const out = db.exec(sql);
    if (!out.length) return { columns: [], values: [], changes: db.getRowsModified() };
    return out[out.length - 1];
  } catch (e) {
    return { error: traducirError(e.message) };
  }
}

// Ejecuta sin dejar cambios en la base (para validar ejercicios).
export function runIsolated(db, sql) {
  db.exec('SAVEPOINT intento');
  try { return run(db, sql); }
  finally { try { db.exec('ROLLBACK TO intento; RELEASE intento'); } catch { /* la consulta cerró la transacción */ } }
}

function traducirError(m) {
  const pistas = [
    [/no such table: (\S+)/, (x) => `La tabla ${x[1]} no existe. Revisa el nombre.`],
    [/no such column: (\S+)/, (x) => `La columna ${x[1]} no existe. Revisa el nombre o el alias.`],
    [/near "(.+?)": syntax error/, (x) => `Error de sintaxis cerca de "${x[1]}".`],
    [/incomplete input/, () => 'La consulta está incompleta (¿falta cerrar un paréntesis?).'],
    [/misuse of aggregate/, () => 'Uso incorrecto de una función de agregación (¿falta GROUP BY o debías usar HAVING?).'],
    [/misuse of window function/, () => 'No puedes usar una función de ventana en WHERE. Calcúlala en una CTE y filtra afuera.'],
  ];
  for (const [re, f] of pistas) { const x = m.match(re); if (x) return f(x) + ` (${m})`; }
  return m;
}

// Compara dos resultados ignorando nombres de columnas. Si ordered es falso, ignora el orden de filas.
export function sameResult(a, b, ordered) {
  if (!a || !b || a.error || b.error) return false;
  if (a.columns.length !== b.columns.length || a.values.length !== b.values.length) return false;
  const key = (row) => JSON.stringify(row.map((v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v)));
  const ka = a.values.map(key), kb = b.values.map(key);
  if (!ordered) { ka.sort(); kb.sort(); }
  return ka.every((k, i) => k === kb[i]);
}

export function resultHtml(r, max = 50) {
  if (r.error) return `<div class="fb bad"><span><strong>Error:</strong> ${esc(r.error)}</span></div>`;
  if (!r.columns.length) return `<p class="small" style="margin:0">Ejecutado. Filas modificadas: ${r.changes ?? 0}.</p>`;
  const rows = r.values.slice(0, max);
  const fmt = (v) => (v === null ? '<span class="null">NULL</span>' : typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(2) : esc(v));
  return `<div class="tbl res"><table><thead><tr>${r.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
  <tbody>${rows.map((row) => `<tr>${row.map((v) => `<td>${fmt(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
  <p class="small" style="margin:0">${r.values.length} fila${r.values.length === 1 ? '' : 's'}${r.values.length > max ? ` (se muestran ${max})` : ''}</p>`;
}

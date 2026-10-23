// Pestaña "Laboratorio SQL": consultas libres contra los datos de práctica.
import { $, esc, insertAt, store } from './util.js';
import { newDatabase, run, resultHtml } from './sql-engine.js';
import { highlight, makeEditor, setCode, selectedCode } from './highlight.js';
import { LEVELS } from '../data/temas.js';

let db = null;

const TABLAS = {
  empleados: 'Las personas de la empresa: área (depto), salario y fecha de ingreso.',
  ventas: 'Cada venta: quién la hizo (empleado_id → empleados.id), cuándo y por cuánto.',
  ventas_mes: 'El total vendido en cada mes (2025-01 a 2026-06). Ideal para LAG.',
  ventas_mes_region: 'Total por región (Norte, Centro, Sur) y mes de 2025. Ideal para PARTITION BY.',
};

const EJEMPLOS = [
  { l: 1, t: 'Ver todo', d: 'Trae todas las filas y columnas de una tabla. El * significa "todas las columnas".',
    q: 'SELECT *\nFROM empleados;' },
  { l: 1, t: 'Elegir columnas y filtrar', d: 'Solo nombre y salario de quienes ganan más de 4000, del mayor al menor.',
    q: 'SELECT nombre, salario\nFROM empleados\nWHERE salario > 4000\nORDER BY salario DESC;' },
  { l: 2, t: 'Agrupar y contar', d: 'Cuántas personas hay en cada área y su salario promedio. GROUP BY junta las filas por depto.',
    q: 'SELECT depto,\n  COUNT(*) AS personas,\n  ROUND(AVG(salario)) AS salario_promedio\nFROM empleados\nGROUP BY depto\nORDER BY personas DESC;' },
  { l: 2, t: 'Unir tablas (JOIN)', d: 'Total vendido por cada vendedor. JOIN conecta cada venta con el nombre del empleado.',
    q: 'SELECT e.nombre,\n  COUNT(*) AS ventas,\n  SUM(v.monto) AS total\nFROM ventas v\nJOIN empleados e ON e.id = v.empleado_id\nGROUP BY e.nombre\nORDER BY total DESC;' },
  { l: 2, t: 'Clasificar con CASE', d: 'Crea una columna nueva según una condición, como un SI() de Excel.',
    q: "SELECT nombre, salario,\n  CASE\n    WHEN salario >= 5000 THEN 'Alto'\n    WHEN salario >= 3500 THEN 'Medio'\n    ELSE 'Base'\n  END AS rango\nFROM empleados;" },
  { l: 3, t: 'CTE + LAG: crecimiento mensual', d: 'La CTE (WITH) calcula el total del mes anterior con LAG; afuera se calcula el % de crecimiento.',
    q: 'WITH base AS (\n  SELECT mes, total,\n    LAG(total) OVER (ORDER BY mes) AS anterior\n  FROM ventas_mes\n)\nSELECT mes, total, anterior,\n  ROUND((total - anterior) * 100.0 / anterior, 1) AS crecimiento_pct\nFROM base;' },
  { l: 3, t: 'El mejor pagado de cada área', d: 'ROW_NUMBER numera dentro de cada depto (PARTITION BY); luego se queda con el número 1.',
    q: 'WITH ranking AS (\n  SELECT nombre, depto, salario,\n    ROW_NUMBER() OVER (PARTITION BY depto ORDER BY salario DESC) AS rn\n  FROM empleados\n)\nSELECT nombre, depto, salario\nFROM ranking\nWHERE rn = 1;' },
  { l: 3, t: 'Acumulado y promedio móvil', d: 'SUM OVER acumula mes a mes por región; AVG con ROWS BETWEEN promedia los últimos 3 meses.',
    q: 'SELECT region, mes, total,\n  SUM(total) OVER (PARTITION BY region ORDER BY mes) AS acumulado,\n  ROUND(AVG(total) OVER (\n    PARTITION BY region ORDER BY mes\n    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)) AS promedio_3m\nFROM ventas_mes_region;' },
];

async function ensure() {
  if (!db) {
    db = await newDatabase();
    renderSchema();
  }
  return db;
}

function renderSchema() {
  const box = $('#labSchema');
  box.innerHTML = Object.entries(TABLAS).map(([name, desc]) => {
    const cols = run(db, `PRAGMA table_info(${name})`).values;
    const n = run(db, `SELECT COUNT(*) FROM ${name}`).values[0][0];
    return `<article class="tcard"><div class="tcard-top"><h3>${name}</h3><span class="small">${n} filas</span></div>
      <p>${esc(desc)}</p>
      <div class="cols">${cols.map((c) => `<button type="button" class="col" data-col="${esc(c[1])}" title="Agregar al editor">${esc(c[1])}<i>${(c[2] || '').toLowerCase() === 'integer' ? 'número' : 'texto'}</i></button>`).join('')}</div>
      <button class="btn" type="button" data-tbl="${name}">Ver datos de ${name}</button></article>`;
  }).join('');
  box.querySelectorAll('[data-tbl]').forEach((b) => (b.onclick = () => load(`SELECT *\nFROM ${b.dataset.tbl}\nLIMIT 20;`, true)));
  box.querySelectorAll('[data-col]').forEach((b) => (b.onclick = () => insertAt($('#labSql'), b.dataset.col)));
}

function load(sql, runNow) {
  setCode($('#labSql'), sql);
  $('#labEditor').scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (runNow) exec();
}

async function exec() {
  const ta = $('#labSql');
  const sel = selectedCode(ta);
  const sql = sel.trim() ? sel : ta.value;
  if (!sql.trim()) { $('#labOut').innerHTML = '<p class="small" style="margin:0">El editor está vacío. Escribe una consulta, por ejemplo <code>SELECT * FROM empleados;</code></p>'; return; }
  store.set('pe_lab', ta.value);
  try {
    const d = await ensure();
    const r = run(d, sql);
    $('#labOut').innerHTML = `<div class="label">Resultado${sel.trim() ? ' (solo la selección)' : ''}</div>` + resultHtml(r, 200);
    if (!r.error && !r.columns.length) renderSchema();
  } catch (e) {
    $('#labOut').innerHTML = `<div class="fb bad"><span>${esc(e.message)}</span></div>`;
  }
}

export function initLaboratorio() {
  const ta = $('#labSql');
  makeEditor(ta, 'sql');
  setCode(ta, store.get('pe_lab', 'SELECT *\nFROM empleados;'));
  $('#labEx').innerHTML = EJEMPLOS.map((e, i) => `<article class="example"><div class="tcard-top"><h3>${e.t}</h3><span class="lvl">${LEVELS[e.l]}</span></div>
    <p>${e.d}</p><pre class="code">${highlight(e.q, 'sql')}</pre>
    <div class="row"><button class="btn primary" type="button" data-ex="${i}">Cargar y ejecutar</button></div></article>`).join('');
  $('#labEx').querySelectorAll('[data-ex]').forEach((b) => (b.onclick = () => load(EJEMPLOS[+b.dataset.ex].q, true)));
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') { e.preventDefault(); insertAt(ta, '    '); }
    else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); exec(); }
  });
  $('#labRun').onclick = exec;
  $('#labClear').onclick = () => { setCode(ta, ''); $('#labOut').innerHTML = ''; ta.focus(); };
  $('#labReset').onclick = async () => { db = null; await ensure(); $('#labOut').innerHTML = '<p class="small" style="margin:0">Listo: los datos volvieron a su estado original.</p>'; };
}

// Se llama al abrir la pestaña: carga el motor y muestra las tablas.
export async function openLaboratorio() {
  try { await ensure(); }
  catch (e) { $('#labSchema').innerHTML = `<div class="fb bad"><span>${esc(e.message)}</span></div>`; }
}

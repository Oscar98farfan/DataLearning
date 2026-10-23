// Pestaña "Laboratorio SQL": consultas libres contra los datos de práctica.
import { $, esc, insertAt, store } from './util.js';
import { newDatabase, run, resultHtml } from './sql-engine.js';

let db = null;

const EJEMPLOS = [
  ['Ver empleados', 'SELECT * FROM empleados;'],
  ['Ventas por vendedor', `SELECT e.nombre, COUNT(*) AS ventas, SUM(v.monto) AS total
FROM ventas v
JOIN empleados e ON e.id = v.empleado_id
GROUP BY e.nombre
ORDER BY total DESC;`],
  ['CTE + LAG', `WITH base AS (
  SELECT mes, total,
    LAG(total) OVER (ORDER BY mes) AS anterior
  FROM ventas_mes
)
SELECT mes, total, anterior,
  ROUND((total - anterior) * 100.0 / anterior, 1) AS crecimiento_pct
FROM base;`],
  ['Top 1 por depto', `WITH r AS (
  SELECT nombre, depto, salario,
    ROW_NUMBER() OVER (PARTITION BY depto ORDER BY salario DESC) AS rn
  FROM empleados
)
SELECT * FROM r WHERE rn = 1;`],
  ['Acumulado por región', `SELECT region, mes, total,
  SUM(total) OVER (PARTITION BY region ORDER BY mes) AS acumulado
FROM ventas_mes_region;`],
];

async function ensure() {
  if (!db) {
    $('#labOut').innerHTML = '<p class="small" style="margin:0">Cargando el motor SQL…</p>';
    db = await newDatabase();
    $('#labOut').innerHTML = '';
    renderSchema();
  }
  return db;
}

function renderSchema() {
  const t = run(db, "SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name");
  if (t.error) return;
  $('#labSchema').innerHTML = t.values.map(([name]) => {
    const cols = run(db, `PRAGMA table_info(${name})`).values.map((c) => `${c[1]} <span class="ty">${c[2] || ''}</span>`).join(', ');
    const n = run(db, `SELECT COUNT(*) FROM ${name}`).values[0][0];
    return `<div class="schema-row"><button type="button" class="linkbtn" data-tbl="${esc(name)}">${esc(name)}</button> <span class="small">(${n} filas)</span><div class="small mono">${cols}</div></div>`;
  }).join('');
  $('#labSchema').querySelectorAll('[data-tbl]').forEach((b) => (b.onclick = () => { $('#labSql').value = `SELECT * FROM ${b.dataset.tbl} LIMIT 20;`; exec(); }));
}

async function exec() {
  const sql = $('#labSql').value;
  if (!sql.trim()) return;
  store.set('pe_lab', sql);
  try {
    const d = await ensure();
    const t0 = performance.now();
    const r = run(d, sql);
    $('#labOut').innerHTML = resultHtml(r, 200) + (r.error ? '' : `<p class="small" style="margin:0">${Math.round(performance.now() - t0)} ms</p>`);
    if (!r.error && !r.columns.length) renderSchema();
  } catch (e) {
    $('#labOut').innerHTML = `<div class="fb bad"><span>${esc(e.message)}</span></div>`;
  }
}

export function initLaboratorio() {
  const ta = $('#labSql');
  ta.value = store.get('pe_lab', EJEMPLOS[2][1]);
  const ex = $('#labEx');
  EJEMPLOS.forEach(([n, q]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.textContent = n;
    b.onclick = () => { ta.value = q; exec(); };
    ex.append(b);
  });
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') { e.preventDefault(); insertAt(ta, '    '); }
    else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); exec(); }
  });
  $('#labRun').onclick = exec;
  $('#labReset').onclick = async () => { db = null; await ensure(); $('#labOut').innerHTML = '<p class="small" style="margin:0">Datos restaurados al estado original.</p>'; };
}

// Se llama al abrir la pestaña: carga el motor y muestra las tablas.
export async function openLaboratorio() { try { await ensure(); } catch (e) { $('#labOut').innerHTML = `<div class="fb bad"><span>${esc(e.message)}</span></div>`; } }

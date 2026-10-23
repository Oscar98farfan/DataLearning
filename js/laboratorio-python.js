// Laboratorio de Python: código libre con pandas sobre los mismos datos del laboratorio SQL.
import { $, esc, insertAt, store, chip } from './util.js';
import { highlight, makeEditor, setCode, selectedCode } from './highlight.js';
import { loadPython, newNamespace, runPython, pythonResultHtml, pythonReady } from './python-engine.js';
import { newDatabase, run } from './sql-engine.js';
import { SETUP_LAB, DATOS_PY, CATS_PY, EJEMPLOS_PY } from '../data/python-lab.js';
import { LEVELS } from '../data/temas.js';

let G = null;          // variables del laboratorio (se conservan entre ejecuciones)
let catSel = 'all';
let busy = false;

const status = (m) => { $('#pyStatus').textContent = m; $('#pyStatus').hidden = !m; };

// Las tablas SQL pasan a Python como JSON para que ambos laboratorios usen los mismos datos.
async function tablasJson() {
  const db = await newDatabase();
  const out = {};
  for (const t of ['empleados', 'ventas', 'ventas_mes', 'ventas_mes_region']) {
    const r = run(db, `SELECT * FROM ${t}`);
    out[t] = JSON.stringify(r.values.map((row) => Object.fromEntries(r.columns.map((c, i) => [c, row[i]]))));
  }
  db.close();
  return out;
}

async function ensure() {
  if (G) return G;
  $('#pyStart').hidden = true;
  status('Preparando…');
  await loadPython(status);
  status('Cargando los datos…');
  G = await newNamespace(SETUP_LAB, { _tablas: await tablasJson() });
  store.set('pe_py_ok', true);
  status('');
  await renderDatos();
  return G;
}

async function renderDatos() {
  const nombres = JSON.stringify(DATOS_PY.map((d) => d.n));
  const info = await runPython(`import json as _json\nprint(_json.dumps({n: [list(map(str, globals()[n].columns)), list(map(str, globals()[n].dtypes)), len(globals()[n])] for n in ${nombres}}))\ndel _json`, G);
  let meta = {};
  try { meta = JSON.parse(info.stdout); } catch { meta = {}; }
  $('#pyDatos').innerHTML = DATOS_PY.map(({ n, d }) => {
    const [cols = [], tipos = [], filas = '?'] = meta[n] || [];
    return `<article class="tcard"><div class="tcard-top"><h3>${n}</h3><span class="small">${filas} filas</span></div><p>${esc(d)}</p>
      <div class="cols">${cols.map((c, i) => `<button type="button" class="col" data-pycol="${esc(c)}" title="Agregar al editor">${esc(c)}<i>${tipoLegible(tipos[i])}</i></button>`).join('')}</div>
      <button class="btn" type="button" data-pyver="${n}">Ver ${n}</button></article>`;
  }).join('');
  $('#pyDatos').querySelectorAll('[data-pyver]').forEach((b) => (b.onclick = () => load(`${b.dataset.pyver}.head(10)`, true)));
  $('#pyDatos').querySelectorAll('[data-pycol]').forEach((b) => (b.onclick = () => insertAt($('#pyCode'), `"${b.dataset.pycol}"`)));
}

const tipoLegible = (t = '') => (t.startsWith('int') ? 'entero' : t.startsWith('float') ? 'decimal' : t.startsWith('datetime') ? 'fecha' : t === 'bool' ? 'sí/no' : 'texto');

function load(code, runNow) {
  setCode($('#pyCode'), code);
  $('#pyEditor').scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (runNow) exec();
}

async function exec() {
  if (busy) return;
  const ta = $('#pyCode');
  const sel = selectedCode(ta);
  const code = sel.trim() ? sel : ta.value;
  if (!code.trim()) { $('#pyOut').innerHTML = '<p class="small" style="margin:0">El editor está vacío. Prueba con <code>ventas.head()</code></p>'; return; }
  store.set('pe_py', ta.value);
  busy = true; $('#pyRun').disabled = true;
  try {
    if (!G) $('#pyOut').innerHTML = '';
    await ensure();
    const t0 = performance.now();
    const r = await runPython(code, G);
    $('#pyOut').innerHTML = `<div class="label">Resultado${sel.trim() ? ' (solo la selección)' : ''}</div>` + pythonResultHtml(r) + `<p class="small" style="margin:0">${Math.round(performance.now() - t0)} ms</p>`;
  } catch (e) {
    status('');
    $('#pyStart').hidden = false;
    $('#pyOut').innerHTML = `<div class="fb bad"><span>No se pudo iniciar Python. ${navigator.onLine ? '' : 'La primera vez necesitas internet para descargarlo. '}(${esc(e.message)})</span></div>`;
  } finally { busy = false; $('#pyRun').disabled = false; }
}

function renderEjemplos() {
  const cc = $('#pyCats'); cc.innerHTML = '';
  cc.append(chip(`Todos (${EJEMPLOS_PY.length})`, catSel === 'all', () => { catSel = 'all'; renderEjemplos(); }));
  for (const [k, v] of Object.entries(CATS_PY)) cc.append(chip(v, catSel === k, () => { catSel = k; renderEjemplos(); }));
  const list = EJEMPLOS_PY.map((e, i) => [e, i]).filter(([e]) => catSel === 'all' || e.c === catSel);
  $('#pyEx').innerHTML = list.map(([e, i]) => `<article class="example"><div class="tcard-top"><h3>${e.t}</h3><span class="lvl">${CATS_PY[e.c]} · ${LEVELS[e.l]}</span></div>
    <p>${e.d}</p><pre class="code">${highlight(e.code, 'python')}</pre>
    <div class="row"><button class="btn primary" type="button" data-pyex="${i}">Cargar y ejecutar</button></div></article>`).join('');
  $('#pyEx').querySelectorAll('[data-pyex]').forEach((b) => (b.onclick = () => load(EJEMPLOS_PY[+b.dataset.pyex].code, true)));
}

export function initLabPython() {
  const ta = $('#pyCode');
  makeEditor(ta, 'python');
  setCode(ta, store.get('pe_py', '# Escribe tu código y toca Ejecutar\nventas.head()'));
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') { e.preventDefault(); insertAt(ta, '    '); }
    else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); exec(); }
  });
  $('#pyStart').onclick = () => exec();
  $('#pyRun').onclick = exec;
  $('#pyClear').onclick = () => { setCode(ta, ''); $('#pyOut').innerHTML = ''; ta.focus(); };
  $('#pyReset').onclick = async () => {
    if (!pythonReady()) return;
    G = null; $('#pyOut').innerHTML = '';
    await ensure();
    $('#pyOut').innerHTML = '<p class="small" style="margin:0">Listo: se borraron tus variables y los datos volvieron a su estado original.</p>';
  };
  renderEjemplos();
}

// Al abrir el laboratorio de Python: si ya se descargó antes, arranca solo.
export function openLabPython() {
  if (!G && store.get('pe_py_ok', false)) ensure().catch(() => { status(''); $('#pyStart').hidden = false; });
}

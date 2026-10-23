// Pestaña "Practicar": filtros, sesión de ejercicios, validación y progreso.
import { TOPICS, LEVELS } from '../data/temas.js';
import { BANK } from '../data/ejercicios/index.js';
import { $, esc, norm, shuffle, chip, store, insertAt } from './util.js';
import { newDatabase, runIsolated, sameResult, resultHtml } from './sql-engine.js';
import { highlight, langFor, makeEditor, stripComments } from './highlight.js';
import { loadPython, newNamespace, runPython, pythonResultHtml } from './python-engine.js';
import { SETUP_PRACTICA } from '../data/python-lab.js';

const PROBAR_PY = (x) => (x.t === 'py' || x.t === 'pd') && x.k === 'w';

let prog = store.get('pe_prog', {});
let sel = store.get('pe_sel', { topics: Object.keys(TOPICS), levels: [1, 2, 3], kind: 'mix' });
// Activa los temas nuevos para quien ya tenía una selección guardada
{
  const vistos = store.get('pe_topics_seen', ['py', 'pd', 'sql', 'bi', 'git', 'arq']);
  for (const k of Object.keys(TOPICS)) if (!vistos.includes(k) && !sel.topics.includes(k)) sel.topics.push(k);
  store.set('pe_topics_seen', Object.keys(TOPICS)); store.set('pe_sel', sel);
}
let queue = [], pos = 0, cur = null, tries = 0, answered = false;
let practiceDb = null;

const pool = () => BANK.filter((x) => sel.topics.includes(x.t) && sel.levels.includes(x.l) && (sel.kind === 'mix' || x.k === sel.kind));

function save() { store.set('pe_sel', sel); renderSetup(); }

export function renderSetup() {
  const tc = $('#topicChips'); tc.innerHTML = '';
  for (const [k, v] of Object.entries(TOPICS)) {
    tc.append(chip(v.n, sel.topics.includes(k), () => {
      sel.topics = sel.topics.includes(k) ? sel.topics.filter((x) => x !== k) : [...sel.topics, k]; save();
    }, v.c));
  }
  const lc = $('#levelChips'); lc.innerHTML = '';
  for (const [k, v] of Object.entries(LEVELS)) {
    const n = +k;
    lc.append(chip(v, sel.levels.includes(n), () => {
      sel.levels = sel.levels.includes(n) ? sel.levels.filter((x) => x !== n) : [...sel.levels, n]; save();
    }));
  }
  const kc = $('#kindChips'); kc.innerHTML = '';
  [['w', 'Escribir'], ['mix', 'Mixto'], ['m', 'Opción múltiple']].forEach(([k, v]) => kc.append(chip(v, sel.kind === k, () => { sel.kind = k; save(); })));
  const n = pool().length;
  $('#startBtn').textContent = n ? `Empezar práctica (${n})` : 'Elige al menos un tema y nivel';
  $('#startBtn').disabled = !n;
  const f = BANK.filter((x) => prog[x.id] === 'bad').length;
  $('#reviewBtn').textContent = `Repasar fallos (${f})`;
  $('#reviewBtn').disabled = !f;
}

export function renderStats() {
  const s = $('#stats'); s.innerHTML = '';
  for (const [k, v] of Object.entries(TOPICS)) {
    const all = BANK.filter((x) => x.t === k), ok = all.filter((x) => prog[x.id] === 'ok').length;
    s.insertAdjacentHTML('beforeend', `<div class="stat"><span class="small">${v.n}</span><b>${ok}/${all.length}</b><div class="bar" style="--c:${v.c}"><i style="width:${Math.round((ok / all.length) * 100)}%"></i></div></div>`);
  }
}

export function start(list) {
  // de básico a avanzado, aleatorio dentro de cada nivel; primero lo no resuelto
  queue = [1, 2, 3].flatMap((l) => {
    const g = shuffle(list.filter((x) => x.l === l));
    return [...g.filter((x) => prog[x.id] !== 'ok'), ...g.filter((x) => prog[x.id] === 'ok')];
  });
  pos = 0; show();
  $('#card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function startTopic(t) {
  sel = { topics: [t], levels: [1, 2, 3], kind: 'mix' }; save(); start(pool());
}

export const keysVisible = () => !!(cur && cur.k === 'w' && !$('#card').hidden && pos < queue.length);

function show() {
  const card = $('#card'); card.hidden = false;
  if (pos >= queue.length) {
    const ok = queue.filter((x) => prog[x.id] === 'ok').length;
    card.innerHTML = `<div class="label">Sesión terminada</div><p class="q">Resolviste ${ok} de ${queue.length}.</p><div class="row"><button class="btn primary" id="again" type="button">Otra ronda</button><button class="btn" id="close" type="button">Cerrar</button></div>`;
    $('#again').onclick = () => start(pool());
    $('#close').onclick = () => { card.hidden = true; $('#keys').hidden = true; };
    $('#keys').hidden = true; renderStats(); renderSetup(); return;
  }
  cur = queue[pos]; tries = 0; answered = false;
  const T = TOPICS[cur.t];
  let h = `<div class="qhead"><span class="row" style="gap:8px;align-items:center"><span class="tag" style="--c:${T.c}">${T.n}</span><span class="lvl">${LEVELS[cur.l]} · ${cur.k === 'w' ? (cur.run ? 'escribir y ejecutar' : 'escribir') : 'opción múltiple'}</span></span><span class="count">${pos + 1} / ${queue.length}</span></div>`;
  h += `<p class="q">${cur.q}</p>`;
  if (cur.c0) h += `<pre class="ctx">${esc(cur.c0)}</pre>`;
  if (cur.k === 'w') {
    h += `<textarea id="ans" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" placeholder="${cur.run ? 'Escribe tu consulta SQL' : 'Escribe tu código aquí'}"></textarea>
    <div class="row">${cur.run ? '<button class="btn" id="runBtn" type="button">Ejecutar</button>' : ''}${PROBAR_PY(cur) ? '<button class="btn" id="pyBtn" type="button">Probar</button>' : ''}<button class="btn primary grow" id="check" type="button">Comprobar</button>${cur.h ? '<button class="btn" id="hint" type="button">Pista</button>' : ''}<button class="btn ghost" id="sol" type="button">Ver solución</button></div>
    <div id="out"></div>`;
  } else {
    h += `<div class="opts">${cur.o.map((o, i) => `<button class="opt" type="button" data-i="${i}">${o}</button>`).join('')}</div>`;
  }
  h += `<div id="fb"></div><div class="row"><button class="btn ghost" id="skip" type="button">Saltar</button><button class="btn grow" id="next" type="button" hidden>Siguiente →</button></div>`;
  card.innerHTML = h;
  $('#keys').hidden = cur.k !== 'w';
  $('#skip').onclick = () => { pos++; show(); };
  $('#next').onclick = () => { pos++; show(); };
  if (cur.k === 'w') {
    const ta = $('#ans');
    makeEditor(ta, langFor(cur));
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') { e.preventDefault(); insertAt(ta, '    '); }
      else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); check(); }
    });
    $('#check').onclick = check;
    if (cur.run) $('#runBtn').onclick = runOnly;
    if (PROBAR_PY(cur)) $('#pyBtn').onclick = probarPython;
    if (cur.h) $('#hint').onclick = () => fb('info', `<span><strong>Pista:</strong> ${cur.h}</span>`);
    $('#sol').onclick = reveal;
  } else {
    card.querySelectorAll('.opt').forEach((b) => (b.onclick = () => pick(+b.dataset.i)));
  }
}

const fb = (kind, html) => { $('#fb').innerHTML = `<div class="fb ${kind}">${html}</div>`; };
const out = (html) => { $('#out').innerHTML = html; };

function mark(r) { prog[cur.id] = r; store.set('pe_prog', prog); renderStats(); renderSetup(); }

async function db() {
  if (!practiceDb) {
    out('<p class="small" style="margin:0">Cargando el motor SQL…</p>');
    practiceDb = await newDatabase();
    out('');
  }
  return practiceDb;
}

async function runOnly() {
  const v = $('#ans').value;
  if (!v.trim()) { fb('info', '<span>Escribe una consulta primero.</span>'); return; }
  try { out('<div class="label">Tu resultado</div>' + resultHtml(runIsolated(await db(), v))); }
  catch (e) { out(`<div class="fb bad"><span>${esc(e.message)}</span></div>`); }
}

// Ejecuta la respuesta en Python real con datos de ejemplo (no califica; solo muestra el resultado).
async function probarPython() {
  const v = $('#ans').value;
  if (!v.trim()) { fb('info', '<span>Escribe tu código primero.</span>'); return; }
  const btn = $('#pyBtn'); btn.disabled = true;
  try {
    out('<p class="small" style="margin:0">Iniciando Python… la primera vez descarga unos 50 MB y luego funciona sin internet.</p>');
    await loadPython((m) => m && out(`<p class="small" style="margin:0">${esc(m)}</p>`));
    const G = await newNamespace(SETUP_PRACTICA + (cur.pre ? '\n' + cur.pre : ''));
    const r = await runPython(v, G);
    out('<div class="label">Tu resultado (con datos de ejemplo)</div>' + pythonResultHtml(r));
  } catch (e) {
    out(`<div class="fb bad"><span>No se pudo iniciar Python. ${navigator.onLine ? '' : 'La primera vez necesitas internet. '}(${esc(e.message)})</span></div>`);
  } finally { if ($('#pyBtn')) $('#pyBtn').disabled = false; }
}

async function check() {
  const v = $('#ans').value;
  if (!v.trim()) { fb('info', '<span>Escribe una respuesta primero.</span>'); return; }
  let ok = cur.r.every((re) => re.test(norm(stripComments(v, langFor(cur)))));
  if (cur.run) {
    try {
      const d = await db();
      const mine = runIsolated(d, v), exp = runIsolated(d, cur.s);
      out('<div class="label">Tu resultado</div>' + resultHtml(mine));
      if (!ok) ok = sameResult(mine, exp, cur.ord);
    } catch (e) { out(`<div class="fb bad"><span>${esc(e.message)}</span></div>`); }
  }
  if (ok) { answered = true; mark('ok'); fb('ok', `<strong>Correcto.</strong>${solBlock()}`); done(); }
  else {
    tries++;
    fb('bad', `<span><strong>Aún no.</strong> ${cur.run ? 'Tu resultado no coincide con el esperado. ' : ''}${tries >= 2 ? 'Revisa la solución si te atascas.' : 'Revisa nombres, paréntesis y el orden.'}</span>`);
  }
}

function solBlock() { return `<pre class="code">${highlight(cur.s, langFor(cur))}</pre>${cur.e ? `<p class="exp">${cur.e}</p>` : ''}`; }

async function reveal() {
  answered = true;
  if (prog[cur.id] !== 'ok') mark('bad');
  let extra = '';
  if (cur.run) { try { extra = '<div class="label">Resultado esperado</div>' + resultHtml(runIsolated(await db(), cur.s)); } catch { /* sin motor */ } }
  fb('info', `<span><strong>Solución</strong></span>${solBlock()}${extra}<button class="linkbtn" id="valid" type="button" style="align-self:flex-start">Mi respuesta también era válida</button>`);
  $('#valid').onclick = () => { mark('ok'); fb('ok', '<strong>Marcado como correcto.</strong>' + solBlock()); };
  done();
}

function pick(i) {
  if (answered) return; answered = true;
  const bs = [...document.querySelectorAll('.opt')];
  bs[cur.c].classList.add('ok');
  if (i === cur.c) { mark('ok'); fb('ok', `<strong>Correcto.</strong>${cur.e ? `<p class="exp">${cur.e}</p>` : ''}`); }
  else { bs[i].classList.add('bad'); mark('bad'); fb('bad', `<span><strong>Incorrecto.</strong> La respuesta es: ${cur.o[cur.c]}</span>${cur.e ? `<p class="exp">${cur.e}</p>` : ''}`); }
  done();
}

function done() {
  $('#next').hidden = false; $('#skip').hidden = true;
  if (cur.k === 'w') { $('#check').disabled = true; $('#sol').disabled = true; }
}

export function resetProgress() { prog = {}; store.set('pe_prog', prog); renderStats(); renderSetup(); }

export function initPractica() {
  $('#startBtn').onclick = () => start(pool());
  $('#reviewBtn').onclick = () => start(BANK.filter((x) => prog[x.id] === 'bad'));
  renderSetup(); renderStats();
}

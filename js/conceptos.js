// Pestaña "Conceptos": recorrido de los datos, comparaciones, glosario y tarjetas de repaso.
import { CATS, GLOS, FLOWS, CMP, AREAS } from '../data/conceptos.js';
import { $, fold, chip, shuffle, store } from './util.js';

const slug = (s) => 'g-' + fold(s).replace(/[^a-z0-9]+/g, '-');
const GMAP = Object.fromEntries(GLOS.map((g) => [g.t, g]));
let gCat = 'all', gQuery = '', cmpI = 0;
let known = store.get('pe_known', {}), fdeck = [], fpos = 0, fshow = false;

const relBtns = (list) => {
  const l = list.filter((x) => GMAP[x]);
  return l.length ? '<div class="rel">' + l.map((x) => `<button type="button" data-go="${x}">${x}</button>`).join('') + '</div>' : '';
};

function renderFlow() {
  $('#flows').innerHTML = FLOWS.map((fl) => `<section class="panel" id="flow-${fl.id}"><h2>${fl.h}</h2><p class="lead">${fl.lead}</p>
    <ol class="flow">${fl.steps.map((f, i) => `${f.phase ? `<li class="phase-li"><span></span><div class="phase">${f.phase}</div></li>` : ''}<li><span class="num">${i + 1}</span><div style="min-width:0"><h3>${f.h}</h3><p>${f.p}</p>${f.medal ? `<div class="medal"><div class="m-br"><b>Bronze</b>Crudo, tal cual llegó</div><div class="m-si"><b>Silver</b>Limpio, sin duplicados</div><div class="m-go"><b>Gold</b>Métricas para el negocio</div></div>` : ''}${relBtns(f.r)}</div></li>`).join('')}</ol>
    ${fl.roles ? `<div class="label">En una frase</div><div class="roles">${fl.roles.map((r) => `<div class="role"><b>${r.t}</b><span>${r.v}</span></div>`).join('')}</div>` : ''}
    ${fl.note ? `<p class="note">${fl.note}</p>` : ''}${fl.topic ? `<button class="btn primary" type="button" data-practice="${fl.topic}">${fl.btn}</button>` : ''}</section>`).join('');
}

function renderCmp() {
  const cc = $('#cmpChips'); cc.innerHTML = '';
  for (const [a, nombre] of Object.entries(AREAS)) {
    const g = document.createElement('div'); g.className = 'cmp-group';
    g.innerHTML = `<div class="label">${nombre}</div>`;
    const row = document.createElement('div'); row.className = 'chips';
    CMP.forEach((c, i) => { if (c.a === a) row.append(chip(c.n, i === cmpI, () => { cmpI = i; renderCmp(); })); });
    g.append(row); cc.append(g);
  }
  const c = CMP[cmpI];
  $('#cmpBody').innerHTML = `<div class="tbl cmp"><table><thead><tr>${c.h.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${c.rows.map((r) => `<tr>${r.map((x) => `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="small" style="margin:6px 0 0">Desliza la tabla hacia los lados si no ves todas las columnas.</p>${c.note ? `<p class="note" style="margin-top:10px">${c.note}</p>` : ''}`;
}

function setCat(k) { gCat = k; renderGlos(); deckBuild(); renderFlash(); }

function renderGlos() {
  const gc = $('#gCats'); gc.innerHTML = '';
  gc.append(chip(`Todos (${GLOS.length})`, gCat === 'all', () => setCat('all')));
  for (const [k, v] of Object.entries(CATS)) gc.append(chip(`${v} (${GLOS.filter((g) => g.c === k).length})`, gCat === k, () => setCat(k)));
  const q = fold(gQuery.trim());
  const list = GLOS.filter((g) => (gCat === 'all' || g.c === gCat) && (!q || fold(g.t + ' ' + g.d + ' ' + g.e).includes(q)));
  $('#gCount').textContent = q ? `${list.length} resultado${list.length === 1 ? '' : 's'}` : `${list.length} términos`;
  $('#gList').innerHTML = list.length
    ? list.map((g) => `<article class="term" id="${slug(g.t)}"><div class="term-top"><h3>${g.t}</h3><span class="cat">${CATS[g.c]}</span></div><p>${g.d}</p>${g.e ? `<p class="ej"><b>Ejemplo:</b> ${g.e}</p>` : ''}${relBtns(g.r)}</article>`).join('')
    : '<p class="empty">No hay términos con esa búsqueda. Prueba con otra palabra o elige "Todos".</p>';
}

function goTerm(t) {
  gCat = 'all'; gQuery = ''; $('#gSearch').value = ''; renderGlos();
  const el = document.getElementById(slug(t)); if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  el.classList.add('flash-hl'); setTimeout(() => el.classList.remove('flash-hl'), 1800);
}

function deckBuild() {
  const l = GLOS.filter((g) => gCat === 'all' || g.c === gCat);
  fdeck = [...shuffle(l.filter((g) => !known[g.t])), ...shuffle(l.filter((g) => known[g.t]))];
  fpos = 0; fshow = false;
}

function renderFlash() {
  const box = $('#flashBox'), all = GLOS.filter((g) => gCat === 'all' || g.c === gCat), k = all.filter((g) => known[g.t]).length;
  const head = `<div class="qhead"><span class="small">${gCat === 'all' ? 'Todas las categorías' : CATS[gCat]}</span><span class="count">Dominados ${k} / ${all.length}</span></div>`;
  if (fpos >= fdeck.length) {
    box.innerHTML = head + `<div class="card-flash"><p class="q">Terminaste la ronda.</p><div class="row"><button class="btn primary" id="fAgain" type="button">Otra ronda</button></div></div>`;
    $('#fAgain').onclick = () => { deckBuild(); renderFlash(); };
    return;
  }
  const g = fdeck[fpos];
  box.innerHTML = head + `<div class="card-flash"><span class="cat">${CATS[g.c]} · ${fpos + 1} de ${fdeck.length}</span><div class="big">${g.t}</div>${fshow ? `<p class="exp">${g.d}</p>${g.e ? `<p class="small" style="margin:0"><b>Ejemplo:</b> ${g.e}</p>` : ''}` : '<p class="small" style="margin:0">¿Cómo lo explicarías con tus palabras?</p>'}</div>
  <div class="row">${fshow ? `<button class="btn grow" id="fNo" type="button">Repasar otra vez</button><button class="btn primary grow" id="fYes" type="button">Lo sé</button>` : `<button class="btn primary grow" id="fFlip" type="button">Voltear tarjeta</button><button class="btn ghost" id="fSkip" type="button">Saltar</button>`}</div>`;
  if (fshow) {
    $('#fYes').onclick = () => { known[g.t] = 1; store.set('pe_known', known); fpos++; fshow = false; renderFlash(); };
    $('#fNo').onclick = () => { delete known[g.t]; store.set('pe_known', known); fpos++; fshow = false; renderFlash(); };
  } else {
    $('#fFlip').onclick = () => { fshow = true; renderFlash(); };
    $('#fSkip').onclick = () => { fpos++; renderFlash(); };
  }
}

export function resetKnown() { known = {}; store.set('pe_known', known); deckBuild(); renderFlash(); }

export function initConceptos() {
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b) goTerm(b.dataset.go); });
  $('#gSearch').addEventListener('input', (e) => { gQuery = e.target.value; renderGlos(); });
  renderFlow(); renderCmp(); renderGlos(); deckBuild(); renderFlash();
}

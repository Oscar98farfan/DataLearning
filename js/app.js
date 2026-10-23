// Punto de entrada: pestañas, barra de símbolos, borrar progreso y modo sin internet.
import { $, store, insertAt } from './util.js';
import { initPractica, startTopic, keysVisible, resetProgress } from './practica.js';
import { initLaboratorio, openLaboratorio } from './laboratorio.js';
import { initLabPython, openLabPython } from './laboratorio-python.js';
import { initConceptos, resetKnown } from './conceptos.js';
import { initClaves } from './claves.js';

const VIEWS = ['practica', 'laboratorio', 'conceptos', 'claves'];
let lab = store.get('pe_lab_tipo', 'sql');

const enLab = () => !$('#view-laboratorio').hidden;

function updateKeys() {
  $('#keys').hidden = !(enLab() || (!$('#view-practica').hidden && keysVisible()));
}

function setLab(t) {
  lab = t === 'py' ? 'py' : 'sql';
  $('#lab-sql').hidden = lab !== 'sql';
  $('#lab-py').hidden = lab !== 'py';
  document.querySelectorAll('.seg-b').forEach((b) => b.setAttribute('aria-selected', b.dataset.lab === lab));
  store.set('pe_lab_tipo', lab);
  if (lab === 'sql') openLaboratorio(); else openLabPython();
}

function setView(v) {
  if (!VIEWS.includes(v)) v = 'practica';
  for (const name of VIEWS) {
    $('#view-' + name).hidden = name !== v;
    $('#tab-' + name).setAttribute('aria-selected', name === v);
  }
  updateKeys();
  store.set('pe_view', v);
  window.scrollTo(0, 0);
  if (v === 'laboratorio') setLab(lab);
}

// El editor activo recibe los símbolos de la barra inferior.
function editorActivo() {
  if (enLab()) return lab === 'py' ? $('#pyCode') : $('#labSql');
  return $('#ans');
}

function renderKeys() {
  const k = $('#keys');
  const syms = ['    ', '()', '[]', '{}', "''", '""', '=', '==', '.', ',', ':', ';', '_', '*', '+', '-', '/', '%', '<', '>', '!', '|', '&', '#', '\n'];
  for (const t of syms) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'key';
    b.textContent = t === '    ' ? '⇥' : t === '\n' ? '↵' : t;
    b.setAttribute('aria-label', t === '    ' ? 'Tabulación' : t === '\n' ? 'Nueva línea' : t);
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('touchstart', (e) => { e.preventDefault(); insertAt(editorActivo(), t); }, { passive: false });
    b.addEventListener('click', () => insertAt(editorActivo(), t));
    k.append(b);
  }
}

function init() {
  initPractica();
  initLaboratorio();
  initLabPython();
  initConceptos();
  initClaves();
  renderKeys();

  document.querySelectorAll('.tab').forEach((b) => (b.onclick = () => setView(b.dataset.view)));
  document.querySelectorAll('.seg-b').forEach((b) => (b.onclick = () => setLab(b.dataset.lab)));
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-practice]');
    if (b) { setView('practica'); startTopic(b.dataset.practice); }
  });

  $('#resetBtn').onclick = () => { $('#resetConfirm').hidden = false; };
  $('#resetNo').onclick = () => { $('#resetConfirm').hidden = true; };
  $('#resetYes').onclick = () => { resetProgress(); resetKnown(); $('#resetConfirm').hidden = true; };

  // La barra de símbolos aparece al empezar un ejercicio de escritura
  new MutationObserver(() => { if (!$('#view-practica').hidden) updateKeys(); })
    .observe($('#card'), { childList: true, attributes: true, attributeFilter: ['hidden'] });

  const hash = location.hash.slice(1);
  setView(VIEWS.includes(hash) ? hash : store.get('pe_view', 'practica'));

  // Modo sin internet (solo cuando se sirve por http/https)
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* sin modo offline */ });
  }
}

init();

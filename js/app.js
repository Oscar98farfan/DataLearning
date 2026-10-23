// Punto de entrada: pestañas, barra de símbolos, borrar progreso y modo sin internet.
import { $, store, insertAt } from './util.js';
import { initPractica, startTopic, keysVisible, resetProgress } from './practica.js';
import { initLaboratorio, openLaboratorio } from './laboratorio.js';
import { initConceptos, resetKnown } from './conceptos.js';

const VIEWS = ['practica', 'laboratorio', 'conceptos'];

function setView(v) {
  if (!VIEWS.includes(v)) v = 'practica';
  for (const name of VIEWS) {
    $('#view-' + name).hidden = name !== v;
    $('#tab-' + name).setAttribute('aria-selected', name === v);
  }
  $('#keys').hidden = !((v === 'practica' && keysVisible()) || v === 'laboratorio');
  store.set('pe_view', v);
  window.scrollTo(0, 0);
  if (v === 'laboratorio') openLaboratorio();
}

function renderKeys() {
  const k = $('#keys');
  const syms = ['    ', '()', '[]', '{}', "''", '""', '=', '==', '.', ',', ':', ';', '_', '*', '+', '-', '/', '%', '<', '>', '!', '|', '&', '#', '\n'];
  for (const t of syms) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'key';
    b.textContent = t === '    ' ? '⇥' : t === '\n' ? '↵' : t;
    b.setAttribute('aria-label', t === '    ' ? 'Tabulación' : t === '\n' ? 'Nueva línea' : t);
    const target = () => (!$('#view-laboratorio').hidden ? $('#labSql') : $('#ans'));
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('touchstart', (e) => { e.preventDefault(); insertAt(target(), t); }, { passive: false });
    b.addEventListener('click', () => insertAt(target(), t));
    k.append(b);
  }
}

function init() {
  initPractica();
  initLaboratorio();
  initConceptos();
  renderKeys();

  document.querySelectorAll('.tab').forEach((b) => (b.onclick = () => setView(b.dataset.view)));
  $('#toArq').onclick = () => { setView('practica'); startTopic('arq'); };

  $('#resetBtn').onclick = () => { $('#resetConfirm').hidden = false; };
  $('#resetNo').onclick = () => { $('#resetConfirm').hidden = true; };
  $('#resetYes').onclick = () => { resetProgress(); resetKnown(); $('#resetConfirm').hidden = true; };

  // La barra de símbolos aparece al empezar un ejercicio de escritura
  new MutationObserver(() => { if (!$('#view-practica').hidden) $('#keys').hidden = !keysVisible(); })
    .observe($('#card'), { childList: true, attributes: true, attributeFilter: ['hidden'] });

  const hash = location.hash.slice(1);
  setView(VIEWS.includes(hash) ? hash : store.get('pe_view', 'practica'));

  // Modo sin internet (solo cuando se sirve por http/https)
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* sin modo offline */ });
  }
}

init();

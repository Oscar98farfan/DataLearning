// Pestaña "Claves": buenas prácticas por lenguaje, con ejemplos de "evita" y "mejor".
import { AREAS_CLAVES, CLAVES } from '../data/claves.js';
import { $, chip, store, fold } from './util.js';
import { highlight } from './highlight.js';

let area = store.get('pe_claves', 'all');
let q = '';

function render() {
  const cc = $('#clavesChips'); cc.innerHTML = '';
  cc.append(chip(`Todas (${CLAVES.length})`, area === 'all', () => { area = 'all'; store.set('pe_claves', area); render(); }));
  for (const [k, v] of Object.entries(AREAS_CLAVES)) {
    cc.append(chip(`${v} (${CLAVES.filter((c) => c.a === k).length})`, area === k, () => { area = k; store.set('pe_claves', area); render(); }));
  }
  const f = fold(q.trim());
  const list = CLAVES.filter((c) => (area === 'all' || c.a === area) && (!f || fold(c.t + ' ' + c.d + ' ' + (c.bien || '')).includes(f)));
  $('#clavesCount').textContent = `${list.length} clave${list.length === 1 ? '' : 's'}`;
  $('#clavesList').innerHTML = list.length ? list.map((c) => `<article class="term clave">
    <div class="term-top"><h3>${c.t}</h3><span class="cat">${AREAS_CLAVES[c.a]}</span></div>
    <p>${c.d}</p>
    ${c.mal ? `<div class="cmp-code"><span class="tag-mal">Evita</span><pre class="code">${highlight(c.mal, c.lang)}</pre></div>` : ''}
    ${c.bien ? `<div class="cmp-code"><span class="tag-bien">${c.mal ? 'Mejor' : 'Ejemplo'}</span><pre class="code">${highlight(c.bien, c.lang)}</pre></div>` : ''}
  </article>`).join('') : '<p class="empty">No hay claves con esa búsqueda.</p>';
}

export function initClaves() {
  $('#clavesSearch').addEventListener('input', (e) => { q = e.target.value; render(); });
  render();
}

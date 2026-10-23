// Laboratorio de Git: terminal simulada, grafo de la historia, archivos y retos.
import { $, esc, store } from './util.js';
import { Repo, layout } from './git-engine.js';
import { RETOS, RESUMEN_HISTORIA } from '../data/git-retos.js';
import { LEVELS } from '../data/temas.js';

let repo = null, reto = null, historial = [], hPos = 0, editando = null;
let hechos = store.get('pe_git_ok', {});

const COLORES = ['var(--t-py)', 'var(--t-git)', 'var(--t-sql)', 'var(--t-pd)', 'var(--t-bi)', 'var(--t-arq)', 'var(--t-ia)'];

function nuevoRepo(r) {
  repo = new Repo();
  if (r) for (const x of r.setup) { if (typeof x === 'function') x(repo); else repo.run(x); }
  else { repo.run('echo "# Mi proyecto" > README.md'); repo.run('git add .'); repo.run('git commit -m "Primer commit"'); }
  repo.usado.clear();
  $('#gitTerm').innerHTML = '';
  escribirTerm(r ? `Reto: ${r.t}\n${r.objetivo}\n\nEscribe "git status" o "git log --all" para empezar. "ayuda" muestra los comandos.` : 'Modo libre: un repositorio con un commit en main. Experimenta sin miedo; "Reiniciar" lo deja como al principio.\nEscribe "ayuda" para ver los comandos.', 'info');
  editando = null;
  render();
}

function escribirTerm(texto, clase = '') {
  const t = $('#gitTerm');
  if (texto === '\f') { t.innerHTML = ''; return; }
  if (!texto) return;
  const d = document.createElement('pre');
  d.className = 'tline ' + clase;
  d.innerHTML = colorear(texto);
  t.append(d);
  t.scrollTop = t.scrollHeight;
}

// Resalta las marcas de conflicto y palabras clave en la salida
function colorear(t) {
  return esc(t)
    .replace(/^(&lt;&lt;&lt;&lt;&lt;&lt;&lt;.*|=======|&gt;&gt;&gt;&gt;&gt;&gt;&gt;.*)$/gm, '<span class="mk">$1</span>')
    .replace(/^(CONFLICTO.*|error:.*|fatal:.*)$/gm, '<span class="er">$1</span>')
    .replace(/^(\+.*)$/gm, '<span class="ad">$1</span>')
    .replace(/^(-(?!-).*)$/gm, '<span class="rm">$1</span>');
}

function ejecutar(cmd) {
  cmd = cmd.trim(); if (!cmd) return;
  historial.push(cmd); hPos = historial.length;
  escribirTerm('$ ' + cmd, 'cmd');
  escribirTerm(repo.run(cmd));
  render();
}

function render() { renderGraph(); renderFiles(); renderReto(); }

function renderGraph() {
  const { orden, pos } = layout(repo);
  const head = repo.headId();
  $('#gitHead').textContent = repo.head.branch ? `Estás en: ${repo.head.branch}` : 'HEAD desconectado';
  if (!orden.length) { $('#gitGraph').innerHTML = '<p class="small" style="margin:0">Todavía no hay commits.</p>'; return; }
  const H = 40, W = 20, maxCol = Math.max(...orden.map((id) => pos[id].col));
  const ancho = 14 + (maxCol + 1) * W;
  const x = (c) => 14 + c * W, y = (r) => r * H + H / 2;
  let lineas = '', puntos = '';
  for (const id of orden) {
    const { row, col } = pos[id];
    repo.commits[id].parents.forEach((p, i) => {
      if (!pos[p]) return;
      const x1 = x(col), y1 = y(row), x2 = x(pos[p].col), y2 = y(pos[p].row);
      const color = COLORES[(i === 0 ? col : pos[p].col) % COLORES.length];
      const d = x1 === x2 ? `M${x1},${y1} L${x2},${y2}`
        : x2 > x1 ? `M${x1},${y1} C${x1},${y1 + H * 0.6} ${x2},${y1 + H * 0.4} ${x2},${y1 + H} L${x2},${y2}`
        : `M${x1},${y1} L${x1},${y2 - H} C${x1},${y2 - H * 0.4} ${x2},${y2 - H * 0.6} ${x2},${y2}`;
      lineas += `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.5"/>`;
    });
  }
  for (const id of orden) {
    const { row, col } = pos[id], c = COLORES[col % COLORES.length], merge = repo.commits[id].parents.length > 1;
    puntos += `<circle cx="${x(col)}" cy="${y(row)}" r="${id === head ? 8 : 6.5}" fill="${id === head ? c : 'var(--surface)'}" stroke="${c}" stroke-width="${merge ? 4 : 2.5}"/>`;
  }
  const filas = orden.map((id) => {
    const c = repo.commits[id];
    const ramas = Object.entries(repo.branches).filter(([, v]) => v === id).map(([b]) => `<span class="ref${repo.head.branch === b ? ' cur' : ''}">${repo.head.branch === b ? 'HEAD → ' : ''}${esc(b)}</span>`).join('');
    const det = !repo.head.branch && repo.head.id === id ? '<span class="ref cur">HEAD</span>' : '';
    return `<div class="grow-row" style="height:${H}px"><span class="cid">${id}</span>${det}${ramas}<span class="cmsg">${esc(c.msg)}${c.parents.length > 1 ? ' <i>(fusión)</i>' : ''}</span></div>`;
  }).join('');
  $('#gitGraph').innerHTML = `<div class="graph-in" style="--gw:${ancho}px"><svg width="${ancho}" height="${orden.length * H}" aria-hidden="true">${lineas}${puntos}</svg><div class="graph-rows">${filas}</div></div>`;
}

function estadoArchivo(f) {
  const h = repo.tree(repo.headId());
  if (repo.conflictFiles().includes(f)) return ['conflicto', 'bad'];
  if (repo.work[f] === undefined) return ['eliminado', 'warn'];
  if (repo.index[f] === undefined && h[f] === undefined) return ['sin seguimiento', 'warn'];
  if (repo.work[f] !== repo.index[f]) return ['modificado', 'warn'];
  if (repo.index[f] !== h[f]) return ['preparado', 'ok'];
  return ['sin cambios', ''];
}

function renderFiles() {
  const nombres = [...new Set([...Object.keys(repo.work), ...Object.keys(repo.index)])].sort();
  $('#gitFiles').innerHTML = nombres.map((f) => {
    const [txt, cls] = estadoArchivo(f);
    return `<div class="gfile"><span class="mono">${esc(f)}</span><span class="pill ${cls}">${txt}</span>
      ${repo.work[f] !== undefined ? `<button type="button" class="ed-btn" data-gedit="${esc(f)}">Editar</button>` : ''}</div>`;
  }).join('') || '<p class="small" style="margin:0">No hay archivos.</p>';
  $('#gitFiles').querySelectorAll('[data-gedit]').forEach((b) => (b.onclick = () => abrirEditor(b.dataset.gedit)));
}

function abrirEditor(f) {
  editando = f;
  $('#gitEdName').value = f; $('#gitEdName').disabled = true;
  $('#gitEdText').value = repo.work[f] ?? '';
  $('#gitEditor').hidden = false;
  $('#gitEdNote').hidden = !/^(<<<<<<<|=======|>>>>>>>)/m.test(repo.work[f] ?? '');
  $('#gitEditor').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function renderReto() {
  const box = $('#gitRetoInfo');
  if (!reto) { box.innerHTML = '<p class="small" style="margin:0">Repositorio libre para experimentar con cualquier comando.</p>'; return; }
  const ok = reto.check(repo);
  if (ok && !hechos[reto.id]) { hechos[reto.id] = 1; store.set('pe_git_ok', hechos); llenarSelect(); }
  const pasos = reto.solucion.map((x) => typeof x === 'function'
    ? `# Edita ${x.archivo} (botón Editar) para que quede así:\n${x.texto.split('\n').map((l) => '#   ' + l).join('\n')}`
    : x).join('\n');
  box.innerHTML = `<div class="row" style="gap:8px;align-items:center"><span class="tag" style="--c:var(--t-git)">${LEVELS[reto.l]}</span><span class="pill">${reto.historia}</span></div>
    <p class="q" style="margin:0"><b>Objetivo:</b> ${esc(reto.objetivo)}</p>
    <p class="exp" style="margin:0">${esc(reto.explica)}</p>
    ${ok ? '<div class="fb ok"><strong>Reto completado.</strong><span>Mira el grafo: así queda la historia con este método.</span></div>' : ''}
    <details class="sol"><summary>Ver solución</summary><pre class="code">${esc(pasos)}</pre></details>`;
}

function llenarSelect() {
  const sel = $('#gitReto'), v = sel.value;
  sel.innerHTML = `<option value="">Modo libre</option>` + RETOS.map((r, i) => `<option value="${r.id}">${hechos[r.id] ? '✓ ' : ''}${i + 1}. ${r.t}</option>`).join('');
  sel.value = v;
  $('#gitProg').textContent = `${Object.keys(hechos).filter((k) => RETOS.some((r) => r.id === k)).length} de ${RETOS.length} retos completados`;
}

export function initLabGit() {
  llenarSelect();
  $('#gitResumen').innerHTML = `<div class="tbl"><table><thead><tr><th>Comando</th><th>Historia</th><th>Qué hace</th></tr></thead><tbody>${RESUMEN_HISTORIA.map(([c, h, d]) => `<tr><td class="mono">${c}</td><td>${h}</td><td>${d}</td></tr>`).join('')}</tbody></table></div>`;
  $('#gitReto').onchange = (e) => { reto = RETOS.find((r) => r.id === e.target.value) || null; store.set('pe_git_reto', e.target.value); nuevoRepo(reto); };
  $('#gitReset').onclick = () => nuevoRepo(reto);
  $('#gitForm').addEventListener('submit', (e) => { e.preventDefault(); const i = $('#gitCmd'); ejecutar(i.value); i.value = ''; });
  $('#gitCmd').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && hPos > 0) { e.preventDefault(); e.target.value = historial[--hPos]; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); hPos = Math.min(historial.length, hPos + 1); e.target.value = historial[hPos] || ''; }
  });
  const rapidos = [['git status', 1], ['git log --all', 1], ['git add .', 1], ['git commit -m ""', 0], ['git branch', 1], ['git switch ', 0], ['git merge ', 0], ['ls', 1], ['ayuda', 1]];
  $('#gitQuick').innerHTML = rapidos.map(([c]) => `<button type="button" class="chip mono" data-q="${esc(c)}">${esc(c.trim())}</button>`).join('');
  $('#gitQuick').querySelectorAll('[data-q]').forEach((b, i) => (b.onclick = () => {
    const [c, directo] = rapidos[i];
    if (directo) ejecutar(c);
    else { const inp = $('#gitCmd'); inp.value = c; inp.focus(); const p = c.endsWith('""') ? c.length - 1 : c.length; inp.setSelectionRange(p, p); }
  }));
  $('#gitNew').onclick = () => { editando = null; $('#gitEdName').disabled = false; $('#gitEdName').value = ''; $('#gitEdText').value = ''; $('#gitEdNote').hidden = true; $('#gitEditor').hidden = false; $('#gitEdName').focus(); };
  $('#gitEdSave').onclick = () => {
    const nombre = (editando || $('#gitEdName').value).trim();
    if (!nombre) { $('#gitEdName').focus(); return; }
    repo.work[nombre] = $('#gitEdText').value.replace(/\r/g, '');
    escribirTerm(`(guardaste ${nombre}${/^(<<<<<<<|=======|>>>>>>>)/m.test(repo.work[nombre]) ? ' — todavía tiene marcas de conflicto' : ''})`, 'info');
    $('#gitEditor').hidden = true; editando = null; render();
  };
  $('#gitEdCancel').onclick = () => { $('#gitEditor').hidden = true; editando = null; };
  const guardado = store.get('pe_git_reto', '');
  reto = RETOS.find((r) => r.id === guardado) || null;
  $('#gitReto').value = reto ? reto.id : '';
  nuevoRepo(reto);
}

// Laboratorio de IA: tokens, siguiente palabra, embeddings y RAG paso a paso (simulado).
import { $, esc, store } from './util.js';
import { tokenizar, siguientes, generar, similitud, embedding, recuperar, armarPrompt, responder, VOCAB, NFRASES } from './ia-engine.js';
import { PREGUNTAS, DOCS } from '../data/ia-lab.js';

const pct = (x) => Math.round(x * 100);
const barra = (x, cls = '') => `<span class="bar ${cls}"><i style="width:${Math.max(2, pct(x))}%"></i></span>`;

function renderTokens() {
  const txt = $('#iaTokTxt').value;
  const toks = tokenizar(txt);
  $('#iaTokOut').innerHTML = toks.map((t, i) => `<span class="tok t${i % 5}" title="id ${t.id}">${esc(t.t).replace(/ /g, '·')}</span>`).join('') || '<span class="small">Escribe algo arriba.</span>';
  $('#iaTokIds').textContent = toks.slice(0, 40).map((t) => t.id).join(', ') + (toks.length > 40 ? ', …' : '');
  $('#iaTokStats').innerHTML = `<b>${txt.length}</b> caracteres · <b>${(txt.match(/\S+/g) || []).length}</b> palabras · <b>${toks.length}</b> tokens aprox.`;
}

function renderNext() {
  const txt = $('#iaNextTxt').value, temp = +$('#iaTemp').value;
  $('#iaTempVal').textContent = temp.toFixed(1);
  const { ultima, visto, opciones } = siguientes(txt, temp);
  $('#iaNextOut').innerHTML = `<p class="small" style="margin:0">${visto ? `Después de "<b>${esc(ultima)}</b>" el modelo vio estas opciones:` : `El modelo nunca vio "${esc(ultima || '')}". Muestra con qué palabras suelen empezar las frases:`}</p>
    <div class="probs">${opciones.slice(0, 6).map((o) => `<button type="button" class="prob" data-w="${esc(o.w)}"><span class="mono">${o.w === '.' ? '(fin)' : esc(o.w)}</span>${barra(o.p)}<span class="mono small">${pct(o.p)}%</span></button>`).join('')}</div>`;
  $('#iaNextOut').querySelectorAll('[data-w]').forEach((b) => (b.onclick = () => { const i = $('#iaNextTxt'); i.value = (i.value.trim() + ' ' + b.dataset.w).trim(); renderNext(); }));
}

function renderSim() {
  const a = $('#iaSimA').value, b = $('#iaSimB').value;
  const s = similitud(a, b);
  const dims = (t) => Object.entries(embedding(t)).filter(([, v]) => v > 0).map(([k, v]) => `<span class="pill">${k} ${v.toFixed(2)}</span>`).join('') || '<span class="small">ningún concepto conocido</span>';
  $('#iaSimOut').innerHTML = `<div class="simrow"><span>Por palabras (léxica)</span>${barra(s.lexica)}<b class="mono">${pct(s.lexica)}%</b></div>
    <div class="simrow"><span>Por significado (semántica)</span>${barra(s.semantica, 'ia')}<b class="mono">${pct(s.semantica)}%</b></div>
    <p class="small" style="margin:0">Vector de A: ${dims(a)}</p><p class="small" style="margin:0">Vector de B: ${dims(b)}</p>`;
}

function renderRag() {
  const q = $('#iaQ').value.trim();
  if (!q) { $('#iaRagOut').innerHTML = ''; return; }
  const opts = { rol: $('#iaRol').value, tamano: +$('#iaChunk').value, k: +$('#iaK').value };
  const ventana = +$('#iaWin').value;
  const { todos, ranking, elegidos, bloqueados } = recuperar(q, opts);
  const prompt = armarPrompt(q, elegidos, ventana);
  const resp = responder(q, prompt.usados);
  const emb = Object.entries(embedding(q)).filter(([, v]) => v > 0);
  const paso = (n, quien, titulo, cuerpo) => `<li><span class="num">${n}</span><div style="min-width:0"><h3>${titulo} <span class="pill">${quien}</span></h3>${cuerpo}</div></li>`;
  $('#iaRagOut').innerHTML = `<ol class="flow">
  ${paso(1, 'Fuentes', 'Chunks del conocimiento', `<p>${DOCS.length} documentos divididos en <b>${todos.length}</b> fragmentos de ${opts.tamano} oración(es). ${todos.filter((c) => !c.permitido).length ? `${todos.filter((c) => !c.permitido).length} son solo para RR. HH.` : ''}</p>`)}
  ${paso(2, 'Orquestador', 'Embedding de la pregunta', `<p>${tokenizar(q).length} tokens. Conceptos que activa: ${emb.map(([k, v]) => `<span class="pill">${k} ${v.toFixed(2)}</span>`).join(' ') || 'ninguno conocido'}</p>`)}
  ${paso(3, 'RAG', 'Recuperar los más parecidos', `<div class="rank">${ranking.slice(0, 6).map((c) => `<div class="rk${elegidos.includes(c) ? ' sel' : ''}${c.permitido ? '' : ' blk'}"><span class="mono small">${c.id}</span><span class="rk-t">${esc(c.texto)}</span>${barra(c.total, 'ia')}<span class="mono small">${pct(c.total)}%</span>${c.permitido ? '' : '<span class="pill bad">sin permiso</span>'}</div>`).join('')}</div>
     ${bloqueados.length ? `<p class="small">${bloqueados.length} fragmento(s) relevante(s) se excluyeron por permisos: tu rol no puede verlos (recorte por permisos).</p>` : ''}`)}
  ${paso(4, 'Orquestador', 'Prompt enriquecido', `<p class="small">${prompt.tokens} de ${ventana} tokens de la ventana de contexto${prompt.recortados.length ? ` · se quitaron ${prompt.recortados.length} fragmento(s) porque no cabían` : ''}.</p><pre class="out">${esc(prompt.texto)}</pre>`)}
  ${paso(5, 'LLM', 'Respuesta', `<div class="fb ${resp.fuente ? 'ok' : 'info'}"><span>${esc(resp.texto)}${resp.fuente ? ` <b>[${resp.fuente}]</b>` : ''}</span></div>
     <p class="small">${resp.fuente ? `Fuente: ${esc(resp.doc)}. ` : ''}Aquí un LLM real redactaría la respuesta con sus palabras usando el contexto; esta demo muestra la oración más relevante. Sin el contexto, el modelo respondería con lo que aprendió en general y podría inventar (alucinación).</p>`)}
  </ol>`;
}

export function initLabIA() {
  $('#iaTokTxt').value = store.get('pe_ia_tok', 'Los embeddings representan información numéricamente.');
  $('#iaTokTxt').addEventListener('input', () => { store.set('pe_ia_tok', $('#iaTokTxt').value); renderTokens(); });
  $('#iaNextTxt').value = 'el analista';
  $('#iaNextTxt').addEventListener('input', renderNext);
  $('#iaTemp').addEventListener('input', renderNext);
  $('#iaGen').onclick = () => {
    const r = generar($('#iaNextTxt').value || 'el', +$('#iaTemp').value);
    $('#iaGenOut').innerHTML = `<p style="margin:0"><b>${esc(r.texto)}</b></p><p class="small" style="margin:0">Elegidas: ${r.pasos.map((p) => `${p.w === '.' ? '(fin)' : esc(p.w)} (${pct(p.p)}%)`).join(' → ')}</p>`;
  };
  $('#iaCorpus').textContent = `Este mini modelo aprendió de solo ${NFRASES} frases (${VOCAB} palabras distintas). Un LLM aprende de billones de tokens, pero la idea es la misma: probabilidades de lo que sigue.`;
  $('#iaSimA').value = 'días libres al año';
  $('#iaSimB').value = 'política de vacaciones';
  ['#iaSimA', '#iaSimB'].forEach((s) => $(s).addEventListener('input', renderSim));
  const pares = [['días libres al año', 'política de vacaciones'], ['trabajar desde la casa', 'teletrabajo remoto'], ['se dañó mi computador', 'soporte para el portátil'], ['ventas del mes', 'política de vacaciones']];
  $('#iaSimPares').innerHTML = pares.map((p, i) => `<button type="button" class="chip" data-par="${i}">${esc(p[0])} ↔ ${esc(p[1])}</button>`).join('');
  $('#iaSimPares').querySelectorAll('[data-par]').forEach((b) => (b.onclick = () => { [$('#iaSimA').value, $('#iaSimB').value] = pares[+b.dataset.par]; renderSim(); }));
  $('#iaQs').innerHTML = PREGUNTAS.map((q, i) => `<button type="button" class="chip" data-qi="${i}">${esc(q)}</button>`).join('');
  $('#iaQs').querySelectorAll('[data-qi]').forEach((b) => (b.onclick = () => { $('#iaQ').value = PREGUNTAS[+b.dataset.qi]; renderRag(); }));
  $('#iaQ').value = PREGUNTAS[0];
  $('#iaAsk').onclick = renderRag;
  $('#iaQ').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); renderRag(); } });
  ['#iaRol', '#iaChunk', '#iaK', '#iaWin'].forEach((s) => $(s).addEventListener('change', renderRag));
  $('#iaDocs').innerHTML = DOCS.map((d) => `<details class="doc"><summary>${esc(d.t)} ${d.acceso === 'rrhh' ? '<span class="pill bad">solo RR. HH.</span>' : ''}</summary><p class="small">${esc(d.texto)}</p></details>`).join('');
  renderTokens(); renderNext(); renderSim(); renderRag();
}

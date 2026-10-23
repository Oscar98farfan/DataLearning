// Lógica del laboratorio de IA (sin interfaz, se puede probar en Node).
import { CORPUS, DOCS, CONCEPTOS, STOPWORDS } from '../data/ia-lab.js';

export const fold = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const palabras = (s) => fold(s).match(/[a-zñ0-9.]+/g)?.map((w) => w.replace(/\.$/, '')).filter(Boolean) || [];

// ---------- tokens (aproximación a un tokenizador BPE) ----------
// Palabras cortas = 1 token; las largas se parten en trozos, como hacen los modelos reales.
export function tokenizar(texto) {
  const out = [];
  for (const m of texto.matchAll(/\s*([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+|\d+|[^\sA-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ])/g)) {
    const espacio = m[0].startsWith(' ') ? ' ' : '';
    const w = m[1];
    if (/^\d+$/.test(w)) { for (let i = 0; i < w.length; i += 3) out.push((i === 0 ? espacio : '') + w.slice(i, i + 3)); continue; }
    if (w.length <= 6) { out.push(espacio + w); continue; }
    const trozos = [w.slice(0, 4)];
    for (let i = 4; i < w.length; i += 4) trozos.push(w.slice(i, i + 4));
    trozos.forEach((t, i) => out.push((i === 0 ? espacio : '') + t));
  }
  return out.map((t) => ({ t, id: [...t].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 50257, 7) }));
}

// ---------- siguiente palabra (bigramas + temperatura) ----------
const FRASES = CORPUS.trim().split('\n').map((l) => l.trim().split(/\s+/));
const BIG = {};
for (const f of FRASES) for (let i = 0; i < f.length - 1; i++) { const a = f[i], b = f[i + 1]; (BIG[a] ||= {})[b] = (BIG[a][b] || 0) + 1; }
const INICIO = {}; for (const f of FRASES) INICIO[f[0]] = (INICIO[f[0]] || 0) + 1;
export const VOCAB = Object.keys(BIG).length;
export const NFRASES = FRASES.length;

export function siguientes(texto, temperatura = 1) {
  const ps = palabras(texto);
  const ultima = ps[ps.length - 1];
  const conteos = (ultima && BIG[ultima]) || INICIO;
  const visto = !!(ultima && BIG[ultima]);
  const t = Math.max(0.05, temperatura);
  const pesos = Object.entries(conteos).map(([w, c]) => [w, Math.pow(c, 1 / t)]);
  const total = pesos.reduce((s, [, p]) => s + p, 0);
  return { ultima, visto, opciones: pesos.map(([w, p]) => ({ w, p: p / total })).sort((a, b) => b.p - a.p) };
}

export function generar(texto, temperatura = 1, n = 8, rnd = Math.random) {
  let actual = texto.trim();
  const pasos = [];
  for (let i = 0; i < n; i++) {
    const { opciones } = siguientes(actual, temperatura);
    let r = rnd(), elegido = opciones[opciones.length - 1];
    for (const o of opciones) { r -= o.p; if (r <= 0) { elegido = o; break; } }
    pasos.push(elegido);
    actual += ' ' + elegido.w;
    if (elegido.w === '.') break;
  }
  return { texto: actual.replace(/ \./g, '.'), pasos };
}

// ---------- embeddings simulados ----------
const DIMS = Object.keys(CONCEPTOS);
const A_CONCEPTO = {};
for (const [k, ws] of Object.entries(CONCEPTOS)) for (const w of ws) (A_CONCEPTO[fold(w)] ||= []).push(k);   // una palabra puede tener varios significados
const raiz = (w) => w.replace(/(es|s)$/, '').replace(/[aeo]$/, '');

export function embedding(texto) {
  const v = Object.fromEntries(DIMS.map((d) => [d, 0]));
  for (const w of palabras(texto)) for (const c of A_CONCEPTO[w] || []) v[c] += 1;
  const n = Math.hypot(...Object.values(v)) || 1;
  return Object.fromEntries(DIMS.map((d) => [d, v[d] / n]));
}

const coseno = (a, b) => {
  let s = 0, na = 0, nb = 0;
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { s += (a[k] || 0) * (b[k] || 0); na += (a[k] || 0) ** 2; nb += (b[k] || 0) ** 2; }
  return na && nb ? s / Math.sqrt(na * nb) : 0;
};

const bolsa = (texto) => {
  const v = {};
  for (const w of palabras(texto)) if (!STOPWORDS.has(w) && w.length > 2) v[raiz(w)] = (v[raiz(w)] || 0) + 1;
  return v;
};

export function similitud(a, b) {
  return { lexica: coseno(bolsa(a), bolsa(b)), semantica: coseno(embedding(a), embedding(b)) };
}

// ---------- RAG ----------
const oraciones = (t) => t.split(/(?<=\.)\s+(?=[A-ZÁÉÍÓÚÑ¿])/).map((x) => x.trim()).filter(Boolean);

export function chunks(tamano = 2, rol = 'empleado') {
  const out = [];
  for (const d of DOCS) {
    const unidas = oraciones(d.texto);
    for (let i = 0; i < unidas.length; i += tamano) {
      out.push({ id: `${d.id}-${i / tamano + 1}`, doc: d, texto: unidas.slice(i, i + tamano).join(' '), permitido: d.acceso === 'todos' || rol === 'rrhh' });
    }
  }
  return out;
}

export function recuperar(pregunta, { tamano = 2, rol = 'empleado', k = 2 } = {}) {
  const todos = chunks(tamano, rol);
  const puntuados = todos.map((c) => {
    const s = similitud(pregunta, c.texto);
    return { ...c, ...s, total: 0.8 * s.semantica + 0.2 * s.lexica };
  }).sort((a, b) => b.total - a.total);
  const permitidos = puntuados.filter((c) => c.permitido);
  const bloqueados = puntuados.filter((c) => !c.permitido && c.total > 0.2);
  return { todos, ranking: puntuados, elegidos: permitidos.slice(0, k).filter((c) => c.total > 0.05), bloqueados };
}

export const SISTEMA = 'Eres el asistente interno de la empresa. Responde solo con base en el contexto. Si la respuesta no está en el contexto, dilo. Cita la fuente entre corchetes.';

export function armarPrompt(pregunta, elegidos, ventana = 250) {
  const cuenta = (s) => tokenizar(s).length;
  let usados = [...elegidos], recortados = [];
  const arma = (cs) => `[Sistema]\n${SISTEMA}\n\n[Contexto]\n${cs.map((c, i) => `[${i + 1}] (${c.doc.t}) ${c.texto}`).join('\n') || '(sin fragmentos relevantes)'}\n\n[Pregunta]\n${pregunta}`;
  while (usados.length && cuenta(arma(usados)) > ventana) recortados.unshift(usados.pop());
  const texto = arma(usados);
  return { texto, tokens: cuenta(texto), usados, recortados, ventana };
}

// Respuesta extractiva: la oración del contexto más parecida a la pregunta (un LLM la redactaría).
export function responder(pregunta, usados) {
  if (!usados.length) return { texto: 'No encontré información sobre eso en los documentos que puedes consultar.', fuente: null };
  let mejor = null;
  usados.forEach((c, i) => {
    for (const o of oraciones(c.texto)) {
      const s = similitud(pregunta, o); const total = 0.8 * s.semantica + 0.2 * s.lexica;
      if (!mejor || total > mejor.total) mejor = { texto: o.trim(), total, fuente: i + 1, doc: c.doc.t };
    }
  });
  if (mejor.total < 0.7) return { texto: 'No encontré una respuesta clara en los documentos que puedes consultar.', fuente: null, total: mejor.total };
  return mejor;
}

// Resaltado de sintaxis liviano para SQL, Python, DAX y Bash/Git.
// highlight(texto, lenguaje) devuelve HTML con <span class="tk-…">.
// makeEditor(textarea, lenguaje) pinta los colores detrás de un textarea mientras escribes.
import { esc } from './util.js';

const words = (s) => new Set(s.split(/\s+/).filter(Boolean));

const KEYWORDS = {
  sql: words(`select from where and or not in is null as join inner left right full outer cross on group by order having
    limit offset with recursive over partition rows range between unbounded preceding following current row distinct
    case when then else end union all intersect except insert into values update set delete create table view drop alter
    primary key references asc desc like exists using delta version timestamp of merge matched describe history
    optimize zorder vacuum retain hours if true false`),
  python: words(`def return if elif else for while in not and or is import from as class try except finally with lambda
    yield pass break continue none true false global nonlocal raise assert del async await`),
  dax: words('var return true false in asc desc not and or'),
  bash: words(''),
};

const PATTERNS = {
  sql: [
    ['c', /--[^\n]*/],
    ['s', /'(?:[^'\\]|\\.|'')*'?/],
    ['s', /"(?:[^"\\]|\\.)*"?/],
    ['n', /\b\d+(?:\.\d+)?\b/],
    ['w', /[A-Za-z_][\w]*/],
  ],
  python: [
    ['c', /#[^\n]*/],
    ['s', /[fFrRbB]?'''[\s\S]*?(?:'''|$)|[fFrRbB]?"""[\s\S]*?(?:"""|$)/],
    ['s', /[fFrRbB]?'(?:[^'\\\n]|\\.)*'?/],
    ['s', /[fFrRbB]?"(?:[^"\\\n]|\\.)*"?/],
    ['d', /@[\w.]+/],
    ['n', /\b\d+(?:\.\d+)?\b/],
    ['w', /[A-Za-z_][\w]*/],
  ],
  dax: [
    ['c', /\/\/[^\n]*|--[^\n]*/],
    ['col', /(?:'[^'\n]*'|[A-Za-z_][\w]*)?\[[^\]\n]*\]?/],
    ['s', /"(?:[^"\n]|"")*"?/],
    ['n', /\b\d+(?:\.\d+)?\b/],
    ['w', /[A-Za-zÁÉÍÓÚáéíóúñÑ_%][\wÁÉÍÓÚáéíóúñÑ%.]*/],
  ],
  bash: [
    ['c', /#[^\n]*/],
    ['s', /'[^'\n]*'?|"(?:[^"\\\n]|\\.)*"?/],
    ['flag', /(?<=\s)--?[A-Za-z][\w-]*/],
    ['w', /[A-Za-z_][\w.:/~^-]*/],
  ],
};

const RE = Object.fromEntries(Object.entries(PATTERNS).map(([lang, ps]) =>
  [lang, new RegExp(ps.map(([, r]) => `(${r.source})`).join('|'), 'g')]));

export function highlight(text, lang = 'sql') {
  const ps = PATTERNS[lang];
  if (!ps) return esc(text);
  const re = RE[lang]; re.lastIndex = 0;
  const kw = KEYWORDS[lang];
  let out = '', last = 0, m, lineStart = true;
  while ((m = re.exec(text))) {
    if (m[0] === '') { re.lastIndex++; continue; }
    const gap = text.slice(last, m.index);
    out += esc(gap);
    if (gap.includes('\n')) lineStart = true;
    const idx = m.slice(1).findIndex((g) => g !== undefined);
    let type = ps[idx][0];
    const tok = m[0];
    if (type === 'w') {
      const next = text.slice(re.lastIndex).match(/^\s*\(/);
      if (lang === 'bash') type = lineStart && /^(git|cd|ls|npm|python|py|curl|start|mkdir|cat|echo)$/.test(tok) ? 'k' : '';
      else if (kw.has(tok.toLowerCase()) && !(lang === 'python' && next && tok !== 'print')) type = 'k';
      else if (next) type = 'f';
      else type = '';
    }
    out += type ? `<span class="tk-${type}">${esc(tok)}</span>` : esc(tok);
    lineStart = false;
    last = re.lastIndex;
  }
  return out + esc(text.slice(last));
}

// Lenguaje según el tema del ejercicio.
export function langFor(ex, code = '') {
  if (ex.t === 'sql') return 'sql';
  if (ex.t === 'bi') return 'dax';
  if (ex.t === 'git') return 'bash';
  if (ex.t === 'arq') return /^\s*(select|with|merge|create|describe|optimize|vacuum)\b/i.test(code || ex.s || '') ? 'sql' : 'python';
  return 'python';
}

// Envuelve un textarea para mostrar los colores detrás del texto. Crece con el contenido.
export function makeEditor(ta, lang) {
  if (ta.closest('.code-ed')) { ta.dataset.lang = lang; ta.dispatchEvent(new Event('input')); return; }
  const wrap = document.createElement('div');
  wrap.className = 'code-ed';
  const pre = document.createElement('pre');
  pre.className = 'hl'; pre.setAttribute('aria-hidden', 'true');
  ta.before(wrap); wrap.append(pre, ta);
  ta.dataset.lang = lang;
  const paint = () => {
    pre.innerHTML = highlight(ta.value, ta.dataset.lang) + '\n';
    ta.style.height = 'auto';
    ta.style.height = Math.max(ta.scrollHeight, pre.scrollHeight) + 'px';
  };
  ta.addEventListener('input', paint);
  paint();
  // el ancho puede cambiar al girar el teléfono
  if ('ResizeObserver' in window) new ResizeObserver(() => paint()).observe(wrap);
}

// Pone texto en un editor y repinta.
export function setCode(ta, value) { ta.value = value; ta.dispatchEvent(new Event('input')); }

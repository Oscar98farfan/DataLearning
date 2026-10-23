// Utilidades compartidas por todos los módulos.

export const $ = (s, root = document) => root.querySelector(s);

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Normaliza una respuesta escrita: minúsculas, sin espacios, comillas simples, sin ; final.
export const norm = (s) => s.toLowerCase().replace(/["“”‘’`´]/g, "'").replace(/\s+/g, '').replace(/;+$/, '');

// Quita tildes para búsquedas.
export const fold = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function chip(label, pressed, onClick, color) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'chip';
  b.setAttribute('aria-pressed', pressed);
  b.innerHTML = (color ? `<span class="dot" style="--c:${color}"></span>` : '') + label;
  b.onclick = onClick;
  return b;
}

// localStorage protegido: si el navegador lo bloquea, la app sigue funcionando.
export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
};

// Inserta texto en un textarea en la posición del cursor (barra de símbolos y Tab).
export function insertAt(ta, t) {
  if (!ta) return;
  const s = ta.selectionStart, e = ta.selectionEnd;
  ta.value = ta.value.slice(0, s) + t + ta.value.slice(e);
  const pairs = { '()': 1, '[]': 1, '{}': 1, "''": 1, '""': 1 };
  const p = pairs[t] ? s + 1 : s + t.length;
  ta.setSelectionRange(p, p);
  ta.focus();
  ta.dispatchEvent(new Event('input'));
}

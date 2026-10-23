// Motor de Python en el navegador: Pyodide (CPython compilado a WebAssembly) + pandas.
// La primera vez descarga unos 50 MB; después queda guardado y funciona sin internet.
import { esc } from './util.js';

let pyPromise = null;

// Ayudantes de Python: ejecutan una "celda" como Jupyter (la última expresión se muestra sola).
export const HELPERS = `
import ast, traceback, sys

def __mostrar(v):
    import pandas as pd
    if v is None:
        return None
    if isinstance(v, pd.DataFrame):
        return ('html', v.to_html(max_rows=60, max_cols=20, border=0, na_rep='NaN'))
    if isinstance(v, pd.Series):
        return ('html', v.to_frame().to_html(max_rows=60, border=0, na_rep='NaN'))
    return ('text', repr(v))

def __ejecutar(codigo, G):
    salidas = []
    G['display'] = G['mostrar'] = lambda x: salidas.append(__mostrar(x))
    try:
        arbol = ast.parse(codigo, '<celda>', 'exec')
        ultima = None
        if arbol.body and isinstance(arbol.body[-1], ast.Expr):
            ultima = ast.Expression(arbol.body.pop().value)
        exec(compile(arbol, '<celda>', 'exec'), G)
        if ultima is not None:
            v = eval(compile(ultima, '<celda>', 'eval'), G)
            if v is not None:
                salidas.append(__mostrar(v))
        return [s for s in salidas if s] , None
    except BaseException as e:
        tb = traceback.extract_tb(e.__traceback__)
        linea = next((f.lineno for f in reversed(tb) if f.filename == '<celda>'), getattr(e, 'lineno', None))
        return [s for s in salidas if s], (type(e).__name__, str(e), linea)
`;

export function pythonReady() { return pyPromise !== null; }

// Carga Pyodide y pandas una sola vez. onProgress recibe mensajes de estado.
export function loadPython(onProgress = () => {}) {
  if (!pyPromise) {
    pyPromise = (async () => {
      onProgress('Descargando Python… (solo la primera vez, unos 50 MB)');
      const { loadPyodide } = await import('../vendor/pyodide/pyodide.mjs');
      const base = new URL('../vendor/pyodide/', import.meta.url).href;
      const py = await loadPyodide({ indexURL: base, stdout: () => {}, stderr: () => {} });
      onProgress('Cargando pandas…');
      await py.loadPackage(['pandas'], { messageCallback: () => {} });
      py.runPython(HELPERS);
      onProgress('');
      return py;
    })();
    pyPromise.catch(() => { pyPromise = null; });
  }
  return pyPromise;
}

// Crea un espacio de variables nuevo y ejecuta el código de arranque en él.
export async function newNamespace(setupCode, extra = {}) {
  const py = await loadPython();
  const G = py.globals.get('dict')();
  for (const [k, v] of Object.entries(extra)) G.set(k, py.toPy(v));
  const [, err] = py.globals.get('__ejecutar')(setupCode, G).toJs();
  if (err) throw new Error('Error al preparar los datos: ' + err[1]);
  return G;
}

// Ejecuta código y devuelve { stdout, outputs: [[tipo, contenido]], error: {tipo, mensaje, linea} | null }
export async function runPython(code, G) {
  const py = await loadPython();
  let out = '';
  py.setStdout({ batched: (s) => { out += s + '\n'; } });
  py.setStderr({ batched: (s) => { out += s + '\n'; } });
  let res;
  try { res = py.globals.get('__ejecutar')(code, G).toJs({ create_proxies: false }); }
  finally { py.setStdout({ batched: () => {} }); py.setStderr({ batched: () => {} }); }
  const [outputs, err] = res;
  return { stdout: out, outputs, error: err ? { tipo: err[0], mensaje: err[1], linea: err[2] } : null };
}

const PISTAS = {
  NameError: 'Usas un nombre que no existe. Revisa que esté bien escrito y que la variable se haya creado antes.',
  KeyError: 'Esa columna o clave no existe. Revisa el nombre exacto (mayúsculas, tildes, espacios).',
  SyntaxError: 'Hay un error de escritura: revisa paréntesis, comillas y los dos puntos (:) al final de if, for, def y class.',
  IndentationError: 'La sangría no cuadra: las líneas dentro de un bloque deben tener los mismos espacios (usa 4).',
  AttributeError: 'Ese objeto no tiene ese método o atributo. Revisa el nombre o el tipo de dato (por ejemplo, .str solo sirve en columnas de texto).',
  TypeError: 'Mezclas tipos que no se pueden combinar (por ejemplo, texto + número) o faltan argumentos en una función.',
  ValueError: 'El tipo está bien, pero el valor no sirve (por ejemplo, convertir "abc" a número).',
  ZeroDivisionError: 'Estás dividiendo entre cero.',
  IndexError: 'Pides una posición que no existe en la lista.',
};

export function pythonResultHtml(r) {
  let h = '';
  if (r.stdout.trim()) h += `<pre class="out">${esc(r.stdout.replace(/\n+$/, ''))}</pre>`;
  for (const [tipo, contenido] of r.outputs) {
    h += tipo === 'html' ? `<div class="tbl res pd">${contenido}</div>` : `<pre class="out">${esc(contenido)}</pre>`;
  }
  if (r.error) {
    const { tipo, mensaje, linea } = r.error;
    h += `<div class="fb bad"><span><strong>${esc(tipo)}${linea ? ` en la línea ${linea}` : ''}:</strong> ${esc(mensaje)}</span>${PISTAS[tipo] ? `<span>${PISTAS[tipo]}</span>` : ''}</div>`;
  }
  if (!h) h = '<p class="small" style="margin:0">Ejecutado sin salida. Usa print() o deja una expresión en la última línea para ver un resultado.</p>';
  return h;
}

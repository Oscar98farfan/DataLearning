// Simulador de Git para aprender: commits, ramas, merge, conflictos, rebase, squash,
// reset, revert, cherry-pick y stash. Todo en memoria; no toca archivos reales.
// Es una versión simplificada pero fiel al comportamiento de Git en los casos de estudio.

const MARCAS = /^(<<<<<<<|=======|>>>>>>>)( |$)/m;

function hash(n, msg) {
  let h = 2166136261 ^ n;
  for (const ch of msg + n) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return ((h >>> 0).toString(16) + (n * 2654435761 >>> 0).toString(16)).padStart(14, '0').slice(0, 7);
}

const igual = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

// ---------- diff y merge de 3 vías por líneas ----------
function lcs(a, b) {
  const n = a.length, m = b.length, t = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) t[i][j] = a[i] === b[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
  const pares = []; let i = 0, j = 0;
  while (i < n && j < m) { if (a[i] === b[j]) { pares.push([i, j]); i++; j++; } else if (t[i + 1][j] >= t[i][j + 1]) i++; else j++; }
  return pares;
}

// Cambios de base → otro, como rangos en coordenadas de base: {b0, b1, lines}
function cambios(base, otro) {
  const res = []; let pb = 0, po = 0;
  for (const [i, j] of [...lcs(base, otro), [base.length, otro.length]]) {
    if (i > pb || j > po) res.push({ b0: pb, b1: i, lines: otro.slice(po, j) });
    pb = i + 1; po = j + 1;
  }
  return res;
}

export function merge3(base, ours, theirs, etiquetaOurs = 'HEAD', etiquetaTheirs = 'otra') {
  if (ours === theirs) return { text: ours, conflict: false };
  if (base === ours) return { text: theirs, conflict: false };
  if (base === theirs) return { text: ours, conflict: false };
  const B = (base ?? '').split('\n'), O = (ours ?? '').split('\n'), T = (theirs ?? '').split('\n');
  const co = cambios(B, O).map((c) => ({ ...c, q: 'o' })), ct = cambios(B, T).map((c) => ({ ...c, q: 't' }));
  const todos = [...co, ...ct].sort((x, y) => x.b0 - y.b0 || x.b1 - y.b1);
  // agrupa cambios que se tocan o se solapan
  const grupos = [];
  for (const c of todos) {
    const g = grupos[grupos.length - 1];
    if (g && (c.b0 < g.b1 || (c.b0 === g.b0 && c.b1 === g.b0) || (c.b0 === g.b1 && c.b1 === c.b0 && g.b0 === g.b1))) { g.b1 = Math.max(g.b1, c.b1); g.items.push(c); }
    else grupos.push({ b0: c.b0, b1: c.b1, items: [c] });
  }
  const out = []; let pos = 0, conflict = false;
  const aplicar = (lado, g) => {   // reconstruye el bloque [g.b0, g.b1) según los cambios de un lado
    const res = []; let p = g.b0;
    for (const c of g.items.filter((x) => x.q === lado)) { res.push(...B.slice(p, c.b0), ...c.lines); p = c.b1; }
    res.push(...B.slice(p, g.b1));
    return res;
  };
  for (const g of grupos) {
    out.push(...B.slice(pos, g.b0));
    const lados = new Set(g.items.map((c) => c.q));
    if (lados.size === 1) out.push(...aplicar([...lados][0], g));
    else {
      const a = aplicar('o', g), b = aplicar('t', g);
      if (a.join('\n') === b.join('\n')) out.push(...a);
      else { conflict = true; out.push(`<<<<<<< ${etiquetaOurs}`, ...a, '=======', ...b, `>>>>>>> ${etiquetaTheirs}`); }
    }
    pos = g.b1;
  }
  out.push(...B.slice(pos));
  return { text: out.join('\n'), conflict };
}

// ---------- repositorio ----------
export class Repo {
  constructor() {
    this.commits = {};
    this.branches = {};
    this.head = { branch: 'main' };
    this.index = {};
    this.work = {};
    this.n = 0;
    this.merging = null;     // { theirs, msg, conflicts:Set }
    this.rebasing = null;    // { onto, pending:[ids], branch, done:[] , current }
    this.picking = null;     // cherry-pick con conflicto
    this.stash = [];
    this.reflog = [];
    this.usado = new Set();  // comandos usados (para retos)
  }

  // ---- utilidades de consulta ----
  headId() { return this.head.branch ? this.branches[this.head.branch] || null : this.head.id; }
  tree(id) { return id ? this.commits[id].files : {}; }
  short(id) { return id; }
  ancestors(id) {
    const seen = new Set(), stack = id ? [id] : [];
    while (stack.length) { const c = stack.pop(); if (seen.has(c)) continue; seen.add(c); stack.push(...this.commits[c].parents); }
    return seen;
  }
  isAncestor(a, b) { return !!a && !!b && this.ancestors(b).has(a); }
  mergeBase(a, b) {
    const A = this.ancestors(a); let best = null;
    for (const c of this.ancestors(b)) if (A.has(c) && (!best || this.commits[c].n > this.commits[best].n)) best = c;
    return best;
  }
  resolve(ref) {
    if (!ref || ref === 'HEAD') return this.headId();
    const m = ref.match(/^(.+?)(~(\d*)|\^+)$/);
    if (m) {
      let id = this.resolve(m[1]);
      const pasos = m[2].startsWith('~') ? (m[3] === '' ? 1 : +m[3]) : m[2].length;
      for (let i = 0; i < pasos && id; i++) id = this.commits[id].parents[0] || null;
      return id;
    }
    if (this.branches[ref] !== undefined) return this.branches[ref];
    const ids = Object.keys(this.commits).filter((c) => c.startsWith(ref.toLowerCase()));
    return ids.length === 1 ? ids[0] : null;
  }
  log(id) {   // historia de primer padre y demás, más recientes primero
    return [...this.ancestors(id)].sort((a, b) => this.commits[b].n - this.commits[a].n);
  }
  op() { return this.merging || this.rebasing || this.picking; }
  // archivos con conflicto que todavía no se marcan como resueltos con git add
  conflictFiles() { const o = this.op(); return o && o.pend ? [...o.pend].sort() : []; }

  _commit(msg, parents, files) {
    const id = hash(++this.n, msg);
    this.commits[id] = { id, msg, parents, files: { ...files }, n: this.n };
    return id;
  }
  _moveHead(id, motivo) {
    if (this.head.branch) this.branches[this.head.branch] = id; else this.head = { id };
    this.reflog.unshift(`${id} HEAD@{${this.reflog.length}}: ${motivo}`);
  }
  _checkoutTree(id) { this.index = { ...this.tree(id) }; this.work = { ...this.tree(id) }; }
  _sucio() {
    const h = this.tree(this.headId());
    return !igual(this.index, h) || !igual(this.work, this.index);
  }

  // ---- intérprete de comandos ----
  run(linea) {
    const args = tokenizar(linea.trim());
    if (!args.length) return '';
    const [cmd, ...rest] = args;
    try {
      if (cmd === 'git') {
        const [sub, ...r] = rest;
        if (!sub) return 'uso: git <comando>. Prueba: git status';
        this.usado.add(sub + (r[0]?.startsWith('-') ? ' ' + r[0] : ''));
        const f = this['git_' + sub.replace(/-/g, '_')];
        if (!f) return `git: '${sub}' no está en este simulador. Comandos: status, add, commit, log, branch, switch, checkout, merge, rebase, reset, revert, cherry-pick, stash, restore, diff, show, reflog.`;
        return f.call(this, r);
      }
      if (cmd === 'ls') return Object.keys(this.work).sort().join('\n') || '(carpeta vacía)';
      if (cmd === 'cat') return rest[0] in this.work ? this.work[rest[0]] : `cat: ${rest[0]}: no existe`;
      if (cmd === 'echo') {
        const i = rest.findIndex((x) => x === '>' || x === '>>');
        if (i < 0) return rest.join(' ');
        const texto = rest.slice(0, i).join(' '), archivo = rest[i + 1];
        if (!archivo) return 'echo: falta el nombre del archivo';
        this.work[archivo] = rest[i] === '>>' && this.work[archivo] !== undefined ? this.work[archivo] + '\n' + texto : texto;
        return '';
      }
      if (cmd === 'rm') { if (!(rest[0] in this.work)) return `rm: ${rest[0]}: no existe`; delete this.work[rest[0]]; return ''; }
      if (cmd === 'clear') return '\f';
      if (cmd === 'help' || cmd === 'ayuda') return AYUDA;
      return `${cmd}: comando no encontrado. Escribe "ayuda" para ver los comandos.`;
    } catch (e) { return 'error: ' + e.message; }
  }

  git_init() { return 'Ya estás en un repositorio de Git.'; }
  git_help() { return AYUDA; }

  git_status() {
    const h = this.tree(this.headId()), out = [];
    out.push(this.head.branch ? `En la rama ${this.head.branch}` : `HEAD desconectado en ${this.head.id}`);
    if (this.merging) out.push(this.conflictFiles().length ? 'Tienes conflictos sin resolver.\n  (arregla los conflictos y usa "git add <archivo>", luego "git commit")\n  (usa "git merge --abort" para cancelar)' : 'Conflictos resueltos, pero sigues en medio de un merge.\n  (usa "git commit" para terminarlo)');
    if (this.rebasing) out.push(`Rebase en progreso sobre ${this.rebasing.onto}.\n  (arregla los conflictos, "git add <archivo>" y luego "git rebase --continue")\n  (usa "git rebase --abort" para cancelar)`);
    if (this.picking) out.push('Cherry-pick en progreso.\n  (arregla, "git add <archivo>" y "git cherry-pick --continue", o "--abort")');
    const staged = [], unstaged = [], untracked = [], conflictos = this.conflictFiles();
    const todos = new Set([...Object.keys(h), ...Object.keys(this.index), ...Object.keys(this.work)]);
    for (const f of [...todos].sort()) {
      if (this.index[f] !== h[f]) staged.push(`${h[f] === undefined ? 'nuevo archivo' : this.index[f] === undefined ? 'eliminado' : 'modificado'}:   ${f}`);
      if (conflictos.includes(f)) continue;
      if (this.index[f] === undefined && h[f] === undefined && this.work[f] !== undefined) untracked.push(f);
      else if (this.work[f] !== this.index[f]) unstaged.push(`${this.work[f] === undefined ? 'eliminado' : 'modificado'}:   ${f}`);
    }
    if (conflictos.length) out.push('Rutas no fusionadas (con conflicto):\n' + conflictos.map((f) => '  ambos modificados:   ' + f).join('\n'));
    if (staged.length) out.push('Cambios a confirmar (en el stage):\n' + staged.map((x) => '  ' + x).join('\n'));
    if (unstaged.length) out.push('Cambios sin preparar (usa "git add"):\n' + unstaged.map((x) => '  ' + x).join('\n'));
    if (untracked.length) out.push('Archivos sin seguimiento:\n' + untracked.map((x) => '  ' + x).join('\n'));
    if (!staged.length && !unstaged.length && !untracked.length && !conflictos.length) out.push('nada para hacer commit, el árbol de trabajo está limpio');
    return out.join('\n\n');
  }

  git_add(r) {
    if (!r.length) return 'Indica qué agregar: git add <archivo> o git add .';
    const archivos = r.includes('.') || r.includes('-A') || r.includes('--all') ? [...new Set([...Object.keys(this.work), ...Object.keys(this.index)])] : r;
    for (const f of archivos) {
      if (this.work[f] === undefined && this.index[f] === undefined) return `fatal: la ruta '${f}' no coincide con ningún archivo`;
      if (this.work[f] === undefined) delete this.index[f]; else this.index[f] = this.work[f];
      this.op()?.pend?.delete(f);
    }
    const conMarcas = archivos.filter((f) => this.work[f] !== undefined && MARCAS.test(this.work[f]));
    return conMarcas.length ? `Ojo: ${conMarcas.join(', ')} todavía tiene marcas de conflicto (<<<<<<<). Git lo acepta, pero no deberías hacerlo.` : '';
  }

  git_commit(r) {
    let msg = null;
    for (let i = 0; i < r.length; i++) if (r[i] === '-m' || r[i] === '-am') { msg = r[i + 1]; if (r[i] === '-am') this.git_add(['.']); }
    if (r.includes('-a') && msg) this.git_add(['.']);
    const amend = r.includes('--amend');
    if (this.rebasing) return 'Estás en un rebase: usa "git rebase --continue".';
    if (this.picking) return 'Estás en un cherry-pick: usa "git cherry-pick --continue".';
    if (this.merging && this.conflictFiles().length) return `error: no puedes hacer commit: hay conflictos sin resolver en ${this.conflictFiles().join(', ')}.\nEdita el archivo, quita las marcas y usa "git add".`;
    if (msg === null && this.merging) msg = this.merging.msg;
    if (msg === null && amend) msg = this.commits[this.headId()].msg;
    if (msg === null) return 'Falta el mensaje. Usa: git commit -m "mensaje"';
    const hid = this.headId();
    if (amend) {
      if (!hid) return 'fatal: no hay commit para corregir';
      const old = this.commits[hid];
      const id = this._commit(msg, old.parents, this.index);
      this._moveHead(id, `commit (amend): ${msg}`);
      return `[${this.head.branch || 'HEAD'} ${id}] ${msg}  (reemplaza a ${hid}: la historia cambió)`;
    }
    if (!this.merging && hid && igual(this.index, this.tree(hid))) return 'nada para hacer commit (usa "git add" para preparar cambios)';
    if (!this.merging && !hid && !Object.keys(this.index).length) return 'nada para hacer commit (crea un archivo y usa "git add")';
    const parents = hid ? [hid] : [];
    if (this.merging && this.merging.theirs) parents.push(this.merging.theirs);
    const id = this._commit(msg, parents, this.index);
    this._moveHead(id, `commit${this.merging ? ' (merge)' : ''}: ${msg}`);
    const eraMerge = !!this.merging; this.merging = null;
    return `[${this.head.branch || 'HEAD desconectado'} ${id}] ${msg}${eraMerge && parents.length > 1 ? '  (commit de fusión con 2 padres)' : ''}`;
  }

  git_log(r) {
    const all = r.includes('--all');
    const starts = all ? [...Object.values(this.branches), this.headId()].filter(Boolean) : [this.headId()].filter(Boolean);
    if (!starts.length) return 'fatal: la rama actual todavía no tiene commits';
    const ids = new Set(); starts.forEach((s) => this.ancestors(s).forEach((c) => ids.add(c)));
    const orden = [...ids].sort((a, b) => this.commits[b].n - this.commits[a].n);
    const etiquetas = (id) => {
      const l = Object.entries(this.branches).filter(([, v]) => v === id).map(([k]) => (this.head.branch === k ? `HEAD -> ${k}` : k));
      if (!this.head.branch && this.head.id === id) l.unshift('HEAD');
      return l.length ? ` (${l.join(', ')})` : '';
    };
    return orden.map((id) => {
      const c = this.commits[id];
      return `${id}${etiquetas(id)} ${c.msg}${c.parents.length > 1 ? '  [merge]' : ''}`;
    }).join('\n');
  }

  git_branch(r) {
    if (!r.length) return Object.keys(this.branches).sort().map((b) => (this.head.branch === b ? '* ' : '  ') + b).join('\n');
    if (r[0] === '-d' || r[0] === '-D') {
      const b = r[1];
      if (!(b in this.branches)) return `error: la rama '${b}' no existe`;
      if (this.head.branch === b) return `error: no puedes borrar la rama en la que estás ('${b}')`;
      if (r[0] === '-d' && !this.isAncestor(this.branches[b], this.headId())) return `error: la rama '${b}' no está fusionada. Si igual quieres borrarla, usa -D (perderás esos commits de vista).`;
      delete this.branches[b];
      return `Rama ${b} eliminada.`;
    }
    const nombre = r[0];
    if (nombre in this.branches) return `fatal: la rama '${nombre}' ya existe`;
    if (!this.headId()) return 'fatal: haz al menos un commit antes de crear ramas';
    this.branches[nombre] = r[1] ? this.resolve(r[1]) : this.headId();
    return '';
  }

  git_switch(r) {
    if (r[0] === '-c') { const e = this.git_branch([r[1]]); if (e) return e; return this._cambiar(r[1]) + `\nCambiado a nueva rama '${r[1]}'`; }
    return this._cambiar(r[0]);
  }
  git_checkout(r) {
    if (r[0] === '-b') { const e = this.git_branch([r[1]]); if (e) return e; return this._cambiar(r[1]) + `\nCambiado a nueva rama '${r[1]}'`; }
    if (r[0] === '--') return this.git_restore(r.slice(1));
    if (r[0] in this.work && !(r[0] in this.branches)) return this.git_restore([r[0]]);
    return this._cambiar(r[0]);
  }
  _cambiar(ref) {
    if (!ref) return 'Indica a qué rama cambiar.';
    if (this.merging || this.rebasing) return 'error: termina o cancela primero el merge/rebase en curso.';
    const esRama = ref in this.branches;
    const id = this.resolve(ref);
    if (!id) return `error: '${ref}' no es una rama ni un commit conocido`;
    if (this._sucio() && !igual(this.tree(id), this.tree(this.headId()))) return 'error: tienes cambios sin confirmar que se perderían.\nHaz commit o guárdalos con "git stash" antes de cambiar de rama.';
    const work = this.work, index = this.index, sucio = this._sucio();
    this.head = esRama ? { branch: ref } : { id };
    if (sucio) { this.work = work; this.index = index; } else this._checkoutTree(id);
    this.reflog.unshift(`${id} HEAD@{${this.reflog.length}}: checkout: moviéndose a ${ref}`);
    return esRama ? `Cambiado a rama '${ref}'` : `HEAD desconectado en ${id}: estás viendo un commit antiguo. Crea una rama si quieres trabajar aquí.`;
  }

  git_merge(r) {
    if (r[0] === '--abort') {
      if (!this.merging) return 'fatal: no hay un merge en curso';
      this.merging = null; this._checkoutTree(this.headId()); return 'Merge cancelado. Todo volvió a como estaba antes.';
    }
    if (r[0] === '--continue') return this.git_commit([]);
    const noff = r.includes('--no-ff'), squash = r.includes('--squash');
    const ref = r.find((x) => !x.startsWith('-')); let msg = null;
    const mi = r.indexOf('-m'); if (mi >= 0) msg = r[mi + 1];
    const theirs = this.resolve(ref), ours = this.headId();
    if (!theirs) return `merge: '${ref}' no es una rama ni un commit conocido`;
    if (this.merging || this.rebasing) return 'error: ya hay una operación en curso.';
    if (this._sucio()) return 'error: tienes cambios sin confirmar. Haz commit o "git stash" antes de fusionar.';
    if (this.isAncestor(theirs, ours)) return 'Ya está actualizado. (Esa rama ya está incluida en la tuya.)';
    const base = this.mergeBase(ours, theirs);
    if (!squash && !noff && this.isAncestor(ours, theirs)) {
      this._moveHead(theirs, `merge ${ref}: Fast-forward`);
      this._checkoutTree(theirs);
      return `Actualizando ${ours}..${theirs}\nFast-forward\n(No se creó commit de fusión: ${this.head.branch} solo avanzó hasta ${ref}. La historia queda lineal.)`;
    }
    const files = new Set([...Object.keys(this.tree(base)), ...Object.keys(this.tree(ours)), ...Object.keys(this.tree(theirs))]);
    const res = {}, conflictos = [];
    for (const f of files) {
      const b = this.tree(base)[f], o = this.tree(ours)[f], t = this.tree(theirs)[f];
      if (o === t) { if (o !== undefined) res[f] = o; continue; }
      if (b === o) { if (t !== undefined) res[f] = t; continue; }
      if (b === t) { if (o !== undefined) res[f] = o; continue; }
      if (o === undefined || t === undefined) { res[f] = `<<<<<<< HEAD\n${o ?? '(eliminado)'}\n=======\n${t ?? '(eliminado)'}\n>>>>>>> ${ref}`; conflictos.push(f); continue; }
      const m = merge3(b, o, t, 'HEAD', ref);
      res[f] = m.text; if (m.conflict) conflictos.push(f);
    }
    this.work = { ...res };
    const limpios = Object.fromEntries(Object.entries(res).filter(([f]) => !conflictos.includes(f)));
    for (const f of conflictos) if (this.tree(ours)[f] !== undefined) limpios[f] = this.tree(ours)[f];
    this.index = limpios;
    const mensaje = msg || `Merge branch '${ref}'${this.head.branch ? ` into ${this.head.branch}` : ''}`;
    if (squash) {
      this.index = { ...res };
      if (conflictos.length) { this.merging = { theirs: null, msg: `Squash de ${ref}`, pend: new Set(conflictos) }; return `Squash: hay conflictos en ${conflictos.join(', ')}. Resuélvelos, "git add" y "git commit -m".`; }
      return `Squash: los cambios de ${ref} quedaron preparados como UN solo cambio, sin traer sus commits.\nAhora haz: git commit -m "mensaje"\n(La historia de ${ref} no pasa a ${this.head.branch}.)`;
    }
    if (conflictos.length) {
      this.merging = { theirs, msg: mensaje, pend: new Set(conflictos) };
      return `Auto-fusionando...\nCONFLICTO (contenido): conflicto de fusión en ${conflictos.join(', ')}\nLa fusión automática falló. Abre el archivo, elige qué conservar, borra las marcas <<<<<<< ======= >>>>>>>,\nluego "git add ${conflictos[0]}" y "git commit".`;
    }
    const id = this._commit(mensaje, [ours, theirs], res);
    this._moveHead(id, `merge ${ref}`);
    this._checkoutTree(id);
    return `Merge hecho por la estrategia 'ort'.\n[${this.head.branch} ${id}] ${mensaje}  (commit de fusión: conserva la historia de ambas ramas)`;
  }

  // Reaplica commits uno por uno (para rebase y cherry-pick)
  _aplicar(id) {
    const c = this.commits[id], padre = c.parents[0], ours = this.headId();
    const base = this.tree(padre), ellos = c.files, nuestros = this.tree(ours);
    const files = new Set([...Object.keys(base), ...Object.keys(ellos), ...Object.keys(nuestros)]);
    const res = {}, conflictos = [];
    for (const f of files) {
      const b = base[f], o = nuestros[f], t = ellos[f];
      if (o === t) { if (o !== undefined) res[f] = o; continue; }
      if (b === t) { if (o !== undefined) res[f] = o; continue; }
      if (b === o) { if (t !== undefined) res[f] = t; continue; }
      if (o === undefined || t === undefined) { res[f] = `<<<<<<< HEAD\n${o ?? '(eliminado)'}\n=======\n${t ?? '(eliminado)'}\n>>>>>>> ${id} (${c.msg})`; conflictos.push(f); continue; }
      const m = merge3(b, o, t, 'HEAD', `${id} (${c.msg})`);
      res[f] = m.text; if (m.conflict) conflictos.push(f);
    }
    return { res, conflictos, msg: c.msg };
  }

  git_rebase(r) {
    if (r[0] === '--abort') {
      if (!this.rebasing) return 'fatal: no hay un rebase en curso';
      const { branch, orig } = this.rebasing; this.rebasing = null;
      this.branches[branch] = orig; this.head = { branch }; this._checkoutTree(orig);
      return 'Rebase cancelado. La rama volvió a como estaba.';
    }
    if (r[0] === '--continue') {
      if (!this.rebasing) return 'fatal: no hay un rebase en curso';
      if (this.conflictFiles().length) return `error: todavía hay conflictos en ${this.conflictFiles().join(', ')}.`;

      const cur = this.rebasing.current;
      const id = this._commit(this.commits[cur].msg, [this.headId()], this.index);
      this.head = { id }; this._checkoutTree(id);
      return this._seguirRebase([`Aplicado: ${this.commits[cur].msg} → ${id}`]);
    }
    if (this.rebasing || this.merging) return 'error: ya hay una operación en curso.';
    if (!this.head.branch) return 'error: cambia a una rama antes de hacer rebase.';
    if (this._sucio()) return 'error: tienes cambios sin confirmar. Haz commit o "git stash" primero.';
    const onto = this.resolve(r[0]);
    if (!onto) return `fatal: '${r[0]}' no es una rama ni un commit conocido`;
    const ours = this.headId();
    if (this.isAncestor(onto, ours)) return `La rama ${this.head.branch} ya está al día con ${r[0]}. Nada que hacer.`;
    if (this.isAncestor(ours, onto)) { this._moveHead(onto, `rebase: fast-forward a ${r[0]}`); this._checkoutTree(onto); return `Fast-forward: ${this.head.branch} avanzó hasta ${r[0]}.`; }
    const enOnto = this.ancestors(onto);
    const pend = this.log(ours).filter((c) => !enOnto.has(c) && this.commits[c].parents.length === 1).reverse();
    const branch = this.head.branch;
    this.rebasing = { onto: r[0], pending: pend, branch, orig: ours, current: null };
    this.head = { id: onto }; this._checkoutTree(onto);
    return this._seguirRebase([`Reaplicando ${pend.length} commit(s) de ${branch} encima de ${r[0]}…`]);
  }
  _seguirRebase(log) {
    const rb = this.rebasing;
    while (rb.pending.length) {
      const id = rb.pending.shift(); rb.current = id;
      const { res, conflictos, msg } = this._aplicar(id);
      if (conflictos.length) {
        this.work = { ...res };
        this.index = Object.fromEntries(Object.entries(res).filter(([f]) => !conflictos.includes(f)));
        for (const f of conflictos) if (this.tree(this.headId())[f] !== undefined) this.index[f] = this.tree(this.headId())[f];
        rb.pend = new Set(conflictos);
        log.push(`CONFLICTO al aplicar "${msg}" en ${conflictos.join(', ')}.\nResuelve el archivo, haz "git add ${conflictos[0]}" y luego "git rebase --continue".`);
        return log.join('\n');
      }
      if (igual(res, this.tree(this.headId()))) { log.push(`Omitido (ya estaba aplicado): ${msg}`); continue; }
      const nid = this._commit(msg, [this.headId()], res);
      this.head = { id: nid }; this._checkoutTree(nid);
      log.push(`Aplicado: ${msg} → ${nid}`);
    }
    const final = this.headId();
    this.branches[rb.branch] = final; this.head = { branch: rb.branch };
    this.reflog.unshift(`${final} HEAD@{${this.reflog.length}}: rebase terminado: ${rb.branch} sobre ${rb.onto}`);
    this.rebasing = null;
    log.push(`Rebase terminado. ${rb.branch} ahora está encima de ${rb.onto} con historia lineal.\n(Los commits se reescribieron: tienen ids nuevos.)`);
    return log.join('\n');
  }

  git_cherry_pick(r) {
    if (r[0] === '--abort') { if (!this.picking) return 'fatal: no hay cherry-pick en curso'; this.picking = null; this._checkoutTree(this.headId()); return 'Cherry-pick cancelado.'; }
    if (r[0] === '--continue') {
      if (!this.picking) return 'fatal: no hay cherry-pick en curso';
      if (this.conflictFiles().length) return `error: todavía hay conflictos en ${this.conflictFiles().join(', ')}.`;
      const id = this._commit(this.picking.msg, [this.headId()], this.index); this.picking = null;
      this._moveHead(id, 'cherry-pick'); this._checkoutTree(id);
      return `[${this.head.branch} ${id}] ${this.commits[id].msg}`;
    }
    const src = this.resolve(r[0]);
    if (!src) return `fatal: '${r[0]}' no es un commit conocido`;
    if (this._sucio()) return 'error: tienes cambios sin confirmar.';
    const { res, conflictos, msg } = this._aplicar(src);
    if (conflictos.length) { this.picking = { msg, pend: new Set(conflictos) }; this.work = { ...res }; this.index = { ...this.tree(this.headId()) }; return `CONFLICTO al copiar "${msg}". Resuelve, "git add" y "git cherry-pick --continue".`; }
    const id = this._commit(msg, [this.headId()], res);
    this._moveHead(id, `cherry-pick: ${msg}`); this._checkoutTree(id);
    return `[${this.head.branch} ${id}] ${msg}\n(Copia del commit ${src}: mismo cambio, id nuevo.)`;
  }

  git_reset(r) {
    const modo = r.find((x) => x.startsWith('--')) || '--mixed';
    const ref = r.find((x) => !x.startsWith('--'));
    if (ref && ref in this.work && !this.resolve(ref)) { this.index[ref] = this.tree(this.headId())[ref]; if (this.index[ref] === undefined) delete this.index[ref]; return `Archivo ${ref} sacado del stage.`; }
    const id = ref ? this.resolve(ref) : this.headId();
    if (!id) return `fatal: '${ref}' no es un commit conocido`;
    const antes = this.headId();
    const perdidos = this.log(antes).filter((c) => !this.ancestors(id).has(c));
    this.merging = null;
    this._moveHead(id, `reset: moviendo a ${ref || 'HEAD'}`);
    if (modo === '--hard') this._checkoutTree(id);
    else if (modo === '--mixed') this.index = { ...this.tree(id) };
    const nota = perdidos.length ? `\n${perdidos.length} commit(s) salieron de la historia de ${this.head.branch || 'HEAD'}: ${perdidos.join(', ')}.` : '';
    const efecto = modo === '--soft' ? 'Los cambios siguen preparados (en el stage).' : modo === '--hard' ? 'Los cambios se BORRARON del área de trabajo.' : 'Los cambios siguen en tus archivos, pero sin preparar.';
    return `HEAD ahora está en ${id}. ${efecto}${nota}${perdidos.length ? '\n(Si te equivocaste, "git reflog" muestra dónde estabas.)' : ''}`;
  }

  git_revert(r) {
    const id = this.resolve(r.find((x) => !x.startsWith('-')));
    if (!id) return 'fatal: indica un commit que exista';
    if (this._sucio()) return 'error: tienes cambios sin confirmar.';
    const c = this.commits[id];
    if (c.parents.length > 1) return 'Este simulador no revierte commits de fusión. Revierte un commit normal.';
    const antes = this.tree(c.parents[0]), despues = c.files, actual = this.tree(this.headId()), res = { ...actual };
    for (const f of new Set([...Object.keys(antes), ...Object.keys(despues)])) {
      if (antes[f] === despues[f]) continue;
      if (actual[f] === despues[f]) { if (antes[f] === undefined) delete res[f]; else res[f] = antes[f]; }
      else {
        const m = merge3(despues[f] ?? '', actual[f] ?? '', antes[f] ?? '', 'HEAD', `revert ${id}`);
        if (m.conflict) return 'El revert choca con cambios posteriores. En este simulador, revierte el último commit que tocó ese archivo.';
        res[f] = m.text;
      }
    }
    const nid = this._commit(`Revert "${c.msg}"`, [this.headId()], res);
    this._moveHead(nid, `revert: ${c.msg}`); this._checkoutTree(nid);
    return `[${this.head.branch} ${nid}] Revert "${c.msg}"\n(Se creó un commit nuevo que deshace el cambio. La historia se conserva: ${id} sigue ahí.)`;
  }

  git_stash(r) {
    const sub = r[0] || 'push';
    if (sub === 'push' || sub === 'save') {
      if (!this._sucio()) return 'No hay cambios para guardar.';
      this.stash.unshift({ work: { ...this.work }, index: { ...this.index }, rama: this.head.branch, msg: `WIP en ${this.head.branch}` });
      this._checkoutTree(this.headId());
      return `Cambios guardados en stash@{0}: WIP en ${this.head.branch}. Tu carpeta quedó limpia.`;
    }
    if (sub === 'list') return this.stash.map((s, i) => `stash@{${i}}: ${s.msg}`).join('\n') || '(stash vacío)';
    if (sub === 'pop' || sub === 'apply') {
      if (!this.stash.length) return 'No hay nada en el stash.';
      const s = this.stash[0];
      this.work = { ...this.work, ...s.work };
      for (const f of Object.keys(this.work)) if (!(f in s.work) && f in this.tree(this.headId()) && !(f in s.index)) delete this.work[f];
      if (sub === 'pop') this.stash.shift();
      return `Cambios restaurados${sub === 'pop' ? ' y eliminados del stash' : ''}. Revisa con "git status".`;
    }
    if (sub === 'drop') { this.stash.shift(); return 'stash@{0} eliminado.'; }
    return 'Usa: git stash, git stash list, git stash pop, git stash drop';
  }

  git_restore(r) {
    const staged = r.includes('--staged'); const archivos = r.filter((x) => !x.startsWith('-'));
    const h = this.tree(this.headId());
    for (const f of archivos[0] === '.' ? Object.keys({ ...this.work, ...this.index }) : archivos) {
      if (staged) { if (h[f] === undefined) delete this.index[f]; else this.index[f] = h[f]; }
      else { if (this.index[f] === undefined) delete this.work[f]; else this.work[f] = this.index[f]; }
    }
    return '';
  }

  git_diff(r) {
    const staged = r.includes('--staged') || r.includes('--cached');
    const A = staged ? this.tree(this.headId()) : this.index, B = staged ? this.index : this.work;
    const out = [];
    for (const f of [...new Set([...Object.keys(A), ...Object.keys(B)])].sort()) {
      if (A[f] === B[f] || (!staged && A[f] === undefined)) continue;
      out.push(`--- a/${f}\n+++ b/${f}`);
      const a = (A[f] ?? '').split('\n'), b = (B[f] ?? '').split('\n');
      for (const c of cambios(a, b)) { a.slice(c.b0, c.b1).forEach((l) => out.push('-' + l)); c.lines.forEach((l) => out.push('+' + l)); }
    }
    return out.join('\n') || (staged ? 'No hay cambios preparados.' : 'No hay cambios sin preparar.');
  }

  git_show(r) {
    const id = this.resolve(r[0] || 'HEAD'); if (!id) return 'fatal: commit desconocido';
    const c = this.commits[id];
    const padre = this.tree(c.parents[0]);
    const cambiosTxt = [...new Set([...Object.keys(padre), ...Object.keys(c.files)])].filter((f) => padre[f] !== c.files[f]).map((f) => `  ${padre[f] === undefined ? 'A' : c.files[f] === undefined ? 'D' : 'M'} ${f}`);
    return `commit ${id}${c.parents.length > 1 ? `\nMerge: ${c.parents.join(' ')}` : ''}\n\n    ${c.msg}\n\n${cambiosTxt.join('\n') || '  (sin cambios de archivos)'}`;
  }

  git_reflog() { return this.reflog.join('\n') || '(vacío)'; }
}

export const AYUDA = `Comandos de Git disponibles:
  git status · git add <archivo>|. · git commit -m "msg" [--amend]
  git log [--all] · git branch [nombre] [-d|-D nombre]
  git switch <rama> · git switch -c <rama> · git checkout [-b] <rama>
  git merge <rama> [--no-ff] [--squash] [--abort]
  git rebase <rama> [--continue] [--abort]
  git reset [--soft|--mixed|--hard] <commit> · git revert <commit>
  git cherry-pick <commit> · git stash [list|pop|drop]
  git restore [--staged] <archivo> · git diff [--staged] · git show <commit> · git reflog
Comandos de archivos:
  ls · cat <archivo> · echo "texto" > archivo · echo "texto" >> archivo · rm <archivo> · clear
Referencias: nombres de rama, HEAD, HEAD~1, HEAD~2, o los primeros caracteres del id.`;

export function tokenizar(s) {
  const out = []; const re = /"((?:\\.|[^"\\])*)"|'([^']*)'|(\S+)/g; let m;
  while ((m = re.exec(s))) out.push(m[1] !== undefined ? m[1].replace(/\\"/g, '"') : m[2] !== undefined ? m[2] : m[3]);
  return out;
}

// Ejecuta una lista de comandos (para preparar retos). Lanza error si algún comando falla.
export function script(repo, lineas) {
  for (const l of lineas) {
    const r = repo.run(l);
    if (/^(error|fatal)/m.test(r) || /no encontrado/.test(r)) throw new Error(`"${l}" → ${r}`);
  }
  return repo;
}

// Calcula la posición de cada commit para dibujar el grafo (como git log --graph).
export function layout(repo) {
  const starts = [...Object.values(repo.branches), repo.headId()].filter(Boolean);
  const ids = new Set(); starts.forEach((s) => repo.ancestors(s).forEach((c) => ids.add(c)));
  const orden = [...ids].sort((a, b) => repo.commits[b].n - repo.commits[a].n);
  const lanes = [], pos = {};
  orden.forEach((id, row) => {
    let col = lanes.indexOf(id);
    if (col < 0) { col = lanes.indexOf(null); if (col < 0) col = lanes.length; lanes[col] = id; }
    for (let i = 0; i < lanes.length; i++) if (i !== col && lanes[i] === id) lanes[i] = null;
    pos[id] = { row, col };
    const ps = repo.commits[id].parents;
    lanes[col] = ps[0] ?? null;
    for (const p of ps.slice(1)) {
      if (!lanes.includes(p)) { let free = lanes.indexOf(null); if (free < 0) free = lanes.length; lanes[free] = p; }
    }
    while (lanes.length && lanes[lanes.length - 1] === null) lanes.pop();
  });
  return { orden, pos };
}

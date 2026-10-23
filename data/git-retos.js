// Retos del laboratorio de Git.
// setup: comandos (o funciones) que preparan el repositorio · solucion: comandos que resuelven el reto
// check(repo): true cuando el objetivo se cumple · historia: qué pasa con la historia
const base = ['echo "# Proyecto de ventas" > README.md', 'git add .', 'git commit -m "Inicio del proyecto"'];
// Edita un archivo (en la solución representa lo que harías con el botón Editar)
const escribir = (archivo, texto) => Object.assign((repo) => { repo.work[archivo] = texto; }, { archivo, texto });
const tip = (repo, rama) => repo.commits[repo.branches[rama]];
const lineal = (repo, rama) => repo.log(repo.branches[rama]).every((c) => repo.commits[c].parents.length <= 1);
const limpio = (repo) => !repo.merging && !repo.rebasing && !repo.picking && repo.run('git status').includes('árbol de trabajo está limpio');
const sinMarcas = (files) => Object.values(files).every((t) => !/^(<<<<<<<|=======|>>>>>>>)/m.test(t));

export const RESUMEN_HISTORIA = [
  ['git merge (fast-forward)', 'Conserva', 'La rama principal solo avanza. No crea commit extra; queda lineal.'],
  ['git merge --no-ff', 'Conserva todo', 'Crea un commit de fusión: se ve que existió la rama y cuándo se integró.'],
  ['git merge --squash', 'No conserva la de la rama', 'Todos los commits de la rama se vuelven uno solo en main.'],
  ['git rebase', 'Reescribe', 'Mueve tus commits encima de otra rama: historia lineal, pero con ids nuevos.'],
  ['git revert', 'Conserva', 'Crea un commit nuevo que deshace otro. Seguro en ramas compartidas.'],
  ['git reset --hard', 'Borra', 'Mueve la rama hacia atrás y descarta commits y cambios. Solo en local.'],
  ['git reset --soft', 'Reescribe', 'Quita commits pero deja sus cambios preparados para rehacerlos en uno.'],
  ['git cherry-pick', 'Copia', 'Copia un commit puntual a otra rama, con id nuevo.'],
];

export const RETOS = [
{id:'g01',l:1,t:'Tu primer commit',historia:'Crea historia',
 objetivo:'Hay un archivo README.md sin seguimiento. Prepáralo y guárdalo en un commit con el mensaje "Primer commit".',
 explica:'Un commit es una foto de tus archivos. Primero eliges qué entra a la foto (git add, el "stage") y luego la tomas (git commit).',
 setup:['echo "# Mi proyecto" > README.md'],
 solucion:['git status','git add README.md','git commit -m "Primer commit"','git log'],
 check:(r)=>!!r.branches.main && 'README.md' in tip(r,'main').files && limpio(r)},

{id:'g02',l:1,t:'Rama y fast-forward',historia:'Conserva (lineal)',
 objetivo:'Crea la rama feature, agrega en ella un archivo reporte.sql con un commit, vuelve a main y fusiona feature.',
 explica:'Si main no avanzó mientras trabajabas en feature, el merge solo "adelanta" main hasta feature (fast-forward). No se crea commit extra.',
 setup:[...base],
 solucion:['git switch -c feature','echo "SELECT * FROM ventas;" > reporte.sql','git add reporte.sql','git commit -m "Agrega reporte de ventas"','git switch main','git merge feature','git log'],
 check:(r)=>r.branches.feature && r.branches.main===r.branches.feature && 'reporte.sql' in tip(r,'main').files && lineal(r,'main') && r.head.branch==='main'},

{id:'g03',l:2,t:'Merge que conserva toda la historia',historia:'Conserva todo',
 objetivo:'La rama feature tiene 2 commits. Intégrala a main dejando un commit de fusión, para que quede registro de que existió la rama.',
 explica:'Con --no-ff Git crea un commit de fusión con 2 padres, aunque se pudiera hacer fast-forward. En el grafo se ve la rama y el punto donde se unió.',
 setup:[...base,'git switch -c feature','echo "import pandas as pd" > limpieza.py','git add .','git commit -m "Crea script de limpieza"','echo "df = df.drop_duplicates()" >> limpieza.py','git commit -am "Quita duplicados"','git switch main'],
 solucion:['git log --all','git merge --no-ff feature -m "Integra limpieza de datos"','git log'],
 check:(r)=>{const t=tip(r,'main');return t.parents.length===2 && r.isAncestor(r.branches.feature,r.branches.main);}},

{id:'g04',l:2,t:'Resolver un conflicto de merge',historia:'Conserva todo',
 objetivo:'main y feature cambiaron la misma línea de config.txt. Fusiona feature en main, resuelve el conflicto dejando meta=150 y termina el merge.',
 explica:'Git no sabe cuál cambio es el correcto, así que marca el archivo con <<<<<<< (tu versión), ======= y >>>>>>> (la otra). Tú editas, dejas lo correcto, borras las marcas, haces git add y git commit.',
 setup:[...base,escribir('config.txt','region=Norte\nmeta=100\nmoneda=COP'),'git add .','git commit -m "Config inicial"','git switch -c feature',escribir('config.txt','region=Norte\nmeta=150\nmoneda=COP'),'git commit -am "Sube la meta a 150"','git switch main',escribir('config.txt','region=Norte\nmeta=120\nmoneda=COP'),'git commit -am "Ajusta la meta a 120"'],
 solucion:['git merge feature','cat config.txt',escribir('config.txt','region=Norte\nmeta=150\nmoneda=COP'),'git add config.txt','git commit -m "Merge feature: meta queda en 150"','git log'],
 check:(r)=>{const t=tip(r,'main');return t.parents.length===2 && !r.merging && sinMarcas(t.files) && /meta=150/.test(t.files['config.txt']||'');}},

{id:'g05',l:2,t:'Historia lineal con rebase',historia:'Reescribe',
 objetivo:'Mientras trabajabas en feature, main recibió un arreglo. Pon tus commits de feature encima de main con rebase y luego intégralos a main sin commit de fusión.',
 explica:'git rebase main toma tus commits y los vuelve a aplicar encima de main, como si hubieras empezado después. La historia queda en una sola línea, pero los commits reciben ids nuevos: por eso no se hace rebase de commits que otros ya descargaron.',
 setup:[...base,'git switch -c feature','echo "def total(v): return sum(v)" > calculos.py','git add .','git commit -m "Función total"','echo "def promedio(v): return total(v)/len(v)" >> calculos.py','git commit -am "Función promedio"','git switch main','echo "Corrige el título" >> README.md','git commit -am "Arreglo en README"','git switch feature'],
 solucion:['git log --all','git rebase main','git switch main','git merge feature','git log'],
 check:(r)=>r.branches.main===r.branches.feature && lineal(r,'main') && r.log(r.branches.main).length>=4},

{id:'g06',l:2,t:'Squash: toda la rama en un solo commit',historia:'No conserva la de la rama',
 objetivo:'feature tiene 3 commits pequeños ("wip"). Llévalos a main como UN solo commit con un buen mensaje.',
 explica:'git merge --squash prepara todos los cambios de la rama juntos, sin traer sus commits. Luego haces un commit normal. main queda limpio, pero se pierde el detalle de los pasos.',
 setup:[...base,'git switch -c feature','echo "Informe mensual" > informe.md','git add .','git commit -m "wip"','echo "Ventas: 120" >> informe.md','git commit -am "wip 2"','echo "Meta: 150" >> informe.md','git commit -am "arreglo typo"','git switch main'],
 solucion:['git merge --squash feature','git status','git commit -m "Agrega informe mensual"','git log'],
 check:(r)=>{const t=tip(r,'main');return t.parents.length===1 && t.files['informe.md']===tip(r,'feature').files['informe.md'] && !r.isAncestor(r.branches.feature,r.branches.main) && !/wip/i.test(t.msg);}},

{id:'g07',l:2,t:'Deshacer sin borrar la historia (revert)',historia:'Conserva',
 objetivo:'El último commit de main metió precios equivocados y ya lo subiste al remoto. Deshazlo sin reescribir la historia.',
 explica:'git revert crea un commit nuevo que hace lo contrario. El error sigue visible en la historia, pero su efecto se anula. Es la forma segura en ramas compartidas.',
 setup:[...base,'echo "producto,precio" > precios.csv','echo "camisa,45000" >> precios.csv','git add .','git commit -m "Precios correctos"','echo "producto,precio" > precios.csv','echo "camisa,4500" >> precios.csv','git commit -am "Actualiza precios"'],
 solucion:['git log','git revert HEAD','cat precios.csv','git log'],
 check:(r)=>{const t=tip(r,'main');return /^Revert/.test(t.msg) && /45000/.test(t.files['precios.csv']) && r.log(r.branches.main).some((c)=>r.commits[c].msg==='Actualiza precios');}},

{id:'g08',l:2,t:'Borrar commits locales (reset --hard)',historia:'Borra',
 objetivo:'Hiciste 2 commits de experimento que nadie más tiene. Bórralos de la historia y deja main como en "Base estable".',
 explica:'git reset --hard HEAD~2 mueve la rama 2 commits atrás y descarta sus cambios. Desaparecen del grafo. Úsalo solo con commits que no hayas compartido. Si te arrepientes, git reflog muestra dónde estabas.',
 setup:[...base,'echo "v1" > modelo.py','git add .','git commit -m "Base estable"','echo "v2 experimental" > modelo.py','git commit -am "Experimento 1"','echo "v3 rota" > modelo.py','git commit -am "Experimento 2"'],
 solucion:['git log','git reset --hard HEAD~2','git log','cat modelo.py','git reflog'],
 check:(r)=>tip(r,'main').msg==='Base estable' && limpio(r)},

{id:'g09',l:3,t:'Unir varios commits (reset --soft)',historia:'Reescribe',
 objetivo:'Tus últimos 3 commits son "wip a", "wip b" y "wip c". Únelos en un solo commit "Agrega módulo de ventas" sin perder ningún cambio.',
 explica:'git reset --soft HEAD~3 quita los 3 commits pero deja todos sus cambios preparados en el stage. Un nuevo commit los guarda juntos.',
 setup:[...base,'echo "def ventas(): pass" > ventas.py','git add .','git commit -m "wip a"','echo "def total(): pass" >> ventas.py','git commit -am "wip b"','echo "def reporte(): pass" >> ventas.py','git commit -am "wip c"'],
 solucion:['git reset --soft HEAD~3','git status','git commit -m "Agrega módulo de ventas"','git log'],
 check:(r)=>{const t=tip(r,'main');return t.msg!=='wip c' && !/wip/i.test(t.msg) && (t.files['ventas.py']||'').split('\n').length===3 && r.commits[t.parents[0]].msg==='Inicio del proyecto';}},

{id:'g10',l:3,t:'Conflicto durante un rebase',historia:'Reescribe',
 objetivo:'Haz rebase de feature sobre main. Habrá un conflicto en config.txt: déjalo con meta=150 y continúa el rebase.',
 explica:'En un rebase, Git aplica tus commits uno por uno; si uno choca, se detiene. Resuelves igual que en un merge, pero terminas con git rebase --continue (o cancelas con --abort).',
 setup:[...base,escribir('config.txt','meta=100'),'git add .','git commit -m "Config inicial"','git switch -c feature',escribir('config.txt','meta=150'),'git commit -am "Meta 150"','git switch main',escribir('config.txt','meta=120'),'git commit -am "Meta 120"','git switch feature'],
 solucion:['git rebase main','cat config.txt',escribir('config.txt','meta=150'),'git add config.txt','git rebase --continue','git log'],
 check:(r)=>!r.rebasing && r.isAncestor(r.branches.main,r.branches.feature) && lineal(r,'feature') && sinMarcas(tip(r,'feature').files) && tip(r,'feature').files['config.txt']==='meta=150'},

{id:'g11',l:3,t:'Traer un solo commit (cherry-pick)',historia:'Copia',
 objetivo:'En develop hay 3 commits. Lleva a main SOLO "Corrige cálculo de IVA", sin la nueva función ni el experimento.',
 explica:'git cherry-pick copia un commit concreto a tu rama actual. Ideal para llevar un arreglo urgente sin traer trabajo a medias. Puedes referirte al commit por su id o como develop~1.',
 setup:[...base,'git switch -c develop','echo "def nueva(): pass" > funciones.py','git add .','git commit -m "Nueva función"','echo "IVA = 0.19" > iva.py','git add .','git commit -m "Corrige cálculo de IVA"','echo "prueba" > experimento.py','git add .','git commit -m "Experimento"','git switch main'],
 solucion:['git log --all','git cherry-pick develop~1','git log','ls'],
 check:(r)=>{const t=tip(r,'main');return t.msg==='Corrige cálculo de IVA' && 'iva.py' in t.files && !('experimento.py' in t.files) && !('funciones.py' in t.files);}},

{id:'g12',l:3,t:'Guardar trabajo a medias (stash)',historia:'No cambia',
 objetivo:'Estás editando ventas.py en feature (sin commit) y te piden un arreglo urgente en main. Guarda tu trabajo, haz un commit "Hotfix" en main y luego recupera tu trabajo en feature.',
 explica:'git stash guarda tus cambios sin commit y deja la carpeta limpia para cambiar de rama. git stash pop los devuelve cuando regresas.',
 setup:[...base,'git switch -c feature','echo "def ventas(): pass" > ventas.py','git add .','git commit -m "Esqueleto de ventas"','echo "def ventas(): return 42  # a medias" > ventas.py'],
 solucion:['git status','git stash','git switch main','echo "arreglo urgente" > hotfix.txt','git add .','git commit -m "Hotfix"','git switch feature','git stash pop','cat ventas.py'],
 check:(r)=>tip(r,'main').msg==='Hotfix' && r.head.branch==='feature' && /a medias/.test(r.work['ventas.py']||'') && !r.stash.length},
];

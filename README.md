# Taller de Datos

Plataforma para practicar programación de **analista e ingeniero de datos**, de lo básico a lo avanzado, desde el celular o el PC y **sin internet**.

- **Practicar:** 296 ejercicios de Python, Pandas, SQL, Power BI / DAX (con inteligencia de tiempo), Git, Arquitectura de datos (Spark y Delta) e IA generativa. Son para escribir código o de opción múltiple, con colores de sintaxis.
- **SQL de verdad:** los ejercicios de SQL se ejecutan en SQLite dentro del navegador. Si tu resultado coincide con el esperado, cuenta como correcto aunque lo hayas escrito distinto.
- **Laboratorio SQL:** consultas libres sobre 4 tablas de práctica, con pasos guiados y 8 ejemplos explicados (de SELECT a CTE + LAG).
- **Conceptos:** el recorrido de los datos (OLTP → lakehouse → medallion → Power BI) y el de un asistente con IA (RAG, Copilot, Copilot Studio). Incluye 13 comparaciones, un glosario de 175 términos y tarjetas de repaso.

## Cómo usarla

**En el celular (instalada, sin internet):** abre la página publicada una vez con internet. En Chrome, menú ⋮ → *Agregar a la pantalla principal* (o *Instalar app*). Desde ahí funciona sin conexión.

**En tu PC, para desarrollar:** necesita un servidor local, porque los módulos y el motor SQL no cargan con doble clic.

```bash
npm start            # = python -m http.server 8000
# abre http://localhost:8000
```

También sirve la extensión *Live Server* de VS Code.

## Estructura

```
index.html              página principal (3 pestañas)
css/styles.css          estilos (tema claro y oscuro)
js/
  app.js                pestañas, barra de símbolos, modo sin internet
  practica.js           sesión de ejercicios, validación, progreso
  laboratorio.js        consultas SQL libres
  conceptos.js          recorrido, comparaciones, glosario, tarjetas
  sql-engine.js         carga SQLite (sql.js) y compara resultados
  highlight.js          colores de sintaxis (SQL, Python, DAX, Git)
  util.js               utilidades
data/
  temas.js              temas y niveles
  contextos.js          esquemas que se muestran en los ejercicios
  ejercicios/*.js       un archivo por tema
  conceptos.js          glosario, recorridos (datos e IA) y comparaciones
  dataset.sql           datos de práctica (generados)
vendor/                 sql.js 1.10.3 (SQLite en WebAssembly)
scripts/
  validar.mjs           revisa todo el contenido (npm test)
  generar-dataset.py    regenera data/dataset.sql
sw.js                   service worker (modo sin internet)
manifest.webmanifest    datos para instalarla como app
```

## Agregar ejercicios

Abre el archivo del tema en `data/ejercicios/` y agrega una línea con un `id` nuevo.

Para escribir:
```js
{id:'sql-042', t:'sql', l:2, k:'w', run:true, q:'Pregunta…', c0:CTX_SQL,
 r:[/^select.../], s:'SELECT …;', h:'Pista opcional'}
```

De opción múltiple:
```js
{id:'git-037', t:'git', l:1, k:'m', q:'Pregunta…', o:['A','B','C'], c:1, e:'Explicación opcional'}
```

| Campo | Qué es |
|---|---|
| `l` | Nivel: 1 básico, 2 intermedio, 3 avanzado |
| `k` | `w` escribir, `m` opción múltiple |
| `r` | Expresiones que debe cumplir la respuesta, ya normalizada: minúsculas, **sin espacios**, comillas simples y sin `;` final |
| `s` | Solución. En SQL con `run:true` también es la consulta de referencia |
| `run` | Solo SQL: valida ejecutando contra `data/dataset.sql` |
| `ord` | Solo SQL: el orden de las filas importa |

Antes de subir cambios, corre:

```bash
npm test
```

Verifica que cada solución pase su corrector, que cada SQL corra sobre los datos y que el modo sin internet incluya todos los archivos.

Si agregas un archivo nuevo (JS, datos o imagen), inclúyelo en `ARCHIVOS` dentro de `sw.js`. Para que los celulares descarguen la versión nueva de inmediato, sube el número de `CACHE` (por ejemplo `taller-datos-v2`).

## Publicar en GitHub Pages

1. Crea un repositorio vacío en GitHub (sin README).
2. En esta carpeta:
   ```bash
   git remote add origin https://github.com/TU_USUARIO/taller-datos.git
   git push -u origin main
   ```
3. En GitHub: **Settings → Pages → Source: Deploy from a branch → Branch: `main` / `(root)` → Save**.
4. En uno o dos minutos queda en `https://TU_USUARIO.github.io/taller-datos/`. Cada `git push` la actualiza.

## Hoja de ruta

- [x] **Fase 1:** proyecto ordenado, app instalable sin internet, publicación en GitHub Pages
- [x] **Fase 1b:** SQL real en el navegador y laboratorio
- [ ] **Fase 2:** Python y pandas reales en el navegador (Pyodide)
- [ ] **Fase 3:** ruta de aprendizaje de analista a ingeniero y mini proyectos (por ejemplo, Bronze → Silver → Gold con un caso de ventas)
- [ ] **Fase 4:** Supabase, con login y progreso sincronizado entre celular y PC

## Créditos

- [sql.js](https://github.com/sql-js/sql.js) (licencia MIT): SQLite compilado a WebAssembly.
- Datos de práctica ficticios.

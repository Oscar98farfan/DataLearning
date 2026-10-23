// Claves: buenas prácticas y trucos de cada lenguaje.
// a área · t título · d por qué · mal / bien ejemplos de código (opcionales) · lang para los colores
export const AREAS_CLAVES = {
  gen: 'General', py: 'Python', pd: 'Pandas', sql: 'SQL', bi: 'Power BI / DAX', git: 'Git', arq: 'Arquitectura', ia: 'IA generativa',
};

export const CLAVES = [
// ---------- General ----------
{a:'gen',t:'Nombra las cosas por lo que son',d:'Un buen nombre ahorra comentarios. Evita x, df2, temp o final_v3. Si alguien lo lee en 6 meses, debe entender qué hay sin abrirlo.',mal:'d = df2[df2.c > 3]',bien:'ventas_grandes = ventas[ventas.monto > 3000]',lang:'python'},
{a:'gen',t:'Una convención por lenguaje y respétala',d:'Python: snake_case para variables y funciones, PascalCase para clases, MAYÚSCULAS para constantes. SQL: snake_case en tablas y columnas. DAX: medidas con nombres de negocio y espacios ("Total Ventas"). Mezclar estilos confunde.',bien:'TASA_IVA = 0.19\nclass ClienteVip: ...\ndef calcular_total(lista_precios): ...',lang:'python'},
{a:'gen',t:'Prueba por partes',d:'No escribas 40 líneas y ejecutes al final. Escribe un paso, ejecútalo y mira el resultado. Comenta el resto con el botón "Comentar líneas" mientras pruebas.'},
{a:'gen',t:'Mira los datos antes de transformarlos',d:'Primero cuántas filas hay, qué tipos, cuántos nulos y qué valores raros. La mitad de los errores vienen de suponer cómo son los datos.'},
{a:'gen',t:'Lee el error de abajo hacia arriba',d:'La última línea dice qué pasó (KeyError, NameError…) y la línea indicada dice dónde. Casi siempre es un nombre mal escrito, un tipo de dato distinto o un paréntesis.'},

// ---------- Python ----------
{a:'py',t:'Usa f-strings para armar textos',d:'Son más legibles que concatenar con + y convierten números solos. Con :, agregas separador de miles y con :.2f, decimales.',mal:'print("Total: " + str(total) + " pesos")',bien:'print(f"Total: {total:,.0f} pesos")',lang:'python'},
{a:'py',t:'La sangría es parte del código',d:'Python usa la sangría para saber qué está dentro de un if, for, def o class. Usa siempre 4 espacios y nunca mezcles con tabulaciones.',bien:'for p in precios:\n    if p > 100:\n        print(p)',lang:'python'},
{a:'py',t:'Nunca uses una lista como valor por defecto',d:'El valor por defecto se crea una sola vez y se comparte entre llamadas. Usa None y créala adentro.',mal:'def agregar(x, lista=[]):\n    lista.append(x)\n    return lista',bien:'def agregar(x, lista=None):\n    if lista is None:\n        lista = []\n    lista.append(x)\n    return lista',lang:'python'},
{a:'py',t:'Usa with para abrir archivos',d:'with cierra el archivo solo, aunque ocurra un error en medio.',bien:'with open("datos.csv", encoding="utf-8") as f:\n    lineas = f.readlines()',lang:'python'},
{a:'py',t:'Captura errores específicos',d:'except sin tipo esconde errores que deberías ver. Captura solo lo que esperas que falle.',mal:'try:\n    n = int(texto)\nexcept:\n    pass',bien:'try:\n    n = int(texto)\nexcept ValueError:\n    n = 0',lang:'python'},
{a:'py',t:'Funciones cortas que hacen una sola cosa',d:'Si una función necesita un "y" para describirse ("limpia y guarda y envía"), divídela. Son más fáciles de probar y reutilizar.'},
{a:'py',t:'Compara con None usando is',d:'is None es la forma correcta y más rápida. == None puede fallar con objetos como los de pandas.',mal:'if valor == None:',bien:'if valor is None:',lang:'python'},
{a:'py',t:'POO: una clase cuando hay datos + comportamiento',d:'Si tienes datos que viajan juntos y funciones que trabajan sobre ellos, una clase los ordena. Para guardar solo datos, @dataclass escribe el __init__ por ti.',bien:'from dataclasses import dataclass\n\n@dataclass\nclass Producto:\n    nombre: str\n    precio: float\n\n    def con_iva(self):\n        return self.precio * 1.19',lang:'python'},
{a:'py',t:'POO: self es el propio objeto',d:'Todo método de instancia recibe self de primero. Los atributos se guardan con self.nombre = ... dentro de __init__.'},
{a:'py',t:'Usa enumerate y zip en lugar de range(len())',d:'Son más claros y evitan errores de índice.',mal:'for i in range(len(nombres)):\n    print(i, nombres[i], edades[i])',bien:'for i, (n, e) in enumerate(zip(nombres, edades)):\n    print(i, n, e)',lang:'python'},

// ---------- Pandas ----------
{a:'pd',t:'Evita los bucles: usa operaciones por columna',d:'Pandas opera sobre toda la columna a la vez y es mucho más rápido que un for fila por fila.',mal:'for i, fila in df.iterrows():\n    df.loc[i, "total"] = fila["cantidad"] * fila["precio"]',bien:'df["total"] = df["cantidad"] * df["precio"]',lang:'python'},
{a:'pd',t:'Condiciones con & y |, siempre entre paréntesis',d:'En pandas no se usa and/or. Cada condición va entre paréntesis por la prioridad de los operadores.',mal:'df[df.region == "Norte" and df.cantidad > 5]',bien:'df[(df["region"] == "Norte") & (df["cantidad"] > 5)]',lang:'python'},
{a:'pd',t:'Usa .copy() al filtrar si vas a modificar',d:'Así evitas el SettingWithCopyWarning y cambios inesperados en el DataFrame original.',bien:'norte = df[df["region"] == "Norte"].copy()\nnorte["bono"] = norte["total"] * 0.1',lang:'python'},
{a:'pd',t:'Asigna con .loc[filas, columna]',d:'Es la forma segura de cambiar valores que cumplen una condición.',bien:'df.loc[df["edad"] < 0, "edad"] = np.nan',lang:'python'},
{a:'pd',t:'Convierte tipos al principio',d:'Fechas con to_datetime y números con to_numeric(errors="coerce"). Con el tipo correcto funcionan .dt, resample y las sumas.',bien:'df["fecha"] = pd.to_datetime(df["fecha"], errors="coerce")\ndf["monto"] = pd.to_numeric(df["monto"], errors="coerce")',lang:'python'},
{a:'pd',t:'Revisa los nulos con isna().sum()',d:'Es el primer diagnóstico de cualquier tabla. Luego decide: rellenar (fillna), eliminar (dropna) o dejarlos y documentarlo.',bien:'df.isna().sum()',lang:'python'},
{a:'pd',t:'Encadena con paréntesis para leer mejor',d:'Un paso por línea hace el código legible, como una receta.',bien:'resumen = (df\n    .query("cantidad > 0")\n    .groupby("region")["total"]\n    .sum()\n    .sort_values(ascending=False))',lang:'python'},
{a:'pd',t:'shift es el LAG de SQL',d:'shift(1) trae la fila anterior; con groupby funciona como PARTITION BY.',bien:'df["anterior"] = df.groupby("region")["total"].shift(1)',lang:'python'},
{a:'pd',t:'Después de merge, verifica las filas',d:'Si el número de filas creció, la llave estaba duplicada en una de las tablas. validate="m:1" lo detecta.',bien:'antes = len(ventas)\ndetalle = ventas.merge(clientes, on="cliente_id", how="left", validate="m:1")\nassert len(detalle) == antes',lang:'python'},

// ---------- SQL ----------
{a:'sql',t:'Orden en que SQL ejecuta una consulta',d:'FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT. Por eso no puedes usar en WHERE un alias creado en SELECT ni una función de ventana.'},
{a:'sql',t:'Evita SELECT * en consultas finales',d:'Pide solo las columnas que necesitas: es más rápido, más claro y no se rompe si la tabla cambia.',mal:'SELECT * FROM ventas;',bien:'SELECT fecha, empleado_id, monto\nFROM ventas;',lang:'sql'},
{a:'sql',t:'NULL se compara con IS NULL',d:'NULL = NULL no es verdadero. Usa IS NULL o IS NOT NULL, y COALESCE para poner un valor por defecto.',mal:'WHERE depto = NULL',bien:"WHERE depto IS NULL\n-- o\nSELECT COALESCE(depto, 'Sin área') AS depto",lang:'sql'},
{a:'sql',t:'Usa CTE para dividir el problema',d:'Cada CTE es un paso con nombre. Se lee de arriba hacia abajo y puedes probar cada paso por separado.',bien:'WITH ventas_mes AS (\n  SELECT substr(fecha, 1, 7) AS mes, SUM(monto) AS total\n  FROM ventas GROUP BY 1\n),\ncon_anterior AS (\n  SELECT mes, total, LAG(total) OVER (ORDER BY mes) AS anterior\n  FROM ventas_mes\n)\nSELECT * FROM con_anterior;',lang:'sql'},
{a:'sql',t:'Filtra funciones de ventana afuera',d:'LAG, ROW_NUMBER o RANK no pueden ir en WHERE. Calcúlalas en una CTE y filtra en la consulta de afuera.',bien:'WITH r AS (\n  SELECT *, ROW_NUMBER() OVER (PARTITION BY depto ORDER BY salario DESC) AS rn\n  FROM empleados\n)\nSELECT * FROM r WHERE rn = 1;',lang:'sql'},
{a:'sql',t:'Cuidado con COUNT(columna) vs COUNT(*)',d:'COUNT(*) cuenta filas; COUNT(columna) no cuenta los NULL. Esa diferencia suele explicar totales que "no cuadran".'},
{a:'sql',t:'WHERE filtra filas, HAVING filtra grupos',d:'Filtra lo más temprano posible con WHERE. Usa HAVING solo para condiciones sobre agregados.',bien:'SELECT depto, COUNT(*) AS personas\nFROM empleados\nWHERE fecha_ingreso >= \'2020-01-01\'\nGROUP BY depto\nHAVING COUNT(*) > 2;',lang:'sql'},
{a:'sql',t:'Multiplica por 100.0 al calcular porcentajes',d:'En muchos motores, entero / entero da entero (5/2 = 2). Un 100.0 obliga a usar decimales.',mal:'SELECT total * 100 / anterior',bien:'SELECT total * 100.0 / anterior',lang:'sql'},
{a:'sql',t:'Revisa el JOIN contando filas',d:'Si después del JOIN hay más filas de las esperadas, la llave no es única en una de las tablas.'},

// ---------- Power BI / DAX ----------
{a:'bi',t:'Siempre usa una tabla calendario',d:'Créala con CALENDAR, CALENDARAUTO o Power Query, relaciónala con la fecha de los hechos y márcala como tabla de fechas. Sin ella, YTD, año anterior y similares fallan o dan resultados raros.',bien:'Calendario = CALENDAR(DATE(2024,1,1), DATE(2026,12,31))',lang:'dax'},
{a:'bi',t:'Desactiva la fecha/hora automática',d:'Power BI crea tablas de fechas ocultas por cada columna de fecha. Inflan el modelo y compiten con tu calendario. Desactívalas en Opciones → Carga de datos.'},
{a:'bi',t:'Modelo estrella, siempre',d:'Hechos al centro y dimensiones alrededor, relaciones uno a muchos en una sola dirección. Es lo que el motor de Power BI espera para ser rápido.'},
{a:'bi',t:'Medidas explícitas, nunca arrastrar la columna',d:'Crea Total Ventas = SUM(Ventas[Monto]) y úsala en todos lados. Así reutilizas lógica, la formateas una vez y otras medidas pueden usarla.',bien:'Total Ventas = SUM(Ventas[Monto])\nVentas AA = CALCULATE([Total Ventas], SAMEPERIODLASTYEAR(Calendario[Fecha]))',lang:'dax'},
{a:'bi',t:'Usa VAR para medidas largas',d:'Cada valor se calcula una vez, el código se lee mejor y puedes depurar devolviendo una variable intermedia en el RETURN.',bien:'Crecimiento % =\nVAR actual = [Total Ventas]\nVAR anterior = [Ventas AA]\nRETURN DIVIDE(actual - anterior, anterior)',lang:'dax'},
{a:'bi',t:'DIVIDE en lugar de /',d:'DIVIDE maneja la división entre cero y devuelve blanco (o el valor que indiques) en vez de error o infinito.',mal:'Margen = [Ganancia] / [Ventas]',bien:'Margen = DIVIDE([Ganancia], [Ventas])',lang:'dax'},
{a:'bi',t:'Referencias: Tabla[Columna] y [Medida]',d:'Convención de la comunidad: columnas siempre con el nombre de la tabla, medidas sin él. Así sabes de un vistazo qué es cada cosa.',bien:'Ventas Grandes = CALCULATE([Total Ventas], Ventas[Monto] > 1000)',lang:'dax'},
{a:'bi',t:'Nombra medidas como las dice el negocio',d:'"Ventas YTD", "Margen %", "Clientes Activos". Organízalas en carpetas de visualización o en una tabla vacía solo para medidas.'},
{a:'bi',t:'Prefiere medidas a columnas calculadas',d:'Las columnas calculadas ocupan memoria y se calculan al refrescar. Úsalas solo para filtrar, segmentar o relacionar.'},
{a:'bi',t:'Transforma en Power Query, calcula en DAX',d:'Limpieza, tipos y columnas fijas van en Power Query (o mejor aún, en el origen). Los cálculos que dependen de filtros van en DAX.'},
{a:'bi',t:'Quita las columnas que no usas',d:'Cada columna ocupa memoria, sobre todo las de alta cardinalidad (ids, textos largos, fechas con hora). Menos columnas, modelo más rápido.'},
{a:'bi',t:'Separa fecha y hora',d:'Una columna fecha-hora tiene casi un valor distinto por fila y comprime mal. Divídela en fecha y hora si necesitas ambas.'},

// ---------- Git ----------
{a:'git',t:'Commits pequeños con mensajes claros',d:'Un commit = un cambio con sentido. El mensaje dice qué hace, en presente: "Agrega ejercicios de DAX", no "cambios" ni "asdf".',bien:'git add data/ejercicios/powerbi.js\ngit commit -m "Agrega ejercicios de inteligencia de tiempo"',lang:'bash'},
{a:'git',t:'git status antes de cada commit',d:'Revisa qué vas a guardar. Evita subir archivos que no querías, como credenciales o archivos temporales.',bien:'git status\ngit diff',lang:'bash'},
{a:'git',t:'Haz pull antes de empezar a trabajar',d:'Trae primero los cambios del remoto y así evitas conflictos innecesarios.',bien:'git pull\n# ... trabajar ...\ngit push',lang:'bash'},
{a:'git',t:'Una rama por tarea',d:'main siempre debe funcionar. Haz cada cambio en una rama y fusiónala cuando esté probado.',bien:'git switch -c laboratorio-python\n# ... cambios y commits ...\ngit switch main\ngit merge laboratorio-python',lang:'bash'},
{a:'git',t:'Nunca subas contraseñas ni llaves',d:'Usa .gitignore para archivos .env y credenciales. Lo que llega a GitHub queda en el historial aunque luego lo borres.',bien:'# .gitignore\n.env\n*.key\ncredenciales.json',lang:'bash'},
{a:'git',t:'Sin miedo: casi todo se puede recuperar',d:'git reflog muestra todo lo que hiciste, incluso commits que creías perdidos. Para deshacer algo ya compartido usa revert, no reset.'},

// ---------- Arquitectura ----------
{a:'arq',t:'Nunca modifiques Bronze',d:'Bronze es tu respaldo: los datos tal cual llegaron. Si un error daña Silver, reprocesas desde Bronze.'},
{a:'arq',t:'Pipelines idempotentes',d:'Ejecutarlo dos veces debe dar el mismo resultado. Usa MERGE por llave en vez de INSERT a ciegas.'},
{a:'arq',t:'Particiona por fecha, no por id',d:'Particiona por columnas de baja cardinalidad que filtras mucho (año, mes, fecha). Por id creas millones de archivos pequeños.'},
{a:'arq',t:'Valida la calidad entre capas',d:'Antes de pasar de Silver a Gold, revisa nulos, duplicados y rangos. Es más barato detectar el error ahí que en el tablero del gerente.'},
{a:'arq',t:'Agrega columnas de auditoría',d:'fecha_carga y archivo_origen en Bronze te permiten saber de dónde vino cada fila y reprocesar solo lo necesario.'},

// ---------- IA ----------
{a:'ia',t:'Contexto, tarea y formato en tus prompts',d:'Di quién es el público, qué necesitas y cómo lo quieres (tabla, 5 viñetas, JSON). Un ejemplo de la salida esperada ayuda mucho.'},
{a:'ia',t:'Verifica lo que importa',d:'Un LLM puede alucinar aunque use RAG. Revisa cifras, nombres y citas antes de usarlas en una decisión.'},
{a:'ia',t:'RAG para conocimiento que cambia',d:'Si la información se actualiza (políticas, precios, inventario), usa RAG o herramientas, no fine-tuning.'},
{a:'ia',t:'La calidad de las fuentes manda',d:'En Copilot Studio o con RAG, documentos desordenados o desactualizados dan respuestas malas. Organiza y depura el conocimiento primero.'},
{a:'ia',t:'Los permisos se heredan',d:'Microsoft 365 Copilot respeta los permisos de cada usuario: si un archivo está compartido de más, Copilot también lo podrá usar. Revisa los permisos de SharePoint antes de implementarlo.'},
];

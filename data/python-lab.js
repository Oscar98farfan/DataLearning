// Contenido del Laboratorio de Python: datos de arranque, ejemplos y entorno de práctica.

// Se ejecuta al iniciar el laboratorio. Recibe las tablas SQL en el diccionario _tablas (JSON).
export const SETUP_LAB = `
import json, warnings
import pandas as pd
import numpy as np
warnings.filterwarnings('ignore')
pd.set_option('display.width', 120)

empleados = pd.DataFrame(json.loads(_tablas['empleados']))
ventas = pd.DataFrame(json.loads(_tablas['ventas']))
ventas_mes = pd.DataFrame(json.loads(_tablas['ventas_mes']))
ventas_mes_region = pd.DataFrame(json.loads(_tablas['ventas_mes_region']))
del _tablas

# Datos "sucios" a propósito para practicar limpieza
clientes_sucios = pd.DataFrame({
    'id': [1, 2, 3, 3, 4, 5, 6, 7, 8, 9],
    'nombre': ['  ana gómez', 'ANDRÉS ROJAS ', 'Camila torres', 'Camila torres', 'daniel PÉREZ',
               None, 'valentina díaz', 'Santiago Herrera ', 'laura castro', 'Julián Moreno'],
    'ciudad': ['bogotá', 'Bogota', 'MEDELLÍN', 'MEDELLÍN', 'cali ', ' Bogotá', 'medellin', 'Cali', 'barranquilla', None],
    'email': ['ana@correo.com', 'ANDRES@CORREO.COM', 'camila@correo', 'camila@correo', 'daniel@correo.com',
              'sin_email', 'valen@correo.com', None, 'laura@correo.com', 'julian@correo.com'],
    'fecha_registro': ['2025-01-15', '15/02/2025', '2025-03-01', '2025-03-01', '2025/04/10',
                       '2025-05-20', None, '2025-07-07', '2025-08-30', '2025-09-12'],
    'compras': ['$1.200.000', '850000', '$2.300.000', '$2.300.000', 'n/a', '430000', '$990.000', None, '1500000', '$75.000'],
    'edad': [34, '29', 41, 41, -5, 38, 27, 'treinta', 45, 52],
})
`;

// Descripción de los datos disponibles (se muestra en "Tus datos").
export const DATOS_PY = [
  { n: 'empleados', d: 'Las mismas 20 personas del laboratorio SQL: id, nombre, depto, salario, fecha_ingreso.' },
  { n: 'ventas', d: '160 ventas: id, empleado_id, fecha (como texto, para que practiques convertirla), monto.' },
  { n: 'ventas_mes', d: 'Total por mes (mes, total). Ideal para shift, pct_change y rolling.' },
  { n: 'ventas_mes_region', d: 'Total por región y mes de 2025. Ideal para groupby y pivot_table.' },
  { n: 'clientes_sucios', d: 'Datos con errores a propósito: espacios, mayúsculas, duplicados, nulos, fechas en varios formatos, montos con $ y edades inválidas.' },
];

// Categorías de ejemplos
export const CATS_PY = {
  base: 'Python básico', fun: 'Funciones', poo: 'POO (objetos)', exp: 'Explorar DataFrames',
  limp: 'Limpieza', trans: 'Transformar y unir', tiempo: 'Series de tiempo', ing: 'POO + pandas',
};

// l nivel · c categoría · t título · d qué hace · code
export const EJEMPLOS_PY = [
{c:'base',l:1,t:'Listas y bucles',d:'Recorre una lista, acumula un total y usa un f-string para mostrar el resultado.',code:`precios = [12000, 8500, 23000, 4300]
total = 0
for p in precios:
    total += p
print(f"Total: {total:,}")
print("Promedio:", total / len(precios))`},
{c:'base',l:1,t:'Diccionarios',d:'Un diccionario guarda pares clave → valor. items() recorre ambos a la vez.',code:`stock = {"camisa": 12, "pantalón": 5, "zapatos": 0}
stock["gorra"] = 7          # agregar
for producto, cantidad in stock.items():
    estado = "agotado" if cantidad == 0 else "disponible"
    print(f"{producto:<10} {cantidad:>3}  {estado}")`},
{c:'base',l:2,t:'List comprehension',d:'Crea listas nuevas en una sola línea, con filtro opcional.',code:`numeros = range(1, 11)
cuadrados = [n ** 2 for n in numeros]
pares = [n for n in numeros if n % 2 == 0]
print(cuadrados)
print(pares)
{n: n ** 2 for n in pares}   # dict comprehension: la última línea se muestra sola`},
{c:'fun',l:1,t:'Tu primera función',d:'def define una función. Los parámetros con = tienen valor por defecto. return devuelve el resultado.',code:`def calcular_iva(valor, tasa=0.19):
    """Devuelve el IVA de un valor."""
    return valor * tasa

print(calcular_iva(100000))
print(calcular_iva(100000, tasa=0.05))`},
{c:'fun',l:2,t:'Funciones que validan',d:'Una función puede revisar sus entradas y lanzar un error claro con raise.',code:`def clasificar_edad(edad):
    if not isinstance(edad, (int, float)):
        raise TypeError(f"La edad debe ser número, llegó: {edad!r}")
    if edad < 0:
        raise ValueError("La edad no puede ser negativa")
    return "menor" if edad < 18 else "adulto"

for e in [15, 30, -2, "treinta"]:
    try:
        print(e, "→", clasificar_edad(e))
    except (TypeError, ValueError) as error:
        print(e, "→ error:", error)`},
{c:'fun',l:2,t:'*args, **kwargs y lambda',d:'*args recibe muchos valores; **kwargs recibe parámetros con nombre; lambda crea funciones cortas.',code:`def resumen(*valores, **opciones):
    decimales = opciones.get("decimales", 1)
    return round(sum(valores) / len(valores), decimales)

print(resumen(3, 4, 5))
print(resumen(3, 4, 5, decimales=3))

personas = [("Ana", 34), ("Luis", 22), ("Sara", 41)]
sorted(personas, key=lambda p: p[1], reverse=True)`},
{c:'poo',l:1,t:'Clase y objeto',d:'Una clase es un molde; cada objeto es una copia con sus propios datos. __init__ se ejecuta al crearlo y self es el propio objeto.',code:`class Producto:
    def __init__(self, nombre, precio, stock=0):
        self.nombre = nombre
        self.precio = precio
        self.stock = stock

    def valor_inventario(self):
        return self.precio * self.stock

    def __str__(self):
        return f"{self.nombre} (\${self.precio:,}) x {self.stock}"

p = Producto("Camisa", 45000, stock=10)
print(p)
print("Valor en bodega:", p.valor_inventario())`},
{c:'poo',l:2,t:'Herencia',d:'Una clase hija hereda todo de la madre y puede cambiar o ampliar su comportamiento. super() llama a la versión de la madre.',code:`class Empleado:
    def __init__(self, nombre, salario):
        self.nombre = nombre
        self.salario = salario

    def pago_mensual(self):
        return self.salario

class Vendedor(Empleado):
    def __init__(self, nombre, salario, ventas, comision=0.03):
        super().__init__(nombre, salario)
        self.ventas = ventas
        self.comision = comision

    def pago_mensual(self):                 # sobrescribe el método de la madre
        return super().pago_mensual() + self.ventas * self.comision

equipo = [Empleado("Laura", 6100), Vendedor("Julián", 3950, ventas=40000)]
for e in equipo:
    print(f"{e.nombre:<8} {type(e).__name__:<9} {e.pago_mensual():>8,.0f}")`},
{c:'poo',l:3,t:'@property y validación',d:'@property expone un atributo controlado: puedes validar al asignar sin cambiar cómo se usa el objeto.',code:`class Cuenta:
    def __init__(self, titular, saldo=0):
        self.titular = titular
        self.saldo = saldo           # pasa por el setter

    @property
    def saldo(self):
        return self._saldo

    @saldo.setter
    def saldo(self, valor):
        if valor < 0:
            raise ValueError("El saldo no puede ser negativo")
        self._saldo = valor

    def retirar(self, monto):
        self.saldo = self.saldo - monto

c = Cuenta("Ana", 100)
c.retirar(30)
print(c.saldo)
try:
    c.retirar(500)
except ValueError as e:
    print("Error:", e)`},
{c:'poo',l:3,t:'@dataclass y @classmethod',d:'@dataclass escribe __init__ y __repr__ por ti. @classmethod crea objetos de otra forma, por ejemplo desde un diccionario.',code:`from dataclasses import dataclass, field

@dataclass
class Venta:
    id: int
    monto: float
    etiquetas: list = field(default_factory=list)

    @classmethod
    def desde_dict(cls, d):
        return cls(id=d["id"], monto=float(d["monto"]))

    @property
    def es_grande(self):
        return self.monto > 2000

filas = ventas.head(3).to_dict("records")
lista = [Venta.desde_dict(f) for f in filas]
for v in lista:
    print(v, "→ grande" if v.es_grande else "")`},
{c:'exp',l:1,t:'Primer vistazo',d:'head() muestra las primeras filas; shape dice filas y columnas; dtypes el tipo de cada columna.',code:`print(ventas.shape)
print(ventas.dtypes)
ventas.head()`},
{c:'exp',l:1,t:'Resumen rápido',d:'describe() da estadísticas de las columnas numéricas; value_counts() cuenta cada valor.',code:`print(empleados["depto"].value_counts())
empleados.describe()`},
{c:'exp',l:2,t:'Filtrar y ordenar',d:'Filtra con condiciones entre paréntesis unidas con & (y) o | (o). Luego ordena.',code:`ventas_ti = empleados[(empleados["depto"] == "TI") & (empleados["salario"] > 4000)]
ventas_ti.sort_values("salario", ascending=False)`},
{c:'limp',l:1,t:'1. Diagnóstico',d:'Antes de limpiar, mira el problema: nulos por columna, duplicados y tipos de dato.',code:`print("Nulos por columna:")
print(clientes_sucios.isna().sum())
print("\\nFilas duplicadas:", clientes_sucios.duplicated().sum())
print("\\nTipos:")
print(clientes_sucios.dtypes)
clientes_sucios`},
{c:'limp',l:1,t:'2. Textos: espacios y mayúsculas',d:'Los métodos .str trabajan sobre toda la columna: strip quita espacios, title pone mayúscula inicial.',code:`df = clientes_sucios.copy()
df["nombre"] = df["nombre"].str.strip().str.title()
df["email"] = df["email"].str.strip().str.lower()
df[["nombre", "email"]]`},
{c:'limp',l:2,t:'3. Unificar categorías',d:'Quita tildes y espacios para que "Bogota", " Bogotá" y "bogotá" sean la misma ciudad.',code:`import unicodedata

def normalizar(texto):
    if pd.isna(texto):
        return texto
    texto = unicodedata.normalize("NFKD", texto.strip().lower())
    return "".join(c for c in texto if not unicodedata.combining(c)).title()

df = clientes_sucios.copy()
df["ciudad"] = df["ciudad"].apply(normalizar)
df["ciudad"].value_counts(dropna=False)`},
{c:'limp',l:2,t:'4. Números y fechas',d:'Quita $ y puntos de miles antes de convertir. errors="coerce" vuelve NaN lo que no se puede convertir.',code:`df = clientes_sucios.copy()
df["compras"] = pd.to_numeric(df["compras"].str.replace(r"[$.]", "", regex=True), errors="coerce")
df["edad"] = pd.to_numeric(df["edad"], errors="coerce")
df.loc[(df["edad"] < 0) | (df["edad"] > 110), "edad"] = np.nan
df["fecha_registro"] = pd.to_datetime(df["fecha_registro"], format="mixed", dayfirst=True, errors="coerce")
print(df.dtypes)
df[["compras", "edad", "fecha_registro"]]`},
{c:'limp',l:3,t:'5. Duplicados, nulos y validación',d:'Elimina duplicados, marca correos inválidos y decide qué hacer con los nulos.',code:`df = clientes_sucios.drop_duplicates().copy()
df["email_valido"] = df["email"].str.contains(r"^[\\w.]+@[\\w]+\\.\\w+$", na=False)
df["nombre"] = df["nombre"].fillna("Sin nombre").str.strip().str.title()
print("Filas:", len(clientes_sucios), "→", len(df))
df[["id", "nombre", "email", "email_valido"]]`},
{c:'trans',l:2,t:'Unir tablas (merge)',d:'merge es el JOIN de pandas: une ventas con empleados por la llave.',code:`detalle = ventas.merge(empleados, left_on="empleado_id", right_on="id", how="left", suffixes=("_venta", ""))
detalle[["fecha", "nombre", "depto", "monto"]].head(10)`},
{c:'trans',l:2,t:'Agrupar (groupby + agg)',d:'Igual que GROUP BY: total, promedio y cantidad de ventas por vendedor.',code:`detalle = ventas.merge(empleados, left_on="empleado_id", right_on="id")
(detalle.groupby("nombre")["monto"]
        .agg(total="sum", promedio="mean", ventas="count")
        .sort_values("total", ascending=False)
        .round(0))`},
{c:'trans',l:3,t:'Tabla dinámica (pivot_table)',d:'Filas = región, columnas = trimestre, valores = suma. Como una tabla dinámica de Excel.',code:`df = ventas_mes_region.copy()
df["trimestre"] = "T" + pd.to_datetime(df["mes"]).dt.quarter.astype(str)
df.pivot_table(index="region", columns="trimestre", values="total", aggfunc="sum", margins=True, margins_name="Total")`},
{c:'tiempo',l:2,t:'shift = LAG de SQL',d:'shift(1) trae el valor de la fila anterior. Con eso calculas la variación mes a mes.',code:`df = ventas_mes.copy()
df["anterior"] = df["total"].shift(1)
df["variacion_pct"] = ((df["total"] - df["anterior"]) / df["anterior"] * 100).round(1)
df`},
{c:'tiempo',l:3,t:'Fechas, resample y rolling',d:'Convierte la fecha, agrupa por mes con resample y calcula promedio móvil de 3 meses y acumulado.',code:`df = ventas.copy()
df["fecha"] = pd.to_datetime(df["fecha"])
mensual = df.set_index("fecha").resample("MS")["monto"].sum().to_frame("total")
mensual["promedio_3m"] = mensual["total"].rolling(3).mean().round(0)
mensual["acumulado"] = mensual["total"].cumsum()
mensual`},
{c:'tiempo',l:3,t:'LAG por grupo',d:'groupby + shift es el equivalente de LAG(...) OVER (PARTITION BY region ORDER BY mes).',code:`df = ventas_mes_region.sort_values(["region", "mes"]).copy()
df["anterior"] = df.groupby("region")["total"].shift(1)
df["rank_mes"] = df.groupby("region")["total"].rank(ascending=False).astype(int)
df.head(8)`},
{c:'ing',l:3,t:'Un limpiador reutilizable',d:'Una clase que agrupa los pasos de limpieza en métodos encadenables: así trabaja un ingeniero de datos (Bronze → Silver).',code:`class LimpiadorClientes:
    def __init__(self, df):
        self.df = df.copy()
        self.log = []

    def _registrar(self, paso):
        self.log.append(f"{paso}: {len(self.df)} filas")
        return self

    def quitar_duplicados(self):
        self.df = self.df.drop_duplicates()
        return self._registrar("duplicados")

    def limpiar_textos(self):
        self.df["nombre"] = self.df["nombre"].str.strip().str.title()
        self.df["email"] = self.df["email"].str.strip().str.lower()
        return self._registrar("textos")

    def convertir_tipos(self):
        self.df["compras"] = pd.to_numeric(self.df["compras"].str.replace(r"[$.]", "", regex=True), errors="coerce")
        self.df["edad"] = pd.to_numeric(self.df["edad"], errors="coerce").where(lambda s: s.between(0, 110))
        return self._registrar("tipos")

    def resultado(self):
        return self.df

silver = (LimpiadorClientes(clientes_sucios)
          .quitar_duplicados()
          .limpiar_textos()
          .convertir_tipos())
print("\\n".join(silver.log))
silver.resultado()`},
];

// Entorno para el botón "Probar" de los ejercicios de Python y Pandas.
// Define las variables que mencionan los enunciados.
export const SETUP_PRACTICA = `
import warnings, json
import pandas as pd
import numpy as np
warnings.filterwarnings('ignore')
nums = [1, 2, 3, 4, 5, 6]
d = {'a': 1, 'b': 2, 'c': 3}
nombre = 'Ana'
edad = 25
texto = '42'
i = 0
palabras = ['datos', 'python', 'sql']
nombres = ['Ana', 'Luis', 'Sara']
edades = [34, 22, 41]
datos = [('Ana', 34), ('Luis', 22), ('Sara', 41)]
with open('datos.txt', 'w') as _f:
    _f.write('primera línea\\nsegunda línea\\n')
df = pd.DataFrame({
    'fecha': pd.to_datetime(['2025-01-05', '2025-01-20', '2025-02-03', '2025-02-18', '2025-03-07', '2025-03-22', '2025-03-30', '2025-01-12']),
    'region': ['Norte', 'Sur', 'Norte', 'Centro', 'Sur', 'Norte', 'Centro', 'Norte'],
    'producto': ['A', 'B', 'A', 'C', 'B', 'C', 'A', 'B'],
    'cantidad': [12, 4, 20, 7, None, 15, 3, 12],
    'precio': [100, 250, 100, 80, 250, 80, 100, 250],
    'cliente_id': [1, 2, 3, 1, 4, 2, 5, 1],
})
df['total'] = df['cantidad'] * df['precio']
df.to_csv('ventas.csv', index=False)
clientes = pd.DataFrame({'cliente_id': [1, 2, 3, 4], 'cliente': ['Éxito', 'Olímpica', 'D1', 'Ara']})
df_ancho = pd.DataFrame({'region': ['Norte', 'Sur'], 'ene': [100, 80], 'feb': [120, 90], 'mar': [130, 70]})

class Producto:
    def __init__(self, nombre, precio, cantidad=1):
        self.nombre = nombre
        self.precio = precio
        self.cantidad = cantidad

class Empleado:
    def __init__(self, nombre, salario):
        self.nombre = nombre
        self.salario = salario

sucios = pd.DataFrame({
    'id': [1, 2, 3, 3, 4, 5, 6, 7],
    'nombre': ['  ana gómez', 'ANDRÉS ROJAS ', 'Camila torres', 'Camila torres', 'daniel PÉREZ', None, 'valentina díaz', 'Santiago Herrera '],
    'ciudad': ['bogotá', 'Bogota', 'MEDELLÍN', 'MEDELLÍN', 'cali ', ' Bogotá', None, 'Cali'],
    'email': ['ana@correo.com', 'ANDRES@CORREO.COM', 'camila@correo', 'camila@correo', 'daniel@correo.com', 'sin_email', 'valen@correo.com', None],
    'fecha_registro': ['2025-01-15', '15/02/2025', '2025-03-01', '2025-03-01', '2025/04/10', '2025-05-20', None, '2025-07-07'],
    'compras': ['$1.200.000', '850000', '$2.300.000', '$2.300.000', 'n/a', '430000', '$990.000', None],
    'edad': [34, '29', 41, 41, -5, 38, 27, 'treinta'],
})
`;

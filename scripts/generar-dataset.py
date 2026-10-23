"""Genera data/dataset.sql: datos de práctica (ficticios) para los ejercicios de SQL.
Uso: python scripts/generar-dataset.py
Es determinista: siempre produce el mismo archivo (semilla fija)."""
import random, datetime, collections, pathlib

random.seed(42)
empleados = [
 (1,'Ana Gómez','Ventas',3200,'2019-03-11'),(2,'Andrés Rojas','TI',5400,'2018-07-02'),
 (3,'Camila Torres','Ventas',2850,'2021-01-18'),(4,'Daniel Pérez','Finanzas',4700,'2017-05-22'),
 (5,'Valentina Díaz','Marketing',3550,'2020-09-14'),(6,'Santiago Herrera','Ventas',2400,'2023-02-06'),
 (7,'Laura Castro','TI',6100,'2016-11-28'),(8,'Julián Moreno','Ventas',3950,'2019-08-19'),
 (9,'Mariana López','RRHH',3100,'2022-04-04'),(10,'Felipe Ramírez','TI',4450,'2020-06-15'),
 (11,'Alejandra Vargas','Finanzas',5250,'2018-02-26'),(12,'Sebastián Ortiz','Ventas',2650,'2024-01-15'),
 (13,'Daniela Suárez','Marketing',2980,'2023-07-03'),(14,'Nicolás Jiménez','TI',3800,'2021-10-11'),
 (15,'Paula Mendoza','Ventas',4200,'2017-12-04'),(16,'Carlos Ruiz','RRHH',2700,'2024-05-20'),
 (17,'Sofía Navarro','Ventas',3350,'2022-09-12'),(18,'Juan Pablo Ríos','Finanzas',3650,'2021-03-29'),
 (19,'Isabela Cárdenas','Marketing',4900,'2019-01-07'),(20,'Tomás Álvarez','TI',3020,'2025-02-17'),
]
# vendedores con peso (cuántas ventas tienden a hacer)
pesos = {1:14,3:10,6:3,8:16,12:2,15:18,17:11,5:5,19:6}
inicio = datetime.date(2025,1,2); fin = datetime.date(2026,6,30)
dias = [inicio + datetime.timedelta(d) for d in range((fin-inicio).days+1)]
fechas = sorted(random.sample(dias, 160))          # fechas únicas
ids, w = zip(*pesos.items())
ventas = []
for i, f in enumerate(fechas, 1):
    emp = random.choices(ids, weights=w)[0]
    monto = random.randrange(120, 2600, 10)
    ventas.append((i, emp, f.isoformat(), monto))
por_mes = collections.OrderedDict()
for _, _, f, m in ventas:
    por_mes[f[:7]] = por_mes.get(f[:7], 0) + m
regiones = []
base = {'Norte':42000,'Centro':61000,'Sur':35000}
for r, b in base.items():
    v = b
    for mes in range(1,13):
        v = max(15000, v + random.randrange(-6000, 7000, 100))
        regiones.append((r, f'2025-{mes:02d}', v))

def q(s): return "'" + str(s).replace("'", "''") + "'"
out = ["-- Datos de práctica (ficticios). Generado por scripts/generar-dataset.py",
"-- Tablas: empleados, ventas, ventas_mes, ventas_mes_region", "",
"CREATE TABLE empleados (id INTEGER PRIMARY KEY, nombre TEXT, depto TEXT, salario INTEGER, fecha_ingreso TEXT);",
"CREATE TABLE ventas (id INTEGER PRIMARY KEY, empleado_id INTEGER REFERENCES empleados(id), fecha TEXT, monto INTEGER);",
"CREATE TABLE ventas_mes (mes TEXT PRIMARY KEY, total INTEGER);",
"CREATE TABLE ventas_mes_region (region TEXT, mes TEXT, total INTEGER, PRIMARY KEY (region, mes));", ""]
out.append("INSERT INTO empleados VALUES\n" + ",\n".join(f"({a},{q(b)},{q(c)},{d},{q(e)})" for a,b,c,d,e in empleados) + ";\n")
out.append("INSERT INTO ventas VALUES\n" + ",\n".join(f"({a},{b},{q(c)},{d})" for a,b,c,d in ventas) + ";\n")
out.append("INSERT INTO ventas_mes VALUES\n" + ",\n".join(f"({q(k)},{v})" for k,v in por_mes.items()) + ";\n")
out.append("INSERT INTO ventas_mes_region VALUES\n" + ",\n".join(f"({q(a)},{q(b)},{c})" for a,b,c in regiones) + ";\n")
dest = pathlib.Path(__file__).resolve().parent.parent / 'data' / 'dataset.sql'
dest.write_text("\n".join(out), encoding='utf-8')
print('ok', dest, len(ventas), 'ventas', len(por_mes), 'meses')

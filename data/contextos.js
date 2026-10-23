// Contextos reutilizables
export const CTX_PD=`df: fecha | region | producto | cantidad | precio | cliente_id`;
export const CTX_SQL=`empleados(id, nombre, depto, salario, fecha_ingreso)
ventas(id, empleado_id, fecha, monto)`;
export const CTX_MES=`ventas_mes(mes, total)   -- un registro por mes`;
export const CTX_BI=`Ventas[Monto], Ventas[Cantidad], Ventas[Precio], Ventas[Region]
Calendario[Fecha]  (tabla de fechas marcada)`;
export const CTX_LIMP=`sucios: id | nombre | ciudad | email | fecha_registro | compras | edad
(datos con espacios, mayúsculas, duplicados, nulos, "$1.200.000", edades como texto)`;
export const CTX_POO=`class Producto:
    def __init__(self, nombre, precio, cantidad=1): ...`;

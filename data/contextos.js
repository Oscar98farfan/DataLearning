// Contextos reutilizables
export const CTX_PD=`df: fecha | region | producto | cantidad | precio | cliente_id`;
export const CTX_SQL=`empleados(id, nombre, depto, salario, fecha_ingreso)
ventas(id, empleado_id, fecha, monto)`;
export const CTX_MES=`ventas_mes(mes, total)   -- un registro por mes`;
export const CTX_BI=`Ventas[Monto], Ventas[Cantidad], Ventas[Precio], Ventas[Region]
Calendario[Fecha]  (tabla de fechas marcada)`;

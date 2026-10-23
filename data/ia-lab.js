// Datos del laboratorio de IA. Todo es una simulación educativa que corre en tu navegador:
// no hay un LLM real; se muestra paso a paso lo que pasa alrededor de él.

// Frases para el mini modelo de "siguiente palabra" (bigramas).
export const CORPUS = `
el modelo genera texto palabra por palabra .
el modelo calcula la probabilidad de la siguiente palabra .
el modelo aprende patrones del lenguaje .
el modelo puede inventar datos si no tiene contexto .
el analista limpia los datos antes de crear el tablero .
el analista revisa los datos con pandas .
el analista escribe consultas en sql .
el ingeniero de datos construye el pipeline .
el ingeniero de datos carga los datos en el lakehouse .
el pipeline mueve los datos de bronze a silver .
el pipeline corre cada noche .
los datos limpios llegan a la capa gold .
los datos de ventas alimentan el tablero de power bi .
los datos sin contexto generan malas respuestas .
la consulta usa una cte y la función lag .
la consulta devuelve las ventas del mes .
la respuesta del modelo depende del contexto .
la respuesta puede tener errores .
la tabla calendario permite comparar el año anterior .
el tablero muestra las ventas por región .
el tablero de power bi usa un modelo estrella .
power bi usa medidas en dax .
rag recupera fragmentos de los documentos .
rag reduce las alucinaciones del modelo .
el orquestador coordina la búsqueda y el modelo .
el orquestador arma el prompt con el contexto .
copilot usa los datos de microsoft 365 .
copilot respeta los permisos del usuario .
el agente puede ejecutar acciones con herramientas .
el agente llama un flujo de power automate .
python permite automatizar la limpieza de datos .
python usa pandas para analizar datos .
sql permite consultar los datos de ventas .
git guarda la historia del proyecto .
git permite trabajar en ramas .
`;

// Documentos de la empresa ficticia para el RAG. acceso: 'todos' o 'rrhh'.
export const DOCS = [
  { id: 'vac', t: 'Política de vacaciones', acceso: 'todos', texto: 'Cada empleado tiene 15 días hábiles de vacaciones por cada año trabajado. Las vacaciones se solicitan con 15 días de anticipación en el portal de RR.HH. Se pueden acumular como máximo dos periodos. El jefe directo aprueba o rechaza la solicitud.' },
  { id: 'tel', t: 'Política de teletrabajo', acceso: 'todos', texto: 'Los empleados pueden trabajar desde casa hasta tres días por semana. El trabajo remoto requiere un acuerdo firmado con el jefe directo. La empresa entrega un auxilio de conectividad de 80.000 pesos al mes. Los martes son presenciales para todo el equipo.' },
  { id: 'via', t: 'Gastos de viaje', acceso: 'todos', texto: 'Los gastos de viaje se reembolsan con factura electrónica a nombre de la empresa. El viático diario de alimentación es de 120.000 pesos. Las solicitudes de reembolso se envían máximo 10 días después del viaje. Los tiquetes aéreos los compra el área de compras.' },
  { id: 'equ', t: 'Equipos y soporte', acceso: 'todos', texto: 'Cada empleado recibe un portátil corporativo. Si el equipo se daña, se reporta a la mesa de ayuda en el portal de soporte. No se permite instalar programas sin autorización de TI. El celular corporativo solo se entrega a cargos comerciales.' },
  { id: 'nom', t: 'Nómina y salarios', acceso: 'rrhh', texto: 'La nómina se paga los días 15 y 30 de cada mes. Los aumentos salariales se aplican en el mes de marzo. La información salarial es confidencial y solo la consulta el área de RR.HH.' },
];

// "Embedding" simulado: cada dimensión es un concepto; las palabras con el mismo significado
// activan la misma dimensión. Así se ve por qué la búsqueda semántica encuentra sinónimos.
export const CONCEPTOS = {
  descanso: ['vacaciones', 'vacacion', 'descanso', 'descansar', 'libres', 'libre', 'licencia', 'festivo'],
  casa: ['casa', 'teletrabajo', 'remoto', 'remota', 'hogar', 'distancia', 'presencial', 'presenciales', 'oficina'],
  dinero: ['cuanta', 'dan', 'gastos', 'gasto', 'reembolso', 'reembolsan', 'viatico', 'viaticos', 'pesos', 'plata', 'dinero', 'auxilio', 'pagan', 'paga', 'pago', 'factura', 'cuanto'],
  viaje: ['viaje', 'viajes', 'viajar', 'viatico', 'viaticos', 'tiquetes', 'vuelo', 'hotel'],
  comida: ['comida', 'alimentacion', 'almuerzo', 'alimentos', 'comer'],
  equipo: ['portatil', 'computador', 'computadora', 'equipo', 'laptop', 'pc', 'celular', 'programas', 'software', 'instalar', 'dano', 'dana', 'dañado', 'roto', 'soporte', 'ayuda'],
  salario: ['nomina', 'salario', 'salarios', 'salarial', 'sueldo', 'aumento', 'aumentos', 'quincena'],
  tiempo: ['dias', 'dia', 'diario', 'semana', 'mes', 'año', 'ano', 'anticipacion', 'cuando', 'martes', 'marzo', 'periodos'],
  permiso: ['solicitud', 'solicitan', 'solicitar', 'pedir', 'aprueba', 'autorizacion', 'acuerdo', 'jefe', 'puedo', 'permite'],
};

export const PREGUNTAS = [
  '¿Cuántos días de descanso tengo al año?',
  '¿Puedo trabajar desde mi casa?',
  '¿Cuánta plata me dan al día para comida en un viaje?',
  'Se me dañó el computador, ¿qué hago?',
  '¿Cuándo pagan la quincena?',
];

export const STOPWORDS = new Set(('a al algo como con cual cuales de del desde donde el ella en entre es esa ese esta este hay la las le lo los me mi mis muy no o para pero por que qué se si sin sobre su sus te tengo tiene un una uno y ya yo').split(' '));

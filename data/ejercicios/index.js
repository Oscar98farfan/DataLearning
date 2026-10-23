// Reúne todos los ejercicios. Para agregar un tema nuevo: crea su archivo
// en esta carpeta, impórtalo aquí y regístralo en data/temas.js.
import python from './python.js';
import pandas from './pandas.js';
import sql from './sql.js';
import powerbi from './powerbi.js';
import git from './git.js';
import arquitectura from './arquitectura.js';
import ia from './ia.js';

export const BANK = [...python, ...pandas, ...sql, ...powerbi, ...git, ...arquitectura, ...ia];

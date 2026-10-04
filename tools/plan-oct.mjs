// Una sola vez (5-oct-2026): adapta la base al plan de acción de Nahuel.
//   node --env-file=.env.local tools/plan-oct.mjs

import { crear, listar, actualizar, guardarPorClave } from '../lib/db.mjs';

// Seguidores de Instagram de la competencia relevados el 4-oct-2026 (ver saber/competencia-*.md).
const comp = { 'c-canarias': 48000, 'c-rei-verde': 45000, 'c-sara': 20000, 'c-barao': 14000, 'c-verdecita': 6298 };
for (const [cuenta, seguidores] of Object.entries(comp)) {
  await guardarPorClave('metrica', 'clave', `${cuenta}_2026-10-04`, { cuenta, fecha: '2026-10-04', seguidores });
}

const tareas = await listar(['tarea']);
const ya = new Set(tareas.map((t) => t.texto));
const T = (frente, texto, extra = {}) => ({ frente, texto, estado: 'pendiente', deNahuel: false, hechoEn: null, ...extra });
const nuevas = [
  T('ig-latina', 'Integrar TikTok con Instagram de LaTiNa (mismo contenido en las dos)'),
  T('ig-centenaria', 'Confirmar el usuario de Facebook de cada marca para cargar métricas'),
  T('influencers', 'Guía breve para Belén (Centenaria) y Santiago (LaTiNa): objetivo, producto y mensaje de cada reel'),
  T('influencers', 'Definir fechas de entrega del UGC y quién edita el material', { deNahuel: true }),
  T('ads', 'Proponer presupuesto de pauta mensual a Nahuel y Adelina'),
  T('ads', 'Primera campaña de 7 días: distribuidores, cuenta yerbamatelatina'),
  T('general', 'Martes: coordinar con la oficina el contenido que sale desde el miércoles'),
];
let n = 0;
for (const t of nuevas) if (!ya.has(t.texto)) { await crear('tarea', t); n++; }

// La tarea de Centenaria Azul ya no es nuestra: queda hecha con el texto correcto.
const azul = tareas.find((t) => t.texto.startsWith('Centenaria Azul'));
if (azul) await actualizar(azul.id, { texto: 'Cente Azul: la maneja Franco (miércoles), fuera de este panel' });

console.log(`métricas de competencia: ${Object.keys(comp).length} · tareas nuevas: ${n}`);

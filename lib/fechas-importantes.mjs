// Fechas que conviene tener a la vista para el contenido: feriados (se leen
// de internet, de argentinadatos.com) y fechas comerciales que se calculan
// solas. Los eventos propios (una expo, una feria) se cargan en el panel como
// registros de tipo `evento`.

import { iso } from './fechas.mjs';

// n-ésimo domingo (o el día de semana que sea) de un mes. dow: 0 = domingo.
function nesimo(anio, mes, dow, n) {
  const d = new Date(Date.UTC(anio, mes, 1));
  d.setUTCDate(1 + ((dow - d.getUTCDay() + 7) % 7) + (n - 1) * 7);
  return iso(d);
}

export function comerciales(anio) {
  const f = (m, d) => iso(new Date(Date.UTC(anio, m - 1, d)));
  // Meses en nesimo() van de 0 (enero) a 11. dow: 0 domingo, 1 lunes, 5 viernes.
  return [
    { fecha: f(2, 14), titulo: 'San Valentín' },
    { fecha: f(3, 8), titulo: 'Día de la Mujer' },
    { fecha: nesimo(anio, 4, 1, 2), titulo: 'Hot Sale (aprox., confirmar fecha)' },
    { fecha: nesimo(anio, 5, 0, 3), titulo: 'Día del Padre' },
    { fecha: f(7, 20), titulo: 'Día del Amigo' },
    { fecha: nesimo(anio, 7, 0, 3), titulo: 'Día del Niño' },
    { fecha: f(9, 21), titulo: 'Día de la Primavera y del Estudiante' },
    { fecha: nesimo(anio, 9, 0, 3), titulo: 'Día de la Madre' },
    { fecha: nesimo(anio, 10, 1, 1), titulo: 'CyberMonday (aprox., confirmar fecha)' },
    { fecha: f(11, 10), titulo: 'Día de la Tradición' },
    { fecha: nesimo(anio, 10, 5, 4), titulo: 'Black Friday' },
    { fecha: f(11, 30), titulo: 'Día Nacional del Mate' },
    { fecha: f(12, 24), titulo: 'Nochebuena' },
    { fecha: f(12, 31), titulo: 'Fin de año' },
  ].map((x) => ({ ...x, tipo: 'comercial' }));
}

const cache = new Map(); // año → { hasta, lista }
async function feriados(anio) {
  const c = cache.get(anio);
  if (c && c.hasta > Date.now()) return c.lista;
  try {
    const r = await fetch(`https://api.argentinadatos.com/v1/feriados/${anio}`, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const lista = (await r.json()).map((f) => ({ fecha: f.fecha, titulo: f.nombre, tipo: f.tipo === 'puente' ? 'puente' : 'feriado' }));
    cache.set(anio, { hasta: Date.now() + 12 * 3600000, lista });
    return lista;
  } catch {
    return c?.lista || []; // sin internet, el panel sigue andando sin feriados
  }
}

// Todas las fechas entre desde y hasta (YYYY-MM-DD, hasta excluido), con los eventos propios.
export async function fechasEntre(desde, hasta, regs = []) {
  const anios = [...new Set([desde.slice(0, 4), hasta.slice(0, 4)])].map(Number);
  const todas = [];
  for (const a of anios) todas.push(...(await feriados(a)), ...comerciales(a));
  for (const e of regs.filter((r) => r.tipo === 'evento')) todas.push({ fecha: e.fecha, titulo: e.titulo, tipo: 'evento', marca: e.marca, lugar: e.lugar, id: e.id });
  return todas.filter((x) => x.fecha >= desde && x.fecha < hasta).sort((a, b) => a.fecha.localeCompare(b.fecha));
}

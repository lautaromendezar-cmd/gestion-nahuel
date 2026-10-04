// Fechas en hora de Argentina (UTC-3, sin horario de verano).
// En el servidor el reloj está en UTC: sin esto, un domingo a las 22 hs ya
// sería lunes y el reporte del viernes caería en la semana equivocada.

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

const pad = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

// "Hoy" en Argentina, como fecha UTC a medianoche.
export function hoyAR(ahora = new Date()) {
  const ar = new Date(ahora.getTime() - 3 * 3600000);
  return new Date(Date.UTC(ar.getUTCFullYear(), ar.getUTCMonth(), ar.getUTCDate()));
}

export function lunesDe(d) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x;
}

export const sumarDias = (d, n) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; };
export const parseISO = (s) => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };

export function etiquetaSemana(lunes) {
  const dom = sumarDias(lunes, 6);
  const mismoMes = lunes.getUTCMonth() === dom.getUTCMonth();
  return `semana del ${lunes.getUTCDate()}${mismoMes ? '' : ' de ' + MESES[lunes.getUTCMonth()]} al ${dom.getUTCDate()} de ${MESES[dom.getUTCMonth()]}`;
}

export function corta(s) {
  if (!s) return '';
  const d = parseISO(String(s));
  return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

// Fecha-hora ISO (UTC) → fecha en Argentina "YYYY-MM-DD".
export function fechaAR(isoCompleto) {
  if (!isoCompleto) return null;
  if (String(isoCompleto).length <= 10) return String(isoCompleto);
  return iso(hoyAR(new Date(isoCompleto)));
}

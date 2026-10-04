// Los textos que salen del panel: el reporte para Nahuel (WhatsApp o
// Telegram) y el plan del lunes. Los arma el servidor, así el botón de la
// web, el comando /reporte del bot y el envío del viernes dicen lo mismo.

import { corta, etiquetaSemana, fechaAR, iso, MESES, sumarDias } from './fechas.mjs';

export const FRENTES = [
  { id: 'ig-latina', nombre: 'Instagram LaTiNa', marca: 'latina' },
  { id: 'ig-centenaria', nombre: 'Instagram Centenaria', marca: 'centenaria' },
  { id: 'ads', nombre: 'Meta Ads', marca: 'ambas' },
  { id: 'influencers', nombre: 'Influencers', marca: 'ambas' },
  { id: 'ideas', nombre: 'Ideas y competencia', marca: 'ambas' },
  { id: 'web-centenaria', nombre: 'Web Centenaria', marca: 'centenaria' },
  { id: 'tienda-latina', nombre: 'Tienda Nube LaTiNa', marca: 'latina' },
  { id: 'general', nombre: 'General', marca: 'ambas' },
];
export const CUENTAS = [{ id: 'latina', nombre: 'LaTiNa' }, { id: 'centenaria', nombre: 'Centenaria' }];
export const PASOS = { idea: 'idea', editando: 'editando', listo: 'listo', publicado: 'publicado' };
export const ESTADOS_CONTACTO = {
  encontrado: 'Encontrado', contactado: 'Contactado', acepto: 'Aceptó', enviado: 'Producto enviado', publico: 'Publicó', descartado: 'Descartado',
};

const nombreFrente = (id) => FRENTES.find((f) => f.id === id)?.nombre || id;
const nombreCuenta = (id) => CUENTAS.find((c) => c.id === id)?.nombre || id;
const entre = (fecha, desde, hasta) => fecha && fecha >= desde && fecha < hasta;

// desde/hasta: "YYYY-MM-DD", hasta excluido.
export function armarReporte(regs, { desde, hasta, titulo, enCurso = true }) {
  const por = (t) => regs.filter((r) => r.tipo === t);
  const secciones = [];

  const posteos = por('posteo');
  const publicados = posteos
    .filter((p) => p.estado === 'publicado' && entre(p.fecha || p.semana, desde, hasta))
    .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  if (publicados.length) secciones.push(['Publicado en Instagram', publicados.map((p) => `${nombreCuenta(p.cuenta)}: ${p.tema || 'posteo ' + p.n}${p.fecha ? ' (' + corta(p.fecha) + ')' : ''}`)]);

  const prep = posteos.filter((p) => p.estado !== 'publicado' && p.tema && entre(p.semana, desde, hasta));
  if (prep.length) secciones.push(['Posteos en preparación', prep.map((p) => `${nombreCuenta(p.cuenta)}: ${p.tema} (${p.estado})`)]);

  const tareas = por('tarea');
  const hechas = tareas.filter((t) => t.estado === 'hecho' && entre(fechaAR(t.hechoEn), desde, hasta));
  if (hechas.length) {
    const l = [];
    for (const f of FRENTES) for (const t of hechas.filter((x) => x.frente === f.id)) l.push(`${f.nombre}: ${t.texto}`);
    secciones.push(['Hecho', l]);
  }

  if (enCurso) {
    const c = tareas.filter((t) => t.estado === 'en curso' && !t.deNahuel);
    if (c.length) secciones.push(['En curso', c.map((t) => `${nombreFrente(t.frente)}: ${t.texto}`)]);
  }

  const infl = por('contacto').filter((c) => c.rubro === 'influencer' && ['acepto', 'enviado', 'publico'].includes(c.estado));
  if (infl.length) secciones.push(['Influencers', infl.map((c) => `${c.nombre} (${c.marca === 'ambas' ? 'las dos' : nombreCuenta(c.marca)}): ${ESTADOS_CONTACTO[c.estado].toLowerCase()}`)]);

  const espera = tareas.filter((t) => t.deNahuel && t.estado !== 'hecho');
  if (espera.length) secciones.push(['Lo que necesito de vos', espera.map((t) => `${t.texto} (${nombreFrente(t.frente)})`)]);

  return { titulo: `LaTiNa y Centenaria · ${titulo}`, secciones };
}

export function reporteSemana(regs, lunes, opts = {}) {
  return armarReporte(regs, { desde: iso(lunes), hasta: iso(sumarDias(lunes, 7)), titulo: etiquetaSemana(lunes), ...opts });
}

export function reporteMes(regs, fecha, opts = {}) {
  const a = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), 1));
  const b = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, 1));
  return armarReporte(regs, { desde: iso(a), hasta: iso(b), titulo: `${MESES[a.getUTCMonth()]} ${a.getUTCFullYear()}`, ...opts });
}

// Plan del lunes: para Lautaro, no para el cliente.
export function planSemana(regs, lunes) {
  const sem = iso(lunes);
  const posteos = regs.filter((r) => r.tipo === 'posteo' && r.semana === sem);
  const l = [];
  for (const c of CUENTAS) for (const n of [1, 2]) {
    const p = posteos.find((x) => x.cuenta === c.id && Number(x.n) === n);
    l.push(`${c.nombre} ${n}: ${p?.tema ? `${p.tema} (${p.estado || 'idea'})` : 'SIN TEMA'}`);
  }
  const tareas = regs.filter((r) => r.tipo === 'tarea');
  const secciones = [['Posteos de la semana', l]];
  const curso = tareas.filter((t) => t.estado === 'en curso');
  if (curso.length) secciones.push(['En curso', curso.map((t) => `${nombreFrente(t.frente)}: ${t.texto}`)]);
  const espera = tareas.filter((t) => t.deNahuel && t.estado !== 'hecho');
  if (espera.length) secciones.push(['Pedirle a Nahuel', espera.map((t) => t.texto)]);
  const bandeja = regs.filter((r) => r.tipo === 'nota' && !r.archivada);
  if (bandeja.length) secciones.push(['Bandeja sin ordenar', [`${bandeja.length} ${bandeja.length === 1 ? 'nota' : 'notas'}`]]);
  return { titulo: `Plan de la ${etiquetaSemana(lunes)}`, secciones };
}

export function aWhatsApp({ titulo, secciones }) {
  const out = [`*${titulo}*`];
  for (const [t, items] of secciones) out.push('', `*${t}*`, ...items.map((i) => `• ${i}`));
  if (!secciones.length) out.push('', 'Todavía no hay nada marcado en este período.');
  return out.join('\n');
}

const escHtml = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
export function aTelegram({ titulo, secciones }) {
  const out = [`<b>${escHtml(titulo)}</b>`];
  for (const [t, items] of secciones) out.push('', `<b>${escHtml(t)}</b>`, ...items.map((i) => `· ${escHtml(i)}`));
  if (!secciones.length) out.push('', 'Todavía no hay nada marcado en este período.');
  return out.join('\n');
}

// Los textos que salen del panel: el reporte para Nahuel (WhatsApp), el plan
// del lunes y el recordatorio del martes. Los arma el servidor, así el botón
// de la web, el bot y los envíos programados dicen lo mismo.
//
// El calendario es el del plan de Nahuel (oct-2026): un posteo por día hábil,
// lunes Centenaria, martes LaTiNa, miércoles Cente Azul (Franco), jueves
// Centenaria, viernes LaTiNa. Tres ejes: tienda, distribución y UGC.

import { corta, etiquetaSemana, fechaAR, iso, MESES, parseISO, sumarDias } from './fechas.mjs';

export const FRENTES = [
  { id: 'ig-latina', nombre: 'Redes LaTiNa', marca: 'latina' },
  { id: 'ig-centenaria', nombre: 'Redes Centenaria', marca: 'centenaria' },
  { id: 'ads', nombre: 'Meta Ads', marca: 'ambas' },
  { id: 'influencers', nombre: 'UGC e influencers', marca: 'ambas' },
  { id: 'ideas', nombre: 'Ideas y competencia', marca: 'ambas' },
  { id: 'web-centenaria', nombre: 'Web Centenaria', marca: 'centenaria' },
  { id: 'tienda-latina', nombre: 'Tienda Nube LaTiNa', marca: 'latina' },
  { id: 'general', nombre: 'General', marca: 'ambas' },
];

export const MARCAS = { centenaria: 'Centenaria', latina: 'LaTiNa', 'cente-azul': 'Cente Azul' };
// getUTCDay(): 1 = lunes … 5 = viernes
export const CALENDARIO = {
  1: { marca: 'centenaria', aCargo: 'Lautaro' },
  2: { marca: 'latina', aCargo: 'Lautaro' },
  3: { marca: 'cente-azul', aCargo: 'Franco' },
  4: { marca: 'centenaria', aCargo: 'Lautaro' },
  5: { marca: 'latina', aCargo: 'Lautaro' },
};
export const REDES = { centenaria: ['ig', 'fb'], latina: ['ig', 'fb', 'tt'], 'cente-azul': ['ig'] };
export const EJES = { tienda: 'Tienda', distribucion: 'Distribución', ugc: 'UGC' };
export const UGC_MES = [
  { quien: 'Belén', marca: 'centenaria', cantidad: 2 },
  { quien: 'Santiago', marca: 'latina', cantidad: 2 },
];
export const CUENTAS_RED = [
  { id: 'ig-centenaria', marca: 'centenaria', red: 'Instagram', usuario: '@yerbacentenariaargentina' },
  { id: 'fb-centenaria', marca: 'centenaria', red: 'Facebook', usuario: '' },
  { id: 'ig-latina', marca: 'latina', red: 'Instagram', usuario: '' },
  { id: 'fb-latina', marca: 'latina', red: 'Facebook', usuario: '' },
  { id: 'tt-latina', marca: 'latina', red: 'TikTok', usuario: '' },
  { id: 'ig-cente-azul', marca: 'cente-azul', red: 'Instagram', usuario: '' },
];
export const CUENTAS_COMPETENCIA = [
  { id: 'c-canarias', nombre: 'Canarias', usuario: '@yerbacanarias.arg' },
  { id: 'c-rei-verde', nombre: 'Rei Verde', usuario: '@reiverdeargentina' },
  { id: 'c-sara', nombre: 'Sara', usuario: '@yerbasarauy' },
  { id: 'c-barao', nombre: 'Barão', usuario: '@barao.argentina' },
  { id: 'c-verdecita', nombre: 'Verdecita', usuario: '@yerbaverdecita' },
  { id: 'c-uruguai', nombre: 'Uruguaí', usuario: '@uruguai_arg' },
];
export const ESTADOS_CONTACTO = {
  encontrado: 'Encontrado', contactado: 'Contactado', acepto: 'Aceptó', enviado: 'Producto enviado', publico: 'Publicó', descartado: 'Descartado',
};

const nombreFrente = (id) => FRENTES.find((f) => f.id === id)?.nombre || id;
const entre = (fecha, desde, hasta) => fecha && fecha >= desde && fecha < hasta;
const pesos = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-AR');
const num = (n) => Number(n) || 0;

// Posteo del día: lo guardado o lo que dice el calendario.
export function posteoDelDia(regs, fecha) {
  const p = regs.find((r) => r.tipo === 'posteo' && r.clave === fecha);
  const dia = parseISO(fecha).getUTCDay();
  const base = CALENDARIO[dia];
  if (!base) return p || null;
  return { marca: base.marca, aCargo: base.aCargo, estado: 'pendiente', ...(p || {}), fecha };
}

// Campañas que tocan el período.
function campanasEn(regs, desde, hasta) {
  return regs.filter((r) => r.tipo === 'campana' && r.inicio && r.inicio < hasta && (r.fin || r.inicio) >= desde);
}

export function resumenAds(campanas) {
  const gasto = campanas.reduce((s, c) => s + num(c.gasto), 0);
  const consultas = campanas.reduce((s, c) => s + num(c.consultas), 0);
  const compras = campanas.reduce((s, c) => s + num(c.compras), 0);
  return { gasto, consultas, compras, costoConsulta: consultas ? gasto / consultas : null };
}

// desde/hasta: "YYYY-MM-DD", hasta excluido.
export function armarReporte(regs, { desde, hasta, titulo, enCurso = true, mensual = false }) {
  const por = (t) => regs.filter((r) => r.tipo === t);
  const secciones = [];

  const posteos = por('posteo').filter((p) => entre(p.fecha || p.clave, desde, hasta));
  const pub = posteos.filter((p) => p.estado === 'publicado').sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  if (pub.length) secciones.push([`Publicado (${pub.length})`, pub.map((p) => `${corta(p.fecha)} · ${MARCAS[p.marca] || p.marca}${p.eje ? ' · ' + EJES[p.eje] : ''}: ${p.tema || 'sin título'}`)]);

  const meses = new Set([desde.slice(0, 7), iso(sumarDias(parseISO(hasta), -1)).slice(0, 7)]);
  const ugc = por('ugc').filter((u) => (u.fecha ? entre(u.fecha, desde, hasta) : meses.has(u.mes)));
  if (ugc.length) secciones.push(['Reels UGC', ugc.map((u) => `${u.quien} (${MARCAS[u.marca] || u.marca}): ${u.titulo || 'reel'} · ${u.estado}`)]);

  const camp = campanasEn(regs, desde, hasta);
  if (camp.length) {
    const r = resumenAds(camp);
    const l = camp.map((c) => `${c.nombre || 'Campaña'} (${corta(c.inicio)} a ${corta(c.fin)}): ${pesos(c.gasto)}, ${num(c.consultas)} consultas${num(c.compras) ? `, ${num(c.compras)} compras` : ''}`);
    l.push(`Total: ${pesos(r.gasto)} invertidos, ${r.consultas} consultas${r.costoConsulta ? ` (${pesos(r.costoConsulta)} cada una)` : ''}, ${r.compras} compras atribuibles`);
    secciones.push([mensual ? 'Publicidad del mes' : 'Publicidad', l]);
  }

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

  const espera = tareas.filter((t) => t.deNahuel && t.estado !== 'hecho');
  if (espera.length) secciones.push(['Lo que necesito de ustedes', espera.map((t) => t.texto)]);

  return { titulo: `LaTiNa y Centenaria · ${titulo}`, secciones };
}

// Datos para la hoja del reporte (reporte.html), que se imprime a PDF.
export function datosReporte(regs, { desde, hasta, titulo, tipo }) {
  const por = (t) => regs.filter((r) => r.tipo === t);
  const publicaciones = [];
  for (let d = parseISO(desde); iso(d) < hasta; d = sumarDias(d, 1)) {
    const p = posteoDelDia(regs, iso(d));
    if (p) publicaciones.push({ fecha: iso(d), marca: p.marca, aCargo: p.aCargo, eje: p.eje || null, tema: p.tema || '', estado: p.estado, redes: Object.keys(p.redes || {}).filter((k) => p.redes[k]) });
  }
  const campanas = campanasEn(regs, desde, hasta).sort((a, b) => String(a.inicio).localeCompare(String(b.inicio)))
    .map((c) => ({ nombre: c.nombre, eje: c.eje, inicio: c.inicio, fin: c.fin, gasto: num(c.gasto), consultas: num(c.consultas), compras: num(c.compras), nota: c.nota || '' }));
  const seguidores = CUENTAS_RED.map((c) => {
    const s = por('metrica').filter((m) => m.cuenta === c.id).sort((a, b) => a.fecha.localeCompare(b.fecha));
    const fin = [...s].reverse().find((m) => m.fecha < hasta);
    const ini = [...s].reverse().find((m) => m.fecha < desde) || s.find((m) => m.fecha >= desde && m.fecha < hasta);
    return { ...c, nombreMarca: MARCAS[c.marca], actual: fin?.seguidores ?? null, inicio: ini && ini !== fin ? ini.seguidores : null, serie: s.filter((m) => m.fecha < hasta).slice(-10).map((m) => m.seguidores) };
  });
  const meses = new Set([desde.slice(0, 7), iso(sumarDias(parseISO(hasta), -1)).slice(0, 7)]);
  const ugc = por('ugc').filter((u) => meses.has(u.mes)).map((u) => ({ quien: u.quien, marca: u.marca, titulo: u.titulo || '', estado: u.estado || 'pedido' }));
  const tareas = por('tarea');
  const agrupar = (l) => FRENTES.map((f) => ({ frente: f.nombre, items: l.filter((t) => t.frente === f.id).map((t) => t.texto) })).filter((g) => g.items.length);
  return {
    titulo, tipo, desde, hasta,
    publicaciones, campanas, ads: resumenAds(campanas), seguidores, ugc,
    hechas: agrupar(tareas.filter((t) => t.estado === 'hecho' && entre(fechaAR(t.hechoEn), desde, hasta))),
    enCurso: agrupar(tareas.filter((t) => t.estado === 'en curso' && !t.deNahuel)),
    espera: tareas.filter((t) => t.deNahuel && t.estado !== 'hecho').map((t) => ({ frente: nombreFrente(t.frente), texto: t.texto })),
    marcas: MARCAS, ejes: EJES,
  };
}

export function rangoSemana(lunes) { return { desde: iso(lunes), hasta: iso(sumarDias(lunes, 7)), titulo: etiquetaSemana(lunes), tipo: 'semana' }; }
export function rangoMes(fecha) {
  const a = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), 1));
  const b = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, 1));
  return { desde: iso(a), hasta: iso(b), titulo: `${MESES[a.getUTCMonth()]} ${a.getUTCFullYear()}`, tipo: 'mes' };
}

export function reporteSemana(regs, lunes, opts = {}) {
  return armarReporte(regs, { desde: iso(lunes), hasta: iso(sumarDias(lunes, 7)), titulo: etiquetaSemana(lunes), ...opts });
}

export function reporteMes(regs, fecha, opts = {}) {
  const a = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), 1));
  const b = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, 1));
  return armarReporte(regs, { desde: iso(a), hasta: iso(b), titulo: `${MESES[a.getUTCMonth()]} ${a.getUTCFullYear()}`, mensual: true, ...opts });
}

function lineasDias(regs, desde, dias) {
  const l = [];
  for (let i = 0; i < dias; i++) {
    const f = iso(sumarDias(desde, i));
    const p = posteoDelDia(regs, f);
    if (!p) continue;
    l.push(`${corta(f)} · ${MARCAS[p.marca]}${p.aCargo === 'Franco' ? ' (Franco)' : ''}: ${p.tema ? `${p.tema}${p.eje ? ' [' + EJES[p.eje] + ']' : ''} · ${p.estado}` : 'SIN TEMA'}`);
  }
  return l;
}

// Plan del lunes: para Lautaro, no para el cliente.
export function planSemana(regs, lunes) {
  const secciones = [['Publicaciones', lineasDias(regs, lunes, 5)]];
  const sem = regs.filter((r) => r.tipo === 'posteo' && entre(r.clave, iso(lunes), iso(sumarDias(lunes, 7))));
  if (!sem.some((p) => p.eje === 'distribucion')) secciones.push(['Falta', ['La pieza de distribución de la semana']]);

  const mes = iso(lunes).slice(0, 7);
  const ugc = regs.filter((r) => r.tipo === 'ugc' && r.mes === mes);
  secciones.push(['Reels UGC del mes', UGC_MES.map((u) => `${u.quien}: ${ugc.filter((x) => x.quien === u.quien && x.estado !== 'pedido').length} de ${u.cantidad} recibidos`)]);

  const hoy = iso(lunes);
  const activa = regs.find((r) => r.tipo === 'campana' && r.inicio <= hoy && r.fin >= hoy);
  secciones.push(['Ads', [activa ? `Activa: ${activa.nombre} hasta el ${corta(activa.fin)}` : 'No hay campaña activa: armar la de esta semana']]);

  const ult = regs.filter((r) => r.tipo === 'metrica' && !String(r.cuenta).startsWith('c-')).map((r) => r.fecha).sort().pop();
  if (!ult || ult < iso(sumarDias(lunes, -6))) secciones.push(['Métricas', ['Cargar los seguidores de la semana (/seg en el bot)']]);

  const tareas = regs.filter((r) => r.tipo === 'tarea');
  const curso = tareas.filter((t) => t.estado === 'en curso');
  if (curso.length) secciones.push(['En curso', curso.map((t) => `${nombreFrente(t.frente)}: ${t.texto}`)]);
  const espera = tareas.filter((t) => t.deNahuel && t.estado !== 'hecho');
  if (espera.length) secciones.push(['Pedirle a Nahuel', espera.map((t) => t.texto)]);
  const bandeja = regs.filter((r) => r.tipo === 'nota' && !r.archivada);
  if (bandeja.length) secciones.push(['Bandeja sin ordenar', [`${bandeja.length} ${bandeja.length === 1 ? 'nota' : 'notas'}`]]);
  return { titulo: `Plan de la ${etiquetaSemana(lunes)}`, secciones };
}

// Martes: coordinación con la oficina, lo que sale desde el miércoles.
export function coordinacionMartes(regs, martes) {
  return {
    titulo: 'Hoy coordinás con la oficina',
    secciones: [['Lo que sale desde mañana', lineasDias(regs, sumarDias(martes, 1), 7)]],
  };
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

// Carga inicial y actualización de la base.
//
//   node --env-file=.env.local tools/sembrar.mjs [--saber] [--tareas]
//
// --saber: sube cada saber/*.md como documento (por slug = nombre del archivo).
//          Reejecutarlo actualiza los existentes, no duplica.
// --tareas: carga las tareas de arranque sólo si la base no tiene ninguna.

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listar, crear, guardarPorClave } from '../lib/db.mjs';

const args = process.argv.slice(2);
const todo = args.length === 0;

const ORDEN = { 'latina-marca': 1, 'centenaria-marca': 2, 'mate-101': 10, 'padron-uruguayo': 11, 'mercado': 12, 'ideas-de-contenido': 20, 'influencers-canje': 21, 'competencia-resumen': 30 };

if (todo || args.includes('--saber')) {
  const dir = fileURLToPath(new URL('../saber/', import.meta.url));
  const archivos = (await readdir(dir)).filter((f) => f.endsWith('.md'));
  for (const f of archivos) {
    const slug = f.replace(/\.md$/, '');
    const cuerpo = await readFile(join(dir, f), 'utf8');
    const titulo = (cuerpo.match(/^#\s+(.+)$/m)?.[1] || slug).trim();
    await guardarPorClave('saber', 'slug', slug, { titulo, cuerpo, orden: ORDEN[slug] ?? (slug.startsWith('competencia-') ? 40 : 50) });
    console.log('saber', slug, `${Math.round(cuerpo.length / 1024)} KB`);
  }
}

if (todo || args.includes('--tareas')) {
  const ya = await listar(['tarea']);
  if (ya.length) console.log(`tareas: ya hay ${ya.length}, no se cargan`);
  else {
    const T = (frente, texto, extra = {}) => ({ frente, texto, estado: 'pendiente', deNahuel: false, hechoEn: null, ...extra });
    const tareas = [
      T('ig-latina', 'Editar y bajar las fotos propias para los 2 posteos de la semana (sin IA)', { estado: 'en curso' }),
      T('ig-latina', 'Revisar las 12 piezas de agosto: cuáles sirven con la línea nueva, más natural'),
      T('ig-centenaria', 'Editar y bajar las fotos propias para los 2 posteos de la semana (sin IA)', { estado: 'en curso' }),
      T('ig-centenaria', 'Centenaria Azul: la administra un empleado de Nahuel (fuera de este panel)', { estado: 'hecho', hechoEn: '2026-10-04T15:00:00Z' }),
      T('ads', 'Anotar resultados de septiembre de las dos cuentas'),
      T('ads', 'Plan de campañas de octubre, LaTiNa y Centenaria'),
      T('influencers', 'Armar la primera lista de candidatos para canje (mate, Entre Ríos, cocina)'),
      T('influencers', 'Definir qué se ofrece en el canje (cuántos paquetes, qué se pide a cambio)', { deNahuel: true }),
      T('ideas', 'Leer las fichas de los 6 competidores y elegir 3 cosas para probar'),
      T('web-centenaria', 'Mostrarle a Nahuel lo hecho del 21 al 23-sep y mandarle el mensaje de pedidos (CONTINUAR.md)'),
      T('web-centenaria', 'Probar en el iPhone 14 real que ya no se traba'),
      T('web-centenaria', 'Decidir el cache de /img/ y /fonts/: bajar max-age o versionar nombres'),
      T('web-centenaria', 'Hosting para el dominio: Vercel pago o Cloudflare Pages'),
      T('web-centenaria', 'Lista de puntos de venta de Centenaria', { deNahuel: true }),
      T('web-centenaria', 'Cuál de los dos Facebook de Centenaria es el bueno', { deNahuel: true }),
      T('web-centenaria', 'Mínimo mayorista: ¿20 o 100 kg?', { deNahuel: true }),
      T('web-centenaria', '¿Azul con Palo existe en ½ kg?', { deNahuel: true }),
      T('web-centenaria', 'Foto sepia original sin filtro y el nombre del pueblo', { deNahuel: true }),
      T('tienda-latina', 'Terminar hoy (subir banners en Personalizar, tema Toluca) y mostrársela el lunes 5', { estado: 'en curso' }),
      T('tienda-latina', 'Cuando esté: completar contacto.tienda en yerbamatelatina.com.ar'),
      T('tienda-latina', 'Foto real del paquete de ½ kg', { deNahuel: true }),
      T('tienda-latina', 'Precios definitivos de la tienda (los cargados son propuestos)', { deNahuel: true }),
      T('tienda-latina', 'Confirmar que la funda de ½ kg trae 24 paquetes', { deNahuel: true }),
      T('tienda-latina', 'Con qué correo se hacen los envíos', { deNahuel: true }),
      T('tienda-latina', 'Catálogo cargado por API (1 kg, ½ kg y fundas), fotos del 1 kg y banners armados', { estado: 'hecho', hechoEn: '2026-10-04T05:00:00Z' }),
    ];
    for (const t of tareas) await crear('tarea', t);
    console.log(`tareas: ${tareas.length} cargadas`);
  }
}

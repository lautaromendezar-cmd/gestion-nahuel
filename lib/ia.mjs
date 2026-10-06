// El "cerebro" del panel: Claude con búsqueda web y, como contexto, todo lo
// que hay en Saber (fichas de competencia, mate 101, padrón uruguayo,
// mercado) más el estado del trabajo.
//
// El system prompt va primero y estable (instrucciones + Saber, ordenado por
// slug) con cache_control: las consultas seguidas pagan ese bloque una vez.
// Lo que cambia (tareas, posteos, la pregunta) va en el mensaje del usuario.

import Anthropic from '@anthropic-ai/sdk';
import { FRENTES } from './reporte.mjs';
import { iso, hoyAR } from './fechas.mjs';

// Sonnet: Lautaro tiene un tope de USD 5 por mes para la API y le tiene que durar.
const MODELO = 'claude-sonnet-5-5';

export const iaDisponible = () => Boolean((process.env.ANTHROPIC_API_KEY || '').trim());

const BASE = `Sos el estratega de marketing de dos yerbas mate argentinas del mismo dueño, Nahuel (empresa Seleme). Trabajás con Lautaro, que les lleva Instagram, Meta Ads, la web y la tienda online.

LAS MARCAS
- LaTiNa: yerba mate de padrón uruguayo (molienda fina, más polvo, sin palo grueso), elaborada en el sur de Brasil. Envase: "yerba mate elaborada despalada", sin TACC, 1 kg y 1/2 kg, funda de 12 kg. Fuerte en Entre Ríos (unos 305 puntos de venta, 250 de ellos en Entre Ríos). Slogan: "El verdadero sabor del padrón uruguayo". Frases propias: "No sos vos, es tu yerba", "Cuando cambiás la yerba, cambia el mate". El negocio es sumar distribuidores y que la gente encuentre dónde comprar. Web: yerbamatelatina.com.ar.
- Centenaria (Seleme Centenaria): también padrón uruguayo, elaborada y envasada en origen en el sur de Brasil por la familia Seleme desde 1918, distribuida desde Gualeguaychú, Entre Ríos. Tres variedades: Original (amarillo), Azul · Con Palo, Esencial. Frase del paquete: "El día empieza con yerba mate". Instagram @yerbacentenariaargentina. La cuenta de Azul con Palo la maneja un empleado de Nahuel; no es tema nuestro.
- Las dos marcas compiten en el mismo segmento: hay que diferenciarlas entre sí (LaTiNa: joven, "no sos vos, es tu yerba", rendimiento; Centenaria: 1918, oficio, origen, mate suave y dulce).
- Nahuel siente que marcas del mismo segmento que llegaron después (Rei Verde, Barão, Verdecita, Canarias, Sara, Uruguaí) hoy venden más. Tomalo como hipótesis a contrastar con datos, no como hecho.

REGLAS
- Español rioplatense con voseo. Directo, concreto, sin relleno, sin emojis.
- Desde octubre de 2026 Nahuel no quiere contenido hecho con IA: las ideas tienen que poder hacerse con fotos y videos reales (el paquete, gente tomando mate, el depósito, los comercios, la costa, el río, Entre Ríos).
- Calendario (plan de Nahuel, oct-2026): un posteo por día hábil. Lunes Centenaria, martes LaTiNa, miércoles Cente Azul (lo hace Franco), jueves Centenaria, viernes LaTiNa. Centenaria publica en Instagram y Facebook; LaTiNa en Instagram, Facebook y TikTok.
- Tres ejes: TIENDA (generar compras, cada pieza con el link a la tienda), DISTRIBUCIÓN (una pieza fuerte por semana para sumar distribuidores con cartera y zona comprobable; el contacto es por WhatsApp y sigue en Kommo) y UGC (contenido juvenil, natural, materos; Belén hace 2 reels por mes para Centenaria y Santiago 2 para LaTiNa).
- Además de los tres ejes existe «Otros», para piezas puntuales que no entran en ninguno (por ejemplo, un sorteo de entradas).
- Meta Ads: campañas de 7 días encadenadas, siguiendo los mismos tres ejes. El reporte mensual separa consultas de compras.
- Nunca inventes datos, precios, cifras de venta, fechas ni cuentas de Instagram. Si no lo sabés y no lo encontrás buscando, decilo. Separá lo que es dato (con fuente) de lo que es inferencia tuya.
- Cuando busques en la web, citá de dónde sale cada dato importante (dominio y, si hay, fecha).`;

export function systemPrompt(saber) {
  const docs = [...saber].sort((a, b) => String(a.slug).localeCompare(String(b.slug)));
  const cuerpo = docs.map((d) => `<documento slug="${d.slug}" titulo="${d.titulo}">\n${d.cuerpo}\n</documento>`).join('\n\n');
  return `${BASE}\n\nBASE DE CONOCIMIENTO (armada por el equipo; puede tener datos viejos, verificá lo que importe):\n\n${cuerpo || '(vacía todavía)'}`;
}

export function estadoTrabajo(regs) {
  const tareas = regs.filter((r) => r.tipo === 'tarea' && r.estado !== 'hecho');
  const posteos = regs.filter((r) => r.tipo === 'posteo' && r.tema).slice(-24);
  const ideas = regs.filter((r) => r.tipo === 'idea').slice(-80);
  const obs = regs.filter((r) => r.tipo === 'obs').slice(-40);
  const fechas = regs.filter((r) => r.tipo === 'fecha');
  const l = [`Hoy es ${iso(hoyAR())}.`];
  if (fechas.length) l.push('', 'FECHAS Y EVENTOS DE LOS PRÓXIMOS 60 DÍAS (feriados, fechas comerciales y eventos de las marcas que cargó el equipo; tenelos en cuenta para las ideas):', ...fechas.map((f) => `- ${f.fecha}: ${f.titulo}${f.tipo === 'evento' ? ` (evento${f.marca ? ' de ' + f.marca : ''}${f.lugar ? ', ' + f.lugar : ''})` : ` (${f.tipo})`}`));
  if (tareas.length) l.push('', 'TAREAS ABIERTAS:', ...tareas.map((t) => `- [${FRENTES.find((f) => f.id === t.frente)?.nombre || t.frente}] ${t.texto}${t.deNahuel ? ' (espera a Nahuel)' : ''}`));
  if (posteos.length) l.push('', 'POSTEOS RECIENTES (para no repetir):', ...posteos.map((p) => `- ${p.semana} ${p.cuenta}: ${p.tema} (${p.estado})`));
  if (ideas.length) l.push('', 'IDEAS YA ANOTADAS (no las repitas):', ...ideas.map((i) => `- [${i.marca}] ${i.titulo}`));
  if (obs.length) l.push('', 'OBSERVACIONES DE LA COMPETENCIA:', ...obs.map((o) => `- ${o.competidor} (${o.fecha || ''}): ${String(o.texto).slice(0, 700)}`));
  return l.join('\n');
}

let _cliente = null;
const cliente = () => (_cliente ||= new Anthropic());

// Una consulta con búsqueda web. Maneja pause_turn (el loop de búsquedas del
// servidor se corta a las 10 iteraciones y hay que reanudarlo).
async function llamar({ system, usuario, effort = 'medium', web = true, maxBusquedas = 5 }) {
  const mensajes = [{ role: 'user', content: usuario }];
  for (let i = 0; i < 4; i++) {
    const stream = cliente().beta.messages.stream({
      model: MODELO,
      max_tokens: 32000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort },
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      ...(web ? { tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: maxBusquedas }] } : {}),
      messages: mensajes,
    });
    const msg = await stream.finalMessage();

    if (msg.stop_reason === 'pause_turn') {
      const ultimo = mensajes[mensajes.length - 1];
      if (ultimo.role === 'assistant') ultimo.content = [...ultimo.content, ...msg.content];
      else mensajes.push({ role: 'assistant', content: msg.content });
      continue;
    }
    if (msg.stop_reason === 'refusal') throw new Error('El modelo no quiso responder esta consulta. Probá reformularla.');

    const previos = mensajes[mensajes.length - 1].role === 'assistant' ? mensajes[mensajes.length - 1].content : [];
    return [...previos, ...msg.content].filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  }
  throw new Error('La búsqueda se hizo demasiado larga. Probá con una pregunta más acotada.');
}

export async function preguntar(pregunta, regs) {
  const saber = regs.filter((r) => r.tipo === 'saber');
  return llamar({
    system: systemPrompt(saber),
    usuario: `${estadoTrabajo(regs)}\n\nPREGUNTA DE LAUTARO:\n${pregunta}\n\nRespondé en texto plano (sin markdown pesado: como mucho guiones para listas). Si hace falta, buscá en la web.`,
  });
}

// Devuelve [{titulo, marca, formato, pilar, descripcion, porque}]
export async function generarIdeas({ marca = 'ambas', cantidad = 8, foco = '' }, regs) {
  const saber = regs.filter((r) => r.tipo === 'saber');
  const texto = await llamar({
    system: systemPrompt(saber),
    usuario: `${estadoTrabajo(regs)}

PEDIDO: ${cantidad} ideas de contenido de Instagram para ${marca === 'ambas' ? 'LaTiNa y Centenaria' : marca === 'latina' ? 'LaTiNa' : 'Centenaria'}.${foco ? `\nFoco: ${foco}` : ''}
Buscá en la web qué está funcionando ahora en cuentas de yerba (las competidoras, mateadores, tendencias de reels) y en fechas próximas, y usalo. Que se puedan hacer con fotos y videos reales, sin IA. Nada que ya esté en la lista de ideas anotadas.

Al final, después de tu análisis, devolvé las ideas en este formato exacto (JSON válido entre las etiquetas, sin nada más adentro):
<ideas>[{"titulo":"...","marca":"latina|centenaria|ambas","formato":"reel|carrusel|foto|historia","pilar":"educativo|ritual|producto|comunidad|humor|comercios|fecha","descripcion":"qué se muestra y qué dice, en 2-3 oraciones","porque":"por qué puede funcionar, con la fuente si salió de algo que viste"}]</ideas>`,
  });
  const m = texto.match(/<ideas>([\s\S]*?)<\/ideas>/);
  if (!m) throw new Error('La respuesta no trajo la lista de ideas. Probá de nuevo.');
  let lista;
  try { lista = JSON.parse(m[1]); } catch { throw new Error('La lista de ideas vino mal formada. Probá de nuevo.'); }
  const resumen = texto.replace(m[0], '').trim();
  return { ideas: Array.isArray(lista) ? lista : [], resumen };
}

export async function analizarCompetidor(nombre, regs) {
  const saber = regs.filter((r) => r.tipo === 'saber');
  return llamar({
    system: systemPrompt(saber),
    maxBusquedas: 8,
    usuario: `${estadoTrabajo(regs)}

PEDIDO: actualizá el análisis de la yerba ${nombre}. Buscá lo más reciente (últimos 3 meses si se puede): qué publicó en Instagram y redes, lanzamientos, precios actuales en Argentina (MercadoLibre, supermercados), anuncios activos, influencers o canjes, notas de prensa, dónde se consigue. Compará con lo que ya dice la base de conocimiento y marcá qué cambió.

Formato, en texto plano con títulos en MAYÚSCULA:
NOVEDADES (con fecha y fuente)
PRECIOS HOY
QUÉ ESTÁ HACIENDO EN REDES
QUÉ LE PODEMOS TOMAR (3 a 5 acciones concretas para LaTiNa o Centenaria)
LO QUE NO PUDE VERIFICAR`,
  });
}

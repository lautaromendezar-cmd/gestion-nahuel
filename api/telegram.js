// Webhook del bot. Todo lo que Lautaro le escribe cae en la bandeja del
// panel, salvo los comandos. Telegram exige respuesta rápida (si no, reenvía
// el mensaje y se duplica la nota): se contesta 200 enseguida y lo lento
// —las consultas a Claude— sigue en segundo plano con waitUntil.

import { waitUntil } from '@vercel/functions';
import { TIPOS, listar, crear, guardarPorClave } from '../lib/db.mjs';
import { enviar } from '../lib/telegram.mjs';
import { FRENTES, planSemana, aTelegram } from '../lib/reporte.mjs';
import { iaDisponible, preguntar, generarIdeas } from '../lib/ia.mjs';
import { hoyAR, lunesDe, iso, sumarDias } from '../lib/fechas.mjs';
import { fechasEntre } from '../lib/fechas-importantes.mjs';
import { cuerpo } from '../lib/http.mjs';

export const config = { maxDuration: 300 };

const AYUDA = `<b>Bot de Gestión Nahuel</b>

Cualquier cosa que me escribas o me reenvíes queda en la <b>bandeja</b> del panel.

/idea texto · va directo a Ideas
/tarea texto · tarea nueva (frente General)
/pendientes · tareas abiertas y lo que espera a Nahuel
/semana · el plan de esta semana
/reporte · link a la hoja del reporte (PDF)
/p pregunta · le pregunto a Claude (busca en la web)
/ideas foco · 5 ideas nuevas de contenido
/seg igc 8120 fbc 3400 igl 12000 fbl 900 ttl 310 iga 520 · cargar seguidores (podés mandar sólo algunas)`;

const ALIAS = { igc: 'ig-centenaria', fbc: 'fb-centenaria', igl: 'ig-latina', fbl: 'fb-latina', ttl: 'tt-latina', iga: 'ig-cente-azul' };

const escHtml = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const secreto = (process.env.TELEGRAM_SECRET || '').trim();
  if (!secreto || req.headers['x-telegram-bot-api-secret-token'] !== secreto) return res.status(401).end();

  const u = cuerpo(req);
  const m = u.message || u.edited_message;
  if (!m) return res.status(200).end();
  const chat = String(m.chat?.id || '');
  const permitido = (process.env.TELEGRAM_CHAT || '').trim();

  // Sin chat configurado, el bot sólo dice el id para poder configurarlo.
  if (!permitido) {
    await enviar(`Tu chat id es <code>${chat}</code>. Cargalo en Vercel como TELEGRAM_CHAT.`, { chat });
    return res.status(200).end();
  }
  if (chat !== permitido) return res.status(200).end();

  try {
    await atender(m, chat);
  } catch (e) {
    console.error(e);
    await enviar(`No pude guardar eso: ${escHtml(e.message)}`, { chat });
  }
  return res.status(200).end();
}

async function atender(m, chat) {
  const texto = (m.text || m.caption || '').trim();
  const [cmdCrudo, ...resto] = texto.split(/\s+/);
  const cmd = texto.startsWith('/') ? cmdCrudo.split('@')[0].toLowerCase() : '';
  const arg = resto.join(' ').trim();

  if (cmd === '/start' || cmd === '/ayuda' || cmd === '/help') return enviar(AYUDA, { chat });

  if (cmd === '/idea') {
    if (!arg) return enviar('Escribí la idea después de /idea.', { chat });
    await crear('idea', { titulo: arg, marca: 'ambas', estado: 'nueva', origen: 'Telegram' });
    return enviar('Anotada en Ideas.', { chat });
  }
  if (cmd === '/tarea') {
    if (!arg) return enviar('Escribí la tarea después de /tarea.', { chat });
    await crear('tarea', { frente: 'general', texto: arg, estado: 'pendiente', deNahuel: false, hechoEn: null });
    return enviar('Tarea anotada en General.', { chat });
  }
  if (cmd === '/seg') {
    const partes = arg.toLowerCase().split(/s+/);
    const fecha = iso(hoyAR());
    const cargadas = [];
    for (let i = 0; i < partes.length - 1; i += 2) {
      const cuenta = ALIAS[partes[i]];
      const n = Number(String(partes[i + 1]).replace(/[.,]/g, '').replace(/k$/, '000'));
      if (!cuenta || !Number.isFinite(n)) continue;
      await guardarPorClave('metrica', 'clave', `${cuenta}_${fecha}`, { cuenta, fecha, seguidores: n });
      cargadas.push(`${partes[i]} ${n.toLocaleString('es-AR')}`);
    }
    if (!cargadas.length) return enviar('Formato: /seg igc 8120 igl 12000 …\nigc/fbc = Centenaria, igl/fbl/ttl = LaTiNa, iga = Cente Azul.', { chat });
    return enviar(`Seguidores de hoy guardados: ${cargadas.join(' · ')}`, { chat });
  }
  if (cmd === '/pendientes') {
    const regs = await listar(['tarea']);
    const abiertas = regs.filter((t) => t.estado !== 'hecho');
    const l = ['<b>Pendientes</b>'];
    for (const f of FRENTES) {
      const x = abiertas.filter((t) => t.frente === f.id && !t.deNahuel);
      if (x.length) l.push('', `<b>${escHtml(f.nombre)}</b>`, ...x.map((t) => `${t.estado === 'en curso' ? '▸' : '·'} ${escHtml(t.texto)}`));
    }
    const esp = abiertas.filter((t) => t.deNahuel);
    if (esp.length) l.push('', '<b>Espera a Nahuel</b>', ...esp.map((t) => `· ${escHtml(t.texto)}`));
    return enviar(l.join('\n'), { chat });
  }
  if (cmd === '/semana') {
    const regs = await listar(TIPOS);
    const fechas = await fechasEntre(iso(hoyAR()), iso(sumarDias(hoyAR(), 30)), regs);
    return enviar(aTelegram(planSemana(regs, lunesDe(hoyAR()), fechas)), { chat });
  }
  if (cmd === '/reporte') {
    return enviar(`<b>Reporte de la semana</b>
https://gestion-nahuel.vercel.app/reporte.html

Abrilo, revisalo y tocá «Descargar PDF» para mandárselo a Nahuel. Si es fin de mes, pasalo a «Mes».`, { chat });
  }
  if (cmd === '/p' || cmd === '/ideas') {
    if (!iaDisponible()) return enviar('Falta cargar ANTHROPIC_API_KEY en Vercel.', { chat });
    if (cmd === '/p' && !arg) return enviar('Escribí la pregunta después de /p.', { chat });
    await enviar(cmd === '/p' ? 'Buscando, dame un minuto o dos...' : 'Pensando ideas, dame un par de minutos...', { chat });
    waitUntil((async () => {
      try {
        const regs = await listar(TIPOS);
        for (const f of await fechasEntre(iso(hoyAR()), iso(sumarDias(hoyAR(), 60)), regs)) regs.push({ ...f, tipo: 'fecha' });
        if (cmd === '/p') {
          const r = await preguntar(arg, regs);
          await enviar(escHtml(r), { chat });
        } else {
          const { ideas } = await generarIdeas({ marca: 'ambas', cantidad: 5, foco: arg }, regs);
          for (const i of ideas) await crear('idea', { ...i, estado: 'nueva', origen: 'IA' });
          await enviar(['<b>Ideas nuevas (ya están en el panel)</b>', ...ideas.map((i) => `\n<b>${escHtml(i.titulo)}</b> · ${escHtml(i.marca)} · ${escHtml(i.formato)}\n${escHtml(i.descripcion)}`)].join('\n'), { chat });
        }
      } catch (e) {
        console.error(e);
        await enviar(`No pude completar la consulta: ${escHtml(e.message)}`, { chat });
      }
    })());
    return;
  }
  if (cmd) return enviar('No conozco ese comando. /ayuda para ver la lista.', { chat });

  // Todo lo demás, a la bandeja.
  let nota = texto;
  if (m.voice || m.audio) nota = nota || '[audio: escuchalo en Telegram]';
  if (m.photo) nota = nota ? `[foto] ${nota}` : '[foto sin texto: mirala en Telegram]';
  if (m.document) nota = `[archivo ${m.document.file_name || ''}] ${nota}`.trim();
  if (m.contact) nota = `${m.contact.first_name || ''} ${m.contact.last_name || ''}: ${m.contact.phone_number}`.trim();
  const de = m.forward_origin?.sender_user?.first_name || m.forward_origin?.sender_user_name || m.forward_from?.first_name || m.forward_sender_name || '';
  if (!nota) return enviar('Eso no lo puedo guardar. Mandame texto, un link o un contacto.', { chat });
  await crear('nota', { texto: nota, de, origen: 'Telegram', archivada: false });
  return enviar('Anotado en la bandeja.', { chat });
}

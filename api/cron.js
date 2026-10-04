// Envíos programados (vercel.json): el plan del lunes y el reporte del viernes.
// Vercel firma la llamada con CRON_SECRET.

import { TIPOS, listar } from '../lib/db.mjs';
import { enviar } from '../lib/telegram.mjs';
import { planSemana, reporteSemana, aTelegram, aWhatsApp } from '../lib/reporte.mjs';
import { hoyAR, lunesDe } from '../lib/fechas.mjs';

export default async function handler(req, res) {
  const secreto = (process.env.CRON_SECRET || '').trim();
  if (!secreto || req.headers.authorization !== `Bearer ${secreto}`) return res.status(401).end();
  const regs = await listar(TIPOS);
  const lunes = lunesDe(hoyAR());
  let r;
  if (req.query.tipo === 'lunes') r = await enviar(aTelegram(planSemana(regs, lunes)));
  else if (req.query.tipo === 'viernes') {
    await enviar('<b>Reporte de la semana.</b> Revisalo y reenviáselo a Nahuel:');
    r = await enviar(aWhatsApp(reporteSemana(regs, lunes)), { html: false });
  } else return res.status(400).json({ error: 'tipo desconocido' });
  return res.status(200).json(r);
}

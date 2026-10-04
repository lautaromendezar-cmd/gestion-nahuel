// Envíos programados (vercel.json): plan del lunes, coordinación del martes y
// reporte del viernes. Vercel firma la llamada con CRON_SECRET.

import { TIPOS, listar } from '../lib/db.mjs';
import { enviar } from '../lib/telegram.mjs';
import { planSemana, coordinacionMartes, aTelegram } from '../lib/reporte.mjs';
import { hoyAR, lunesDe, iso, sumarDias } from '../lib/fechas.mjs';
import { fechasEntre } from '../lib/fechas-importantes.mjs';

export default async function handler(req, res) {
  const secreto = (process.env.CRON_SECRET || '').trim();
  if (!secreto || req.headers.authorization !== `Bearer ${secreto}`) return res.status(401).end();
  const regs = await listar(TIPOS);
  const hoy = hoyAR();
  const lunes = lunesDe(hoy);
  const fechas = await fechasEntre(iso(hoy), iso(sumarDias(hoy, 30)), regs);
  let r;
  if (req.query.tipo === 'lunes') r = await enviar(aTelegram(planSemana(regs, lunes, fechas)));
  else if (req.query.tipo === 'martes') r = await enviar(aTelegram(coordinacionMartes(regs, hoy, fechas)));
  else if (req.query.tipo === 'viernes') {
    r = await enviar(`<b>Viernes: reporte de la semana listo</b>
https://gestion-nahuel.vercel.app/reporte.html

Revisalo, completá lo que falte en el panel y descargalo en PDF para Nahuel.`);
  } else return res.status(400).json({ error: 'tipo desconocido' });
  return res.status(200).json(r);
}

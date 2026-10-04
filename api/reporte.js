// Reporte para Nahuel en texto de WhatsApp.

import { TIPOS, listar } from '../lib/db.mjs';
import { reporteSemana, reporteMes, aWhatsApp } from '../lib/reporte.mjs';
import { parseISO, lunesDe, hoyAR } from '../lib/fechas.mjs';
import { sinSesion, fallo } from '../lib/http.mjs';

export default async function handler(req, res) {
  if (sinSesion(req, res)) return;
  try {
    const regs = await listar(TIPOS);
    const base = /^\d{4}-\d{2}-\d{2}$/.test(req.query.lunes || '') ? parseISO(req.query.lunes) : lunesDe(hoyAR());
    const opts = { enCurso: req.query.curso !== '0' };
    const r = req.query.rango === 'mes' ? reporteMes(regs, new Date(base.getTime() + 3 * 86400000), opts) : reporteSemana(regs, lunesDe(base), opts);
    res.setHeader('cache-control', 'no-store');
    return res.status(200).json({ texto: aWhatsApp(r) });
  } catch (e) {
    return fallo(res, e);
  }
}

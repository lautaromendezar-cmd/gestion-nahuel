// Datos del reporte para Nahuel. La hoja (public/reporte.html) los dibuja y se
// descarga como PDF desde el navegador. ?formato=texto devuelve la versión de WhatsApp.

import { TIPOS, listar } from '../lib/db.mjs';
import { datosReporte, rangoSemana, rangoMes, reporteSemana, reporteMes, aWhatsApp } from '../lib/reporte.mjs';
import { parseISO, lunesDe, hoyAR, sumarDias } from '../lib/fechas.mjs';
import { sinSesion, fallo } from '../lib/http.mjs';

export default async function handler(req, res) {
  if (sinSesion(req, res)) return;
  try {
    const regs = await listar(TIPOS);
    const base = /^\d{4}-\d{2}-\d{2}$/.test(req.query.lunes || '') ? parseISO(req.query.lunes) : lunesDe(hoyAR());
    const mes = req.query.rango === 'mes';
    res.setHeader('cache-control', 'no-store');
    if (req.query.formato === 'texto') {
      const r = mes ? reporteMes(regs, sumarDias(base, 3)) : reporteSemana(regs, lunesDe(base));
      return res.status(200).json({ texto: aWhatsApp(r) });
    }
    const rango = mes ? rangoMes(sumarDias(base, 3)) : rangoSemana(lunesDe(base));
    return res.status(200).json(datosReporte(regs, rango));
  } catch (e) {
    return fallo(res, e);
  }
}

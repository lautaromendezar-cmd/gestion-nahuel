// Consultas a Claude desde la web: preguntar, generar ideas, analizar un competidor.

import { TIPOS, listar, crear } from '../lib/db.mjs';
import { iaDisponible, preguntar, generarIdeas, analizarCompetidor } from '../lib/ia.mjs';
import { cuerpo, sinSesion, fallo } from '../lib/http.mjs';
import { iso, hoyAR, sumarDias } from '../lib/fechas.mjs';
import { fechasEntre } from '../lib/fechas-importantes.mjs';

export const config = { maxDuration: 300 };

export default async function handler(req, res) {
  if (sinSesion(req, res, { solo: 'lautaro' })) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'método no permitido' });
  if (!iaDisponible()) return res.status(503).json({ error: 'Falta la clave de la API de Claude (ANTHROPIC_API_KEY) en Vercel.' });
  const b = cuerpo(req);
  try {
    const regs = await listar(TIPOS);
    for (const f of await fechasEntre(iso(hoyAR()), iso(sumarDias(hoyAR(), 60)), regs)) regs.push({ ...f, tipo: 'fecha' });
    if (b.modo === 'pregunta') {
      const texto = await preguntar(String(b.texto || '').slice(0, 4000), regs);
      return res.status(200).json({ texto });
    }
    if (b.modo === 'ideas') {
      const { ideas, resumen } = await generarIdeas({ marca: b.marca, cantidad: Math.min(Number(b.cantidad) || 8, 15), foco: String(b.foco || '').slice(0, 1000) }, regs);
      const guardadas = [];
      for (const i of ideas) guardadas.push(await crear('idea', { ...i, estado: 'nueva', origen: 'IA' }));
      return res.status(200).json({ ideas: guardadas, resumen });
    }
    if (b.modo === 'competidor') {
      const nombre = String(b.competidor || '').slice(0, 80);
      if (!nombre) return res.status(400).json({ error: 'Falta el competidor' });
      const texto = await analizarCompetidor(nombre, regs);
      const obs = await crear('obs', { competidor: nombre, texto, origen: 'IA', fecha: iso(hoyAR()) });
      return res.status(200).json({ obs });
    }
    return res.status(400).json({ error: 'modo desconocido' });
  } catch (e) {
    return fallo(res, e);
  }
}

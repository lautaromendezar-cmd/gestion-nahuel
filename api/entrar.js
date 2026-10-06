// Login del panel con PIN. Dos usuarios: Lautaro (PANEL_PASSWORD) y Franco
// (FRANCO_PASSWORD, sólo publicaciones y calendario).

import { verificarPassword, crearSesion, cabeceraCookie, hayPanelProtegido } from '../lib/sesion.mjs';
import { cuerpo } from '../lib/http.mjs';

// Espera creciente entre intentos fallidos, en memoria de la instancia: un PIN
// corto no aguanta prueba y error sin freno.
const fallos = new Map();

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    res.setHeader('set-cookie', cabeceraCookie(''));
    return res.status(200).json({ ok: true });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'método no permitido' });
  if (!hayPanelProtegido()) return res.status(503).json({ error: 'El panel no tiene PIN configurado' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'desconocida';
  const previos = fallos.get(ip) || 0;
  if (previos > 0) await new Promise((r) => setTimeout(r, Math.min(previos * 1500, 12000)));

  const { pin = '' } = cuerpo(req);
  const rol = verificarPassword(String(pin), process.env.PANEL_PASSWORD) ? 'lautaro'
    : verificarPassword(String(pin), process.env.FRANCO_PASSWORD) ? 'franco'
    : null;
  if (!rol) {
    fallos.set(ip, previos + 1);
    return res.status(401).json({ error: 'PIN incorrecto' });
  }
  fallos.delete(ip);
  res.setHeader('set-cookie', cabeceraCookie(crearSesion(process.env.PANEL_SECRET, rol)));
  return res.status(200).json({ ok: true, rol });
}

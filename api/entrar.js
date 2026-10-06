// Login del panel con PIN. Dos usuarios: Lautaro (PANEL_PASSWORD) y Franco
// (FRANCO_PASSWORD, sólo publicaciones, calendario, semana e ideas).
//
// Freno a quien pruebe PIN: los intentos quedan en la base (tabla `ingresos`),
// así cuentan aunque Vercel reparta los pedidos entre varias instancias o el
// atacante cambie de IP.
//   - 5 fallidos desde una IP en 15 minutos: esa IP no puede entrar por 15 min.
//   - 20 fallidos en total en 15 minutos: nadie puede entrar por 15 min.
// Las sesiones ya abiertas siguen andando: el bloqueo sólo frena ingresos nuevos.

import { verificarPassword, crearSesion, cabeceraCookie, hayPanelProtegido } from '../lib/sesion.mjs';
import { intentosFallidos, anotarIngreso } from '../lib/db.mjs';
import { cuerpo, fallo } from '../lib/http.mjs';

const VENTANA_MIN = 15;
const TOPE_IP = 5;
const TOPE_GLOBAL = 20;

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    res.setHeader('set-cookie', cabeceraCookie(''));
    return res.status(200).json({ ok: true });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'método no permitido' });
  if (!hayPanelProtegido()) return res.status(503).json({ error: 'El panel no tiene PIN configurado' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'desconocida';
  try {
    const n = await intentosFallidos(ip, VENTANA_MIN);
    if (n.ip >= TOPE_IP || n.global >= TOPE_GLOBAL) {
      return res.status(429).json({ error: `Demasiados intentos fallidos. Esperá ${VENTANA_MIN} minutos y probá de nuevo.` });
    }
    // Espera creciente además del tope: cada error hace más lento el siguiente intento.
    if (n.ip > 0) await new Promise((r) => setTimeout(r, Math.min(n.ip * 1500, 8000)));

    const { pin = '' } = cuerpo(req);
    const rol = verificarPassword(String(pin), process.env.PANEL_PASSWORD) ? 'lautaro'
      : verificarPassword(String(pin), process.env.FRANCO_PASSWORD) ? 'franco'
      : null;
    await anotarIngreso(ip, Boolean(rol));
    if (!rol) {
      const quedan = TOPE_IP - n.ip - 1;
      return res.status(401).json({ error: quedan > 0 ? `PIN incorrecto (${quedan} ${quedan === 1 ? 'intento' : 'intentos'} más antes de esperar ${VENTANA_MIN} minutos)` : `PIN incorrecto. Esperá ${VENTANA_MIN} minutos.` });
    }
    res.setHeader('set-cookie', cabeceraCookie(crearSesion(process.env.PANEL_SECRET, rol)));
    return res.status(200).json({ ok: true, rol });
  } catch (e) {
    return fallo(res, e);
  }
}

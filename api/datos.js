// CRUD de registros. GET trae todo (el volumen es chico y así la web
// funciona entera con una sola lectura).

import { TIPOS, listar, crear, actualizar, borrar, guardarPorClave } from '../lib/db.mjs';
import { FRENTES, CUENTAS, ESTADOS_CONTACTO } from '../lib/reporte.mjs';
import { iaDisponible } from '../lib/ia.mjs';
import { cuerpo, sinSesion, fallo } from '../lib/http.mjs';

const UUID = /^[0-9a-f-]{36}$/i;

export default async function handler(req, res) {
  if (sinSesion(req, res)) return;
  res.setHeader('cache-control', 'no-store');
  try {
    if (req.method === 'GET') {
      const registros = await listar(TIPOS);
      return res.status(200).json({ registros, frentes: FRENTES, cuentas: CUENTAS, estadosContacto: ESTADOS_CONTACTO, ia: iaDisponible() });
    }
    const b = cuerpo(req);
    if (req.method === 'POST') {
      if (!TIPOS.includes(b.tipo) || typeof b.datos !== 'object') return res.status(400).json({ error: 'tipo o datos inválidos' });
      if (b.clave) return res.status(200).json(await guardarPorClave(b.tipo, 'clave', String(b.clave), b.datos));
      return res.status(200).json(await crear(b.tipo, b.datos));
    }
    if (req.method === 'PATCH') {
      if (!UUID.test(b.id || '') || typeof b.cambios !== 'object') return res.status(400).json({ error: 'id o cambios inválidos' });
      const r = await actualizar(b.id, b.cambios);
      return r ? res.status(200).json(r) : res.status(404).json({ error: 'No existe' });
    }
    if (req.method === 'DELETE') {
      if (!UUID.test(b.id || '')) return res.status(400).json({ error: 'id inválido' });
      await borrar(b.id);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'método no permitido' });
  } catch (e) {
    return fallo(res, e);
  }
}

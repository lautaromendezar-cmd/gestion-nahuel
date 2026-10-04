// Ayudas comunes de los endpoints.

import { autorizado } from './sesion.mjs';

export function cuerpo(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

// Devuelve true si cortó la respuesta por falta de sesión.
export function sinSesion(req, res) {
  if (autorizado(req)) return false;
  res.setHeader('cache-control', 'no-store');
  res.status(401).json({ error: 'Hace falta el PIN', login: true });
  return true;
}

export function fallo(res, e, codigo = 500) {
  console.error(e);
  res.status(codigo).json({ error: e?.message || String(e) });
}

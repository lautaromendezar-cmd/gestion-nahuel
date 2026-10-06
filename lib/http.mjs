// Ayudas comunes de los endpoints.

import { autorizado } from './sesion.mjs';

export function cuerpo(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

// Devuelve true si cortó la respuesta por falta de sesión (401) o porque el
// rol no alcanza (403). Si deja pasar, el rol queda en req.rol.
// { solo: 'lautaro' } cierra el endpoint para Franco.
export function sinSesion(req, res, { solo } = {}) {
  const rol = autorizado(req);
  if (rol && (!solo || rol === solo)) {
    req.rol = rol;
    return false;
  }
  res.setHeader('cache-control', 'no-store');
  if (rol) res.status(403).json({ error: 'Esta parte no está habilitada para tu usuario' });
  else res.status(401).json({ error: 'Hace falta el PIN', login: true });
  return true;
}

export function fallo(res, e, codigo = 500) {
  console.error(e);
  res.status(codigo).json({ error: e?.message || String(e) });
}

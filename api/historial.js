// Historial de cambios y papelera. Sólo Lautaro: Franco borra, pero lo que
// borra va a la papelera y lo recupera Lautaro desde acá.
//   GET  → { cambios: [...últimos 200], papelera: [...últimos 30 días] }
//   POST { restaurar: id } → el registro vuelve a su lugar

import { historial, papelera, restaurar } from '../lib/db.mjs';
import { cuerpo, sinSesion, fallo } from '../lib/http.mjs';

const UUID = /^[0-9a-f-]{36}$/i;

export default async function handler(req, res) {
  if (sinSesion(req, res, { solo: 'lautaro' })) return;
  res.setHeader('cache-control', 'no-store');
  try {
    if (req.method === 'GET') {
      const [cambios, borrados] = await Promise.all([historial(200), papelera(30)]);
      return res.status(200).json({ cambios, papelera: borrados });
    }
    if (req.method === 'POST') {
      const { restaurar: id } = cuerpo(req);
      if (!UUID.test(id || '')) return res.status(400).json({ error: 'id inválido' });
      const r = await restaurar(id, req.rol);
      return r.error ? res.status(409).json({ error: r.error }) : res.status(200).json(r.registro);
    }
    return res.status(405).json({ error: 'método no permitido' });
  } catch (e) {
    return fallo(res, e);
  }
}

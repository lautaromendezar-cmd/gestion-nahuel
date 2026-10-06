// CRUD de registros. GET trae todo (el volumen es chico y así la web
// funciona entera con una sola lectura).
//
// Franco sólo ve y toca posteos, eventos y SUS ideas: el filtro va acá, no en
// la web, para que con su sesión no se pueda leer ni escribir el resto.
// El autor de cada registro nuevo lo pone el servidor (`autor` = rol de la
// sesión), así una idea de Franco queda a su nombre y no se puede falsear.

import { TIPOS, listar, obtener, crear, actualizar, borrar, guardarClave } from '../lib/db.mjs';
import { FRENTES, MARCAS, CALENDARIO, REDES, EJES, UGC_MES, CUENTAS_RED, CUENTAS_COMPETENCIA, ESTADOS_CONTACTO } from '../lib/reporte.mjs';
import { iaDisponible } from '../lib/ia.mjs';
import { fechasEntre } from '../lib/fechas-importantes.mjs';
import { hoyAR, sumarDias, iso } from '../lib/fechas.mjs';
import { cuerpo, sinSesion, fallo } from '../lib/http.mjs';

const UUID = /^[0-9a-f-]{36}$/i;
const TIPOS_FRANCO = ['posteo', 'evento', 'idea'];
// Lo que una sesión puede ver y tocar de un registro ya existente.
const alcanza = (rol, r) => rol === 'lautaro' || (TIPOS_FRANCO.includes(r.tipo) && (r.tipo !== 'idea' || r.autor === rol));
const tiposDe = (rol) => (rol === 'franco' ? TIPOS_FRANCO : TIPOS);

export default async function handler(req, res) {
  if (sinSesion(req, res)) return;
  res.setHeader('cache-control', 'no-store');
  const tipos = tiposDe(req.rol);
  const prohibido = () => res.status(403).json({ error: 'Esta parte no está habilitada para tu usuario' });
  try {
    if (req.method === 'GET') {
      const registros = (await listar(tipos)).filter((r) => alcanza(req.rol, r));
      const hoy = hoyAR();
      const fechas = await fechasEntre(iso(sumarDias(hoy, -14)), iso(sumarDias(hoy, 150)), registros);
      const meta = req.rol === 'franco'
        ? { frentes: [], marcas: MARCAS, calendario: CALENDARIO, redes: REDES, ejes: EJES, ugcMes: [], cuentasRed: [], cuentasCompetencia: [], estadosContacto: {}, fechas }
        : { frentes: FRENTES, marcas: MARCAS, calendario: CALENDARIO, redes: REDES, ejes: EJES, ugcMes: UGC_MES, cuentasRed: CUENTAS_RED, cuentasCompetencia: CUENTAS_COMPETENCIA, estadosContacto: ESTADOS_CONTACTO, fechas };
      return res.status(200).json({ registros, meta, ia: req.rol === 'lautaro' && iaDisponible(), rol: req.rol });
    }
    const b = cuerpo(req);
    if (req.method === 'POST') {
      if (!TIPOS.includes(b.tipo) || typeof b.datos !== 'object') return res.status(400).json({ error: 'tipo o datos inválidos' });
      if (!tipos.includes(b.tipo)) return prohibido();
      const { autor: _a, ...resto } = b.datos;
      const datos = { ...resto, editadoPor: req.rol };
      if (b.clave && b.tipo === 'idea' && req.rol !== 'lautaro') return prohibido();
      if (b.clave) {
        const r = await guardarClave(b.tipo, String(b.clave), datos, typeof b.antes === 'object' ? b.antes : {});
        if (r.conflicto) return res.status(409).json({ error: 'Otra persona cambió esto recién', conflicto: true, actual: r.actual });
        return res.status(200).json(r.registro);
      }
      return res.status(200).json(await crear(b.tipo, { ...datos, autor: req.rol }));
    }
    if (req.method === 'PATCH' || req.method === 'DELETE') {
      if (!UUID.test(b.id || '')) return res.status(400).json({ error: 'id inválido' });
      if (req.rol !== 'lautaro') {
        const previo = await obtener(b.id);
        if (!previo) return res.status(404).json({ error: 'Ya no existe: lo borró otra persona' });
        if (!alcanza(req.rol, previo)) return prohibido();
      }
      if (req.method === 'DELETE') {
        if (!(await borrar(b.id))) return res.status(404).json({ error: 'Ya no existe: lo borró otra persona' });
        return res.status(200).json({ ok: true });
      }
      if (typeof b.cambios !== 'object') return res.status(400).json({ error: 'cambios inválidos' });
      const { autor: _b, ...cambios } = b.cambios;
      const r = await actualizar(b.id, { ...cambios, editadoPor: req.rol });
      return r ? res.status(200).json(r) : res.status(404).json({ error: 'Ya no existe: lo borró otra persona' });
    }
    return res.status(405).json({ error: 'método no permitido' });
  } catch (e) {
    return fallo(res, e);
  }
}

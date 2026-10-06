// Base de datos: una sola tabla de registros con el contenido en jsonb.
//
// Todo lo del panel (tareas, posteos, contactos, ideas, notas de la bandeja,
// documentos de saber, observaciones de la competencia) es un registro con un
// `tipo`. Con este volumen —cientos de filas, no millones— una tabla genérica
// es más simple que siete tablas y no cuesta nada en rendimiento.
//
// Nada se borra de verdad: borrar marca `borrado` (papelera, se recupera desde
// Historial) y cada alta, cambio, borrado o restauración queda en `cambios`
// con quién lo hizo. `ingresos` guarda los intentos de PIN para frenar a quien
// pruebe combinaciones.

import { neon } from '@neondatabase/serverless';

// 'paso': tarea compartida entre Lautaro y Franco (texto, fecha, quien, hecho),
// suelta o atada a un evento con eventoId. 'tarea' sigue siendo la lista privada de Lautaro.
export const TIPOS = ['tarea', 'posteo', 'contacto', 'idea', 'nota', 'saber', 'obs', 'ugc', 'campana', 'metrica', 'diario', 'evento', 'paso'];

let _sql = null;
export function sql() {
  if (!_sql) {
    const url = (process.env.DATABASE_URL || '').trim();
    if (!url) throw new Error('Falta DATABASE_URL');
    _sql = neon(url);
  }
  return _sql;
}

let migrado = false;
export async function migrar() {
  if (migrado) return;
  const q = sql();
  await q`create table if not exists registros (
    id uuid primary key default gen_random_uuid(),
    tipo text not null,
    datos jsonb not null default '{}'::jsonb,
    creado timestamptz not null default now(),
    actualizado timestamptz not null default now()
  )`;
  await q`create index if not exists registros_tipo on registros (tipo)`;
  await q`alter table registros add column if not exists borrado timestamptz`;
  await q`alter table registros add column if not exists borrado_por text`;
  await q`create table if not exists cambios (
    id bigserial primary key,
    registro uuid not null,
    tipo text not null,
    accion text not null,
    quien text not null default 'sistema',
    antes jsonb,
    despues jsonb,
    momento timestamptz not null default now()
  )`;
  await q`create index if not exists cambios_momento on cambios (momento desc)`;
  await q`create table if not exists ingresos (
    id bigserial primary key,
    ip text,
    ok boolean not null,
    momento timestamptz not null default now()
  )`;
  await q`create index if not exists ingresos_momento on ingresos (momento)`;
  // Un solo registro vivo por clave (el posteo de un día, la métrica de una
  // cuenta en una fecha): si dos personas crean el mismo a la vez, la base
  // frena al segundo. Los de la papelera no cuentan.
  try {
    await q`create unique index if not exists registros_clave_vivo on registros (tipo, (datos->>'clave')) where datos->>'clave' is not null and borrado is null`;
    await q`drop index if exists registros_clave`;
  } catch (e) {
    console.error('No se pudo crear registros_clave_vivo (¿claves duplicadas?)', e);
  }
  migrado = true;
}

const fila = (r) => ({ id: r.id, tipo: r.tipo, ...r.datos, creado: r.creado, actualizado: r.actualizado });
const solo = (obj, claves) => Object.fromEntries(claves.map((k) => [k, obj?.[k] ?? null]));

// El historial nunca tiene que hacer fallar un guardado: si no se puede anotar, se avisa en el log.
async function anotar(registro, tipo, accion, quien, antes, despues) {
  try {
    await sql()`insert into cambios (registro, tipo, accion, quien, antes, despues)
      values (${registro}, ${tipo}, ${accion}, ${quien}, ${antes == null ? null : JSON.stringify(antes)}::jsonb, ${despues == null ? null : JSON.stringify(despues)}::jsonb)`;
  } catch (e) {
    console.error('No se pudo anotar en el historial', e);
  }
}

export async function listar(tipos) {
  await migrar();
  const rows = await sql()`select * from registros where tipo = any(${tipos}) and borrado is null order by creado`;
  return rows.map(fila);
}

export async function obtener(id) {
  await migrar();
  const [r] = await sql()`select * from registros where id = ${id} and borrado is null`;
  return r ? fila(r) : null;
}

export async function crear(tipo, datos, quien = 'sistema') {
  await migrar();
  const [r] = await sql()`insert into registros (tipo, datos) values (${tipo}, ${JSON.stringify(datos)}::jsonb) returning *`;
  await anotar(r.id, tipo, 'crear', quien, null, datos);
  return fila(r);
}

// Mezcla superficial: los campos que llegan pisan a los que había.
export async function actualizar(id, cambios, quien = 'sistema') {
  await migrar();
  const [r] = await sql()`with previo as (select datos from registros where id = ${id} and borrado is null)
    update registros set datos = datos || ${JSON.stringify(cambios)}::jsonb, actualizado = now()
    where id = ${id} and borrado is null returning *, (select datos from previo) as previo`;
  if (!r) return null;
  await anotar(r.id, r.tipo, 'editar', quien, solo(r.previo, Object.keys(cambios)), cambios);
  return fila(r);
}

// A la papelera. Devuelve false si ya no estaba (lo borró otra persona antes).
export async function borrar(id, quien = 'sistema') {
  await migrar();
  const [r] = await sql()`update registros set borrado = now(), borrado_por = ${quien}
    where id = ${id} and borrado is null returning *`;
  if (!r) return false;
  await anotar(r.id, r.tipo, 'borrar', quien, r.datos, null);
  return true;
}

// Saca de la papelera. Si mientras tanto se creó otro con la misma clave
// (otro posteo para ese día), la base no deja tener dos: se avisa.
export async function restaurar(id, quien = 'sistema') {
  await migrar();
  try {
    const [r] = await sql()`update registros set borrado = null, borrado_por = null
      where id = ${id} and borrado is not null returning *`;
    if (!r) return { error: 'Ya no está en la papelera' };
    await anotar(r.id, r.tipo, 'restaurar', quien, null, r.datos);
    return { registro: fila(r) };
  } catch (e) {
    if (e?.code === '23505') return { error: 'Ya hay otro registro igual (por ejemplo, el posteo de ese día): no se puede restaurar encima.' };
    throw e;
  }
}

// Guardado por clave con control de concurrencia, para cuando Lautaro y Franco
// tocan el mismo día a la vez.
//
// `antes` son los valores que la persona veía en los campos que cambió
// ({ tema: 'viejo' }; null si estaba vacío). Si en la base ya no son esos,
// alguien los cambió en el medio: no se pisa nada y vuelve { conflicto, actual }.
// Los campos que no están en `antes` se mezclan sin chequear. La comparación y
// la escritura van en el mismo UPDATE, así no hay hueco entre leer y escribir.
export async function guardarClave(tipo, clave, cambios, antes = {}, quien = 'sistema') {
  await migrar();
  const q = sql();
  const datos = JSON.stringify({ ...cambios, clave });
  const [creado] = await q`insert into registros (tipo, datos) values (${tipo}, ${datos}::jsonb)
    on conflict do nothing returning *`;
  // Recién creado: sólo vale si la persona lo veía vacío.
  if (creado) {
    await anotar(creado.id, tipo, 'crear', quien, null, creado.datos);
    return { registro: fila(creado) };
  }

  const ant = JSON.stringify(antes || {});
  const [r] = await q`with previo as (select datos from registros where tipo = ${tipo} and datos->>'clave' = ${clave} and borrado is null)
    update registros set datos = datos || ${datos}::jsonb, actualizado = now()
    where tipo = ${tipo} and datos->>'clave' = ${clave} and borrado is null
      and coalesce((select jsonb_object_agg(k, coalesce(datos->k, 'null'::jsonb)) from jsonb_object_keys(${ant}::jsonb) k), '{}'::jsonb) = ${ant}::jsonb
    returning *, (select datos from previo) as previo`;
  if (r) {
    await anotar(r.id, tipo, 'editar', quien, solo(r.previo, Object.keys(cambios)), cambios);
    return { registro: fila(r) };
  }
  const [actual] = await q`select * from registros where tipo = ${tipo} and datos->>'clave' = ${clave} and borrado is null`;
  return { conflicto: true, actual: actual ? fila(actual) : null };
}

// Para guardar con un id lógico propio (por ejemplo, el posteo 2 de LaTiNa
// de la semana del 5-oct): busca por un campo de `datos` y crea o actualiza.
export async function guardarPorClave(tipo, campo, valor, datos, quien = 'sistema') {
  await migrar();
  const [previo] = await sql()`select id from registros where tipo = ${tipo} and datos->>${campo} = ${valor} and borrado is null limit 1`;
  if (previo) return actualizar(previo.id, datos, quien);
  return crear(tipo, { ...datos, [campo]: valor }, quien);
}

// ---------- Historial y papelera (sólo Lautaro) ----------

export async function historial(limite = 200) {
  await migrar();
  const rows = await sql()`select c.*, r.datos as actual, r.borrado is not null as en_papelera
    from cambios c left join registros r on r.id = c.registro
    order by c.momento desc limit ${limite}`;
  return rows.map((c) => ({ id: c.id, registro: c.registro, tipo: c.tipo, accion: c.accion, quien: c.quien, antes: c.antes, despues: c.despues, momento: c.momento, actual: c.actual, enPapelera: c.en_papelera }));
}

export async function papelera(dias = 30) {
  await migrar();
  const rows = await sql()`select * from registros where borrado is not null and borrado > now() - make_interval(days => ${dias})
    order by borrado desc`;
  return rows.map((r) => ({ ...fila(r), borrado: r.borrado, borradoPor: r.borrado_por }));
}

// ---------- Intentos de ingreso ----------

export async function intentosFallidos(ip, minutos) {
  await migrar();
  const [r] = await sql()`select count(*) filter (where not ok)::int as global,
      count(*) filter (where not ok and ip = ${ip})::int as ip
    from ingresos where momento > now() - make_interval(mins => ${minutos})`;
  return r;
}

export async function anotarIngreso(ip, ok) {
  await migrar();
  await sql()`insert into ingresos (ip, ok) values (${ip}, ${ok})`;
  // Limpieza de paso: los intentos viejos no sirven para nada.
  if (Math.random() < 0.05) await sql()`delete from ingresos where momento < now() - interval '7 days'`;
}

// Base de datos: una sola tabla de registros con el contenido en jsonb.
//
// Todo lo del panel (tareas, posteos, contactos, ideas, notas de la bandeja,
// documentos de saber, observaciones de la competencia) es un registro con un
// `tipo`. Con este volumen —cientos de filas, no millones— una tabla genérica
// es más simple que siete tablas y no cuesta nada en rendimiento.

import { neon } from '@neondatabase/serverless';

export const TIPOS = ['tarea', 'posteo', 'contacto', 'idea', 'nota', 'saber', 'obs'];

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
  migrado = true;
}

const fila = (r) => ({ id: r.id, tipo: r.tipo, ...r.datos, creado: r.creado, actualizado: r.actualizado });

export async function listar(tipos) {
  await migrar();
  const rows = await sql()`select * from registros where tipo = any(${tipos}) order by creado`;
  return rows.map(fila);
}

export async function crear(tipo, datos) {
  await migrar();
  const [r] = await sql()`insert into registros (tipo, datos) values (${tipo}, ${JSON.stringify(datos)}::jsonb) returning *`;
  return fila(r);
}

// Mezcla superficial: los campos que llegan pisan a los que había.
export async function actualizar(id, cambios) {
  await migrar();
  const [r] = await sql()`update registros set datos = datos || ${JSON.stringify(cambios)}::jsonb, actualizado = now()
    where id = ${id} returning *`;
  return r ? fila(r) : null;
}

export async function borrar(id) {
  await migrar();
  await sql()`delete from registros where id = ${id}`;
}

// Para guardar con un id lógico propio (por ejemplo, el posteo 2 de LaTiNa
// de la semana del 5-oct): busca por un campo de `datos` y crea o actualiza.
export async function guardarPorClave(tipo, campo, valor, datos) {
  await migrar();
  const [previo] = await sql()`select id from registros where tipo = ${tipo} and datos->>${campo} = ${valor} limit 1`;
  if (previo) return actualizar(previo.id, datos);
  return crear(tipo, { ...datos, [campo]: valor });
}

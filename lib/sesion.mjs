// Contraseña del panel.
//
// No se usa la protección de Vercel a nivel de deployment porque eso se mete en
// el camino de las invocaciones del cron. Acá se protege lo único que importa:
// los DATOS. El HTML del panel puede ser público, no dice nada por sí solo;
// lo que no puede quedar abierto es /api/estado.

import { scryptSync, timingSafeEqual, createHmac, randomBytes } from 'node:crypto';

const COOKIE = '__Host-gn';
const DURACION_DIAS = 30;

// scrypt con sal por contraseña. El hash guardado es "sal:derivada" en hex.
export function hashear(password) {
  const sal = randomBytes(16);
  const derivada = scryptSync(password, sal, 64);
  return `${sal.toString('hex')}:${derivada.toString('hex')}`;
}

export function verificarPassword(password, guardado) {
  if (!guardado || !guardado.includes(':')) return false;
  const [salHex, esperadoHex] = guardado.split(':');
  try {
    const derivada = scryptSync(password, Buffer.from(salHex, 'hex'), 64);
    const esperado = Buffer.from(esperadoHex, 'hex');
    // Comparación de tiempo constante: un === filtra información por lo que tarda.
    return derivada.length === esperado.length && timingSafeEqual(derivada, esperado);
  } catch {
    return false;
  }
}

// ---------- Cookie firmada ----------

const firmar = (datos, secreto) => createHmac('sha256', secreto).update(datos).digest('base64url');

// Dos usuarios: 'lautaro' (todo) y 'franco' (sólo publicaciones y calendario).
// El rol va dentro del cuerpo firmado, así no se puede cambiar desde el navegador.
export const ROLES = ['lautaro', 'franco'];

export function crearSesion(secreto, rol = 'lautaro') {
  const vence = Date.now() + DURACION_DIAS * 86400000;
  const cuerpo = `${vence}-${rol}`;
  return `${cuerpo}.${firmar(cuerpo, secreto)}`;
}

// Devuelve el rol si la sesión es válida, o false. Las cookies de antes del
// 6-oct-2026 no traen rol: eran todas de Lautaro.
export function sesionValida(valor, secreto) {
  if (!valor || !secreto) return false;
  const i = valor.lastIndexOf('.');
  if (i < 1) return false;
  const cuerpo = valor.slice(0, i);
  const firma = valor.slice(i + 1);

  const esperada = Buffer.from(firmar(cuerpo, secreto));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return false;

  const [venceTxt, rol = 'lautaro'] = cuerpo.split('-');
  const vence = Number(venceTxt);
  if (!Number.isFinite(vence) || vence <= Date.now() || !ROLES.includes(rol)) return false;
  return rol;
}

export function cabeceraCookie(valor) {
  // __Host- exige Secure, Path=/ y nada de Domain. HttpOnly para que el JS de
  // la página no pueda leerla, y SameSite=Strict porque no hay flujo externo.
  const base = `${COOKIE}=${valor}; Path=/; HttpOnly; Secure; SameSite=Strict`;
  return valor
    ? `${base}; Max-Age=${DURACION_DIAS * 86400}`
    : `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function leerCookie(req) {
  const crudo = req.headers?.cookie || '';
  for (const parte of crudo.split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === COOKIE) return v.join('=');
  }
  return null;
}

// Devuelve true si la petición trae una sesión válida. Si no hay contraseña
// configurada, el panel queda abierto: se avisa en el propio panel, no se
// finge una seguridad que no existe.
export function hayPanelProtegido(env = process.env) {
  return Boolean(env.PANEL_PASSWORD && env.PANEL_SECRET);
}

// Devuelve el rol de la sesión ('lautaro' | 'franco') o false.
export function autorizado(req, env = process.env) {
  if (!hayPanelProtegido(env)) return false; // sin clave configurada, cerrado
  return sesionValida(leerCookie(req), env.PANEL_SECRET);
}

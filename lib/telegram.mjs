// Envío por Telegram. El bot es sólo de Lautaro: TELEGRAM_CHAT es su chat y
// el webhook ignora a cualquier otro.

export async function enviar(texto, { chat = process.env.TELEGRAM_CHAT, html = true } = {}) {
  const token = (process.env.TELEGRAM_TOKEN || '').trim();
  if (!token || !chat) return { enviado: false, motivo: 'falta TELEGRAM_TOKEN o TELEGRAM_CHAT' };

  // Telegram corta en 4096 caracteres: se parte por renglones.
  const partes = [];
  let actual = '';
  for (const linea of String(texto).split('\n')) {
    if ((actual + '\n' + linea).length > 3800) { partes.push(actual); actual = linea; }
    else actual = actual ? actual + '\n' + linea : linea;
  }
  if (actual) partes.push(actual);

  for (const p of partes) {
    let r = await mandar(token, chat, p, html);
    // Si el HTML vino roto (una respuesta de la IA con un < suelto), esa parte va en texto plano.
    if (!r.ok && html) r = await mandar(token, chat, p.replace(/<[^>]+>/g, ''), false);
    if (!r.ok) return { enviado: false, motivo: r.motivo };
  }
  return { enviado: true };
}

async function mandar(token, chat, text, html) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text, ...(html ? { parse_mode: 'HTML' } : {}), disable_web_page_preview: true }),
  });
  if (res.ok) return { ok: true };
  const d = await res.json().catch(() => ({}));
  return { ok: false, motivo: d.description || `HTTP ${res.status}` };
}

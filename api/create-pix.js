import { calcTotal, getToken, json, onlyDigits, validCpf, validEmail, webhookUrl, API_BASE } from './lib.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method_not_allowed' });
  const chunks = [];
  for await (const c of req) chunks.push(c);
  let body = {};
  try { body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { body = {}; }
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const cpf = onlyDigits(body.cpf);
  const phone = onlyDigits(body.phone);
  const addons = Array.isArray(body.addons) ? body.addons : [];
  if (name.length < 3) return json(res, 422, { ok: false, message: 'Informe seu nome completo.' });
  if (!validEmail(email)) return json(res, 422, { ok: false, message: 'E-mail invalido.' });
  if (!validCpf(cpf)) return json(res, 422, { ok: false, message: 'CPF invalido.' });
  if (phone.length < 10 || phone.length > 11) return json(res, 422, { ok: false, message: 'Telefone invalido.' });
  const order = calcTotal(addons);
  const hook = webhookUrl(req);
  if (!hook) return json(res, 422, { ok: false, message: 'webhook_url ausente.' });
  try {
    const token = await getToken();
    const r = await fetch(`${API_BASE}/api/partner/v1/cash-in`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount: order.total, description: 'Prime Gold Black', webhook_url: hook, client: { name, cpf, email, phone } }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.pix_code) {
      return json(res, 502, { ok: false, error: 'cashin_failed', message: data.message || 'A SyncPay recusou o PIX.', http: r.status, detail: data });
    }
    return json(res, 200, { ok: true, pix_code: data.pix_code, identifier: data.identifier || null, amount: order.total, items: order.items });
  } catch (e) {
    return json(res, 502, { ok: false, error: 'auth_failed', message: e.message || 'Falha SyncPay' });
  }
}

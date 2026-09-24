export const API_BASE = 'https://api.syncpayments.com.br';

export const CATALOG = {
  base: { id: 'prime-gold-black', name: 'Prime Gold Black', price: 23.99 },
  addons: {
    xotaku4k: { name: 'Xotaku Prime 4K', price: 11.99 },
    sexy: { name: 'Revistas Sexy (+300)', price: 9.99 },
    antigos: { name: 'Titulos antigos + gibis', price: 5.99 },
    famosas: { name: 'Canal das Famosinhas', price: 13.99 },
    combo: { name: 'Super Combo Leve Tudo', price: 29.99 },
  },
};

export function json(res, code, payload) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

export function onlyDigits(s) {
  return String(s || '').replace(/\D+/g, '');
}

export function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
}

export function validCpf(cpf) {
  cpf = onlyDigits(cpf);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  for (let t = 9; t < 11; t++) {
    let sum = 0;
    for (let i = 0; i < t; i++) sum += Number(cpf[i]) * (t + 1 - i);
    const dig = ((10 * sum) % 11) % 10;
    if (Number(cpf[t]) !== dig) return false;
  }
  return true;
}

export function calcTotal(selectedAddons) {
  const items = [CATALOG.base];
  let total = CATALOG.base.price;
  const selected = [...new Set((selectedAddons || []).map(String))];
  if (selected.includes('combo')) {
    items.push(CATALOG.addons.combo);
    total += CATALOG.addons.combo.price;
  } else {
    for (const id of ['xotaku4k', 'sexy', 'antigos', 'famosas']) {
      if (selected.includes(id)) {
        items.push(CATALOG.addons[id]);
        total += CATALOG.addons[id].price;
      }
    }
  }
  return { items, total: Math.round(total * 100) / 100 };
}

export async function getToken() {
  const client_id = process.env.SYNCPAY_CLIENT_ID || '';
  const client_secret = process.env.SYNCPAY_CLIENT_SECRET || '';
  if (!client_id || !client_secret || client_id.includes('COLE_AQUI')) {
    throw new Error('Credenciais SyncPay ausentes.');
  }
  const res = await fetch(`${API_BASE}/api/partner/v1/auth-token`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id, client_secret }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(data.message || 'Falha ao autenticar na SyncPay');
  }
  return data.access_token;
}

export function webhookUrl(req) {
  if (process.env.SYNCPAY_WEBHOOK_URL) return process.env.SYNCPAY_WEBHOOK_URL;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (!host) return '';
  return `${proto}://${host}/api/webhook`;
}

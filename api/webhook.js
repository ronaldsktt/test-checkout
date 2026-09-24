import { json } from './lib.mjs';

export default async function handler(req, res) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  let payload = {};
  try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { payload = {}; }
  const status = String(payload.status || payload.status_transaction || (payload.data && payload.data.status) || '').toLowerCase();
  console.log('syncpay-webhook', status, payload.id || payload.identifier);
  return json(res, 200, { ok: true });
}

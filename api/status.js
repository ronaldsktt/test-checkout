import { getToken, json, API_BASE } from './lib.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'method_not_allowed' });
  const id = String(new URL(req.url, 'http://x').searchParams.get('id') || '').trim();
  if (!id) return json(res, 422, { ok: false, error: 'missing_id' });
  try {
    const token = await getToken();
    const r = await fetch(`${API_BASE}/api/partner/v1/transaction/${encodeURIComponent(id)}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    const raw = await r.json().catch(() => ({}));
    if (!r.ok) return json(res, 502, { ok: false, error: 'status_failed', http: r.status, detail: raw });
    const data = raw.data || raw;
    return json(res, 200, { ok: true, status: String(data.status || 'pending').toLowerCase(), data });
  } catch (e) {
    return json(res, 502, { ok: false, error: 'status_failed', message: e.message });
  }
}

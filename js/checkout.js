const BASE = 23.99;
const ADDONS = {
  xotaku4k: { name: 'Xotaku Prime 4K', price: 11.99 },
  sexy: { name: 'Revistas Sexy', price: 9.99 },
  antigos: { name: 'Títulos antigos', price: 5.99 },
  famosas: { name: 'Canal das Famosinhas', price: 13.99 },
  combo: { name: 'Super Combo Leve Tudo', price: 29.99 },
};
const VIDEO_SOUND =
  'https://iframe.mediadelivery.net/embed/634099/edd21468-4e22-4309-b89f-8f3deeed6878?autoplay=true&muted=false&preload=true&responsive=true&controls=true&bgcolor=101010';

const selected = new Set();
let currentId = null;
let pollTimer = null;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

function money(n) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function total() {
  let t = BASE;
  if (selected.has('combo')) return +(t + ADDONS.combo.price).toFixed(2);
  for (const id of selected) t += (ADDONS[id] && ADDONS[id].price) || 0;
  return +t.toFixed(2);
}

function renderTotals() {
  const t = money(total());
  $$('[data-total]').forEach((el) => (el.textContent = t));
  const btn = $('#payBtn');
  if (btn && !btn.disabled) btn.textContent = 'PAGAR COM PIX \u00b7 ' + t;
  const box = $('#breakdown');
  if (box) {
    const rows = [`<div><span>Prime Gold Black</span><span>${money(BASE)}</span></div>`];
    if (selected.has('combo')) {
      rows.push(`<div><span>${ADDONS.combo.name}</span><span>+ ${money(ADDONS.combo.price)}</span></div>`);
    } else {
      for (const id of selected) {
        const item = ADDONS[id];
        if (item) rows.push(`<div><span>${item.name}</span><span>+ ${money(item.price)}</span></div>`);
      }
    }
    rows.push(`<div class="sum"><span>Total</span><span>${t}</span></div>`);
    box.innerHTML = rows.join('');
  }
}

function paintOffers() {
  $$('.offer').forEach((b) => {
    const on = selected.has(b.dataset.id);
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

function toggleAddon(id) {
  if (!id || !ADDONS[id]) return;
  if (id === 'combo') {
    if (selected.has('combo')) selected.clear();
    else {
      selected.clear();
      selected.add('combo');
    }
  } else {
    selected.delete('combo');
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
  }
  paintOffers();
  renderTotals();
}

function enableSound() {
  const iframe = $('#promoVideo');
  const btn = $('#soundBtn');
  if (!iframe) return;
  iframe.src = VIDEO_SOUND;
  if (btn) btn.classList.add('off');
}

function digits(s) {
  return String(s || '').replace(/\D+/g, '');
}

function maskCpf(v) {
  v = digits(v).slice(0, 11);
  return v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function maskPhone(v) {
  v = digits(v).slice(0, 11);
  if (v.length <= 10) return v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
  return v.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
}

function showErr(msg) {
  const el = $('#err');
  el.style.display = 'block';
  el.textContent = msg;
}

function hideErr() {
  const el = $('#err');
  el.style.display = 'none';
}

async function pay() {
  hideErr();
  const name = $('#name').value.trim();
  const email = $('#email').value.trim();
  const cpf = digits($('#cpf').value);
  const phone = digits($('#phone').value);
  if (name.length < 3) return showErr('Informe seu nome completo.');
  if (!email.includes('@')) return showErr('E-mail inválido.');
  if (cpf.length !== 11) return showErr('CPF precisa ter 11 dígitos.');
  if (phone.length < 10) return showErr('Telefone com DDD.');
  const btn = $('#payBtn');
  btn.disabled = true;
  btn.textContent = 'Gerando PIX…';
  try {
    const res = await fetch('api/create-pix.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, cpf, phone, addons: [...selected] }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.message || data.error || 'Falha ao gerar PIX');
    openPix(data);
  } catch (e) {
    showErr(e.message || 'Não rolou gerar o PIX.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'PAGAR COM PIX \u00b7 ' + money(total());
  }
}

function openPix(data) {
  currentId = data.identifier;
  $('#modal').classList.add('show');
  $('#pixAmount').textContent = money(data.amount || total());
  $('#pixCode').textContent = data.pix_code;
  $('#demoNote').style.display = data.demo ? 'block' : 'none';
  const box = $('#qrcode');
  box.innerHTML = '';
  if (window.QRCode) {
    QRCode.toCanvas(data.pix_code, { width: 196, margin: 1 }, (err, canvas) => {
      if (!err) box.appendChild(canvas);
    });
  }
  $('#statusLine').textContent = 'Aguardando pagamento…';
  $('#statusLine').classList.remove('paid');
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(checkStatus, 4000);
}

async function checkStatus() {
  if (!currentId) return;
  try {
    const res = await fetch('api/status.php?id=' + encodeURIComponent(currentId));
    const data = await res.json();
    if (data.status === 'completed') {
      clearInterval(pollTimer);
      $('#statusLine').textContent = 'Pagamento confirmado.';
      $('#statusLine').classList.add('paid');
      setTimeout(() => { location.href = 'success.html'; }, 1200);
    }
  } catch (_) {}
}

async function copyPix() {
  const code = $('#pixCode').textContent.trim();
  try {
    await navigator.clipboard.writeText(code);
    $('#copyBtn').textContent = 'Copiado';
    setTimeout(() => ($('#copyBtn').textContent = 'Copiar código Pix'), 1600);
  } catch {
    prompt('Copia o Pix:', code);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const bumps = $('#bumps');
  if (bumps) {
    bumps.addEventListener('click', (e) => {
      const btn = e.target.closest('.offer');
      if (!btn || !bumps.contains(btn)) return;
      e.preventDefault();
      toggleAddon(btn.dataset.id);
    });
  }
  const soundBtn = $('#soundBtn');
  if (soundBtn) soundBtn.addEventListener('click', enableSound);
  $('#cpf').addEventListener('input', (e) => (e.target.value = maskCpf(e.target.value)));
  $('#phone').addEventListener('input', (e) => (e.target.value = maskPhone(e.target.value)));
  $('#payBtn').addEventListener('click', pay);
  $('#copyBtn').addEventListener('click', copyPix);
  $('#closeModal').addEventListener('click', () => {
    $('#modal').classList.remove('show');
    if (pollTimer) clearInterval(pollTimer);
  });
  paintOffers();
  renderTotals();
  const end = Date.now() + 9 * 60 * 60 * 1000 + 51 * 60 * 1000;
  const tick = () => {
    const s = Math.max(0, Math.floor((end - Date.now()) / 1000));
    const h = String(Math.floor(s / 3600)).padStart(2, '0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    const el = $('#timer');
    if (el) el.textContent = `${h}:${m}:${sec}`;
  };
  tick();
  setInterval(tick, 1000);
});

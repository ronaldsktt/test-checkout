<?php
require __DIR__ . '/_lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_out(405, ['ok' => false, 'error' => 'method_not_allowed']);
}

$in = body_json();
$name  = trim((string)($in['name']  ?? ''));
$email = trim((string)($in['email'] ?? ''));
$cpf   = only_digits((string)($in['cpf'] ?? ''));
$phone = only_digits((string)($in['phone'] ?? ''));
$addons = $in['addons'] ?? [];
if (!is_array($addons)) $addons = [];

if (mb_strlen($name) < 3) {
    json_out(422, ['ok' => false, 'error' => 'invalid_name', 'message' => 'Informe seu nome completo.']);
}
if (!valid_email($email)) {
    json_out(422, ['ok' => false, 'error' => 'invalid_email', 'message' => 'E-mail invalido.']);
}
if (!valid_cpf($cpf)) {
    json_out(422, ['ok' => false, 'error' => 'invalid_cpf', 'message' => 'CPF invalido.']);
}
if (strlen($phone) < 10 || strlen($phone) > 11) {
    json_out(422, ['ok' => false, 'error' => 'invalid_phone', 'message' => 'Telefone invalido. Use DDD + numero.']);
}

$order = calc_total($addons);
$amount = $order['total'];
$desc = 'Prime Gold Black';
if (count($order['items']) > 1) {
    $extra = array_map(fn($i) => $i['name'], array_slice($order['items'], 1));
    $desc .= ' + ' . implode(', ', $extra);
}

if (is_demo($config)) {
    $id = 'demo-' . bin2hex(random_bytes(8));
    $pix = '00020126580014br.gov.bcb.pix0136' . substr(md5($id), 0, 36)
         . '520400005303986540' . sprintf('%02d', strlen(number_format($amount, 2, '.', '')))
         . number_format($amount, 2, '.', '')
         . '5802BR5913BIBLIOTECA VIP6009SAO PAULO62070503***6304ABCD';
    json_out(200, [
        'ok' => true, 'demo' => true, 'pix_code' => $pix, 'identifier' => $id,
        'amount' => $amount, 'items' => $order['items'],
        'message' => 'Modo demo: cole as credenciais em api/config.php.',
    ]);
}

$token = get_access_token($config);
$payload = [
    'amount' => $amount,
    'description' => $desc,
    'client' => ['name' => $name, 'cpf' => $cpf, 'email' => $email, 'phone' => $phone],
];
$hook = webhook_url($config);
if ($hook === '') {
    json_out(422, ['ok' => false, 'error' => 'missing_webhook', 'message' => 'A SyncPay exige webhook_url.']);
}
$payload['webhook_url'] = $hook;
if (!empty($config['split']) && is_array($config['split'])) {
    $payload['split'] = $config['split'];
}
$url = rtrim($config['api_base'], '/') . $config['cashin_path'];
$res = http_json('POST', $url, [
    'Accept' => 'application/json',
    'Content-Type' => 'application/json',
    'Authorization' => 'Bearer ' . $token,
], $payload);
if (!$res['ok'] || empty($res['data']['pix_code'])) {
    $msg = $res['data']['message'] ?? $res['data']['error'] ?? $res['error'] ?? 'A SyncPay recusou a criacao do PIX.';
    json_out(502, ['ok' => false, 'error' => 'cashin_failed', 'message' => is_string($msg) ? $msg : 'Falha ao gerar PIX', 'http' => $res['http'], 'detail' => $res['data']]);
}
json_out(200, [
    'ok' => true, 'demo' => false, 'pix_code' => $res['data']['pix_code'],
    'identifier' => $res['data']['identifier'] ?? null, 'amount' => $amount,
    'items' => $order['items'], 'message' => $res['data']['message'] ?? 'PIX gerado',
]);

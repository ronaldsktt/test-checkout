<?php
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

$config = require __DIR__ . '/config.php';

function json_out(int $code, array $payload): void
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function body_json(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '[]', true);
    return is_array($data) ? $data : [];
}

function only_digits(string $s): string
{
    return preg_replace('/\D+/', '', $s) ?? '';
}

function valid_cpf(string $cpf): bool
{
    $cpf = only_digits($cpf);
    if (strlen($cpf) !== 11 || preg_match('/^(\d)\1{10}$/', $cpf)) {
        return false;
    }
    for ($t = 9; $t < 11; $t++) {
        $sum = 0;
        for ($i = 0; $i < $t; $i++) {
            $sum += (int)$cpf[$i] * (($t + 1) - $i);
        }
        $dig = ((10 * $sum) % 11) % 10;
        if ((int)$cpf[$t] !== $dig) {
            return false;
        }
    }
    return true;
}

function valid_email(string $email): bool
{
    return (bool)filter_var($email, FILTER_VALIDATE_EMAIL);
}

function is_demo(array $config): bool
{
    if ($config['demo_mode'] === true) return true;
    if ($config['demo_mode'] === false) return false;
    $id = (string)$config['client_id'];
    $sec = (string)$config['client_secret'];
    return str_contains($id, 'COLE_AQUI') || str_contains($sec, 'COLE_AQUI') || $id === '' || $sec === '';
}

function http_json(string $method, string $url, array $headers = [], ?array $body = null): array
{
    $ch = curl_init($url);
    $hdrs = [];
    foreach ($headers as $k => $v) {
        $hdrs[] = $k . ': ' . $v;
    }
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => strtoupper($method),
        CURLOPT_HTTPHEADER     => $hdrs,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_CONNECTTIMEOUT => 15,
    ];
    if ($body !== null) {
        $opts[CURLOPT_POSTFIELDS] = json_encode($body, JSON_UNESCAPED_UNICODE);
    }
    curl_setopt_array($ch, $opts);
    $raw  = curl_exec($ch);
    $err  = curl_error($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($raw === false) {
        return ['ok' => false, 'http' => 0, 'error' => $err ?: 'curl_failed', 'data' => null];
    }
    $decoded = json_decode($raw, true);
    return [
        'ok'    => $code >= 200 && $code < 300,
        'http'  => $code,
        'error' => null,
        'data'  => is_array($decoded) ? $decoded : ['_raw' => $raw],
    ];
}

function token_cache_file(): string
{
    return sys_get_temp_dir() . '/syncpay_token_cache.json';
}

function webhook_url(array $config): string
{
    if (!empty($config['webhook_url'])) {
        return (string)$config['webhook_url'];
    }
    $host = (string)($_SERVER['HTTP_HOST'] ?? '');
    if ($host === '') {
        return '';
    }
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (string)($_SERVER['SERVER_PORT'] ?? '') === '443'
        || strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
    $scheme = $https ? 'https' : 'http';
    $script = (string)($_SERVER['SCRIPT_NAME'] ?? '/api/create-pix.php');
    $dir = rtrim(str_replace('\\', '/', dirname($script)), '/');
    return $scheme . '://' . $host . $dir . '/webhook.php';
}

function get_access_token(array $config): string
{
    $cacheFile = token_cache_file();
    if (is_file($cacheFile)) {
        $cached = json_decode((string)file_get_contents($cacheFile), true);
        if (is_array($cached) && !empty($cached['access_token']) && !empty($cached['expires_at'])) {
            $exp = strtotime((string)$cached['expires_at']);
            if ($exp && $exp > time() + 60) {
                return (string)$cached['access_token'];
            }
        }
    }
    $res = http_json('POST', rtrim($config['api_base'], '/') . $config['auth_path'], [
        'Accept'       => 'application/json',
        'Content-Type' => 'application/json',
    ], [
        'client_id'     => $config['client_id'],
        'client_secret' => $config['client_secret'],
    ]);
    if (!$res['ok'] || empty($res['data']['access_token'])) {
        $msg = $res['data']['message'] ?? $res['data']['error'] ?? $res['error'] ?? 'Falha ao autenticar na SyncPay';
        json_out(502, [
            'ok'      => false,
            'error'   => 'auth_failed',
            'message' => is_string($msg) ? $msg : 'Falha ao autenticar na SyncPay',
            'http'    => $res['http'],
            'hint'    => 'Confira client_id/client_secret e se o IP deste servidor esta liberado no painel.',
        ]);
    }
    @file_put_contents($cacheFile, json_encode($res['data']));
    return (string)$res['data']['access_token'];
}

function catalog(): array
{
    return [
        'base' => ['id' => 'prime-gold-black', 'name' => 'Prime Gold Black', 'price' => 23.99],
        'addons' => [
            'xotaku4k' => ['name' => 'Xotaku Prime 4K', 'price' => 11.99],
            'sexy'     => ['name' => 'Revistas Sexy (+300)', 'price' => 9.99],
            'antigos'  => ['name' => 'Titulos antigos + gibis', 'price' => 5.99],
            'famosas'  => ['name' => 'Canal das Famosinhas', 'price' => 13.99],
            'combo'    => ['name' => 'Super Combo Leve Tudo', 'price' => 29.99],
        ],
    ];
}

function calc_total(array $selectedAddons): array
{
    $cat = catalog();
    $items = [$cat['base']];
    $total = (float)$cat['base']['price'];
    $addons = $cat['addons'];
    $selected = array_values(array_unique(array_map('strval', $selectedAddons)));
    if (in_array('combo', $selected, true)) {
        $items[] = $addons['combo'];
        $total += $addons['combo']['price'];
    } else {
        foreach (['xotaku4k', 'sexy', 'antigos', 'famosas'] as $id) {
            if (in_array($id, $selected, true)) {
                $items[] = $addons[$id];
                $total += $addons[$id]['price'];
            }
        }
    }
    return ['items' => $items, 'total' => round($total, 2)];
}

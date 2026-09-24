<?php
require __DIR__ . '/_lib.php';
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_out(405, ['ok' => false, 'error' => 'method_not_allowed']);
}
$id = trim((string)($_GET['id'] ?? ''));
if ($id === '') {
    json_out(422, ['ok' => false, 'error' => 'missing_id']);
}
if (str_starts_with($id, 'demo-')) {
    json_out(200, ['ok' => true, 'demo' => true, 'status' => 'pending']);
}
$token = get_access_token($config);
$url = rtrim($config['api_base'], '/') . $config['status_path'] . rawurlencode($id);
$res = http_json('GET', $url, ['Accept' => 'application/json', 'Authorization' => 'Bearer ' . $token]);
if (!$res['ok']) {
    json_out(502, ['ok' => false, 'error' => 'status_failed', 'http' => $res['http'], 'detail' => $res['data']]);
}
$data = $res['data']['data'] ?? $res['data'];
json_out(200, ['ok' => true, 'demo' => false, 'status' => strtolower((string)($data['status'] ?? 'pending')), 'data' => $data]);

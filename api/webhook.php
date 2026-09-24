<?php
require __DIR__ . '/_lib.php';
$raw = file_get_contents('php://input') ?: '';
$dir = __DIR__ . '/../storage';
if (!is_dir($dir)) {
    @mkdir($dir, 0755, true);
}
$stamp = date('Ymd-His') . '-' . bin2hex(random_bytes(3));
@file_put_contents($dir . '/webhook-' . $stamp . '.json', $raw);
$payload = json_decode($raw, true);
if (!is_array($payload)) {
    json_out(200, ['ok' => true]);
}
$status = strtolower((string)($payload['status'] ?? $payload['status_transaction'] ?? $payload['data']['status'] ?? ''));
$id = (string)($payload['id'] ?? $payload['identifier'] ?? $payload['idTransaction'] ?? $payload['data']['reference_id'] ?? '');
$paid = in_array($status, ['completed', 'paid', 'approved', 'success'], true);
if ($paid && $id !== '') {
    @file_put_contents($dir . '/paid-' . $id . '.json', json_encode(['paid_at' => date('c'), 'payload' => $payload], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}
json_out(200, ['ok' => true]);

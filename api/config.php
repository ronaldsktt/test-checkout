<?php
/**
 * Preencha no servidor. Nao commitar secret real.
 */
return [
    'client_id'     => getenv('SYNCPAY_CLIENT_ID')     ?: 'COLE_AQUI_SEU_CLIENT_ID',
    'client_secret' => getenv('SYNCPAY_CLIENT_SECRET') ?: 'COLE_AQUI_SEU_CLIENT_SECRET',
    'api_base'      => 'https://api.syncpayments.com.br',
    'cashin_path'   => '/api/partner/v1/cash-in',
    'auth_path'     => '/api/partner/v1/auth-token',
    'status_path'   => '/api/partner/v1/transaction/',
    'webhook_url'   => getenv('SYNCPAY_WEBHOOK_URL') ?: '',
    'split'         => [],
    'demo_mode'     => null,
];

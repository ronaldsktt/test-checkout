# TEST CHECKOUT

Checkout Prime Gold Black + PIX SyncPay.

Repo: https://github.com/ronaldsktt/test-checkout

## Importante

GitHub Pages **não roda PHP**. A página abre, os order bumps e o vídeo funcionam, mas o Pix real só gera num host com PHP 8.1+ e cURL.

## Arquivos

- `index.html` — checkout
- `js/checkout.js` — som do vídeo + order bumps + total
- `api/create-pix.php` — gera Pix na SyncPay
- `api/status.php` — consulta pagamento
- `api/webhook.php` — recebe confirmação
- `api/config.php` — credenciais (preenche no servidor)

## Subir no host PHP

1. Clona este repo no servidor.
2. Copia `api/config.example.php` para `api/config.php` e cola `client_id` / `client_secret`.
3. Sobe também a pasta `assets/` se as imagens locais não forem.
4. Libera o IP do servidor no painel SyncPay.

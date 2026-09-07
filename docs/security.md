# Security notes (pnk-mail + pnk-id)

## Исправлено

| Риск | Что сделано |
|------|-------------|
| XSS в HTML писем | DOMPurify (`sanitizeMailHtml`) |
| Чужой mailbox | `ensureMailbox` не переназначает owner |
| Open redirect logout / next | только относительные `/…` |
| Refresh token чужого client | проверка `clientId` |
| Dev-секреты в production | `JWT_SECRET` / `PNK_ID_CLIENT_SECRET` обязательны |
| Размер письма / получатели | лимиты в `/api/mail/send` |
| Vault cookies без подписи | HMAC (`MAIL_VAULT_SECRET` / client secret) |
| OAuth CSRF | `state` cookie + query (`/api/auth/start`) |
| PKCE `plain` | только `S256` |
| Resume POST → session | отключён в production (только handoff GET) |
| Brute-force login/register/send | in-memory rate limit |
| CSRF cookie POST | Origin/Referer check (switch, send) |

## Тесты

```bash
npm test   # в каждом репо: tests/security.test.ts
```

## Остаётся (дальше)

1. Распределённый rate limit (Redis) при нескольких репликах  
2. Подтверждение email (`email_verified`)  
3. CAPTCHA при регистрации  
4. Входящая почта (MX)  

## Ops

PostgreSQL + Docker: [production.md](./production.md). DNS: [mail-dns.md](./mail-dns.md).

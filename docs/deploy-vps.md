# Развёртывание pnk-mail + pnk-id на VPS

**Актуальная инструкция (Docker + PostgreSQL):** [production.md](./production.md).

## Архитектура

| Сервис | Порт | Роль | БД |
|--------|------|------|-----|
| **postgres** | 5432 | Общий PostgreSQL | `pnk_id`, `pnk_mail` |
| **pnk-id** | 3100 | Регистрация, логин, OAuth | `pnk_id` |
| **pnk-mail** | 3000 | UI почты, API, исходящая отправка | `pnk_mail` |

Домены: `id.pnkmail.ru` → ID, `pnkmail.ru` → mail.

## Быстрый старт (Docker)

```bash
# оба репо рядом: ../pnk-id и ./pnk-mail
cd pnk-mail
cp deploy/.env.example .env   # секреты + домены
docker compose up -d --build
```

Секреты: `openssl rand -hex 32` для `JWT_SECRET`, `SESSION_SECRET`, `PNK_ID_CLIENT_SECRET`, `MAIL_VAULT_SECRET`, `POSTGRES_PASSWORD`.

## Nginx / DNS / проверки

См. [production.md](./production.md). DNS: [mail-dns.md](./mail-dns.md). Security: [security.md](./security.md).

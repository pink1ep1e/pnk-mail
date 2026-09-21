# Почта pnkmail.ru: исходящие + входящие

Цель: письма `@pnkmail.ru` ↔ Gmail / Яндекс / любые домены.

| Направление | Как |
|-------------|-----|
| `@pnkmail.ru` → `@pnkmail.ru` | Сразу через БД (без провайдера) |
| `@pnkmail.ru` → внешние | Resend (или SES) |
| Внешние → `@pnkmail.ru` | **MX на Resend Receiving** + webhook `/api/mail/inbound` |

Без MX входящие с Яндекса/Gmail **не появятся** в ящике.

---

## 1. Resend (рекомендуется)

1. Аккаунт на [resend.com](https://resend.com)
2. **Domains** → Add `pnkmail.ru`
3. Включи **Receiving** для домена (входящие)
4. Создай **API Key** → `RESEND_API_KEY`

### DNS (reg.ru)

Записи из панели Resend + общие:

| Тип | Имя | Значение |
|-----|-----|----------|
| TXT | `@` | `v=spf1 include:_spf.resend.com ~all` |
| CNAME/TXT | из Resend | DKIM (отправка) |
| **MX** | `@` | из Resend Receiving (приоритет как в панели) |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@pnkmail.ru` |

Дождись **Verified** в Resend.

> Если раньше стоял MX на VPS/другой хостинг — замени на MX Resend, иначе входящие не дойдут.

### Webhook входящих

1. Resend → **Webhooks** → Add  
2. URL:

```text
https://pnkmail.ru/api/mail/inbound
```

Заголовок (или query):

```text
Authorization: Bearer <MAIL_INBOUND_SECRET>
```

либо:

```text
https://pnkmail.ru/api/mail/inbound?secret=<MAIL_INBOUND_SECRET>
```

3. Событие: **`email.received`**

### `.env` на VPS

```env
MAIL_TRANSPORT=resend
MAIL_FROM_DOMAIN=pnkmail.ru
RESEND_API_KEY=re_xxxxxxxx
MAIL_INBOUND_SECRET=сгенерируй_openssl_rand_hex_32
```

```bash
cd ~/pnk-mail
git pull
# допиши переменные в .env
set -a && source .env && set +a
npm run build
pm2 restart pnk-mail --update-env
# или:
pm2 delete pnk-mail
pm2 start npm --name pnk-mail -- start -- -p 3000
pm2 save
```

### Проверка

```bash
# health
curl -s https://pnkmail.ru/api/mail/inbound

# тест generic (подставь секрет и свой ящик)
curl -s -X POST "https://pnkmail.ru/api/mail/inbound" \
  -H "Authorization: Bearer ТВОЙ_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"from":"Me <test@yandex.ru>","to":["твойлогин@pnkmail.ru"],"subject":"Тест inbound","text":"Привет из теста"}'
```

Дальше: с Яндекса/Gmail на `логин@pnkmail.ru` → письмо во «Входящих».  
Обратно: из pnk-mail на внешний адрес (нужен Verified домен + `MAIL_TRANSPORT=resend`).

---

## 2. Amazon SES (альтернатива)

- Исходящие: `MAIL_TRANSPORT=ses` + SMTP credentials  
- Входящие: SES Inbound + SNS → тот же webhook (generic JSON) или отдельный адаптер  

SPF: `v=spf1 include:amazonses.com ~all`  
MX: SES inbound endpoint региона.

---

## 3. Ограничения сейчас

- Вложения: флаг `hasAttachment`, файлы пока не сохраняются на диск  
- Нужен существующий ящик в БД (`Mailbox`) — регистрация через ID/почту  
- Не свой Postfix на VPS (порт 25 часто закрыт у хостеров)

## Warm-up

Сначала мало писем на знакомые адреса; смотри спам, пока репутация домена не вырастет.

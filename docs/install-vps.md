# Установка pnk-mail на VPS (PM2, без Docker)

**Условие:** [pnk-id](https://github.com/pink1ep1e/pnk-id) уже работает под PM2 (порт **3100**).  
Ставим только почту на порт **3000**.

Репозиторий: https://github.com/pink1ep1e/pnk-mail

---

## 0. Что должно быть готово

| Что | Проверка |
|-----|----------|
| Node **≥ 20** | `node -v` |
| PM2 | `pm2 ls` — есть `pnk-id` |
| PostgreSQL | та же БД, что у ID (или тот же сервер) |
| DNS | `pnkmail.ru` → IP VPS; `id.pnkmail.ru` уже ок |
| Nginx | `id.pnkmail.ru` → `127.0.0.1:3100` |

Узнать пароль/юзера Postgres из `.env` ID:

```bash
# путь подставь свой, например /var/www/pnk-id или /opt/pnk/pnk-id
grep DATABASE_URL /var/www/pnk-id/.env
# пример: postgresql://pnk:SECRET@localhost:5432/pnk_id?schema=public
```

Нужна **вторая** БД `pnk_mail` на том же Postgres.

---

## 1. База `pnk_mail`

```bash
sudo -u postgres psql -c "CREATE DATABASE pnk_mail OWNER pnk;"
# если юзер не pnk — замени на своего из DATABASE_URL ID
# если БД уже есть — ошибка «already exists» нормальна
```

Или через `psql` с твоим пользователем:

```bash
psql "postgresql://pnk:ТВОЙ_ПАРОЛЬ@localhost:5432/postgres" -c "CREATE DATABASE pnk_mail;"
```

---

## 2. Клон / обновление кода

```bash
# рядом с pnk-id, например:
cd /var/www   # или /opt/pnk
sudo git clone https://github.com/pink1ep1e/pnk-mail.git pnk-mail
sudo chown -R $USER:$USER pnk-mail

# если уже клонировали:
cd /var/www/pnk-mail && git pull
```

---

## 3. `.env` (не только `.env.local`)

Prisma CLI читает **`.env`**. Next тоже его подхватит. Для PM2 удобнее один файл:

```bash
cd /var/www/pnk-mail
cp .env.example .env
nano .env
```

Минимум (подставь свои значения):

```env
DATABASE_URL="postgresql://pnk:ТВОЙ_ПАРОЛЬ@localhost:5432/pnk_mail?schema=public"

NEXT_PUBLIC_PNK_ID_URL="https://id.pnkmail.ru"
NEXT_PUBLIC_MAIL_URL="https://pnkmail.ru"

# Тот же секрет, что у OAuth-клиента pnk-mail в БД ID (из seed / .env ID)
PNK_ID_CLIENT_SECRET="..."

MAIL_VAULT_SECRET="сгенерируй_openssl_rand_hex_32"

MAIL_TRANSPORT="console"
MAIL_FROM_DOMAIN="pnkmail.ru"
# позже: MAIL_TRANSPORT=resend + RESEND_API_KEY=re_...
```

Если уже заполнил `.env.local` — скопируй в `.env`:

```bash
cp .env.local .env
```

Секреты:

```bash
openssl rand -hex 32
```

`PNK_ID_CLIENT_SECRET` должен совпадать с тем, что захеширован в ID при seed. Если не помнишь — посмотри в `.env` ID или пересейви клиент (шаг 5).

---

## 4. Установка, схема, сборка, PM2

```bash
cd /var/www/pnk-mail

# Node 20+ обязателен
node -v

npm ci
npx prisma generate
npx prisma db push
npm run build

# если mail уже был в pm2 — сначала удали старый
pm2 delete pnk-mail 2>/dev/null || true

pm2 start npm --name pnk-mail -- start -- -p 3000
pm2 save
pm2 startup   # один раз: выполни команду, которую выведет pm2

pm2 ls
curl -sI http://127.0.0.1:3000 | head -3
```

Ожидание: процесс `pnk-mail` **online**, HTTP `200`.

---

## 5. OAuth-клиент в ID (если ещё не сидили)

Если вход с почты падает на «unknown client» — в каталоге **pnk-id**:

```bash
cd /var/www/pnk-id
# в .env должны быть:
# NEXT_PUBLIC_MAIL_URL=https://pnkmail.ru
# PNK_ID_CLIENT_SECRET=тот_же_что_в_mail_.env.local

npm run db:seed
# или: npx tsx prisma/seed.ts
```

Ожидание: `Seed OK` и redirect `https://pnkmail.ru/api/auth/callback/pnk-id`.

---

## 6. Nginx для почты

Если в `/etc/nginx/sites-available/pnk` ещё нет блока mail — добавь `server` для `pnkmail.ru` (ID-блок не трогай):

```nginx
server {
  server_name pnkmail.ru www.pnkmail.ru;
  client_max_body_size 20m;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
# сертификат (если ещё не выпускал для mail):
sudo certbot --nginx -d pnkmail.ru -d www.pnkmail.ru
# или вместе с id:
# sudo certbot --nginx -d id.pnkmail.ru -d pnkmail.ru -d www.pnkmail.ru
```

---

## 7. Проверка

1. https://pnkmail.ru — лендинг почты  
2. «Войти» → https://id.pnkmail.ru → обратно в ящик  

Логи:

```bash
pm2 logs pnk-mail --lines 50
pm2 logs pnk-id --lines 50
```

---

## Обновление mail с GitHub

```bash
cd /var/www/pnk-mail
git pull
npm ci
npx prisma generate
npx prisma db push
npm run build
pm2 restart pnk-mail
```

---

## Частые проблемы

| Симптом | Что сделать |
|---------|-------------|
| `Unsupported engine` / Prisma `Unexpected token '?'` | Node слишком старый → поставь Node 20 (nodesource) |
| `database "pnk_mail" does not exist` | Шаг 1 — создать БД |
| OAuth / invalid client | Один `PNK_ID_CLIENT_SECRET` + `npm run db:seed` в ID |
| `ERR_NAME_NOT_RESOLVED` | A-запись `pnkmail.ru` / `id` у регистратора |
| Порт занят | `ss -tlnp \| grep 3000`, `pm2 ls` |

Исходящая почта (Resend/SES + SPF/DKIM): [mail-dns.md](./mail-dns.md).

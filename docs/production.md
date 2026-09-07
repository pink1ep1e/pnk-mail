# Production install — pnk-id + pnk-mail + PostgreSQL

Один PostgreSQL, две БД: `pnk_id` и `pnk_mail`. Сервисы в Docker, снаружи — Nginx + HTTPS.

## Что куда

| Что | Где |
|-----|-----|
| Репозиторий **pnk-id** | `/opt/pnk/pnk-id` (или рядом с mail) |
| Репозиторий **pnk-mail** | `/opt/pnk/pnk-mail` |
| Compose | `pnk-mail/docker-compose.yml` (собирает оба, поднимает Postgres) |
| Секреты | `pnk-mail/.env` (из `deploy/.env.example`) |
| Init SQL | `pnk-mail/deploy/postgres/init.sql` → создаёт `pnk_id`, `pnk_mail` |
| Домен ID | `id.pnkmail.ru` → контейнер `:3100` |
| Домен почты | `pnkmail.ru` → контейнер `:3000` |
| Данные Postgres | Docker volume `pnk_pg_data` |

Структура на сервере:

```text
/opt/pnk/
  pnk-id/          # git clone
  pnk-mail/        # git clone + .env + docker compose
```

## 1. VPS

```bash
sudo apt update
sudo apt install -y git docker.io docker-compose-v2 nginx certbot python3-certbot-nginx
sudo usermod -aG docker $USER   # re-login
```

Если `No space left on device` при build:

```bash
df -h
cd /opt/pnk/pnk-mail && docker compose stop pnk-id pnk-mail
docker builder prune -af
docker system prune -af
# seed оставлял node_modules на хосте — не тащить в build context:
rm -rf /opt/pnk/pnk-id/node_modules /opt/pnk/pnk-mail/node_modules
rm -rf /opt/pnk/pnk-id/.next /opt/pnk/pnk-mail/.next
df -h
```

## 2. Клонирование

```bash
sudo mkdir -p /opt/pnk && sudo chown $USER:$USER /opt/pnk
cd /opt/pnk
git clone <URL-pnk-id> pnk-id
git clone <URL-pnk-mail> pnk-mail
```

## 3. Секреты

```bash
cd /opt/pnk/pnk-mail
cp deploy/.env.example .env
nano .env
```

Обязательно смените:

- `POSTGRES_PASSWORD`
- `JWT_SECRET` / `SESSION_SECRET` / `PNK_ID_CLIENT_SECRET` / `MAIL_VAULT_SECRET`  
  (`openssl rand -hex 32`)
- `APP_URL`, `NEXT_PUBLIC_PNK_ID_URL`, `NEXT_PUBLIC_MAIL_URL` — ваши HTTPS URL

`PNK_ID_CLIENT_SECRET` один и тот же в compose для id (seed) и mail (OAuth).

## Диск / Docker (если `No space left on device`)

```bash
df -h
docker system df
# освободить место (удалит неиспользуемые образы/кэш сборки)
docker builder prune -af
docker system prune -af
# затем снова
cd /opt/pnk/pnk-id && git pull
cd /opt/pnk/pnk-mail && git pull
docker compose up -d --build
```

Образы теперь slim: в runtime не копируется весь `node_modules` (только Next standalone + Prisma).


```bash
cd /opt/pnk/pnk-mail
docker compose up -d --build
docker compose ps
docker compose logs -f pnk-id pnk-mail
```

При старте:

1. Postgres поднимается, init создаёт `pnk_id` + `pnk_mail`
2. **pnk-id** / **pnk-mail**: `prisma db push` (схемы)
3. OAuth-клиент `pnk-mail` — один раз через seed (см. ниже)

Проверка:

```bash
curl -sI http://127.0.0.1:3100 | head -1
curl -sI http://127.0.0.1:3000 | head -1
```

## 5. Nginx + HTTPS

`/etc/nginx/sites-available/pnk`:

```nginx
server {
  server_name id.pnkmail.ru;
  location / {
    proxy_pass http://127.0.0.1:3100;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}

server {
  server_name pnkmail.ru www.pnkmail.ru;
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
sudo ln -s /etc/nginx/sites-available/pnk /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d id.pnkmail.ru -d pnkmail.ru -d www.pnkmail.ru
```

OAuth seed (первый запуск или после смены доменов / `PNK_ID_CLIENT_SECRET`).
Нужен **Node ≥ 18** — на типичном VPS системный Node слишком старый, поэтому seed через контейнер:

```bash
cd /opt/pnk/pnk-mail
set -a && source .env && set +a
NET=$(docker network ls --format '{{.Name}}' | grep -E 'pnk.*default' | head -1)
echo "network: $NET"

docker run --rm --network "$NET" \
  -v /opt/pnk/pnk-id:/app -w /app \
  -e NEXT_PUBLIC_MAIL_URL \
  -e PNK_ID_CLIENT_SECRET \
  -e SEED_DEMO_PASSWORD \
  -e DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/pnk_id?schema=public" \
  node:20-bookworm-slim \
  bash -c "apt-get update -qq && apt-get install -y -qq openssl >/dev/null \
    && npm ci && npx prisma generate \
    && npx prisma db push --skip-generate \
    && npx tsx prisma/seed.ts"
```

Ожидаемый вывод: `Seed OK` и redirect на `https://pnkmail.ru/api/auth/callback/pnk-id`.
Если id-контейнер уже поднимался — таблицы могли создаться entrypoint’ом; `db push` всё равно безопасен (идемпотентен).

## 6. DNS и исходящая почта

См. [mail-dns.md](./mail-dns.md). В `.env`:

```env
MAIL_TRANSPORT=resend   # или ses
RESEND_API_KEY=re_...
```

Без SPF/DKIM/DMARC внешняя доставка почти всегда в спам.

## 7. Локальная разработка (Postgres в Docker)

```bash
# только БД
cd pnk-mail
docker compose up -d postgres
# в .env обоих проектов:
# DATABASE_URL=postgresql://pnk:ВАШ_ПАРОЛЬ@localhost:5432/pnk_id?schema=public
# DATABASE_URL=postgresql://pnk:ВАШ_ПАРОЛЬ@localhost:5432/pnk_mail?schema=public

cd ../pnk-id && cp .env.example .env && npx prisma db push && npm run db:seed && npm run dev
cd ../pnk-mail && cp .env.example .env.local && npx prisma db push && npm run dev
```

## 8. Тесты безопасности

```bash
cd pnk-id && npm i && npm test
cd pnk-mail && npm i && npm test
```

Покрывают: rate-limit, open-redirect, HMAC vault, Origin CSRF, XSS sanitizer.

## 9. Git — залить изменения

В каждом репозитории (секреты и `.env` не коммитить):

```bash
# --- pnk-id ---
cd /path/to/pnk-id
git status
git add -A
git status   # убедись, что нет .env / *.db
git commit -m "$(cat <<'EOF'
Prepare production: PostgreSQL, Docker, rate limits, security tests.

EOF
)"
git push -u origin HEAD

# --- pnk-mail ---
cd /path/to/pnk-mail
git status
git add -A
git status
git commit -m "$(cat <<'EOF'
Prepare production: PostgreSQL, Docker Compose, OAuth state, vault HMAC, tests.

EOF
)"
git push -u origin HEAD
```

Если remote ещё нет:

```bash
git remote add origin git@github.com:ORG/pnk-id.git
git push -u origin main
```

## 10. Бэкапы Postgres

```bash
docker compose exec -T postgres pg_dump -U pnk pnk_id > backup-id-$(date +%F).sql
docker compose exec -T postgres pg_dump -U pnk pnk_mail > backup-mail-$(date +%F).sql
```

## Чеклист после деплоя

1. Регистрация на `id.…` → вход в почту через `/api/auth/start`
2. Письмо `@pnkmail.ru` → `@pnkmail.ru`
3. Внешнее письмо при `MAIL_TRANSPORT=resend|ses`
4. `npm test` зелёный в CI/локально
5. В БД ID клиент `pnk-mail` с redirect `https://pnkmail.ru/api/auth/callback/pnk-id`

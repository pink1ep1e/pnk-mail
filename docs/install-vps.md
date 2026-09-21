# Установка pnk-mail + pnk-id на VPS (по шагам)

Репозитории:
- Mail: https://github.com/pink1ep1e/pnk-mail
- ID: https://github.com/pink1ep1e/pnk-id

Стек: Docker (Postgres + id `:3100` + mail `:3000`) → Nginx + HTTPS.

Минимум: **≥20 GB** диска (на 10 GB сборка двух Next часто падает).

---

## 0. DNS (сделай до certbot)

У регистратора (reg.ru и т.п.), NS зоны `pnkmail.ru`:

| Тип | Имя | Значение |
|-----|-----|----------|
| A | `@` | IP VPS |
| A | `www` | IP VPS |
| A | `id` | IP VPS |

Проверка с ПК:

```powershell
nslookup pnkmail.ru 8.8.8.8
nslookup id.pnkmail.ru 8.8.8.8
```

Оба должны вернуть IP VPS. Без записи `id` OAuth не откроется.

---

## 1. Пакеты на сервере

```bash
sudo apt update
sudo apt install -y git docker.io docker-compose-v2 nginx certbot python3-certbot-nginx
sudo systemctl enable --now docker
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 2. Клонирование

```bash
sudo mkdir -p /opt/pnk && sudo chown $USER:$USER /opt/pnk
cd /opt/pnk
git clone https://github.com/pink1ep1e/pnk-id.git pnk-id
git clone https://github.com/pink1ep1e/pnk-mail.git pnk-mail
```

Структура:

```text
/opt/pnk/
  pnk-id/
  pnk-mail/   ← здесь .env и docker compose
```

---

## 3. Секреты

```bash
cd /opt/pnk/pnk-mail
cp deploy/.env.example .env
nano .env
```

Заполни (секреты: `openssl rand -hex 32`):

```env
POSTGRES_USER=pnk
POSTGRES_PASSWORD=...          # без @ : # / ?
JWT_SECRET=...
SESSION_SECRET=...
PNK_ID_CLIENT_SECRET=...       # один и тот же для id и mail
MAIL_VAULT_SECRET=...
APP_URL=https://id.pnkmail.ru
NEXT_PUBLIC_PNK_ID_URL=https://id.pnkmail.ru
NEXT_PUBLIC_MAIL_URL=https://pnkmail.ru
MAIL_TRANSPORT=console
MAIL_FROM_DOMAIN=pnkmail.ru
```

---

## 4. Сборка и запуск (по одному — экономия места)

```bash
cd /opt/pnk/pnk-mail
df -h
docker compose build pnk-id
docker builder prune -af
docker compose build pnk-mail
docker compose up -d
docker compose ps
curl -sI http://127.0.0.1:3100 | head -3
curl -sI http://127.0.0.1:3000 | head -3
```

Ожидание: оба `Up`, HTTP `200`.

Если `No space left`:

```bash
docker compose stop pnk-id pnk-mail || true
docker builder prune -af
docker system prune -af
rm -rf /opt/pnk/pnk-id/node_modules /opt/pnk/pnk-mail/node_modules
df -h
```

---

## 5. Схема БД + OAuth seed (один раз)

Схема **не** создаётся при старте контейнера. Нужен Node 20 в Docker (системный Node на VPS часто слишком старый).

### 5.1 ID (таблицы + клиент `pnk-mail`)

```bash
cd /opt/pnk/pnk-mail
set -a && source .env && set +a
NET=$(docker network ls --format '{{.Name}}' | grep -E 'pnk.*default' | head -1)

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

rm -rf /opt/pnk/pnk-id/node_modules
```

Ожидание: `Seed OK`.

### 5.2 Mail (таблицы)

```bash
cd /opt/pnk/pnk-mail
set -a && source .env && set +a
NET=$(docker network ls --format '{{.Name}}' | grep -E 'pnk.*default' | head -1)

docker run --rm --network "$NET" \
  -v /opt/pnk/pnk-mail:/app -w /app \
  -e DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/pnk_mail?schema=public" \
  node:20-bookworm-slim \
  bash -c "apt-get update -qq && apt-get install -y -qq openssl >/dev/null \
    && npm ci && npx prisma generate && npx prisma db push --skip-generate"

rm -rf /opt/pnk/pnk-mail/node_modules
```

---

## 6. Nginx + HTTPS

```bash
sudo tee /etc/nginx/sites-available/pnk >/dev/null <<'EOF'
server {
  listen 80;
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
  listen 80;
  server_name pnkmail.ru www.pnkmail.ru;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
EOF

sudo ln -sf /etc/nginx/sites-available/pnk /etc/nginx/sites-enabled/pnk
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# DNS id + @ уже должны указывать на этот IP
sudo certbot --nginx -d id.pnkmail.ru -d pnkmail.ru -d www.pnkmail.ru
```

---

## 7. Проверка

1. https://id.pnkmail.ru — кабинет ID  
2. https://pnkmail.ru — почта → «Войти» → OAuth на ID → обратно в почту  

---

## Обновление кода с GitHub

```bash
cd /opt/pnk/pnk-id && git pull
cd /opt/pnk/pnk-mail && git pull

cd /opt/pnk/pnk-mail
docker compose build pnk-id
docker builder prune -af
docker compose build pnk-mail
docker compose up -d
docker compose ps
```

---

## Частые проблемы

| Симптом | Причина |
|---------|---------|
| `ERR_NAME_NOT_RESOLVED` на id | Нет A-записи `id` в DNS |
| Certbot Timeout | Закрыты 80/443 (ufw / панель хостера) |
| Чужой сайт на домене | Другой nginx site / старый хостинг |
| `No space left` | Мало диска; prune + build по одному |
| OAuth ошибка клиента | Не сделан seed или другой `PNK_ID_CLIENT_SECRET` |

Подробнее: [production.md](./production.md), исходящая почта: [mail-dns.md](./mail-dns.md).

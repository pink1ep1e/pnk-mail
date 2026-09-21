# pnk-mail

Почтовый веб-клиент (Next.js) + OAuth через [pnk-id](https://github.com/pink1ep1e/pnk-id).

Иконки — **Streamline Flex Solid** (как в pnk-id): `import { Mail } from "@/lib/icons"`.

## Локально

```bash
cp .env.example .env.local
npm ci
npx prisma db push
npm run dev
```

## Production на VPS (PM2)

pnk-id уже стоит → ставим только mail:

**[docs/install-vps.md](./docs/install-vps.md)** — пошагово (Postgres `pnk_mail`, build, `pm2`, Nginx).

```bash
git clone https://github.com/pink1ep1e/pnk-mail.git
# далее по install-vps.md
pm2 start npm --name pnk-mail -- start -- -p 3000
```

## Иконки

```bash
npm run icons:generate
```

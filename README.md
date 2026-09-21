# pnk-mail

Почтовый веб-клиент (Next.js) + OAuth через [pnk-id](https://github.com/pink1ep1e/pnk-id).

Иконки — **Streamline Flex Solid** (тот же набор, что в pnk-id): `import { Mail } from "@/lib/icons"`.

## Локально

```bash
cp .env.example .env.local
npm ci
npx prisma db push
npm run dev
```

## Production (VPS + Docker)

Пошагово: **[docs/install-vps.md](./docs/install-vps.md)**  
Детали: [docs/production.md](./docs/production.md)

```bash
git clone https://github.com/pink1ep1e/pnk-mail.git
git clone https://github.com/pink1ep1e/pnk-id.git
# см. install-vps.md
```

## Иконки

```bash
npm run icons:generate   # пересобрать lib/generated/solid-icons.ts
```

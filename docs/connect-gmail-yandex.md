# Подключение почты: письма появляются в Gmail и Яндексе

Задача: с ящика `логин@pnkmail.ru` письмо уходит наружу и приходит во **Входящие** Gmail / Яндекс (не только в спам / не теряется).

Провайдер: **[Resend](https://resend.com)** (проще всего для старта).

---

## Что должно быть готово

- Домен `pnkmail.ru` у тебя (DNS в reg.ru или где делегирован)
- Сайт почты на VPS: `https://pnkmail.ru`, PM2 `pnk-mail`
- Ящик уже создан (вход через ID работает)

---

## Шаг 1. Аккаунт Resend

1. Зайди на https://resend.com → Sign up  
2. **API Keys** → Create → скопируй ключ `re_...`  
3. **Domains** → **Add Domain** → `pnkmail.ru`  
4. Открой домен и включи / настрой **Sending** (отправка)

Resend покажет DNS-записи — их добавишь на шаге 2.

---

## Шаг 2. DNS в панели домена (reg.ru)

Добавь **точно** то, что показывает Resend для Sending (имена/значения копируй из панели).

Обычно нужно:

### SPF (TXT на `@` / корне)

```text
v=spf1 include:_spf.resend.com ~all
```

Если уже есть другой SPF — **не создавай второй**. Объедини в одну запись, например:

```text
v=spf1 include:_spf.resend.com include:другое ~all
```

### DKIM

Несколько **CNAME** (или TXT) — как в Resend. Без них Яндекс/Gmail часто режут или кладут в спам.

### DMARC (TXT на `_dmarc`)

```text
v=DMARC1; p=none; rua=mailto:dmarc@pnkmail.ru
```

Позже можно сменить `p=none` → `p=quarantine`.

### Проверка DNS

Подожди 5–60 минут. В Resend домен должен стать **Verified** / зелёный статус.

Проверка с ПК:

```powershell
nslookup -type=TXT pnkmail.ru 8.8.8.8
nslookup -type=TXT _dmarc.pnkmail.ru 8.8.8.8
```

---

## Шаг 3. Прописать ключ на VPS

```bash
cd ~/pnk-mail
nano .env
```

Добавь / замени:

```env
MAIL_TRANSPORT=resend
MAIL_FROM_DOMAIN=pnkmail.ru
RESEND_API_KEY=re_ВАШ_КЛЮЧ
```

Сохрани. Перезапуск:

```bash
set -a && source .env && set +a
pm2 delete pnk-mail 2>/dev/null || true
pm2 start npm --name pnk-mail -- start -- -p 3000
pm2 save
pm2 logs pnk-mail --lines 20
```

Не должно быть ошибок при старте.

---

## Шаг 4. Тест в Gmail и Яндекс

1. Открой https://pnkmail.ru → войди в ящик  
2. Напиши письмо:
   - на свой `@gmail.com`
   - на свой `@yandex.ru`  
3. Отправь  

Ожидание: письмо во **Входящих** (иногда сначала в **Спаме** — это нормально первые дни).

Если не пришло:

```bash
pm2 logs pnk-mail --lines 80
```

Ищи `transportWarning` / ошибки Resend. В панели Resend → **Emails** / Logs — статус отправки.

---

## Шаг 5 (важно). Чтобы не попадало в спам

| Сделай | Зачем |
|--------|--------|
| Домен **Verified** в Resend | Без этого с кастомным From не пустят |
| SPF + DKIM | Обязательно для Яндекса |
| DMARC | Репутация |
| Мало писем первые дни | «Прогрев» домена |
| Не слать массовые рассылки сразу | Бан / спам |

Проверь домен: https://mxtoolbox.com/SuperTool.aspx (SPF/DKIM/DMARC).

---

## Входящие *на* @pnkmail.ru (с Gmail/Яндекса к тебе)

Это **отдельный** шаг (MX + Receiving + webhook).  
Краткая схема:

1. В Resend для домена включи **Receiving**  
2. Поставь **MX** записи из Resend (замени старые MX, если были)  
3. В `.env`:
   ```env
   MAIL_INBOUND_SECRET=$(openssl rand -hex 32)
   RESEND_API_KEY=re_...
   ```
4. Webhook в Resend: событие **`email.received`** → URL **с секретом в query**:

```text
https://pnkmail.ru/api/mail/inbound?secret=ТВОЙ_MAIL_INBOUND_SECRET
```

> Без `?secret=...` Resend стучится → 401, в `pm2 logs` раньше было пусто. Теперь будет `[inbound] auth failed`.

5. Проверка:
   ```bash
   curl -s https://pnkmail.ru/api/mail/inbound
   # authConfigured: true
   pm2 logs pnk-mail --lines 50
   ```
6. Отправь тест с Gmail → в логах должно быть `[inbound] hit` → `[inbound] delivered`

Подробно: [mail-dns.md](./mail-dns.md)

---

## Чеклист «в Gmail/Яндексе видно»

- [ ] Resend domain Verified  
- [ ] SPF / DKIM / DMARC в DNS  
- [ ] `MAIL_TRANSPORT=resend` + `RESEND_API_KEY` в `.env`  
- [ ] `pm2` перезапущен с новым env  
- [ ] Тест на Gmail и Яндекс дошёл (Входящие или Спам)  

---

## Частые ошибки

| Симптом | Причина |
|---------|---------|
| Письмо «отправилось», снаружи нет | Всё ещё `MAIL_TRANSPORT=console` |
| Resend error domain not verified | DNS не готов / не те записи |
| Только в спаме | Нет DKIM/DMARC или новый домен |
| From запрещён | From должен быть `@pnkmail.ru` на verified домене |
| В Resend письмо есть, в почте нет, логи пустые | Webhook без `?secret=` или нет `MAIL_INBOUND_SECRET` в `.env` |
| `[inbound] auth failed` | Секрет в URL ≠ секрет в `.env` — поправь webhook URL |
| `[inbound] no matching @domain recipients` | Письмо пришло не на существующий ящик `@pnkmail.ru` |

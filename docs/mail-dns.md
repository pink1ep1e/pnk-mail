# DNS checklist for pnkmail.ru deliverability

Goal: outbound mail from `*@pnkmail.ru` lands in Inbox (incl. Yandex), not Spam.
Do **not** send from a raw VPS IP without SPF/DKIM/DMARC.

## Why local mail never reaches @yandex.ru

Default `MAIL_TRANSPORT=console` only logs outbound messages.
Internal `@pnkmail.ru` → `@pnkmail.ru` still works via the database.

## Provider

1. Pick one:
   - **Amazon SES** (`MAIL_TRANSPORT=ses`) — cost/scale
   - **Resend** (`MAIL_TRANSPORT=resend`) — simple API
2. Verify the **domain** `pnkmail.ru` in the provider console (not just a single email).
3. Publish DNS records the provider shows.

## Required DNS

### SPF (TXT on apex)

```
v=spf1 include:amazonses.com ~all
```

or for Resend:

```
v=spf1 include:_spf.resend.com ~all
```

### DKIM

Add CNAME/TXT records from SES/Resend after domain verification.

### DMARC (TXT on `_dmarc.pnkmail.ru`)

```
v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@pnkmail.ru
```

## Warm-up

Start with low volume to known recipients. Avoid bulk until reputation builds.

## Inbound (phase 2)

Receiving from Gmail/Yandex into pnkmail.ru needs MX + SES Inbound (or your own MTA).
Today: internal DB delivery + external outbound via transport.

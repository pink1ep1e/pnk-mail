/**
 * Outbound mail transport.
 * - console: log only (dev default); internal @pnkmail.ru still via DB
 * - resend: Resend HTTP API
 * - ses: Amazon SES via SMTP (nodemailer) — recommended for deliverability
 */

import nodemailer from "nodemailer";

export type OutboundMail = {
  fromName: string;
  fromEmail: string;
  to: string[];
  cc?: string[];
  subject: string;
  bodyHtml: string;
  bodyText: string;
};

export type TransportResult =
  | { ok: true; providerId?: string }
  | { ok: false; error: string };

function transportMode(): "console" | "resend" | "ses" {
  const raw = (process.env.MAIL_TRANSPORT || "console").toLowerCase();
  if (raw === "resend" || raw === "ses") return raw;
  return "console";
}

async function sendConsole(mail: OutboundMail): Promise<TransportResult> {
  console.info("[mail-transport:console]", {
    from: `${mail.fromName} <${mail.fromEmail}>`,
    to: mail.to,
    cc: mail.cc,
    subject: mail.subject,
  });
  return { ok: true, providerId: `console-${Date.now()}` };
}

async function sendResend(mail: OutboundMail): Promise<TransportResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY не задан" };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${mail.fromName} <${mail.fromEmail}>`,
      to: mail.to,
      cc: mail.cc?.length ? mail.cc : undefined,
      subject: mail.subject,
      html: mail.bodyHtml,
      text: mail.bodyText,
    }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    error?: { message?: string };
  };

  if (!res.ok) {
    return {
      ok: false,
      error: json.error?.message || json.message || `Resend HTTP ${res.status}`,
    };
  }
  return { ok: true, providerId: json.id };
}

async function sendSesSmtp(mail: OutboundMail): Promise<TransportResult> {
  const host = process.env.SES_SMTP_HOST || "email-smtp.eu-central-1.amazonaws.com";
  const user = process.env.SES_SMTP_USER;
  const pass = process.env.SES_SMTP_PASS;
  const port = Number(process.env.SES_SMTP_PORT || 587);

  if (!user || !pass) {
    return { ok: false, error: "SES_SMTP_USER / SES_SMTP_PASS не заданы" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const info = await transporter.sendMail({
      from: `"${mail.fromName}" <${mail.fromEmail}>`,
      to: mail.to.join(", "),
      cc: mail.cc?.length ? mail.cc.join(", ") : undefined,
      subject: mail.subject,
      html: mail.bodyHtml,
      text: mail.bodyText,
    });

    return { ok: true, providerId: info.messageId };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "SES SMTP error",
    };
  }
}

/** Send to external recipients (not delivered via internal DB). */
export async function sendOutbound(
  mail: OutboundMail,
): Promise<TransportResult> {
  if (!mail.to.length) return { ok: true };

  switch (transportMode()) {
    case "resend":
      return sendResend(mail);
    case "ses":
      return sendSesSmtp(mail);
    default:
      return sendConsole(mail);
  }
}

export function getMailFromDomain() {
  return (
    process.env.MAIL_FROM_DOMAIN?.replace(/^\./, "") || "pnkmail.ru"
  ).toLowerCase();
}

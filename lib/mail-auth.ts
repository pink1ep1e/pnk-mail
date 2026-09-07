import { readVault } from "@/lib/mail-session";
import { ensureMailbox } from "@/lib/mail-store";

export type ActiveMailboxContext = {
  userId: string;
  email: string;
  name: string;
  mailboxId: string;
};

/** Resolve authenticated active mailbox from cookie vault. */
export async function requireActiveMailbox(): Promise<
  | { ok: true; ctx: ActiveMailboxContext }
  | { ok: false; status: number; message: string }
> {
  const vault = await readVault();
  if (!vault) {
    return { ok: false, status: 401, message: "Нужна авторизация" };
  }
  const active = vault.accounts[vault.activeId];
  if (!active) {
    return { ok: false, status: 401, message: "Активный аккаунт не найден" };
  }

  try {
    const mailbox = await ensureMailbox(
      active.profile.id,
      active.profile.email,
    );
    return {
      ok: true,
      ctx: {
        userId: active.profile.id,
        email: mailbox.address,
        name: active.profile.name,
        mailboxId: mailbox.id,
      },
    };
  } catch (e) {
    if (e instanceof Error && e.message === "MAILBOX_OWNERSHIP_CONFLICT") {
      return {
        ok: false,
        status: 403,
        message: "Этот адрес принадлежит другому аккаунту",
      };
    }
    throw e;
  }
}

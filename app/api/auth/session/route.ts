import { NextResponse } from "next/server";
import { PNK_ID_URL, getServerPnkIdUrl } from "@/lib/id-auth";
import {
  applyActiveCookies,
  getAccessToken,
  listAccountsFromVault,
  profileFromUser,
  readVault,
  type MailSessionUser,
} from "@/lib/mail-session";
import { ensureVaultTokens } from "@/lib/oauth-tokens";

async function fetchUserinfo(
  token: string,
  timeoutMs = 5000,
): Promise<MailSessionUser | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${getServerPnkIdUrl()}/api/oauth/userinfo`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: ctrl.signal,
    });
    const json = await res.json();
    if (!json.ok || !json.data) return null;
    const d = json.data as Record<string, unknown>;
    return {
      id: String(d.sub || ""),
      login: String(d.preferred_username || ""),
      email: (d.email as string) || null,
      displayName: (d.name as string) || null,
      firstName: (d.given_name as string) || null,
      lastName: (d.family_name as string) || null,
      avatarUrl: (d.picture as string) || null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  let vault = await readVault();
  const tokenHint = await getAccessToken();

  if (!tokenHint && !vault) {
    return NextResponse.json({ ok: false, data: { user: null, accounts: [] } });
  }

  try {
    let cookiesChanged = false;
    let expiresIn = 3600;

    if (vault && Object.keys(vault.accounts).length > 0) {
      const ensured = await ensureVaultTokens(vault);
      vault = ensured.vault;
      cookiesChanged = ensured.changed;
      expiresIn = ensured.expiresIn;

      let accounts = listAccountsFromVault(vault).map((a) => ({
        ...a,
        avatarUrl: a.avatarUrl || `${PNK_ID_URL}/api/public/avatar/${a.id}`,
      }));
      const active = accounts.find((a) => a.active) || accounts[0];

      const activeToken =
        (active && vault.accounts[active.id]?.accessToken) || tokenHint || null;
      let user: MailSessionUser | null = null;
      if (activeToken) {
        user = await fetchUserinfo(activeToken);
        // Stale access → one refresh retry
        if (!user && vault.accounts[active.id]?.refreshToken) {
          const retry = await ensureVaultTokens({
            ...vault,
            accounts: {
              ...vault.accounts,
              [active.id]: {
                ...vault.accounts[active.id],
                accessToken: "", // force refresh
              },
            },
          });
          if (retry.changed) {
            vault = retry.vault;
            cookiesChanged = true;
            expiresIn = retry.expiresIn;
            const fresh = vault.accounts[active.id]?.accessToken;
            if (fresh) user = await fetchUserinfo(fresh);
          }
        }
        if (user?.id && vault.accounts[user.id]) {
          const u = user;
          const profile = profileFromUser(u);
          // Enrich response only — don't Set-Cookie on every poll (nginx header limit)
          accounts = listAccountsFromVault(vault).map((a) =>
            a.id === u.id
              ? {
                  ...a,
                  ...profile,
                  avatarUrl:
                    profile.avatarUrl ||
                    a.avatarUrl ||
                    `${PNK_ID_URL}/api/public/avatar/${u.id}`,
                  active: a.active,
                }
              : a,
          );
        }
      }

      const account = accounts.find((a) => a.active) || accounts[0];
      // Stay logged-in from vault even if ID is briefly unreachable
      const res = NextResponse.json({
        ok: Boolean(account),
        data: {
          user,
          account,
          accounts,
        },
      });
      // Only Set-Cookie when tokens/profiles actually changed (avoids nginx 502 spam)
      if (cookiesChanged && vault) {
        applyActiveCookies(res, vault, expiresIn);
      }
      return res;
    }

    const user = tokenHint ? await fetchUserinfo(tokenHint) : null;
    if (!user) {
      return NextResponse.json({
        ok: false,
        data: { user: null, accounts: [] },
      });
    }

    const account = {
      ...profileFromUser(user),
      active: true as const,
    };

    return NextResponse.json({
      ok: true,
      data: {
        user,
        account,
        accounts: [account],
      },
    });
  } catch {
    if (vault && Object.keys(vault.accounts).length > 0) {
      const accounts = listAccountsFromVault(vault);
      const account = accounts.find((a) => a.active) || accounts[0];
      return NextResponse.json({
        ok: Boolean(account),
        data: { user: null, account, accounts },
      });
    }
    return NextResponse.json({
      ok: false,
      data: { user: null, accounts: [] },
    });
  }
}

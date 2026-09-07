import { NextResponse } from "next/server";
import { PNK_ID_URL } from "@/lib/id-auth";
import {
  applyActiveCookies,
  getAccessToken,
  listAccountsFromVault,
  profileFromUser,
  readVault,
  type MailSessionUser,
} from "@/lib/mail-session";

async function fetchUserinfo(
  token: string,
  timeoutMs = 5000,
): Promise<MailSessionUser | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${PNK_ID_URL}/api/oauth/userinfo`, {
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
  const vault = await readVault();
  const token = await getAccessToken();

  if (!token && !vault) {
    return NextResponse.json({ ok: false, data: { user: null, accounts: [] } });
  }

  try {
    // Fast path: vault alone is enough to open mail (don't block on ID)
    if (vault && Object.keys(vault.accounts).length > 0) {
      // Return vault immediately with public avatar URLs; enrich names in background path
      let accounts = listAccountsFromVault(vault).map((a) => ({
        ...a,
        // Guarantee avatar URL even if cookie profile had null
        avatarUrl: a.avatarUrl || `${PNK_ID_URL}/api/public/avatar/${a.id}`,
      }));
      const active = accounts.find((a) => a.active) || accounts[0];

      const activeToken =
        (active && vault.accounts[active.id]?.accessToken) || token || null;
      let user: MailSessionUser | null = null;
      if (activeToken) {
        user = await fetchUserinfo(activeToken);
        if (user?.id && vault.accounts[user.id]) {
          const profile = profileFromUser(user);
          vault.accounts[user.id] = {
            ...vault.accounts[user.id],
            profile: {
              ...vault.accounts[user.id].profile,
              ...profile,
              // Never wipe avatar with null from a sparse userinfo payload
              avatarUrl:
                profile.avatarUrl ||
                vault.accounts[user.id].profile.avatarUrl ||
                `${PNK_ID_URL}/api/public/avatar/${user.id}`,
            },
          };
          accounts = listAccountsFromVault(vault);
        }
      }

      const account = accounts.find((a) => a.active) || accounts[0];
      const res = NextResponse.json({
        ok: Boolean(account),
        data: {
          user,
          account,
          accounts,
        },
      });
      applyActiveCookies(res, vault);
      return res;
    }

    const user = token ? await fetchUserinfo(token) : null;
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
    // Last resort: still open mail from vault if present
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

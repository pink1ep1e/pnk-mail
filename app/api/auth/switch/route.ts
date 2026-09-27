import { NextRequest, NextResponse } from "next/server";
import {
  applyActiveCookies,
  listAccountsFromVault,
  readVault,
  readVaultFromRequest,
} from "@/lib/mail-session";
import { ensureVaultTokens, refreshAccessToken } from "@/lib/oauth-tokens";
import { assertSameOrigin } from "@/lib/request-guard";

export async function POST(req: NextRequest) {
  const origin = assertSameOrigin(req);
  if (!origin.ok) {
    return NextResponse.json(
      { ok: false, error: { message: origin.message } },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { accountId?: string };
  const accountId = body.accountId?.trim();
  if (!accountId) {
    return NextResponse.json(
      { ok: false, error: { message: "accountId обязателен" } },
      { status: 400 },
    );
  }

  const vault = readVaultFromRequest(req) || (await readVault());
  if (!vault?.accounts[accountId]) {
    return NextResponse.json(
      { ok: false, error: { message: "Аккаунт не найден" } },
      { status: 404 },
    );
  }

  let next = { ...vault, activeId: accountId };
  const target = next.accounts[accountId];
  let expiresIn = 3600;

  // Inactive cookies store refresh only — mint access before activating
  if (!target.accessToken && target.refreshToken) {
    const refreshed = await refreshAccessToken(target.refreshToken);
    if (refreshed) {
      next = {
        ...next,
        accounts: {
          ...next.accounts,
          [accountId]: {
            ...target,
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
          },
        },
      };
      expiresIn = refreshed.expiresIn;
    }
  } else {
    const ensured = await ensureVaultTokens(next);
    next = ensured.vault;
    expiresIn = ensured.expiresIn;
  }

  const res = NextResponse.json({
    ok: true,
    data: {
      accountId,
      accounts: listAccountsFromVault(next),
    },
  });
  applyActiveCookies(res, next, expiresIn);
  return res;
}

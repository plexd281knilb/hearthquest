/**
 * HearthQuest Google OAuth 2.0 + OIDC Authentication Engine (Zero-Dependency)
 * - Authorization Code + PKCE (S256) + HMAC-signed state/nonce cookie
 * - Native Node `node:crypto` RS256 JWKS verification against Google's OIDC public keys
 * - Guided local setup / sandbox fallback when GOOGLE_CLIENT_ID is not yet configured
 */

import crypto from "node:crypto";
import {
  AgeGroupPreset,
  RulesTier,
  constantTimeEquals,
  getOrCreateRuntimeSecret,
} from "@hearthquest/shared-types";

export interface GoogleOAuthConfigStatus {
  configured: boolean;
  clientId: string;
  hasClientSecret: boolean;
  redirectUri: string;
  sandboxAvailable: boolean;
}

export interface VerifiedGoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  avatarUrl?: string;
}

export interface GoogleOAuthTransaction {
  state: string;
  nonce: string;
  codeVerifier: string;
  redirectUri: string;
  preferredRulesTier?: RulesTier;
  preferredAgeGroup?: AgeGroupPreset;
  exp: number;
}

const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

let cachedJwks: { keys: any[]; fetchedAt: number } | null = null;

function getGoogleOAuthSigningSecret(): string {
  return getOrCreateRuntimeSecret("signing", [
    "HEARTHQUEST_LICENSE_SECRET",
    "STRIPE_WEBHOOK_SECRET",
  ]);
}

export function getGoogleAuthConfig(requestOrigin?: string): GoogleOAuthConfigStatus {
  const clientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
  const baseOrigin = (requestOrigin || process.env.PUBLIC_VTT_URL || "http://localhost:3000").replace(
    /\/+$/,
    ""
  );
  const redirectUri =
    (process.env.GOOGLE_REDIRECT_URI || "").trim() || `${baseOrigin}/api/auth/google/callback`;
  const configured = Boolean(clientId && clientSecret);
  const sandboxAllowedInEnv =
    process.env.NODE_ENV !== "production" ||
    process.env.HEARTHQUEST_ALLOW_GOOGLE_SANDBOX === "true";
  const sandboxAvailable =
    !configured && sandboxAllowedInEnv && process.env.HEARTHQUEST_DISABLE_GOOGLE_SANDBOX !== "true";

  return {
    configured,
    clientId,
    hasClientSecret: Boolean(clientSecret),
    redirectUri,
    sandboxAvailable,
  };
}

export function isGoogleAuthConfigured(): boolean {
  return getGoogleAuthConfig().configured;
}

function createPkceChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

function signTransactionToken(tx: GoogleOAuthTransaction): string {
  const payload = Buffer.from(JSON.stringify(tx), "utf8").toString("base64url");
  const sig = crypto
    .createHmac("sha256", getGoogleOAuthSigningSecret())
    .update(`g_tx:${payload}`)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyGoogleOAuthTransactionCookie(
  cookieValue: string,
  returnedState: string
): GoogleOAuthTransaction {
  if (!cookieValue || !cookieValue.includes(".")) {
    throw new Error("Missing or invalid Google OAuth state cookie.");
  }
  const [payload, sig] = cookieValue.split(".");
  const expected = crypto
    .createHmac("sha256", getGoogleOAuthSigningSecret())
    .update(`g_tx:${payload}`)
    .digest("base64url");
  const a = Buffer.from(sig || "", "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error("Google OAuth state cookie signature mismatch.");
  }

  let parsed: GoogleOAuthTransaction;
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as GoogleOAuthTransaction;
  } catch {
    throw new Error("Corrupted Google OAuth state payload.");
  }
  if (!parsed.exp || Date.now() > parsed.exp) {
    throw new Error("Google OAuth login session expired. Please try again.");
  }
  const stateA = Buffer.from(parsed.state || "", "utf8");
  const stateB = Buffer.from((returnedState || "").trim(), "utf8");
  if (!stateA.length || stateA.length !== stateB.length || !crypto.timingSafeEqual(stateA, stateB)) {
    throw new Error("Google OAuth state mismatch (CSRF protection triggered).");
  }
  return parsed;
}

export function createGoogleOAuthStartParams(params: {
  requestOrigin: string;
  preferredRulesTier?: RulesTier;
  preferredAgeGroup?: AgeGroupPreset;
}): {
  authUrl: string;
  cookieToken: string;
  transaction: GoogleOAuthTransaction;
  config: GoogleOAuthConfigStatus;
} {
  const config = getGoogleAuthConfig(params.requestOrigin);
  const state = crypto.randomBytes(24).toString("base64url");
  const nonce = crypto.randomBytes(24).toString("base64url");
  const codeVerifier = crypto.randomBytes(32).toString("base64url");

  const transaction: GoogleOAuthTransaction = {
    state,
    nonce,
    codeVerifier,
    redirectUri: config.redirectUri,
    preferredRulesTier: params.preferredRulesTier,
    preferredAgeGroup: params.preferredAgeGroup,
    exp: Date.now() + 1000 * 60 * 10,
  };

  const url = new URL(GOOGLE_AUTH_URL);
  if (config.clientId) {
    url.searchParams.set("client_id", config.clientId);
  }
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge", createPkceChallenge(codeVerifier));
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("access_type", "online");
  url.searchParams.set("prompt", "select_account");

  return {
    authUrl: url.toString(),
    cookieToken: signTransactionToken(transaction),
    transaction,
    config,
  };
}

async function fetchGoogleJwks(jwksOverride?: { keys: any[] }): Promise<any[]> {
  if (jwksOverride && Array.isArray(jwksOverride.keys)) {
    return jwksOverride.keys;
  }
  if (cachedJwks && Date.now() - cachedJwks.fetchedAt < 1000 * 60 * 60) {
    return cachedJwks.keys;
  }
  const res = await fetch(GOOGLE_JWKS_URL);
  if (!res.ok) {
    throw new Error(`Failed to load Google public signing keys (${res.status}).`);
  }
  const json = (await res.json()) as { keys?: any[] };
  if (!Array.isArray(json.keys) || json.keys.length === 0) {
    throw new Error("Google JWKS response returned no signing keys.");
  }
  cachedJwks = { keys: json.keys, fetchedAt: Date.now() };
  return json.keys;
}

export async function verifyGoogleIdToken(params: {
  idToken: string;
  expectedAudience?: string;
  expectedNonce?: string;
  jwksOverride?: { keys: any[] };
  nowSeconds?: number;
}): Promise<VerifiedGoogleIdentity> {
  const parts = String(params.idToken || "").trim().split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid Google ID token format.");
  }
  const [headerB64, payloadB64, sigB64] = parts;

  let header: { alg?: string; kid?: string };
  let payload: Record<string, any>;
  try {
    header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf8"));
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    throw new Error("Malformed Google ID token header or payload.");
  }

  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("Unsupported Google ID token signing algorithm.");
  }

  const keys = await fetchGoogleJwks(params.jwksOverride);
  const matchingJwk = keys.find((k) => k && k.kid === header.kid);
  if (!matchingJwk) {
    throw new Error("Google signing key not found for token kid.");
  }

  const publicKey = crypto.createPublicKey({ key: matchingJwk, format: "jwk" });
  const signingInput = Buffer.from(`${headerB64}.${payloadB64}`, "utf8");
  const signature = Buffer.from(sigB64, "base64url");
  const validSig = crypto.verify("RSA-SHA256", signingInput, publicKey, signature);
  if (!validSig) {
    throw new Error("Google ID token signature verification failed.");
  }

  const iss = String(payload.iss || "");
  if (iss !== "https://accounts.google.com" && iss !== "accounts.google.com") {
    throw new Error(`Invalid Google token issuer: ${iss}`);
  }

  const expectedAud = (params.expectedAudience || process.env.GOOGLE_CLIENT_ID || "").trim();
  if (!expectedAud || String(payload.aud || "") !== expectedAud) {
    throw new Error("Google ID token audience mismatch.");
  }

  const nowSec = params.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (!payload.exp || !Number.isFinite(Number(payload.exp)) || Number(payload.exp) <= nowSec) {
    throw new Error("Google ID token has expired.");
  }

  if (params.expectedNonce && !constantTimeEquals(String(payload.nonce || ""), params.expectedNonce)) {
    throw new Error("Google ID token nonce mismatch.");
  }

  if (!payload.sub || !payload.email) {
    throw new Error("Google ID token missing subject or email.");
  }
  if (payload.email_verified !== true && payload.email_verified !== "true") {
    throw new Error("Google account email is not verified.");
  }

  return {
    sub: String(payload.sub),
    email: String(payload.email).trim().toLowerCase(),
    emailVerified: true,
    name: String(payload.name || payload.given_name || String(payload.email).split("@")[0]),
    avatarUrl: payload.picture ? String(payload.picture) : undefined,
  };
}

export async function exchangeGoogleAuthorizationCode(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  expectedNonce?: string;
  clientId?: string;
  clientSecret?: string;
  tokenFetcher?: (formBody: URLSearchParams) => Promise<{ id_token?: string; access_token?: string }>;
  jwksOverride?: { keys: any[] };
}): Promise<VerifiedGoogleIdentity> {
  const clientId = (params.clientId || process.env.GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = (params.clientSecret || process.env.GOOGLE_CLIENT_SECRET || "").trim();
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured for code exchange.");
  }

  const form = new URLSearchParams();
  form.set("code", params.code);
  form.set("client_id", clientId);
  form.set("client_secret", clientSecret);
  form.set("redirect_uri", params.redirectUri);
  form.set("grant_type", "authorization_code");
  form.set("code_verifier", params.codeVerifier);

  let tokenJson: { id_token?: string; error?: string; error_description?: string };
  if (params.tokenFetcher) {
    tokenJson = await params.tokenFetcher(form);
  } else {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    tokenJson = (await res.json()) as {
      id_token?: string;
      error?: string;
      error_description?: string;
    };
    if (!res.ok) {
      throw new Error(tokenJson.error_description || tokenJson.error || "Google token exchange failed.");
    }
  }

  if (!tokenJson.id_token) {
    throw new Error("Google OAuth response did not include an id_token.");
  }

  return verifyGoogleIdToken({
    idToken: tokenJson.id_token,
    expectedAudience: clientId,
    expectedNonce: params.expectedNonce,
    jwksOverride: params.jwksOverride,
  });
}

export function renderGoogleSetupGuideHtml(params: {
  config: GoogleOAuthConfigStatus;
  isFirstAccountSetup: boolean;
}): string {
  const esc = (s: string) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const faviconSvg = encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#0f172a"/><path d="M32 10L52 22V42L32 54L12 42V22Z" fill="#f59e0b"/><text x="32" y="39" text-anchor="middle" font-size="22" font-weight="900" fill="#0f172a">HQ</text></svg>'
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>HearthQuest — Google Auth Setup</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${faviconSvg}" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    :root { color-scheme: dark; }
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, sans-serif; min-height: 100vh; min-height: 100dvh; }
    .min-h-dvh { min-height: 100vh; min-height: 100dvh; }
    .gs-btn-nav { background-color: #1e293b; color: #e2e8f0; border: 1px solid #334155; }
    .gs-code-box { background-color: #0f172a; color: #6ee7b7; border: 1px solid #1e293b; }
    .gs-first-banner { background-color: rgba(120, 53, 15, 0.35); border-color: rgba(245, 158, 11, 0.5); color: #fde68a; }
    .gs-sandbox-box { background-color: rgba(120, 53, 15, 0.2); border-color: rgba(245, 158, 11, 0.4); }
    body[data-theme="light"] {
      color-scheme: light;
      background: radial-gradient(circle at top, #fdfbf7 0%, #f4ede4 100%) !important;
      color: #1c1917 !important;
    }
    body[data-theme="light"] .gs-card {
      background-color: #ffffff !important;
      border-color: #d97706 !important;
      color: #1c1917 !important;
    }
    body[data-theme="light"] .gs-inner {
      background-color: #fbf9f5 !important;
      border-color: #e5ded2 !important;
      color: #292524 !important;
    }
    body[data-theme="light"] .gs-btn-nav {
      background-color: #f3ece1 !important;
      border-color: #d6cbba !important;
      color: #1c1917 !important;
    }
    body[data-theme="light"] .gs-code-box {
      background-color: #f5efe6 !important;
      border-color: #d6cbba !important;
      color: #065f46 !important;
    }
    body[data-theme="light"] .gs-first-banner {
      background-color: #fef3c7 !important;
      border-color: #d97706 !important;
      color: #78350f !important;
    }
    body[data-theme="light"] .gs-sandbox-box {
      background-color: #fffbeb !important;
      border-color: #f59e0b !important;
      color: #292524 !important;
    }
    body[data-theme="light"] .text-amber-400,
    body[data-theme="light"] .text-amber-300,
    body[data-theme="light"] .text-amber-200 { color: #92400e !important; }
    body[data-theme="light"] .text-emerald-300 { color: #065f46 !important; }
    body[data-theme="light"] .text-slate-100,
    body[data-theme="light"] .text-slate-200,
    body[data-theme="light"] .text-slate-300 { color: #292524 !important; }
    body[data-theme="light"] .text-slate-400 { color: #57534e !important; }
    body[data-theme="light"] input,
    body[data-theme="light"] select {
      background-color: #ffffff !important;
      border-color: #d6cbba !important;
      color: #1c1917 !important;
    }
    @media (max-width: 640px) {
      input, select { font-size: 16px !important; }
    }
  </style>
</head>
<body class="min-h-dvh bg-slate-950 text-slate-100 flex items-center justify-center p-4">
  <div class="gs-card w-full max-w-lg bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h1 class="text-lg font-extrabold text-amber-400 flex items-center gap-2">
        <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/></svg>
        <span>Google OAuth 2.0 Setup</span>
      </h1>
      <div class="flex items-center gap-2">
        <button type="button" onclick="toggleGuideTheme()" class="gs-btn-nav text-xs px-3 py-2 min-h-[40px] rounded-xl font-bold cursor-pointer">🌓 Theme</button>
        <a href="/" class="gs-btn-nav text-xs px-3 py-2 min-h-[40px] inline-flex items-center rounded-xl font-bold">← Sign In</a>
      </div>
    </div>
    ${
      params.isFirstAccountSetup
        ? `<div class="gs-first-banner p-3 rounded-xl border text-xs">
            <strong>First-Run Server Setup:</strong> Whichever account signs in first (Google or Email) becomes the <strong>Admin Account</strong>.
          </div>`
        : ""
    }
    <div class="gs-inner p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2 text-slate-300 leading-relaxed">
      <div class="font-bold text-slate-100">To enable live Google Sign-In in production / Unraid:</div>
      <ol class="list-decimal list-inside space-y-1.5">
        <li>Open <strong>Google Cloud Console → APIs &amp; Services → Credentials → Create OAuth client ID (Web application)</strong>.</li>
        <li>Add this <strong>Authorized redirect URI</strong>:<br />
          <code class="gs-code-box block mt-1 p-2 rounded-lg font-mono break-all">${esc(params.config.redirectUri)}</code>
        </li>
        <li>Set <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> in <code>docker-compose.yml</code> or container env vars and restart.</li>
      </ol>
    </div>

    ${
      params.config.sandboxAvailable
        ? `<form onsubmit="submitSandboxGoogle(event)" class="gs-sandbox-box p-4 rounded-2xl border space-y-3 text-xs">
            <div class="font-extrabold text-amber-300">Local Dev Google Sign-In Preview (OAuth Env Vars Not Set Yet)</div>
            <p class="text-slate-400">Test the Google SSO flow and First-Account Admin promotion locally right now before adding Cloud Console keys:</p>
            <input id="gsb-name" type="text" required maxlength="64" value="GM Admin" placeholder="Google Display Name" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100" />
            <input id="gsb-email" type="email" required value="admin@gmail.com" placeholder="Google Email (@gmail.com)" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100" />
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select id="gsb-tier" class="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2.5 text-slate-100">
                <option value="STORYBOOK_D6">📖 Storybook D6</option>
                <option value="APPRENTICE_5E_LITE">🛡️ Apprentice 5e Lite</option>
                <option value="STANDARD_5E">🐉 Standard 5e</option>
              </select>
              <select id="gsb-age" class="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2.5 text-slate-100">
                <option value="AGES_5_7">🐣 Ages 5–7</option>
                <option value="AGES_8_10" selected>🧭 Ages 8–10</option>
                <option value="AGES_11_13">⚔️ Ages 11–13</option>
                <option value="TEENS_13_PLUS">🔥 Teens 13+</option>
              </select>
            </div>
            <button type="submit" class="w-full py-2.5 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black cursor-pointer">
              Continue as Google User →
            </button>
            <div id="gsb-err" class="text-rose-400 font-semibold"></div>
          </form>
          <script>
            async function submitSandboxGoogle(e) {
              e.preventDefault();
              const res = await fetch("/api/auth/google/sandbox-login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: document.getElementById("gsb-name").value.trim(),
                  email: document.getElementById("gsb-email").value.trim(),
                  preferredRulesTier: document.getElementById("gsb-tier").value,
                  preferredAgeGroup: document.getElementById("gsb-age").value
                })
              });
              const data = await res.json();
              if (!data.ok) {
                document.getElementById("gsb-err").innerText = data.error || "Failed";
                return;
              }
              localStorage.setItem("hq_vtt_auth_token", data.token);
              window.location.assign("/");
            }
          </script>`
        : ""
    }
  </div>
  <script>
    function applyGuideTheme(t) {
      document.body.setAttribute("data-theme", t);
    }
    function toggleGuideTheme() {
      var cur = document.body.getAttribute("data-theme") === "light" ? "light" : "dark";
      var next = cur === "light" ? "dark" : "light";
      localStorage.setItem("hearthquest_theme", next);
      localStorage.setItem("hearthquest-theme", next);
      applyGuideTheme(next);
    }
    applyGuideTheme(localStorage.getItem("hearthquest_theme") || localStorage.getItem("hearthquest-theme") || "dark");
  </script>
</body>
</html>`;
}

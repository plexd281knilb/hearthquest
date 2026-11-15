import { RoomSessionState, getBuildMetadata } from "@hearthquest/shared-types";
import { HEARTHQUEST_SKILLS } from "@hearthquest/srd-rules";
import { computeRoomInviteSig } from "./auth-store";
import {
  renderAtmosphereControlsHtml,
  renderCombatAndAmbientAudioScript,
  renderCombatInitiativeBarHtml,
} from "./combat-audio-engine";
import { renderDice3DEngineScript, renderDice3DOverlayHtml } from "./dice-3d-engine";
import { renderLighting2DEngineScript, renderLightingControlsHtml } from "./lighting-engine";
import { renderTabletopToolsControlsHtml, renderToolsAndWeatherEngineScript } from "./tools-weather-engine";
import { renderTokenForgeClientScript, renderTokenForgeModalHtml } from "./token-forge-engine";

const GOOGLE_ICON_SVG = `<svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.8-5.4 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z"/><path fill="#4285F4" d="M21.2 12.2c0-.6-.1-1.1-.2-1.6H12v3.9h5.4c-.3 1.3-1.1 2.4-2.2 3.1l3.5 2.7c2-1.9 2.5-4.7 2.5-8.1z"/><path fill="#FBBC05" d="M6 14.3c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L2.5 7C1.8 8.5 1.4 10.2 1.4 12s.4 3.5 1.1 5L6 14.3z"/><path fill="#34A853" d="M12 21.6c2.6 0 4.8-.9 6.4-2.3l-3.5-2.7c-.9.6-2 1-2.9 1-2.3 0-4.2-1.5-4.9-3.6L3.6 16.7C5.2 19.7 8.4 21.6 12 21.6z"/></svg>`;

export function renderVttLoginGateHtml(options?: {
  isFirstAccountSetup?: boolean;
  googleConfigured?: boolean;
  oauthError?: string;
}): string {
  const buildMeta = getBuildMetadata();
  const isFirstSetup = Boolean(options?.isFirstAccountSetup);
  const googleConfigured = Boolean(options?.googleConfigured);
  const esc = (s: string) =>
    String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const oauthErrorHtml = options?.oauthError
    ? `<div class="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-xs font-semibold text-rose-200">⚠️ ${esc(options.oauthError)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>HearthQuest VTT — ${isFirstSetup ? "Admin First-Time Setup" : "Sign In"}</title>
  <link rel="icon" type="image/png" href="/assets/hearthquest-icon.png" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body[data-theme="light"] {
      background: radial-gradient(circle at top, #fdfbf7 0%, #f4ede4 100%) !important;
      color: #1c1917 !important;
    }
    body[data-theme="light"] #vtt-login-gate {
      background-color: #ffffff !important;
      border-color: #d97706 !important;
      color: #1c1917 !important;
    }
    body[data-theme="light"] input,
    body[data-theme="light"] select {
      background-color: #fbf9f5 !important;
      border-color: #d6cbba !important;
      color: #1c1917 !important;
    }
    body[data-theme="light"] .text-slate-100,
    body[data-theme="light"] .text-slate-200,
    body[data-theme="light"] .text-slate-300 { color: #292524 !important; }
    body[data-theme="light"] .text-slate-400 { color: #57534e !important; }
    body[data-theme="light"] .text-amber-200 { color: #78350f !important; }
    body[data-theme="light"] .text-emerald-300 { color: #065f46 !important; }
    body[data-theme="light"] .bg-amber-950\/70,
    body[data-theme="light"] .bg-amber-950\/50 { background-color: #fef3c7 !important; }
    body[data-theme="light"] .bg-emerald-950 { background-color: #d1fae5 !important; }
    body[data-theme="light"] .bg-slate-800 { background-color: #e7e5e4 !important; color: #1c1917 !important; }
  </style>
</head>
<body data-theme="dark" class="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
  <div id="vtt-login-gate" class="w-full max-w-md bg-slate-900 border-2 ${isFirstSetup ? "border-amber-400" : "border-amber-500/60"} rounded-3xl p-6 shadow-2xl space-y-4">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <img src="/assets/hearthquest-icon.png" alt="HearthQuest" class="w-10 h-10 rounded-xl shadow-md" />
        <div>
          <h1 class="text-xl font-extrabold text-amber-400 leading-tight">HearthQuest VTT</h1>
          <p class="text-[11px] text-slate-400">${isFirstSetup ? "First-Run Server Admin Setup" : "Private Family Tabletop Instances"}</p>
        </div>
      </div>
      <div class="flex items-center gap-1.5">
        <button type="button" id="gate-theme-btn" onclick="toggleGateTheme()" class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-800 text-slate-200 border border-slate-600">🌙</button>
        <span class="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40">${buildMeta.badgeText}</span>
      </div>
    </div>

    ${
      isFirstSetup
        ? `<div id="first-admin-setup-banner" class="p-3 rounded-xl bg-amber-950/70 border border-amber-400/60 text-xs text-amber-200 leading-relaxed">
            👑 <strong>First Login = Admin Account:</strong> No accounts exist yet. Create your initial account or continue with Google below to claim the <strong>Admin</strong> role and launch your private tabletop room.
          </div>`
        : `<div class="p-3 rounded-xl bg-amber-950/50 border border-amber-500/40 text-xs text-amber-200 leading-relaxed">
            🔐 <strong>Sign In Required:</strong> Each user gets their own private room code, custom tailored story hook, heroes, and saved progression isolated from other groups.
          </div>`
    }

    ${oauthErrorHtml}

    <button id="btn-google-signin" type="button" onclick="startGoogleOAuth()" class="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs flex items-center justify-center gap-2.5 shadow-md transition">
      ${GOOGLE_ICON_SVG}
      <span>${isFirstSetup ? "Continue with Google (Claim Admin)" : "Continue with Google"}</span>
      <span class="px-1.5 py-0.5 text-[10px] rounded bg-slate-200 text-slate-700 font-mono">${googleConfigured ? "OAuth2" : "Setup / Preview"}</span>
    </button>

    <div class="flex items-center gap-2 text-[11px] text-slate-500">
      <div class="h-px flex-1 bg-slate-800"></div>
      <span>OR USE EMAIL</span>
      <div class="h-px flex-1 bg-slate-800"></div>
    </div>

    <div class="flex gap-2 text-xs">
      <button type="button" onclick="switchGateTab('login')" id="gate-tab-login" class="flex-1 py-2 rounded-xl ${isFirstSetup ? "bg-slate-800 text-slate-300 font-bold" : "bg-indigo-600 text-white font-extrabold"}">🔑 Sign In</button>
      <button type="button" onclick="switchGateTab('register')" id="gate-tab-register" class="flex-1 py-2 rounded-xl ${isFirstSetup ? "bg-amber-500 text-slate-950 font-extrabold" : "bg-slate-800 text-slate-300 font-bold"}">${isFirstSetup ? "👑 Create Admin Account" : "✨ Create Account"}</button>
    </div>

    <form id="gate-form-login" onsubmit="submitGateLogin(event)" class="${isFirstSetup ? "hidden " : ""}space-y-3 text-xs">
      <input id="gate-login-email" type="email" required placeholder="Email Address" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100" />
      <input id="gate-login-password" type="password" required placeholder="Password" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100" />
      <button type="submit" class="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black">🔓 Sign In to My Session</button>
    </form>

    <form id="gate-form-register" onsubmit="submitGateRegister(event)" class="${isFirstSetup ? "" : "hidden "}space-y-2.5 text-xs">
      <input id="gate-reg-family" type="text" required placeholder="Family / Group Name (e.g., The Miller Family)" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100" />
      <input id="gate-reg-email" type="email" required placeholder="Email Address" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100" />
      <input id="gate-reg-password" type="password" required minlength="6" oninput="updateGatePasswordMatchHint()" placeholder="Password (6+ characters)" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100" />
      <input id="gate-reg-password-confirm" type="password" required minlength="6" oninput="updateGatePasswordMatchHint()" placeholder="Re-enter Password" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100" />
      <div id="gate-reg-pw-match" class="hidden text-[11px] font-semibold"></div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] font-bold text-slate-400 mb-1">Game System</label>
          <select id="gate-reg-tier" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-slate-100 font-semibold">
            <option value="STORYBOOK_D6">📖 Storybook (Easy D6)</option>
            <option value="APPRENTICE_5E_LITE">🛡️ Apprentice (5e Lite)</option>
            <option value="STANDARD_5E">🐉 Standard 5e (Tactical)</option>
          </select>
        </div>
        <div>
          <label class="block text-[10px] font-bold text-slate-400 mb-1">Age Group</label>
          <select id="gate-reg-age" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-slate-100 font-semibold">
            <option value="AGES_5_7">🐣 Ages 5–7</option>
            <option value="AGES_8_10" selected>🧭 Ages 8–10</option>
            <option value="AGES_11_13">⚔️ Ages 11–13</option>
            <option value="TEENS_13_PLUS">🔥 Teens 13+</option>
          </select>
        </div>
      </div>
      <button type="submit" class="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black">${isFirstSetup ? "👑 Create Admin Account & Launch Session" : "🎮 Create My Account & Launch Private Session"}</button>
    </form>

    <div id="gate-feedback" class="text-xs font-semibold min-h-[1rem]"></div>
    <p class="text-[11px] text-slate-400 text-center">
      📱 Joining as a Kid Tablet or Living Room TV? Scan the host's QR Join code from their signed-in screen.
    </p>
  </div>

  <script>
    (function initGateTheme() {
      const t = localStorage.getItem("hearthquest-theme") || "dark";
      document.body.setAttribute("data-theme", t);
      const b = document.getElementById("gate-theme-btn");
      if (b) b.innerText = t === "light" ? "☀️" : "🌙";
    })();
    function toggleGateTheme() {
      const cur = document.body.getAttribute("data-theme") || "dark";
      const nxt = cur === "dark" ? "light" : "dark";
      document.body.setAttribute("data-theme", nxt);
      localStorage.setItem("hearthquest-theme", nxt);
      const b = document.getElementById("gate-theme-btn");
      if (b) b.innerText = nxt === "light" ? "☀️" : "🌙";
    }
    function startGoogleOAuth() {
      const tier = document.getElementById("gate-reg-tier")?.value || "STORYBOOK_D6";
      const age = document.getElementById("gate-reg-age")?.value || "AGES_8_10";
      window.location.assign("/api/auth/google/start?preferredRulesTier=" + encodeURIComponent(tier) + "&preferredAgeGroup=" + encodeURIComponent(age));
    }

    function switchGateTab(tab) {
      const isReg = tab === "register";
      document.getElementById("gate-form-login").classList.toggle("hidden", isReg);
      document.getElementById("gate-form-register").classList.toggle("hidden", !isReg);
      document.getElementById("gate-tab-login").className = !isReg
        ? "flex-1 py-2 rounded-xl bg-indigo-600 text-white font-extrabold"
        : "flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold";
      document.getElementById("gate-tab-register").className = isReg
        ? "flex-1 py-2 rounded-xl bg-amber-500 text-slate-950 font-extrabold"
        : "flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold";
    }

    // If local token exists from prior browser session, verify cleanly via /api/auth/me cookie-sync
    (async () => {
      const existingToken = localStorage.getItem("hq_vtt_auth_token");
      if (existingToken) {
        const res = await fetch("/api/auth/me", { headers: { Authorization: "Bearer " + existingToken } });
        const data = await res.json();
        if (data && data.ok && data.account) {
          window.location.assign("/");
        } else {
          localStorage.removeItem("hq_vtt_auth_token");
        }
      }
    })();

    async function submitGateLogin(e) {
      e.preventDefault();
      const fb = document.getElementById("gate-feedback");
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: document.getElementById("gate-login-email").value.trim(),
          password: document.getElementById("gate-login-password").value,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        fb.className = "text-xs font-semibold text-rose-400";
        fb.innerText = data.error || "Sign in failed";
        return;
      }
      localStorage.setItem("hq_vtt_auth_token", data.token);
      window.location.assign("/");
    }

    function updateGatePasswordMatchHint() {
      const pw = document.getElementById("gate-reg-password").value;
      const confirmEl = document.getElementById("gate-reg-password-confirm");
      const hint = document.getElementById("gate-reg-pw-match");
      if (!confirmEl || !hint) return;
      const confirmPw = confirmEl.value;
      if (!confirmPw) {
        hint.classList.add("hidden");
        return;
      }
      hint.classList.remove("hidden");
      if (pw === confirmPw) {
        hint.className = "text-[11px] font-semibold text-emerald-400";
        hint.innerText = "✅ Passwords match";
      } else {
        hint.className = "text-[11px] font-semibold text-rose-400";
        hint.innerText = "⚠️ Passwords do not match";
      }
    }

    async function submitGateRegister(e) {
      e.preventDefault();
      const fb = document.getElementById("gate-feedback");
      const password = document.getElementById("gate-reg-password").value;
      const confirmPassword = document.getElementById("gate-reg-password-confirm").value;
      if (password !== confirmPassword) {
        fb.className = "text-xs font-semibold text-rose-400";
        fb.innerText = "Passwords do not match. Please re-enter your password.";
        document.getElementById("gate-reg-password-confirm").focus();
        return;
      }
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyName: document.getElementById("gate-reg-family").value.trim(),
          email: document.getElementById("gate-reg-email").value.trim(),
          password,
          confirmPassword,
          preferredRulesTier: document.getElementById("gate-reg-tier").value,
          preferredAgeGroup: document.getElementById("gate-reg-age").value,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        fb.className = "text-xs font-semibold text-rose-400";
        fb.innerText = data.error || "Account creation failed";
        return;
      }
      localStorage.setItem("hq_vtt_auth_token", data.token);
      window.location.assign("/");
    }
  </script>
</body>
</html>`;
}

export function renderVttAppHtml(
  initialState: RoomSessionState,
  options?: { requireAuthLogin?: boolean; guestToken?: string }
): string {
  const serialized = JSON.stringify(initialState).replace(/</g, "\\u003c");
  const buildMeta = getBuildMetadata();
  const requireAuthLogin = Boolean(options?.requireAuthLogin);
  const initialInviteSig = computeRoomInviteSig(initialState.roomCode);
  const initialGuestToken = options?.guestToken || "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <meta name="theme-color" content="#f59e0b" />
  <meta name="msapplication-TileColor" content="#f59e0b" />
  <title>HearthQuest VTT — Room ${initialState.roomCode}</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='48' fill='%231e1b4b' stroke='%23f59e0b' stroke-width='6'/%3E%3Cpath d='M50 18 C70 18 80 24 80 50 C80 72 64 84 50 90 C36 84 20 72 20 50 C20 24 30 18 50 18 Z' fill='%230f172a' stroke='%23fbbf24' stroke-width='4'/%3E%3Cpath d='M50 32 C58 44 68 52 66 68 C64 80 54 82 50 82 C46 82 36 80 34 68 C32 52 42 44 50 32 Z' fill='%23ea580c'/%3E%3Cpath d='M50 44 C54 52 60 58 58 70 C56 78 52 80 50 80 C48 80 44 78 42 70 C40 58 46 52 50 44 Z' fill='%23fde047'/%3E%3C/svg%3E" />
  <link rel="alternate icon" type="image/png" href="/assets/hearthquest-icon.png" />
  <link rel="apple-touch-icon" href="/assets/hearthquest-icon.png" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/three@0.160.0/build/three.min.js"></script>
  <style>
    /* Dark Mode (Midnight Hearth) */
    body[data-theme="dark"] {
      background: radial-gradient(circle at top, #1e1b4b 0%, #090d16 100%);
      color: #f8fafc;
      font-family: system-ui, -apple-system, sans-serif;
    }
    body[data-theme="dark"] .theme-header {
      background-color: rgba(9, 13, 22, 0.95);
      border-color: rgba(99, 102, 241, 0.3);
    }
    body[data-theme="dark"] .theme-card {
      background-color: rgba(15, 23, 42, 0.9);
      border-color: rgba(51, 65, 85, 0.8);
      color: #f8fafc;
    }
    body[data-theme="dark"] .theme-inner-box {
      background-color: #020617;
      border-color: #1e293b;
      color: #cbd5e1;
    }
    body[data-theme="dark"] .theme-input {
      background-color: #020617;
      border-color: #334155;
      color: #ffffff;
    }

    /* Light Mode (Storybook Parchment) */
    body[data-theme="light"] {
      background: radial-gradient(circle at top, #fdfbf7 0%, #f4ede4 100%);
      color: #1c1917;
      font-family: system-ui, -apple-system, sans-serif;
    }
    body[data-theme="light"] .theme-header {
      background-color: rgba(255, 255, 255, 0.96);
      border-color: #e2d7c5;
      box-shadow: 0 2px 10px rgba(180, 83, 9, 0.05);
    }
    body[data-theme="light"] .theme-card {
      background-color: #ffffff !important;
      border-color: #e5ded2 !important;
      color: #1c1917 !important;
      box-shadow: 0 4px 16px rgba(120, 53, 15, 0.06);
    }
    body[data-theme="light"] .theme-inner-box {
      background-color: #fbf9f5 !important;
      border-color: #e8e0d4 !important;
      color: #292524 !important;
    }
    body[data-theme="light"] .theme-input {
      background-color: #ffffff !important;
      border-color: #d6cbba !important;
      color: #1c1917 !important;
    }
    body[data-theme="light"] h1,
    body[data-theme="light"] h2,
    body[data-theme="light"] h3,
    body[data-theme="light"] h4 {
      color: #92400e !important;
    }
    body[data-theme="light"] .text-slate-100,
    body[data-theme="light"] .text-slate-200 {
      color: #1c1917 !important;
    }
    body[data-theme="light"] .text-slate-300 {
      color: #44403c !important;
    }
    body[data-theme="light"] .text-slate-400 {
      color: #6b635b !important;
    }
    body[data-theme="light"] .text-amber-100,
    body[data-theme="light"] .text-amber-200,
    body[data-theme="light"] .text-amber-300,
    body[data-theme="light"] .text-amber-400 {
      color: #92400e !important;
    }
    body[data-theme="light"] .text-emerald-200,
    body[data-theme="light"] .text-emerald-300,
    body[data-theme="light"] .text-emerald-400 {
      color: #065f46 !important;
    }
    body[data-theme="light"] .text-purple-200,
    body[data-theme="light"] .text-purple-300,
    body[data-theme="light"] .text-purple-400 {
      color: #6b21a8 !important;
    }
    body[data-theme="light"] .text-indigo-200,
    body[data-theme="light"] .text-indigo-300,
    body[data-theme="light"] .text-indigo-400 {
      color: #3730a3 !important;
    }
    body[data-theme="light"] .text-sky-200,
    body[data-theme="light"] .text-sky-300,
    body[data-theme="light"] .text-sky-400 {
      color: #075985 !important;
    }
    body[data-theme="light"] .theme-card .bg-slate-800,
    body[data-theme="light"] .theme-header .bg-slate-800,
    body[data-theme="light"] .theme-card .bg-slate-900\/80,
    body[data-theme="light"] .theme-header .bg-slate-900\/80 {
      background-color: #f3ece1 !important;
      color: #292524 !important;
      border-color: #d6cbba !important;
    }
    body[data-theme="light"] .bg-amber-950\/40,
    body[data-theme="light"] .bg-amber-950\/50,
    body[data-theme="light"] .bg-amber-950\/70 {
      background-color: #fef3c7 !important;
      color: #78350f !important;
    }
    body[data-theme="light"] .bg-purple-950,
    body[data-theme="light"] .bg-purple-950\/40,
    body[data-theme="light"] .bg-purple-950\/60,
    body[data-theme="light"] .bg-purple-950\/70,
    body[data-theme="light"] .bg-purple-950\/80 {
      background-color: #f3e8ff !important;
      color: #581c87 !important;
    }
    body[data-theme="light"] .bg-indigo-950,
    body[data-theme="light"] .bg-indigo-950\/40,
    body[data-theme="light"] .bg-indigo-950\/50 {
      background-color: #e0e7ff !important;
      color: #312e81 !important;
    }
    body[data-theme="light"] .bg-emerald-950,
    body[data-theme="light"] .bg-emerald-950\/30,
    body[data-theme="light"] .bg-emerald-950\/50,
    body[data-theme="light"] .bg-emerald-950\/70,
    body[data-theme="light"] .bg-emerald-950\/80 {
      background-color: #d1fae5 !important;
      color: #065f46 !important;
    }
    body[data-theme="light"] code {
      background-color: #efe7da !important;
      color: #7c2d12 !important;
    }
    body[data-theme="light"] .skill-chip-dark-fallback {
      background-color: #fef3c7 !important;
      color: #78350f !important;
      border-color: #fcd34d !important;
    }
    .active-turn-ring {
      box-shadow: 0 0 0 3px #f43f5e, 0 0 18px rgba(244, 63, 94, 0.85);
      transform: scale(1.1);
    }

    /* 10x6 Tactical Grid */
    .grid-board {
      display: grid;
      grid-template-columns: repeat(10, minmax(0, 1fr));
      grid-template-rows: repeat(6, minmax(0, 1fr));
      aspect-ratio: 10 / 6;
      background-size: cover;
      background-position: center;
    }

    /* Themed Battlemap Backgrounds (2x2 tactical square alignment — boosted tile contrast) */
    .bg-bakery {
      background-image: url('/assets/tiles/tile-bakery-floor.svg');
      background-size: 20% 33.3333%;
      background-repeat: repeat;
      filter: brightness(1.12) contrast(1.06);
    }
    .bg-treehouse {
      background-image: url('/assets/tiles/tile-treehouse-wood.svg');
      background-size: 20% 33.3333%;
      background-repeat: repeat;
      filter: brightness(1.14) contrast(1.06);
    }
    .bg-starlight {
      background-image: url('/assets/tiles/tile-starlight-deck.svg');
      background-size: 20% 33.3333%;
      background-repeat: repeat;
      filter: brightness(1.18) contrast(1.08);
    }

    body[data-theme="light"] .bg-bakery {
      background-image: url('/assets/tiles/tile-bakery-floor.svg');
      background-size: 20% 33.3333%;
      background-repeat: repeat;
      filter: brightness(1.24) contrast(1.04);
    }
    body[data-theme="light"] .bg-treehouse {
      background-image: url('/assets/tiles/tile-treehouse-wood.svg');
      background-size: 20% 33.3333%;
      background-repeat: repeat;
      filter: brightness(1.24) contrast(1.04);
    }
    body[data-theme="light"] .bg-starlight {
      background-image: url('/assets/tiles/tile-starlight-deck.svg');
      background-size: 20% 33.3333%;
      background-repeat: repeat;
      filter: brightness(1.28) contrast(1.05);
    }

    /* High-visibility individual tile borders & reachable move range */
    .vtt-cell {
      border: 1px solid rgba(251, 191, 36, 0.34);
      box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.18);
    }
    body[data-theme="light"] .vtt-cell {
      border: 1px solid rgba(120, 53, 15, 0.38);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
    }
    .vtt-cell-reachable {
      background-color: rgba(16, 185, 129, 0.14);
      box-shadow: inset 0 0 0 1px rgba(52, 211, 153, 0.42);
    }
    .vtt-cell-reachable:hover {
      background-color: rgba(52, 211, 153, 0.28) !important;
    }

    @keyframes trapPulseRing {
      0%, 100% { transform: scale(0.95); opacity: 0.72; }
      50% { transform: scale(1.06); opacity: 1; }
    }
    .trap-hazard-sprite {
      animation: trapPulseRing 2.6s ease-in-out infinite;
    }

    /* Token Standee Styling */
    .token-standee {
      position: relative;
      transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.18s ease;
      cursor: pointer;
    }
    .token-standee:hover {
      transform: scale(1.18) translateY(-4px);
      z-index: 30;
      box-shadow: 0 10px 25px -5px rgba(245, 158, 11, 0.5);
    }
    .token-portrait-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 9999px;
      pointer-events: none;
    }
  </style>
</head>
<body class="min-h-screen flex flex-col" data-theme="dark">
  <!-- Top Navigation & 3-Screen Mode Switcher -->
  <header class="theme-header border-b px-4 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40 backdrop-blur">
    <div class="flex items-center gap-3">
      <span class="text-2xl animate-pulse">🛡️</span>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="font-extrabold text-lg tracking-tight text-amber-400">HearthQuest</h1>
          <span id="room-code-badge" class="px-2.5 py-0.5 text-xs font-mono font-bold rounded-full bg-indigo-600 text-white border border-indigo-400 shadow-sm">
            ROOM: ${initialState.roomCode}
          </span>
          <span id="build-version-badge" class="px-2.5 py-0.5 text-[11px] font-mono font-bold rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-500/40" title="Build updated ${buildMeta.updatedAt}">
            ${buildMeta.badgeText}
          </span>
          <button onclick="toggleQrJoinModal()" id="btn-qr-join" class="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/50 transition">
            📲 QR Join
          </button>
          <button onclick="openSessionWalkthroughModal(0); toggleStartHereGuideBar(true);" id="btn-session-walkthrough" class="px-2.5 py-0.5 text-xs font-bold rounded-full bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/50 transition">
            🧭 Start Here Guide
          </button>
          <a id="btn-open-storefront" href="http://localhost:3001/store" onclick="this.href=window.location.protocol+'//'+window.location.hostname+':3001/store'" target="_blank" class="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/50 transition">
            🛍️ Store
          </a>
          <button onclick="toggleVttAuthModal(true)" id="btn-vtt-account" class="px-2.5 py-0.5 text-xs font-bold rounded-full bg-purple-500/25 hover:bg-purple-500/40 text-purple-200 border border-purple-400/50 transition">
            👤 Demo Account (Session 1 Free)
          </button>
          <button onclick="openVttAdminModal()" id="btn-open-vtt-admin" class="hidden px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-500/25 hover:bg-amber-500/40 text-amber-200 border border-amber-400/60 transition">
            👑 Admin Console
          </button>
        </div>
        <p id="campaign-subtitle" class="text-xs text-slate-400">${initialState.campaignTitle}</p>
      </div>
    </div>

    <!-- 3-Screen Ecosystem Switcher -->
    <div class="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-700/80">
      <button onclick="setDisplayMode('GM_COMMAND')" id="btn-mode-gm" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition">
        👑 GM Command
      </button>
      <button onclick="setDisplayMode('TABLE_TV_DISPLAY')" id="btn-mode-tv" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition">
        📺 TV Display
      </button>
      <button onclick="setDisplayMode('PLAYER_CONTROLLER')" id="btn-mode-player" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition">
        🎮 Kid Tablet
      </button>
    </div>

    <!-- Theme, Sound & Settings Controls -->
    <div class="flex items-center gap-2">
      <!-- Theme Toggle (Light / Dark) -->
      <button onclick="toggleTheme()" id="btn-theme-toggle" class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-600 transition flex items-center gap-1.5" title="Switch Theme (Light Parchment vs. Dark Midnight)">
        🌙 Dark
      </button>

      <!-- Audio SFX Mute / Unmute Toggle -->
      <button onclick="toggleAudioMute()" id="btn-audio-toggle" class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-600 transition flex items-center gap-1.5" title="Toggle Dice & Sound Effects">
        🔊 SFX: ON
      </button>

      <!-- Always-Accessible Music Player (On/Off + Track Picker) -->
      <div class="inline-flex items-center gap-1 rounded-lg bg-slate-800/90 border border-slate-600 p-0.5">
        <button onclick="toggleMusicPlayback()" id="btn-music-toggle" class="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition" title="Turn Background Music On or Off">
          🔇 Music: OFF
        </button>
        <select id="header-music-select" onchange="selectMusicTrack(this.value)" class="theme-input border-0 rounded-md px-1.5 py-1 text-xs font-bold text-indigo-300 cursor-pointer" title="Choose Background Music Track">
          <option value="COZY_TAVERN">🎻 Tavern</option>
          <option value="WHISPERING_WOODS">🍃 Woods</option>
          <option value="GOBLIN_KITCHEN">🥁 March</option>
          <option value="CRYSTAL_CAVERN">💎 Starlight</option>
          <option value="HEROIC_BATTLE">⚔️ Battle</option>
          <option value="SILENT">🔇 Off</option>
        </select>
      </div>

      <select id="select-rules-tier" onchange="changeRoomSettings()" class="theme-input border rounded-lg px-2 py-1.5 text-xs text-amber-300">
        <option value="STORYBOOK_D6">🧸 Storybook (d6)</option>
        <option value="APPRENTICE_5E_LITE">⚔️ Apprentice (5e Lite)</option>
        <option value="STANDARD_5E">🐉 Standard 5e</option>
      </select>

      <select id="select-difficulty" onchange="changeRoomSettings()" class="theme-input border rounded-lg px-2 py-1.5 text-xs text-sky-300" title="Adjust enemy HP, AC, attack bonuses, trap/lock DCs, and hero buffs">
        <option value="STORY_EASY">🌟 Easy (Softer Foes &amp; -3 DC)</option>
        <option value="BALANCED_NORMAL">⚖️ Balanced (Standard SRD)</option>
        <option value="HEROIC_HARD">🔥 Heroic (+35% Foe HP &amp; +2 DC)</option>
      </select>

      <select id="select-content-rating" onchange="changeRoomSettings()" class="theme-input border rounded-lg px-2 py-1.5 text-xs text-emerald-300">
        <option value="COZY_G">🌈 Cozy G-Rated</option>
        <option value="ADVENTURE_PG">🏰 Adventure PG</option>
        <option value="CLASSIC_PG13">🔥 Classic PG-13</option>
      </select>

      <button onclick="toggleBedtime()" id="btn-bedtime" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-950 hover:bg-indigo-800 text-indigo-200 border border-indigo-500/40 transition">
        🌙 Pause for Bedtime
      </button>
    </div>
  </header>

  <!-- Bedtime Freeze Banner -->
  <div id="bedtime-banner" class="hidden bg-indigo-950/95 border-b border-indigo-400/40 px-6 py-4 text-center">
    <p class="text-sm font-bold text-amber-300">🌙 Adventure Paused for Bedtime! All tokens & health saved.</p>
    <p id="bedtime-recap-text" class="text-xs text-indigo-200 mt-1 max-w-3xl mx-auto"></p>
  </div>

  <!-- Loot Notification Banner -->
  <div id="loot-toast" class="hidden bg-gradient-to-r from-amber-600 to-orange-500 text-white px-4 py-2.5 text-center text-xs font-extrabold shadow-xl flex items-center justify-center gap-2 transition">
    <span class="text-lg">🎁</span>
    <span id="loot-toast-message">You opened a treasure chest!</span>
  </div>

  <!-- Main Workspace Container -->
  <main class="flex-1 p-4 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4">
    <!-- START HERE: Persistent Step-by-Step Interactive Quick-Start Strip (GM Command Mode) -->
    <section id="start-here-guide-bar" class="lg:col-span-12 theme-card rounded-2xl p-3.5 border-2 border-amber-400/70 shadow-xl space-y-2.5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2.5">
          <span class="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] uppercase tracking-wide">Start Here</span>
          <h2 class="text-sm font-extrabold text-amber-300">How to Run Your First Session (In 4 Simple Steps)</h2>
        </div>
        <div class="flex items-center gap-2 text-[11px]">
          <button type="button" onclick="openSessionWalkthroughModal(0)" class="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/50 font-bold">
            📖 Open Walkthrough
          </button>
          <button type="button" onclick="toggleStartHereGuideBar(false)" class="px-2 py-1 rounded-lg text-slate-400 hover:text-slate-200 font-semibold">
            ✕ Hide Guide
          </button>
        </div>
      </div>
      <p id="start-here-next-hint" class="text-xs font-semibold text-emerald-300">
        👉 Next Step: Click "1. Read Story Intro" to see the map &amp; read the opening hook to your table!
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <button id="sh-step-1" type="button" onclick="quickStartStep1ReadIntro()" class="p-2.5 rounded-xl border-2 border-emerald-400 bg-emerald-950/50 hover:bg-emerald-900/60 text-left transition flex items-start justify-between gap-2">
          <div>
            <div class="text-xs font-black text-amber-300">1. Read Story Intro</div>
            <div class="text-[11px] text-slate-300">Open Hook, Area Map &amp; Read Aloud</div>
          </div>
          <span id="sh-badge-1" class="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-500 text-slate-950 shrink-0">START</span>
        </button>
        <button id="sh-step-2" type="button" onclick="quickStartStep2QrInvite()" class="p-2.5 rounded-xl border theme-inner-box hover:border-sky-400 text-left transition flex items-start justify-between gap-2">
          <div>
            <div class="text-xs font-black text-sky-300">2. Invite Kids / TV</div>
            <div class="text-[11px] text-slate-300">Optional QR Code &amp; Room ${initialState.roomCode}</div>
          </div>
          <span id="sh-badge-2" class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 shrink-0">QR</span>
        </button>
        <button id="sh-step-3" type="button" onclick="quickStartStep3MoveHero()" class="p-2.5 rounded-xl border theme-inner-box hover:border-amber-400 text-left transition flex items-start justify-between gap-2">
          <div>
            <div class="text-xs font-black text-amber-300">3. Move Hero &amp; Doors</div>
            <div class="text-[11px] text-slate-300">Use D-Pad / Map Tiles &amp; Click Doors</div>
          </div>
          <span id="sh-badge-3" class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 shrink-0">MOVE</span>
        </button>
        <button id="sh-step-4" type="button" onclick="quickStartStep4RollCheck()" class="p-2.5 rounded-xl border theme-inner-box hover:border-purple-400 text-left transition flex items-start justify-between gap-2">
          <div>
            <div class="text-xs font-black text-purple-300">4. Roll First Action</div>
            <div class="text-[11px] text-slate-300">Tap an Action Card or Story Choice</div>
          </div>
          <span id="sh-badge-4" class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 shrink-0">ROLL</span>
        </button>
      </div>
    </section>

    <!-- Left / Center Column: Interactive Tabletop Grid Map -->
    <section id="map-column" class="lg:col-span-8 flex flex-col gap-4">
      ${renderCombatInitiativeBarHtml()}
      <div class="theme-card rounded-2xl p-4 shadow-2xl border">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 id="active-scene-title" class="text-base font-bold text-amber-400"></h2>
            <p class="text-xs text-slate-400">Tap a highlighted square or use the Touch D-Pad to move within your speed.</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <!-- Map Zoom Controls -->
            <div id="vtt-map-zoom-controls" class="inline-flex items-center gap-1 theme-inner-box px-2 py-1 rounded-xl border text-xs">
              <button type="button" id="btn-zoom-out" onclick="zoomMapBy(-0.2)" class="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 font-black" title="Zoom Out Map">➖</button>
              <span id="map-zoom-label" class="font-mono font-bold px-1.5 min-w-[44px] text-center">100%</span>
              <button type="button" id="btn-zoom-in" onclick="zoomMapBy(0.2)" class="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 font-black" title="Zoom In Map">➕</button>
              <button type="button" id="btn-zoom-reset" onclick="resetMapZoom()" class="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold" title="Reset Map Fit">Fit</button>
            </div>
            <!-- Jackbox-Style Room Join Pill for TV Mode -->
            <div class="flex items-center gap-2 theme-inner-box px-3 py-1.5 rounded-xl border">
              <span class="text-xs text-slate-400">📱 Kids Join:</span>
              <span id="kids-join-room-code" class="font-mono font-extrabold text-sm text-amber-400">${initialState.roomCode}</span>
            </div>
          </div>
        </div>

        <!-- Scrollable Zoom Viewport wrapping 10x6 Interactive Tabletop Grid + Overlays -->
        <div id="vtt-board-viewport" class="w-full overflow-auto rounded-xl border border-slate-700/70 bg-slate-950/90 max-h-[70vh]">
          <div id="vtt-grid-wrapper" class="relative w-full rounded-xl overflow-hidden shadow-2xl border border-slate-800/80 bg-slate-950 transition-[width] duration-150" style="width: 100%; margin: 0 auto;">
            <img id="vtt-scene-backdrop" src="/assets/backgrounds/backdrop-hearth-tavern.svg" alt="Scene Backdrop" class="hidden absolute inset-0 w-full h-full object-cover opacity-65 pointer-events-none z-0 transition-opacity duration-500" />
            <div class="pointer-events-none absolute inset-0 z-[5] rounded-xl" style="box-shadow: inset 0 0 22px rgba(2, 6, 23, 0.28);"></div>
            <div id="vtt-grid" class="grid-board w-full rounded-xl overflow-hidden border-2 border-amber-500/50 bg-bakery relative z-10 select-none"></div>
            <canvas id="vtt-lighting-canvas" class="absolute inset-0 w-full h-full pointer-events-none z-20 rounded-xl"></canvas>
            <canvas id="vtt-tools-canvas" style="touch-action: none;" class="absolute inset-0 w-full h-full pointer-events-none z-30 rounded-xl"></canvas>
            <div id="vtt-door-hitboxes" class="absolute inset-0 pointer-events-none z-40"></div>
          </div>
        </div>
        <div id="move-blocked-banner" class="hidden mt-2.5 px-3 py-2 rounded-xl bg-rose-950/85 border border-rose-500/60 text-rose-100 text-xs font-bold flex items-center justify-between gap-2 shadow-lg">
          <span id="move-blocked-text">🧱 Blocked by wall!</span>
          <button id="move-blocked-action-btn" class="hidden px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[11px]">🚪 Open Door</button>
        </div>

        <!-- Zone Fog-of-War, Interactive Doors & Static Ambiance (Creator Tools Hidden Unless Admin) -->
        <div id="gm-zone-controls" class="mt-3 pt-3 border-t border-slate-700/50 flex flex-col gap-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs font-semibold text-slate-400">🗺️ Reveal Rooms:</span>
              <div id="zone-buttons" class="flex flex-wrap gap-2"></div>
            </div>
            <button id="btn-toggle-pro-gm-tools" type="button" onclick="document.getElementById('gm-advanced-tools-drawer').open = !document.getElementById('gm-advanced-tools-drawer').open" class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600">
              🕯️ Table Ambiance
            </button>
          </div>
          <div class="flex flex-wrap items-center gap-2 text-xs">
            <span class="font-bold text-amber-400">🚪 Doors &amp; Locks:</span>
            <div id="door-buttons" class="flex flex-wrap gap-1.5"></div>
          </div>
          <details id="gm-advanced-tools-drawer" class="rounded-xl theme-inner-box border p-2.5 space-y-2">
            <summary class="cursor-pointer text-xs font-bold text-slate-300 select-none">
              🕯️ Optional Table Ambiance (Lighting, Backdrop &amp; Sound)
            </summary>
            <div class="pt-2 space-y-2">
              <div id="creator-map-authoring-box" class="hidden space-y-2 border-b border-amber-500/30 pb-2 mb-2">
                <div class="text-[11px] font-extrabold text-amber-400 uppercase tracking-wider">👑 Creator / Admin Map &amp; One-Shot Studio</div>
                <div class="flex flex-wrap items-center gap-2">
                  <select id="campaign-select" onchange="switchCampaign(this.value)" class="theme-input border rounded-lg px-2 py-1 text-xs text-amber-300">
                    <option value="camp-goblin-bakery">🧁 The Goblin Bakery Heist</option>
                    <option value="camp-clockwork-treehouse">⚙️ The Clockwork Treehouse</option>
                    <option value="camp-starlight-otter">🦦 Voyage of the Starlight Otter</option>
                  </select>
                  <button onclick="regenerateProceduralMap()" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm">
                    🎲 New Procedural Map
                  </button>
                  <button id="btn-generate-oneshot" onclick="generateScaledOneShot()" title="Generate a fresh, non-overlapping One-Shot scaled to your party's average hero level" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-sm">
                    ⚡ Level-Scaled One-Shot
                  </button>
                </div>
                ${renderTabletopToolsControlsHtml()}
                <!-- Custom Unraid Token Drop Folder Bar -->
                <div id="custom-tokens-bar" class="mt-1 pt-2 border-t border-slate-700/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-bold text-purple-400">📂 Unraid Custom Tokens:</span>
                    <select id="select-custom-token" class="theme-input border rounded-lg px-2 py-1 text-xs">
                      <option value="">Scanning /app/data/custom-tokens...</option>
                    </select>
                    <button onclick="spawnSelectedCustomToken()" class="px-2.5 py-1 rounded-lg font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-sm">➕ Spawn on Map</button>
                    <button onclick="openTokenForgeModal()" class="px-2.5 py-1 rounded-lg font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm">⚒️ Foundry Token Forge</button>
                    <button onclick="refreshCustomTokens()" class="px-2 py-1 rounded-lg border border-slate-700 text-slate-300 hover:border-purple-400">🔄 Refresh</button>
                  </div>
                  <span class="text-[11px] text-slate-400">Drop PNG/SVG/WebP files into <code class="text-amber-300">/app/data/custom-tokens</code></span>
                </div>
              </div>
              ${renderLightingControlsHtml()}
              ${renderAtmosphereControlsHtml()}
            </div>
          </details>
        </div>
      </div>

      <!-- GM Story Branching & Read-Aloud Box Text Panel (GM Only) -->
      <div id="gm-story-panel" class="theme-card rounded-2xl p-4 border">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h3 class="text-sm font-bold text-indigo-400">📖 Zero-Prep Read-Aloud Box Text</h3>
          <div class="flex flex-wrap gap-1 items-center">
            <button onclick="setReadAloudTone('COZY_SILLY')" id="tone-cozy" class="px-2.5 py-1 rounded text-xs font-semibold bg-amber-500 text-slate-950">😂 Cozy & Silly</button>
            <button onclick="setReadAloudTone('ACTION_HEROIC')" id="tone-action" class="px-2.5 py-1 rounded text-xs font-semibold bg-slate-800 text-slate-300">⚔️ Action Heroic</button>
            <button onclick="setReadAloudTone('MYSTERY_ATMOSPHERIC')" id="tone-mystery" class="px-2.5 py-1 rounded text-xs font-semibold bg-slate-800 text-slate-300">🕯️ Mystery</button>
            <button onclick="speakReadAloudText()" id="btn-read-aloud-tts" class="px-2.5 py-1 rounded text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50 transition">
              🔊 Read Aloud (Voice TTS)
            </button>
            <button onclick="triggerSceneRpCue()" id="btn-open-rp-popup" class="px-2.5 py-1 rounded text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white border border-purple-400/50 transition">
              🗣️ Cue Speech Popup
            </button>
          </div>
        </div>
        <blockquote id="read-aloud-box" class="p-3.5 rounded-xl theme-inner-box border-l-4 border-amber-400 text-sm text-amber-200 italic leading-relaxed"></blockquote>

        <!-- Static Stage-Setting Illustrations (Area Map + Scene Mood Art) shown before combat begins -->
        <div id="stage-art-showcase" class="mt-3 p-3 rounded-2xl theme-inner-box border space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-xs font-extrabold text-sky-300">🗺️ Stage-Setting Pictures (Pre-Combat Regional Map &amp; Scene Mood)</span>
            <span id="difficulty-effect-pill" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-200 border border-sky-400/40">⚖️ Balanced</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button type="button" onclick="openStageArtLightbox('map')" class="group text-left rounded-xl overflow-hidden border border-amber-500/40 hover:border-amber-400 transition bg-slate-950/60">
              <img id="stage-area-map-img" src="/assets/maps/map-oakhaven-bakery-quarter.svg" alt="Regional Town Map" class="w-full h-36 object-cover group-hover:scale-[1.02] transition" />
              <div class="px-2.5 py-1.5 flex items-center justify-between text-[11px] font-bold text-amber-300">
                <span>🗺️ Town &amp; Area Map</span>
                <span class="text-[10px] text-slate-400">🔍 Zoom</span>
              </div>
            </button>
            <button type="button" onclick="openStageArtLightbox('mood')" class="group text-left rounded-xl overflow-hidden border border-purple-500/40 hover:border-purple-400 transition bg-slate-950/60">
              <img id="stage-mood-art-img" src="/assets/backgrounds/backdrop-hearth-tavern.svg" alt="Scene Mood Art" class="w-full h-36 object-cover group-hover:scale-[1.02] transition" />
              <div class="px-2.5 py-1.5 flex items-center justify-between text-[11px] font-bold text-purple-300">
                <span>🎨 Scene Atmosphere Art</span>
                <span class="text-[10px] text-slate-400">🔍 Zoom</span>
              </div>
            </button>
          </div>
        </div>

        <div id="story-rp-cue-buttons" class="flex flex-wrap gap-1.5 mt-2"></div>

        <!-- Base 5e Monster Stat Block Inspector Card (shows when a monster token is selected) -->
        <div id="monster-statblock-card" class="hidden mt-3 p-3.5 rounded-2xl theme-inner-box border-2 border-rose-500/50 space-y-2 text-xs">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h4 id="msb-name" class="text-sm font-black text-amber-300">Goblin Boss</h4>
              <p id="msb-meta" class="text-[11px] italic text-slate-400">Small humanoid (goblinoid), neutral evil</p>
            </div>
            <div class="flex items-center gap-1.5">
              <button type="button" id="msb-rp-btn" class="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold">🗣️ Speak Line</button>
              <button type="button" onclick="document.getElementById('monster-statblock-card').classList.add('hidden')" class="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px]">✕</button>
            </div>
          </div>
          <div id="msb-vitals" class="grid grid-cols-3 gap-2 p-2 rounded-xl bg-rose-950/30 border border-rose-500/30 font-bold text-slate-200"></div>
          <div id="msb-abilities" class="grid grid-cols-6 gap-1 text-center font-mono text-[11px]"></div>
          <div id="msb-traits" class="space-y-1 text-[11px] text-slate-300"></div>
          <div id="msb-actions" class="space-y-1 text-[11px] text-slate-200"></div>
        </div>

        <div class="mt-3">
          <p class="text-xs font-semibold text-slate-400 mb-2">🔀 Branching Story Choices (Tap what the kids decide to do):</p>
          <div id="branch-choices" class="grid grid-cols-1 sm:grid-cols-2 gap-2"></div>
        </div>
      </div>
    </section>

    <!-- Right Column: Context-Aware Panel (GM Co-Pilot Sidebar OR Kid Tablet Action Controller) -->
    <aside id="side-column" class="lg:col-span-4 flex flex-col gap-4">
      <!-- PANEL A: GM AI Co-Pilot & Sibling Spotlight Tracker -->
      <div id="gm-copilot-panel" class="theme-card rounded-2xl p-4 flex flex-col gap-3 border">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-purple-400 flex items-center gap-1.5">
            <span>🤖</span> AI GM Co-Pilot Whisper
          </h3>
          <span class="text-[11px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700">
            RTX 3080 Ready
          </span>
        </div>

        <p class="text-xs text-slate-400">
          Kids trying something wild? Type what they asked:
        </p>

        <div class="flex gap-2">
          <input id="gm-improv-input" type="text" placeholder="e.g. Can we feed the goblin our cookie?" class="flex-1 theme-input border rounded-xl px-3 py-2 text-xs" />
          <button onclick="askAiCoPilot()" class="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold whitespace-nowrap shadow">
            ✨ Help Me GM!
          </button>
        </div>

        <div id="copilot-response-box" class="p-3 rounded-xl theme-inner-box border text-xs space-y-2">
          <p class="text-purple-300 font-semibold">💡 GM Tip for this Scene:</p>
          <p id="copilot-whisper-text" class="text-slate-300"></p>
        </div>

        <div class="pt-2 border-t border-slate-700/50">
          <h4 class="text-xs font-bold text-amber-400 mb-1 flex items-center gap-1">
            <span>⚖️</span> Sibling Spotlight Tracker
          </h4>
          <p class="text-[11px] text-slate-400 mb-2">Ensures every child gets equal turns and moments in the spotlight:</p>
          <div id="spotlight-list" class="space-y-1.5"></div>
        </div>
      </div>

      <!-- PANEL B: Kid Tablet / Phone Controller -->
      <div id="player-controller-panel" class="theme-card rounded-2xl p-4 flex flex-col gap-4 border">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-amber-400">🎮 Kid Hero Controller</h3>
          <div class="flex gap-1.5">
            <button onclick="openHeroSheetModal()" class="text-xs px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold">
              📜 View Sheet
            </button>
            <button onclick="openTokenForgeModal()" class="text-xs px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold">
              ⚒️ Forge
            </button>
            <button onclick="toggleHeroCreatorModal()" class="text-xs px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
              + New Hero
            </button>
          </div>
        </div>

        <!-- Select Active Hero on This Tablet/Phone -->
        <div>
          <label class="text-xs text-slate-400 block mb-1">Tap Your Hero:</label>
          <div id="hero-selector-tabs" class="grid grid-cols-2 gap-2"></div>
        </div>

        <!-- Tactile Gamepad Cross D-Pad (Static DOM so rapid taps never interrupt) -->
        <div id="vtt-dpad-controller" class="p-3 rounded-xl theme-inner-box border flex items-center justify-between gap-3">
          <div class="space-y-1 min-w-0 flex-1">
            <div class="text-xs font-extrabold text-amber-400 flex items-center gap-1.5">
              <span>🕹️ Hero D-Pad</span>
              <span class="text-[10px] font-mono text-slate-400 font-normal">WASD / Arrows</span>
            </div>
            <div id="dpad-active-label" class="text-[11px] font-semibold text-slate-200 truncate">Ready to move</div>
            <div class="text-[10px] text-slate-400">Solid walls & closed/locked doors block movement.</div>
          </div>
          <div id="vtt-dpad-pad" class="grid grid-cols-3 grid-rows-3 gap-1 shrink-0 select-none" style="touch-action: manipulation;">
            <div></div>
            <button id="dpad-btn-up" type="button" onclick="moveSelectedHero(0, -1)" aria-label="Move North" class="w-10 h-10 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 active:scale-95 border border-slate-600 text-white font-black text-base shadow transition flex items-center justify-center">▲</button>
            <div></div>
            <button id="dpad-btn-left" type="button" onclick="moveSelectedHero(-1, 0)" aria-label="Move West" class="w-10 h-10 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 active:scale-95 border border-slate-600 text-white font-black text-base shadow transition flex items-center justify-center">◀</button>
            <button id="dpad-btn-center" type="button" onclick="openHeroSheetModal()" title="Open Selected Hero Sheet" class="w-10 h-10 rounded-xl bg-slate-900 border border-amber-500/50 text-amber-300 font-black text-sm flex items-center justify-center shadow-inner">🛡️</button>
            <button id="dpad-btn-right" type="button" onclick="moveSelectedHero(1, 0)" aria-label="Move East" class="w-10 h-10 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 active:scale-95 border border-slate-600 text-white font-black text-base shadow transition flex items-center justify-center">▶</button>
            <div></div>
            <button id="dpad-btn-down" type="button" onclick="moveSelectedHero(0, 1)" aria-label="Move South" class="w-10 h-10 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 active:scale-95 border border-slate-600 text-white font-black text-base shadow transition flex items-center justify-center">▼</button>
            <div></div>
          </div>
        </div>

        <!-- Selected Hero Card -->
        <div id="active-hero-sheet" class="p-3 rounded-xl theme-inner-box border space-y-3"></div>

        <!-- Big Color-Coded Action Cards -->
        <div>
          <h4 class="text-xs font-bold text-slate-300 mb-2">🃏 Tap an Action Card to Roll Dice:</h4>
          <div id="hero-action-cards" class="space-y-2"></div>
        </div>
      </div>

      <!-- Live Family Dice Roll Feed & Foundry 3D Quick Tray -->
      <div class="theme-card rounded-2xl p-4 border space-y-2.5">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">🎲 3D Dice Tray & Log</h3>
          <span class="text-[10px] text-amber-400 font-semibold">3D WebGL</span>
        </div>
        <div id="quick-dice-tray" class="grid grid-cols-6 gap-1">
          <button onclick="quickRoll3D('d4')" class="py-1.5 rounded-lg bg-indigo-950/70 hover:bg-amber-500 hover:text-slate-950 border border-indigo-500/40 text-xs font-extrabold text-amber-300 transition">d4</button>
          <button onclick="quickRoll3D('d6')" class="py-1.5 rounded-lg bg-indigo-950/70 hover:bg-amber-500 hover:text-slate-950 border border-indigo-500/40 text-xs font-extrabold text-amber-300 transition">d6</button>
          <button onclick="quickRoll3D('d8')" class="py-1.5 rounded-lg bg-indigo-950/70 hover:bg-amber-500 hover:text-slate-950 border border-indigo-500/40 text-xs font-extrabold text-amber-300 transition">d8</button>
          <button onclick="quickRoll3D('d10')" class="py-1.5 rounded-lg bg-indigo-950/70 hover:bg-amber-500 hover:text-slate-950 border border-indigo-500/40 text-xs font-extrabold text-amber-300 transition">d10</button>
          <button onclick="quickRoll3D('d12')" class="py-1.5 rounded-lg bg-indigo-950/70 hover:bg-amber-500 hover:text-slate-950 border border-indigo-500/40 text-xs font-extrabold text-amber-300 transition">d12</button>
          <button onclick="quickRoll3D('d20')" class="py-1.5 rounded-lg bg-indigo-950/70 hover:bg-amber-500 hover:text-slate-950 border border-indigo-500/40 text-xs font-extrabold text-amber-300 transition">d20</button>
        </div>
        <div id="dice-log-list" class="space-y-2 max-h-48 overflow-y-auto"></div>
      </div>
    </aside>
  </main>

  ${renderDice3DOverlayHtml()}

  <!-- HYBRID REAL DICE vs. DIGITAL DICE MODAL -->
  <div id="dice-modal" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="theme-card border-2 border-amber-400 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
      <div class="flex items-center justify-between">
        <h3 id="dice-modal-title" class="text-lg font-extrabold text-amber-400"></h3>
        <button onclick="closeDiceModal()" class="text-slate-400 hover:text-white text-sm">✕</button>
      </div>
      <p id="dice-modal-desc" class="text-xs text-slate-300"></p>

      <!-- Option 1: Roll Digital 3D Die -->
      <button onclick="triggerDigitalRoll()" class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-sm shadow-lg">
        📱 Roll Digital 3D Dice Now!
      </button>

      <!-- Option 2: Roll Real Physical Dice on the Table -->
      <div class="pt-3 border-t border-slate-700/50">
        <p id="physical-dice-prompt" class="text-xs font-bold text-emerald-400 mb-2 text-center">
          🎲 Or roll your REAL physical die on the table & tap what you got:
        </p>
        <div id="physical-dice-buttons" class="grid grid-cols-5 gap-1.5"></div>
      </div>
    </div>
  </div>

  <!-- INTERACTIVE CHARACTER SHEET MODAL -->
  <div id="hero-sheet-modal" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="theme-card border-2 border-indigo-400 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
      <div class="flex items-center justify-between">
        <h3 id="modal-hero-title" class="text-lg font-extrabold text-indigo-400">📜 Storybook Character Sheet</h3>
        <button onclick="closeHeroSheetModal()" class="text-slate-400 hover:text-white text-sm">✕</button>
      </div>
      <div id="modal-hero-content" class="space-y-3 text-xs"></div>
    </div>
  </div>

  <!-- 5-MINUTE VISUAL HERO CREATOR MODAL -->
  <div id="hero-creator-modal" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="theme-card border-2 border-emerald-400 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-extrabold text-emerald-400">✨ 5-Minute Kid Hero Creator</h3>
        <button onclick="toggleHeroCreatorModal()" class="text-slate-400 hover:text-white text-sm">✕</button>
      </div>
      <div class="space-y-2 text-xs">
        <label class="block text-slate-300">Kid's First Name & Age:</label>
        <div class="flex gap-2">
          <input id="new-hero-player" type="text" placeholder="e.g. Sam" class="flex-1 theme-input border rounded-xl px-3 py-2" />
          <input id="new-hero-age" type="number" value="8" class="w-20 theme-input border rounded-xl px-3 py-2" />
        </div>
        <label class="block text-slate-300">Hero Name:</label>
        <input id="new-hero-name" type="text" placeholder="e.g. Captain Bramble" class="w-full theme-input border rounded-xl px-3 py-2" />
        <label class="block text-slate-300">Choose Your Hero Style:</label>
        <select id="new-hero-archetype" class="w-full theme-input border rounded-xl px-3 py-2">
          <option value="🛡️|Shield Knight">🛡️ Shield Knight (Brave & Protective)</option>
          <option value="🪄|Starlight Wizard">🪄 Starlight Wizard (Clever & Magical)</option>
          <option value="🏹|Forest Ranger">🏹 Forest Ranger (Nimble & Acorn Sharpshooter)</option>
          <option value="🗡️|Sneaky Ninja Rogue">🗡️ Sneaky Ninja Rogue (Acrobatic & Quick)</option>
          <option value="🎵|Musical Bard">🎵 Musical Bard (Charming & Melodic)</option>
          <option value="🐻|Druid Shapeshifter">🐻 Druid Shapeshifter (Animal Friend)</option>
        </select>
        <label class="block text-slate-300">Choose Your Pet Companion:</label>
        <input id="new-hero-pet" type="text" placeholder="e.g. Marshmallow the Baby Dragon" class="w-full theme-input border rounded-xl px-3 py-2" />
      </div>
      <button onclick="createNewHero()" class="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm shadow-md">
        🚀 Join the Adventure!
      </button>
    </div>
  </div>

  ${renderTokenForgeModalHtml()}

  <!-- QR JOIN MODAL -->
  <div id="qr-join-modal" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="theme-card border-2 border-amber-400 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
      <div class="flex items-center justify-between">
        <h3 id="qr-modal-title" class="text-lg font-extrabold text-amber-400">📲 Scan to Join Room ${initialState.roomCode}</h3>
        <button onclick="toggleQrJoinModal()" class="text-slate-400 hover:text-white text-sm">✕</button>
      </div>
      <p class="text-xs text-slate-300">
        Kids & family members can scan this QR badge or tap the link to open the Kid Tablet Controller:
      </p>
      <div class="flex justify-center">
        <img id="qr-modal-img" src="/api/room/qr?room=${initialState.roomCode}" alt="QR Code for Room ${initialState.roomCode}" class="rounded-2xl shadow-lg border border-amber-500/40 bg-white max-w-full h-auto" />
      </div>
      <div class="p-3 rounded-xl theme-inner-box border space-y-1">
        <div class="text-xs text-slate-400">4-Letter Room Code:</div>
        <div id="qr-modal-code" class="text-2xl font-mono font-extrabold text-amber-400 tracking-widest">${initialState.roomCode}</div>
        <a id="qr-modal-link" href="/?room=${initialState.roomCode}&mode=kid" class="inline-block mt-2 text-xs font-bold text-emerald-400 hover:underline break-all">
          🔗 Open Direct Kid Tablet Link (/?room=${initialState.roomCode}&mode=kid)
        </a>
      </div>
    </div>
  </div>

  <!-- Demo Account Creation, Login & License Key Modal -->
  <div id="vtt-auth-modal" class="hidden fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="theme-card border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-extrabold text-amber-400">👤 Sign In for Your Private VTT Session</h3>
        <button id="btn-close-auth-modal" onclick="toggleVttAuthModal(false)" class="text-slate-400 hover:text-white text-sm">✕</button>
      </div>
      <div id="vtt-auth-required-banner" class="hidden p-2.5 rounded-xl bg-amber-950/70 border border-amber-500/50 text-[11px] font-semibold text-amber-200">
        🔐 Each user must sign in (or create a free account) to get their own isolated room code &amp; saved adventure!
      </div>
      <div id="vtt-account-summary" class="hidden p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs space-y-2"></div>

      <button type="button" onclick="window.location.assign('/api/auth/google/start')" class="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs flex items-center justify-center gap-2 shadow">
        ${GOOGLE_ICON_SVG}
        <span>Continue with Google</span>
      </button>

      <div id="vtt-account-preferences-box" class="hidden p-3 rounded-xl theme-inner-box border border-amber-500/40 text-xs space-y-2.5">
        <div class="font-extrabold text-amber-400">🎲 Account Adventure Generator Settings</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-bold text-slate-400 mb-1">Game System / Rules Tier</label>
            <select id="pref-rules-tier" class="w-full theme-input border rounded-lg px-2 py-1.5 text-xs font-semibold">
              <option value="STORYBOOK_D6">📖 Storybook D6 (Easy)</option>
              <option value="APPRENTICE_5E_LITE">🛡️ Apprentice 5e Lite</option>
              <option value="STANDARD_5E">🐉 Standard 5e SRD</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-400 mb-1">Player Age Group</label>
            <select id="pref-age-group" class="w-full theme-input border rounded-lg px-2 py-1.5 text-xs font-semibold">
              <option value="AGES_5_7">🐣 Ages 5–7 (Cozy G)</option>
              <option value="AGES_8_10">🧭 Ages 8–10 (Adventure PG)</option>
              <option value="AGES_11_13">⚔️ Ages 11–13 (Champions)</option>
              <option value="TEENS_13_PLUS">🔥 Teens 13+ (Classic PG-13)</option>
            </select>
          </div>
        </div>
        <button onclick="saveVttAccountPreferences()" type="button" class="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black">
          ✨ Generate Tailored Hook, NPCs, Enemies & Boss!
        </button>
      </div>

      <div class="flex gap-2 text-xs">
        <button onclick="switchAuthTab('register')" id="tab-auth-register" class="flex-1 py-2 rounded-xl bg-amber-500 text-slate-950 font-extrabold">✨ Create Free Account</button>
        <button onclick="switchAuthTab('login')" id="tab-auth-login" class="flex-1 py-2 rounded-xl bg-slate-800 text-slate-200 font-bold">🔑 Sign In</button>
      </div>

      <form id="form-vtt-register" onsubmit="submitVttRegister(event)" class="space-y-2.5 text-xs">
        <p class="text-slate-400">Pick your game style and age group to auto-generate your Session 1 hook, scenario, NPCs, enemies &amp; boss!</p>
        <input id="reg-family-name" type="text" required placeholder="Family Name (e.g., The Miller Family)" class="w-full theme-input border rounded-xl px-3 py-2" />
        <input id="reg-email" type="email" required placeholder="Email Address" class="w-full theme-input border rounded-xl px-3 py-2" />
        <input id="reg-password" type="password" required minlength="6" oninput="updateModalPasswordMatchHint()" placeholder="Password (6+ characters)" class="w-full theme-input border rounded-xl px-3 py-2" />
        <input id="reg-password-confirm" type="password" required minlength="6" oninput="updateModalPasswordMatchHint()" placeholder="Re-enter Password" class="w-full theme-input border rounded-xl px-3 py-2" />
        <div id="reg-pw-match" class="hidden text-[11px] font-semibold"></div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-bold text-slate-400 mb-1">Game System</label>
            <select id="reg-rules-tier" class="w-full theme-input border rounded-xl px-2.5 py-2 font-semibold">
              <option value="STORYBOOK_D6">📖 Storybook (Easy D6)</option>
              <option value="APPRENTICE_5E_LITE">🛡️ Apprentice (5e Lite)</option>
              <option value="STANDARD_5E">🐉 Standard 5e (Tactical)</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-400 mb-1">Age Group</label>
            <select id="reg-age-group" class="w-full theme-input border rounded-xl px-2.5 py-2 font-semibold">
              <option value="AGES_5_7">🐣 Ages 5–7</option>
              <option value="AGES_8_10" selected>🧭 Ages 8–10</option>
              <option value="AGES_11_13">⚔️ Ages 11–13</option>
              <option value="TEENS_13_PLUS">🔥 Teens 13+</option>
            </select>
          </div>
        </div>
        <button type="submit" class="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black">🎮 Create Account &amp; Generate Session 1</button>
      </form>

      <form id="form-vtt-login" onsubmit="submitVttLogin(event)" class="hidden space-y-2.5 text-xs">
        <input id="login-email" type="email" required placeholder="Email Address" class="w-full theme-input border rounded-xl px-3 py-2" />
        <input id="login-password" type="password" required placeholder="Password" class="w-full theme-input border rounded-xl px-3 py-2" />
        <button type="submit" class="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black">🔓 Sign In</button>
      </form>

      <div class="pt-3 border-t border-slate-700/60 space-y-2 text-xs">
        <label class="font-bold text-amber-300 block">Have a Store License Key (HQ-...)? Unlock Session 2+:</label>
        <div class="flex gap-2">
          <input id="vtt-license-key-input" type="text" placeholder="HQ-UPD-..." class="flex-1 theme-input border rounded-xl px-3 py-1.5 font-mono uppercase" />
          <button onclick="activateVttLicenseUi()" type="button" class="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold">Unlock</button>
        </div>
        <div id="vtt-auth-feedback" class="text-[11px] font-semibold"></div>
      </div>
    </div>
  </div>

  <!-- Server Admin Accounts & Google OAuth Status Modal -->
  <div id="vtt-admin-modal" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="theme-card border-2 border-amber-400 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-extrabold text-amber-400">👑 VTT Server Admin Console</h3>
        <button onclick="document.getElementById('vtt-admin-modal').classList.add('hidden')" class="text-slate-400 hover:text-white text-sm">✕</button>
      </div>
      <div id="vtt-admin-google-status" class="p-3 rounded-xl theme-inner-box border text-xs space-y-1"></div>
      <div id="admin-send-adventure-box" class="p-3.5 rounded-2xl theme-inner-box border border-amber-500/40 space-y-2.5 text-xs">
        <div class="font-extrabold text-amber-400 uppercase tracking-wider">📤 Create &amp; Send Campaign / Map / One-Shot to User</div>
        <p class="text-[11px] text-slate-300 leading-relaxed">
          Maps stay static and locked for regular user sessions. Dispatch a new Campaign, Static Map, or Level-Scaled One-Shot directly into a user's private room:
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-bold text-slate-400 mb-1">Target User Room</label>
            <select id="admin-send-target-room" class="w-full theme-input border rounded-lg px-2 py-1.5 text-xs"></select>
          </div>
          <div>
            <label class="block text-[10px] font-bold text-slate-400 mb-1">Adventure Payload</label>
            <select id="admin-send-mode" onchange="toggleAdminSendModeFields()" class="w-full theme-input border rounded-lg px-2 py-1.5 text-xs">
              <option value="CAMPAIGN">📖 Core Campaign (Static Map)</option>
              <option value="PROCEDURAL_MAP">🎲 New Static Procedural Map</option>
              <option value="ONE_SHOT">⚡ Level-Scaled One-Shot</option>
            </select>
          </div>
        </div>
        <div id="admin-send-campaign-row">
          <label class="block text-[10px] font-bold text-slate-400 mb-1">Campaign Selection</label>
          <select id="admin-send-campaign-id" class="w-full theme-input border rounded-lg px-2 py-1.5 text-xs">
            <option value="camp-goblin-bakery">🧁 The Goblin Bakery Heist</option>
            <option value="camp-clockwork-treehouse">⚙️ The Clockwork Treehouse</option>
            <option value="camp-starlight-otter">🦦 Voyage of the Starlight Otter</option>
          </select>
        </div>
        <div id="admin-send-theme-row" class="hidden">
          <label class="block text-[10px] font-bold text-slate-400 mb-1">Map Theme</label>
          <select id="admin-send-theme" class="w-full theme-input border rounded-lg px-2 py-1.5 text-xs">
            <option value="BAKERY">🧁 Bakery / Tavern</option>
            <option value="FOREST_TREEHOUSE">🌲 Forest Treehouse</option>
            <option value="STARLIGHT_SHIP">🌌 Starlight Ship</option>
          </select>
        </div>
        <button type="button" onclick="sendAdventureFromAdminModal()" class="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-sm transition">
          📤 Send Static Adventure to User Room
        </button>
      </div>
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-extrabold text-slate-200 uppercase tracking-wider">Registered Accounts &amp; Private Rooms</h4>
          <button onclick="openVttAdminModal()" type="button" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-amber-300">↻ Refresh</button>
        </div>
        <div id="vtt-admin-accounts-list" class="space-y-2 text-xs"></div>
      </div>
      <div id="vtt-admin-feedback" class="text-xs font-semibold"></div>
    </div>
  </div>

  <!-- Session 2+ Paywall Upgrade Modal -->
  <div id="vtt-paywall-modal" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="theme-card border-2 border-amber-400/70 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-extrabold text-amber-400">🔒 Session 1 Complete — Unlock Full Adventure</h3>
        <button onclick="document.getElementById('vtt-paywall-modal').classList.add('hidden')" class="text-slate-400 hover:text-white text-sm">✕</button>
      </div>
      <p id="vtt-paywall-reason" class="text-xs text-slate-300 leading-relaxed">
        You completed the Free First Session Demo! Pick an affordable creator update plan ($5/mo), print-at-home DIY PDF ($15, zero shipping), or shipped Starter Box ($49) in the Storefront to unlock Session 2+!
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
        <a id="paywall-store-link" href="http://localhost:3001/store" onclick="this.href=window.location.protocol+'//'+window.location.hostname+':3001/store'" target="_blank" class="p-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-center">
          🛍️ Upgrade in Storefront ($4–$49)
        </a>
        <button onclick="document.getElementById('vtt-paywall-modal').classList.add('hidden'); toggleVttAuthModal(true);" class="p-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold">
          🔑 Sign In / Enter License Key
        </button>
      </div>
    </div>
  </div>

  <!-- MODAL: LOCKED DOOR LOCKPICK CHECK -->
  <div id="lockpick-modal" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="theme-card border-2 border-rose-500/60 rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <div>
          <h3 id="lockpick-door-title" class="text-base font-extrabold text-amber-400">🔐 Locked Door</h3>
          <p id="lockpick-door-subtitle" class="text-xs text-slate-300 mt-0.5">Roll Sleight of Hand to pick the tumbler lock!</p>
        </div>
        <button onclick="document.getElementById('lockpick-modal').classList.add('hidden')" class="text-slate-400 hover:text-white text-sm">✕</button>
      </div>
      <div class="theme-inner-box border rounded-xl p-3 flex flex-col gap-2">
        <label class="text-[11px] font-bold text-slate-300">Picking Character (Sleight of Hand / Thieves' Tools)</label>
        <select id="lockpick-hero-select" class="theme-input border rounded-lg px-2.5 py-2 text-xs font-semibold"></select>
        <div class="flex items-center gap-2 mt-1">
          <button id="btn-roll-lockpick" onclick="submitLockpickRoll(false)" class="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition">
            🗝️ Roll Lockpick Check!
          </button>
        </div>
        <div class="flex items-center gap-2 pt-2 border-t border-slate-700/40">
          <input id="lockpick-physical-input" type="number" min="1" max="20" placeholder="Or real table die (1-20)" class="theme-input flex-1 border rounded-lg px-2.5 py-1.5 text-xs" />
          <button onclick="submitLockpickRoll(true)" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs">
            🎲 Log Table Die
          </button>
        </div>
      </div>
      <div id="lockpick-feedback" class="hidden p-2.5 rounded-xl border text-xs font-semibold"></div>
      <div id="lockpick-gm-actions" class="hidden pt-2 border-t border-slate-700/40 flex items-center justify-between gap-2 text-xs">
        <span class="text-slate-400">👑 GM Override:</span>
        <button onclick="gmForceUnlockAndOpenDoor()" class="px-3 py-1.5 rounded-lg bg-rose-900/70 hover:bg-rose-800 border border-rose-500/50 text-rose-200 font-bold">
          🔓 Unlock & Swing Open
        </button>
      </div>
    </div>
  </div>

  <!-- MODAL: GROUP READ-ALOUD & SPOKEN ROLEPLAY PROMPT -->
  <div id="rp-readout-modal" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="theme-card border-2 border-purple-500/70 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-3">
          <div id="rp-modal-emoji" class="w-12 h-12 rounded-2xl bg-purple-950/80 border border-purple-400/60 flex items-center justify-center text-2xl shadow-md">📖</div>
          <div>
            <span id="rp-modal-badge" class="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40">STORYTELLER HOOK</span>
            <h3 id="rp-modal-title" class="text-base font-extrabold text-amber-400 mt-1">Session Opening</h3>
            <p id="rp-modal-speaker" class="text-[11px] text-slate-400">Speaking to the Group</p>
          </div>
        </div>
        <button onclick="dismissRpPrompt()" class="text-slate-400 hover:text-white text-sm">✕</button>
      </div>

      <div id="rp-modal-art-strip" class="grid grid-cols-2 gap-2">
        <button type="button" onclick="openStageArtLightbox('map')" class="rounded-xl overflow-hidden border border-amber-500/40 bg-slate-950/60 text-left">
          <img id="rp-modal-map-img" src="/assets/maps/map-oakhaven-bakery-quarter.svg" alt="Area Map" class="w-full h-24 object-cover" />
          <div class="px-2 py-0.5 text-[10px] font-bold text-amber-300">🗺️ Area Map</div>
        </button>
        <button type="button" onclick="openStageArtLightbox('mood')" class="rounded-xl overflow-hidden border border-purple-500/40 bg-slate-950/60 text-left">
          <img id="rp-modal-mood-img" src="/assets/backgrounds/backdrop-hearth-tavern.svg" alt="Scene Mood" class="w-full h-24 object-cover" />
          <div class="px-2 py-0.5 text-[10px] font-bold text-purple-300">🎨 Scene Mood</div>
        </button>
      </div>

      <blockquote id="rp-modal-spoken-text" class="p-4 rounded-2xl theme-inner-box border-l-4 border-purple-400 text-sm text-slate-100 leading-relaxed font-medium"></blockquote>

      <div id="rp-modal-question-box" class="p-3 rounded-xl bg-indigo-950/50 border border-indigo-500/40 text-xs text-indigo-200 font-semibold"></div>

      <div id="rp-modal-replies" class="flex flex-col gap-1.5"></div>

      <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-700/50">
        <div class="flex items-center gap-2">
          <button onclick="speakRpPromptText()" class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow">
            🔊 Read Aloud to Group
          </button>
          <label class="inline-flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer">
            <input id="rp-auto-tts-toggle" type="checkbox" class="rounded" />
            Auto-Speak
          </label>
        </div>
        <button onclick="dismissRpPrompt()" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs">
          Continue Adventure →
        </button>
      </div>
    </div>
  </div>

  <!-- MODAL: DEMO SESSION 1 WALKTHROUGH & HOST SETUP GUIDE -->
  <div id="session-walkthrough-modal" class="hidden fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="theme-card border-2 border-sky-400/80 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
      <div class="flex items-start justify-between gap-3">
        <div>
          <span class="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/50">
            Session 1 Free Demo • Host Quick-Start
          </span>
          <h3 class="text-lg font-extrabold text-amber-400 mt-1">🧭 First Session Setup &amp; Walkthrough</h3>
          <p id="walkthrough-campaign-meta" class="text-xs text-slate-400">Tailored for your table</p>
        </div>
        <button onclick="closeSessionWalkthroughModal(false)" class="text-slate-400 hover:text-white text-sm">✕</button>
      </div>

      <!-- 4-Step Tabs -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] font-bold">
        <button type="button" id="wt-tab-0" onclick="setWalkthroughStep(0)" class="py-2 px-2 rounded-xl border transition">🛠️ 1. Set Up</button>
        <button type="button" id="wt-tab-1" onclick="setWalkthroughStep(1)" class="py-2 px-2 rounded-xl border transition">📲 2. Join</button>
        <button type="button" id="wt-tab-2" onclick="setWalkthroughStep(2)" class="py-2 px-2 rounded-xl border transition">🎮 3. Start</button>
        <button type="button" id="wt-tab-3" onclick="setWalkthroughStep(3)" class="py-2 px-2 rounded-xl border transition">📖 4. Read Aloud</button>
      </div>

      <!-- STEP 1: HOW TO SET IT UP -->
      <div id="walkthrough-step-0" class="space-y-3 text-xs leading-relaxed">
        <div class="p-3.5 rounded-2xl bg-emerald-950/50 border-2 border-emerald-400/70 space-y-2">
          <div class="font-extrabold text-emerald-300">⚡ Want to Jump Straight In? Your Room is Ready!</div>
          <p class="text-slate-200">You don't need to configure anything else to begin. Click the green button below to launch the opening scene &amp; read it aloud to your players:</p>
          <button type="button" onclick="closeSessionWalkthroughModal(true)" class="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg">
            🚀 Start Session 1 Now &amp; Read Opening Hook!
          </button>
        </div>
        <div class="p-3.5 rounded-2xl theme-inner-box border space-y-2">
          <div class="font-extrabold text-amber-400">Step 1 — Check Your Game Style, Age Group &amp; Heroes</div>
          <p class="text-slate-300">
            Your private Session 1 adventure was automatically generated for your account's <strong>Rules Tier</strong> and <strong>Age Group</strong>, complete with 3 map zones, locked/unlocked doors, NPCs, enemies, and a Session 1 boss.
          </p>
          <ul class="list-disc list-inside space-y-1 text-slate-300">
            <li><strong>Game System &amp; Rating:</strong> Use the top header dropdowns (or click below) to switch between <em>Storybook D6</em>, <em>Apprentice 5e Lite</em>, or <em>Standard 5e</em> and <em>Cozy G</em> / <em>Adventure PG</em> / <em>PG-13</em>.</li>
            <li><strong>Table Atmosphere:</strong> Set Ambient Lighting, Scene Backdrop, Weather, and Music right beneath the battlemap.</li>
            <li><strong>Custom Heroes:</strong> Open <strong>+ New Hero</strong> or <strong>⚒️ Forge</strong> in the Kid Controller to create custom portraits &amp; character tokens for each player!</li>
          </ul>
          <div class="flex flex-wrap gap-2 pt-1">
            <button type="button" onclick="closeSessionWalkthroughModal(false); toggleVttAuthModal(true);" class="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black">
              ⚙️ Change Game Style / Age Group
            </button>
            <button type="button" onclick="closeSessionWalkthroughModal(false); openTokenForgeModal();" class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold">
              ⚒️ Forge a Custom Hero
            </button>
          </div>
        </div>
      </div>

      <!-- STEP 2: HOW OTHERS SHOULD JOIN IT -->
      <div id="walkthrough-step-1" class="hidden space-y-3 text-xs leading-relaxed">
        <div class="p-3.5 rounded-2xl theme-inner-box border space-y-2.5">
          <div class="font-extrabold text-amber-400">Step 2 — Invite Players &amp; Living Room TV Screen</div>
          <p class="text-slate-300">
            Your room is completely isolated to your account (<strong id="walkthrough-room-code" class="font-mono text-amber-300">${initialState.roomCode}</strong>). Other players don't need separate accounts—they join strictly as table players using your signed invite!
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div class="p-3 rounded-xl bg-slate-950/70 border border-slate-700/70 space-y-1">
              <div class="font-bold text-emerald-300">📱 Kid Tablets &amp; Phones</div>
              <p class="text-[11px] text-slate-300">Click <strong>📲 Open Scannable QR Code</strong> below and let players scan the QR with their camera—or copy &amp; text the Kid Controller link directly. They only see revealed rooms &amp; player controls!</p>
            </div>
            <div class="p-3 rounded-xl bg-slate-950/70 border border-slate-700/70 space-y-1">
              <div class="font-bold text-sky-300">📺 Shared Table / Living Room TV</div>
              <p class="text-[11px] text-slate-300">Open the invite link with <code class="text-amber-300">&amp;mode=tv</code> on a TV browser (or switch tabs with <strong>📺 TV Display</strong>) to keep GM whispers and hidden fog zones secret.</p>
            </div>
          </div>
          <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Signed Kid Tablet Invite Link</div>
            <div id="walkthrough-join-url" class="font-mono text-[11px] text-emerald-300 break-all"></div>
            <div class="flex flex-wrap gap-2 pt-1">
              <button type="button" onclick="toggleQrJoinModal()" class="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black">
                📲 Open Scannable QR Code
              </button>
              <button type="button" onclick="copyWalkthroughJoinUrl()" id="btn-copy-wt-link" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold border border-slate-600">
                📋 Copy Invite Link
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- STEP 3: HOW TO START & PLAY IT -->
      <div id="walkthrough-step-2" class="hidden space-y-3 text-xs leading-relaxed">
        <div class="p-3.5 rounded-2xl theme-inner-box border space-y-2">
          <div class="font-extrabold text-amber-400">Step 3 — How to Start &amp; Run the First Encounter</div>
          <ol class="list-decimal list-inside space-y-1.5 text-slate-300">
            <li><strong>Pick &amp; Move Heroes:</strong> Tap your hero tab, then use the static cross <strong>🕹️ Hero D-Pad</strong>, <strong>WASD / Arrow Keys</strong>, or click an adjacent map tile to move.</li>
            <li><strong>Doors &amp; Lockpicking:</strong> Walls and closed doors block tokens automatically! Click any <strong>🔓 Unlocked Door</strong> to swing it open, or click a <strong>🔐 Locked Vault Door</strong> to roll a <em>Sleight of Hand</em> lockpick check (with digital 3D dice or real physical table dice).</li>
            <li><strong>Reveal Fog &amp; Roll Action Cards:</strong> As heroes advance into new rooms, tap <strong>👁️ Reveal Zone</strong> beneath the map. Let kids roll Action Cards or trigger <strong>⚔️ Combat Initiative</strong>!</li>
            <li><strong>Advance the Story:</strong> Click one of the <strong>🔀 Branching Story Choices</strong> under the teleprompter when ready. <em>Session 1 is 100% free to finish!</em></li>
          </ol>
        </div>
      </div>

      <!-- STEP 4: WHAT TO READ ALOUD -->
      <div id="walkthrough-step-3" class="hidden space-y-3 text-xs leading-relaxed">
        <div class="p-3.5 rounded-2xl theme-inner-box border space-y-2.5">
          <div class="font-extrabold text-amber-400">Step 4 — What to Read Out Loud to Your Group</div>
          <p class="text-[11px] text-slate-400">Show the Town Map &amp; Mood Picture to set the stage before combat, then read these generated lines aloud:</p>
          <div id="walkthrough-art-strip" class="grid grid-cols-2 gap-2">
            <div class="rounded-xl overflow-hidden border border-amber-500/40">
              <img id="walkthrough-map-img" src="/assets/maps/map-oakhaven-bakery-quarter.svg" alt="Area Map" class="w-full h-24 object-cover" />
              <div class="px-2 py-0.5 text-[10px] font-bold text-amber-300">🗺️ Town / Area Map</div>
            </div>
            <div class="rounded-xl overflow-hidden border border-purple-500/40">
              <img id="walkthrough-mood-img" src="/assets/backgrounds/backdrop-hearth-tavern.svg" alt="Scene Mood" class="w-full h-24 object-cover" />
              <div class="px-2 py-0.5 text-[10px] font-bold text-purple-300">🎨 Scene Mood Picture</div>
            </div>
          </div>
          <div class="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 space-y-1">
            <div class="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">1. Opening Hook</div>
            <p id="walkthrough-read-hook" class="text-slate-100 font-medium"></p>
          </div>
          <div class="p-3 rounded-xl bg-purple-950/40 border border-purple-500/40 space-y-1">
            <div class="text-[10px] font-extrabold uppercase tracking-wider text-purple-300">2. Scene 1 Entrance Script</div>
            <p id="walkthrough-read-scene" class="text-slate-100 font-medium"></p>
          </div>
          <div id="walkthrough-npc-box" class="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/40 space-y-1">
            <div id="walkthrough-npc-title" class="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300">3. First NPC / Group Question</div>
            <p id="walkthrough-read-npc" class="text-slate-100 font-medium"></p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" onclick="speakWalkthroughReadout()" class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow">
              🔊 Read Opening &amp; Scene 1 Aloud
            </button>
          </div>
        </div>
      </div>

      <!-- Footer Navigation -->
      <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-700/50 text-xs">
        <button type="button" id="btn-wt-prev" onclick="setWalkthroughStep(walkthroughStep - 1)" class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold">
          ← Back
        </button>
        <div class="flex items-center gap-2">
          <button type="button" id="btn-wt-skip" onclick="closeSessionWalkthroughModal(false)" class="px-3 py-2 rounded-xl text-slate-400 hover:text-slate-200 font-semibold">
            Skip for Now
          </button>
          <button type="button" id="btn-wt-next" onclick="setWalkthroughStep(walkthroughStep + 1)" class="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black">
            Next Step →
          </button>
          <button type="button" id="btn-wt-start" onclick="closeSessionWalkthroughModal(true)" class="hidden px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-md">
            🚀 Start Session 1 &amp; Open Readout!
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- MODAL: STAGE ART LIGHTBOX (FULLSCREEN TV VIEW FOR AREA MAPS & MOOD ART) -->
  <div id="stage-art-lightbox" class="hidden fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick="closeStageArtLightbox()">
    <div class="theme-card border-2 border-amber-400/70 rounded-3xl max-w-4xl w-full p-4 shadow-2xl space-y-3" onclick="event.stopPropagation()">
      <div class="flex items-center justify-between">
        <h3 id="lightbox-title" class="text-sm font-extrabold text-amber-400">🗺️ Area Map</h3>
        <button type="button" onclick="closeStageArtLightbox()" class="px-3 py-1 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold">✕ Close</button>
      </div>
      <img id="lightbox-img" src="/assets/maps/map-oakhaven-bakery-quarter.svg" alt="Stage Artwork" class="w-full max-h-[75vh] object-contain rounded-2xl border border-slate-700" />
    </div>
  </div>

  <script>
    let state = ${serialized};
    const rawUrlMode = (new URLSearchParams(window.location.search).get("mode") || "").toUpperCase();
    let displayMode =
      rawUrlMode === "KID" || rawUrlMode === "PLAYER_CONTROLLER"
        ? "PLAYER_CONTROLLER"
        : rawUrlMode === "TV" || rawUrlMode === "TABLE_TV_DISPLAY"
        ? "TABLE_TV_DISPLAY"
        : "GM_COMMAND";

    let selectedHeroId = state.heroes[0]?.id || "";
    let selectedTokenId = state.tokens?.find(t => t.characterId === selectedHeroId)?.id || "";
    let activeCardId = "";
    let activeTone = "COZY_SILLY";

    /* ==========================================================
       1. PROCEDURAL WEB AUDIO SYNTHESIS ENGINE (ZERO-DEPENDENCY)
       ========================================================== */
    const AudioEngine = {
      ctx: null,
      muted: false,
      init() {
        if (!this.ctx) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) this.ctx = new AudioContextClass();
        }
        if (this.ctx && this.ctx.state === "suspended") {
          this.ctx.resume();
        }
      },
      playDiceRoll() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        for (let i = 0; i < 6; i++) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(140 + Math.random() * 260, now + i * 0.04);
          gain.gain.setValueAtTime(0.18, now + i * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.06);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + i * 0.04);
          osc.stop(now + i * 0.04 + 0.07);
        }
      },
      playSuccessChime() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const now = this.ctx.currentTime + idx * 0.09;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.5);
        });
      },
      playFailForwardBoing() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.35);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      },
      playHeroicRally() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;
        const notes = [392, 523.25, 659.25, 783.99]; // G4, C5, E5, G5
        notes.forEach((freq, idx) => {
          const now = this.ctx.currentTime + idx * 0.12;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.65);
        });
      },
      playBedtimeLullaby() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;
        const notes = [659.25, 587.33, 523.25, 392, 440, 523.25];
        notes.forEach((freq, idx) => {
          const now = this.ctx.currentTime + idx * 0.2;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.6);
        });
      },
      playChestOpen() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;
        const notes = [440, 554.37, 659.25, 880, 1108.73];
        notes.forEach((freq, idx) => {
          const now = this.ctx.currentTime + idx * 0.06;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.14, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.4);
        });
      }
    };

    function toggleAudioMute() {
      AudioEngine.muted = !AudioEngine.muted;
      const btn = document.getElementById("btn-audio-toggle");
      if (btn) {
        btn.innerText = AudioEngine.muted ? "🔇 SFX: OFF" : "🔊 SFX: ON";
        btn.className = AudioEngine.muted
          ? "px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700"
          : "px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-emerald-300 border border-slate-600";
      }
    }

    async function toggleMusicPlayback() {
      if (AmbientAudioEngine.musicEnabled) {
        AmbientAudioEngine.stop();
      } else {
        const headerSel = document.getElementById("header-music-select");
        const drawerSel = document.getElementById("select-ambient-soundscape");
        let track =
          (state.ambientSoundscape && state.ambientSoundscape !== "SILENT" ? state.ambientSoundscape : "") ||
          (headerSel && headerSel.value && headerSel.value !== "SILENT" ? headerSel.value : "") ||
          AmbientAudioEngine.lastTrack ||
          "COZY_TAVERN";
        if (headerSel) headerSel.value = track;
        if (drawerSel) drawerSel.value = track;
        AmbientAudioEngine.start(track, true);
        if (displayMode === "GM_COMMAND") {
          await apiPost("/api/room/atmosphere", { roomCode: state.roomCode, ambientSoundscape: track });
        }
      }
    }

    async function selectMusicTrack(track) {
      const headerSel = document.getElementById("header-music-select");
      const drawerSel = document.getElementById("select-ambient-soundscape");
      if (headerSel) headerSel.value = track;
      if (drawerSel) drawerSel.value = track;
      if (!track || track === "SILENT") {
        AmbientAudioEngine.stop();
      } else {
        AmbientAudioEngine.start(track, true);
      }
      if (displayMode === "GM_COMMAND") {
        await apiPost("/api/room/atmosphere", { roomCode: state.roomCode, ambientSoundscape: track });
      }
    }

    let mapZoom = 1;
    function applyMapZoom() {
      const wrapper = document.getElementById("vtt-grid-wrapper");
      const label = document.getElementById("map-zoom-label");
      if (wrapper) {
        const pct = Math.round(mapZoom * 100);
        wrapper.style.width = pct + "%";
        wrapper.style.minWidth = pct >= 100 ? pct + "%" : "auto";
      }
      if (label) {
        label.innerText = Math.round(mapZoom * 100) + "%";
      }
      requestAnimationFrame(() => {
        if (typeof Lighting2DEngine !== "undefined" && Lighting2DEngine.render) Lighting2DEngine.render();
        if (typeof ToolsWeatherEngine !== "undefined" && ToolsWeatherEngine.render) ToolsWeatherEngine.render();
      });
    }
    function zoomMapBy(delta) {
      mapZoom = Math.max(0.6, Math.min(2.2, Math.round((mapZoom + delta) * 100) / 100));
      applyMapZoom();
    }
    function resetMapZoom() {
      mapZoom = 1;
      applyMapZoom();
    }
    (function attachBoardZoomWheel() {
      const vp = document.getElementById("vtt-board-viewport");
      if (!vp) return;
      vp.addEventListener("wheel", (e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          zoomMapBy(e.deltaY < 0 ? 0.15 : -0.15);
        }
      }, { passive: false });
    })();

    /* ==========================================================
       2. LIGHT MODE & DARK MODE THEME SYSTEM
       ========================================================== */
    let currentTheme = localStorage.getItem("hearthquest_theme") || "dark";
    function applyTheme(theme) {
      currentTheme = theme;
      localStorage.setItem("hearthquest_theme", theme);
      document.body.setAttribute("data-theme", theme);
      const btn = document.getElementById("btn-theme-toggle");
      if (btn) {
        btn.innerText = theme === "light" ? "☀️ Light" : "🌙 Dark";
      }
      const modal = document.getElementById("hero-sheet-modal");
      if (modal && !modal.classList.contains("hidden")) {
        openHeroSheetModal();
      }
    }
    function toggleTheme() {
      applyTheme(currentTheme === "light" ? "dark" : "light");
    }
    applyTheme(currentTheme);

    const SKILL_CATALOG = ${JSON.stringify(HEARTHQUEST_SKILLS)};

    ${renderDice3DEngineScript()}

    ${renderLighting2DEngineScript()}

    ${renderToolsAndWeatherEngineScript()}

    ${renderCombatAndAmbientAudioScript()}

    ${renderTokenForgeClientScript()}

    /* ==========================================================
       3. API CALLS & HELPERS
       ========================================================== */
    let vttAuthToken = localStorage.getItem("hq_vtt_auth_token") || "";
    let vttGuestToken = ${JSON.stringify(initialGuestToken)};
    let roomInviteSig = ${JSON.stringify(initialInviteSig)};
    let currentAccount = null;
    const enforceAccountLoginGate = ${requireAuthLogin};

    function isAuthRequiredGateActive() {
      return enforceAccountLoginGate && !currentAccount && displayMode === "GM_COMMAND";
    }

    function toggleVttAuthModal(open) {
      if (!open && isAuthRequiredGateActive()) {
        return;
      }
      document.getElementById("vtt-auth-modal").classList.toggle("hidden", !open);
    }

    function switchAuthTab(tab) {
      const isReg = tab === "register";
      document.getElementById("form-vtt-register").classList.toggle("hidden", !isReg);
      document.getElementById("form-vtt-login").classList.toggle("hidden", isReg);
      document.getElementById("tab-auth-register").className = isReg
        ? "flex-1 py-2 rounded-xl bg-amber-500 text-slate-950 font-extrabold"
        : "flex-1 py-2 rounded-xl bg-slate-800 text-slate-200 font-bold";
      document.getElementById("tab-auth-login").className = !isReg
        ? "flex-1 py-2 rounded-xl bg-indigo-600 text-white font-extrabold"
        : "flex-1 py-2 rounded-xl bg-slate-800 text-slate-200 font-bold";
    }

    function updateAccountUi() {
      const btn = document.getElementById("btn-vtt-account");
      const adminBtn = document.getElementById("btn-open-vtt-admin");
      const creatorBox = document.getElementById("creator-map-authoring-box");
      const toolsToggleBtn = document.getElementById("btn-toggle-pro-gm-tools");
      const summary = document.getElementById("vtt-account-summary");
      const prefsBox = document.getElementById("vtt-account-preferences-box");
      const closeBtn = document.getElementById("btn-close-auth-modal");
      const reqBanner = document.getElementById("vtt-auth-required-banner");
      const gateActive = isAuthRequiredGateActive();
      if (closeBtn) closeBtn.classList.toggle("hidden", gateActive);
      if (reqBanner) reqBanner.classList.toggle("hidden", !gateActive);
      if (!currentAccount) {
        if (btn) btn.innerText = "🔐 Sign In / Get Private Session";
        if (adminBtn) adminBtn.classList.add("hidden");
        if (creatorBox) creatorBox.classList.add("hidden");
        if (toolsToggleBtn) toolsToggleBtn.innerText = "🕯️ Table Ambiance";
        if (summary) summary.classList.add("hidden");
        if (prefsBox) prefsBox.classList.add("hidden");
        return;
      }
      const isAdmin = currentAccount.role === "ADMIN";
      const isPaid = currentAccount.subscriptionTier && currentAccount.subscriptionTier !== "TRIAL_PREVIEW";
      const rulesShort = currentAccount.preferredRulesTier === "STANDARD_5E"
        ? "5e"
        : currentAccount.preferredRulesTier === "APPRENTICE_5E_LITE"
        ? "Apprentice"
        : "Storybook";
      if (adminBtn) adminBtn.classList.toggle("hidden", !isAdmin);
      if (creatorBox) creatorBox.classList.toggle("hidden", !isAdmin);
      if (toolsToggleBtn) toolsToggleBtn.innerText = isAdmin ? "🛠️ Creator & Ambiance Tools" : "🕯️ Table Ambiance";
      if (btn) {
        btn.innerText = (isAdmin ? "👑 " : isPaid ? "🔓 " : "🟢 ") + currentAccount.familyName + " (" + rulesShort + ")";
      }
      if (summary) {
        const providerBadge = currentAccount.authProvider === "GOOGLE" ? "Google SSO" : "Email";
        const roleBadge = isAdmin
          ? "<span class='px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300 border border-amber-400/50 font-black text-[10px]'>👑 ADMIN</span>"
          : "<span class='px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px]'>USER</span>";
        summary.classList.remove("hidden");
        summary.innerHTML =
          "<div class='flex justify-between items-center gap-2'><strong>" + currentAccount.familyName + " " + roleBadge + "</strong><button onclick='logoutVttAccountUi()' class='text-rose-400 underline font-bold'>Sign Out</button></div>" +
          "<div>Personal Room: <strong class='font-mono text-amber-300'>" + currentAccount.trialRoomCode + "</strong> • Mode: <strong>" + rulesShort + "</strong> • Auth: <strong>" + providerBadge + "</strong></div>";
      }
      if (prefsBox) {
        prefsBox.classList.remove("hidden");
        document.getElementById("pref-rules-tier").value = currentAccount.preferredRulesTier || "STORYBOOK_D6";
        document.getElementById("pref-age-group").value = currentAccount.preferredAgeGroup || "AGES_8_10";
      }
    }

    function toggleAdminSendModeFields() {
      const mode = document.getElementById("admin-send-mode")?.value || "CAMPAIGN";
      document.getElementById("admin-send-campaign-row")?.classList.toggle("hidden", mode !== "CAMPAIGN");
      document.getElementById("admin-send-theme-row")?.classList.toggle("hidden", mode !== "PROCEDURAL_MAP");
    }

    async function sendAdventureFromAdminModal() {
      const fb = document.getElementById("vtt-admin-feedback");
      const targetRoomCode = document.getElementById("admin-send-target-room")?.value || "";
      const mode = document.getElementById("admin-send-mode")?.value || "CAMPAIGN";
      const campaignId = document.getElementById("admin-send-campaign-id")?.value || "camp-goblin-bakery";
      const theme = document.getElementById("admin-send-theme")?.value || "BAKERY";
      if (!targetRoomCode) {
        if (fb) {
          fb.className = "text-xs font-semibold text-rose-400";
          fb.innerText = "Pick a target user room first.";
        }
        return;
      }
      const res = await fetch("/api/vtt-admin/send-adventure", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(vttAuthToken ? { Authorization: "Bearer " + vttAuthToken } : {}),
        },
        body: JSON.stringify({ targetRoomCode, mode, campaignId, theme }),
      });
      const data = await res.json();
      if (!data.ok) {
        if (fb) {
          fb.className = "text-xs font-semibold text-rose-400";
          fb.innerText = data.error || "Dispatch failed";
        }
        return;
      }
      if (fb) {
        fb.className = "text-xs font-semibold text-emerald-400";
        fb.innerText = data.message || "Adventure dispatched cleanly!";
      }
      if (data.room && data.room.roomCode === state.roomCode) {
        renderAll(data.room);
      }
    }

    async function openVttAdminModal() {
      const modal = document.getElementById("vtt-admin-modal");
      const fb = document.getElementById("vtt-admin-feedback");
      if (modal) modal.classList.remove("hidden");
      if (fb) fb.innerText = "";
      const res = await fetch("/api/vtt-admin/accounts", {
        headers: vttAuthToken ? { Authorization: "Bearer " + vttAuthToken } : {},
      });
      const data = await res.json();
      if (!data.ok) {
        if (fb) {
          fb.className = "text-xs font-semibold text-rose-400";
          fb.innerText = data.error || "Admin access required";
        }
        return;
      }
      const gBox = document.getElementById("vtt-admin-google-status");
      if (gBox && data.googleConfig) {
        gBox.innerHTML =
          "<div class='font-extrabold text-indigo-300'>Google OAuth 2.0 Status: " +
          (data.googleConfig.configured ? "<span class='text-emerald-400'>CONFIGURED (Live OIDC)</span>" : "<span class='text-amber-300'>UNCONFIGURED (Local Dev Preview Active)</span>") +
          "</div>" +
          "<div class='text-slate-400'>Callback Redirect URI: <code class='text-emerald-300 font-mono'>" + data.googleConfig.redirectUri + "</code></div>";
      }
      const targetSel = document.getElementById("admin-send-target-room");
      if (targetSel) {
        const prev = targetSel.value;
        targetSel.innerHTML = (data.accounts || []).map((a) =>
          "<option value='" + a.trialRoomCode + "'>" + a.familyName + " (" + a.role + ") — Room " + a.trialRoomCode + "</option>"
        ).join("");
        if (prev && Array.from(targetSel.options).some((o) => o.value === prev)) {
          targetSel.value = prev;
        }
      }
      const listEl = document.getElementById("vtt-admin-accounts-list");
      if (listEl) {
        listEl.innerHTML = (data.accounts || []).map((a) => {
          const isAdmin = a.role === "ADMIN";
          const nextRole = isAdmin ? "USER" : "ADMIN";
          return "<div class='p-3 rounded-xl theme-inner-box border flex items-center justify-between gap-2'>" +
            "<div>" +
              "<div class='font-bold text-slate-100'>" + (isAdmin ? "👑 " : "👤 ") + a.familyName + " <span class='font-mono text-slate-400'>(" + a.email + ")</span></div>" +
              "<div class='text-[11px] text-slate-400'>Room: <strong class='text-amber-300 font-mono'>" + a.trialRoomCode + "</strong> • Auth: <strong>" + a.authProvider + "</strong> • Tier: <strong>" + a.subscriptionTier + "</strong></div>" +
            "</div>" +
            "<button onclick=\"toggleAccountRoleByAdmin('" + a.id + "', '" + nextRole + "')\" class='px-2.5 py-1 rounded-lg text-[11px] font-bold " + (isAdmin ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-amber-500 hover:bg-amber-400 text-slate-950") + "'>" +
              (isAdmin ? "Demote to User" : "Make Admin") +
            "</button>" +
          "</div>";
        }).join("");
      }
    }

    async function toggleAccountRoleByAdmin(accountId, nextRole) {
      const fb = document.getElementById("vtt-admin-feedback");
      const res = await fetch("/api/vtt-admin/accounts/role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(vttAuthToken ? { Authorization: "Bearer " + vttAuthToken } : {}),
        },
        body: JSON.stringify({ accountId, role: nextRole }),
      });
      const data = await res.json();
      if (!data.ok) {
        if (fb) {
          fb.className = "text-xs font-semibold text-rose-400";
          fb.innerText = data.error || "Could not change role";
        }
        return;
      }
      openVttAdminModal();
    }

    let walkthroughStep = 0;

    function syncWalkthroughModalData() {
      const code = state.roomCode || "";
      const activeNode = (state.storyNodes && (state.storyNodes.find(n => n.id === state.activeNodeId) || state.storyNodes[0])) || {};
      const rating = state.contentRating || "COZY_G";
      const readScript =
        (activeNode.readAloudByRating && (activeNode.readAloudByRating[rating] || activeNode.readAloudByRating.COZY_G)) ||
        (activeNode.readAloudByTone && (activeNode.readAloudByTone[activeTone] || activeNode.readAloudByTone.COZY_SILLY)) ||
        "";
      const firstPrompt = (activeNode.rpPrompts && activeNode.rpPrompts[0]) || state.activeRpPrompt || null;

      const metaEl = document.getElementById("walkthrough-campaign-meta");
      if (metaEl) {
        const tierLabel = state.rulesTier === "STANDARD_5E"
          ? "Standard 5e"
          : state.rulesTier === "APPRENTICE_5E_LITE"
          ? "Apprentice 5e Lite"
          : "Storybook D6";
        const ageLabel = state.ageGroup || "AGES_8_10";
        metaEl.innerText = (state.campaignTitle || "Session 1") + " • " + tierLabel + " • " + ageLabel;
      }

      const codeEl = document.getElementById("walkthrough-room-code");
      if (codeEl) codeEl.innerText = code;

      const joinPath = "/?room=" + encodeURIComponent(code) + "&mode=kid" + (roomInviteSig ? "&invite=" + encodeURIComponent(roomInviteSig) : "");
      const urlEl = document.getElementById("walkthrough-join-url");
      if (urlEl) {
        urlEl.innerText = window.location.origin + joinPath;
      }

      const hookEl = document.getElementById("walkthrough-read-hook");
      if (hookEl) {
        hookEl.innerText = state.sessionOpeningHook || ("Welcome to Room " + code + "! Tonight's adventure: " + (state.campaignTitle || "First Quest") + ".");
      }

      const sceneEl = document.getElementById("walkthrough-read-scene");
      if (sceneEl) {
        sceneEl.innerText = readScript || "Gather around the table—your heroes step into the first chamber!";
      }

      const stageUrls = resolveRoomStageUrls();
      const wtMapImg = document.getElementById("walkthrough-map-img");
      const wtMoodImg = document.getElementById("walkthrough-mood-img");
      if (wtMapImg) wtMapImg.src = stageUrls.areaMapUrl;
      if (wtMoodImg) wtMoodImg.src = stageUrls.moodArtUrl;

      const npcBox = document.getElementById("walkthrough-npc-box");
      const npcTitle = document.getElementById("walkthrough-npc-title");
      const npcEl = document.getElementById("walkthrough-read-npc");
      if (npcBox && npcEl) {
        if (firstPrompt) {
          npcBox.classList.remove("hidden");
          if (npcTitle) {
            npcTitle.innerText = "3. " + (firstPrompt.speakerEmoji || "🗣️") + " " + (firstPrompt.speakerName || "Group Prompt");
          }
          npcEl.innerText = '"' + (firstPrompt.spokenText || "") + '"' + (firstPrompt.playerPromptQuestion ? " — Ask your players: " + firstPrompt.playerPromptQuestion : "");
        } else {
          npcBox.classList.add("hidden");
        }
      }
    }

    function setWalkthroughStep(stepIdx) {
      walkthroughStep = Math.max(0, Math.min(3, Number(stepIdx) || 0));
      for (let i = 0; i < 4; i++) {
        const panel = document.getElementById("walkthrough-step-" + i);
        const tab = document.getElementById("wt-tab-" + i);
        if (panel) panel.classList.toggle("hidden", i !== walkthroughStep);
        if (tab) {
          tab.className = i === walkthroughStep
            ? "py-2 px-2 rounded-xl border bg-sky-500 text-slate-950 border-sky-300 font-black transition"
            : "py-2 px-2 rounded-xl border bg-slate-900/70 text-slate-300 border-slate-700 hover:border-sky-400/50 transition";
        }
      }
      const prevBtn = document.getElementById("btn-wt-prev");
      const nextBtn = document.getElementById("btn-wt-next");
      const startBtn = document.getElementById("btn-wt-start");
      if (prevBtn) prevBtn.classList.toggle("hidden", walkthroughStep === 0);
      if (nextBtn) nextBtn.classList.toggle("hidden", walkthroughStep === 3);
      if (startBtn) startBtn.classList.toggle("hidden", walkthroughStep !== 3);
      syncWalkthroughModalData();
    }

    function openSessionWalkthroughModal(stepIdx) {
      syncWalkthroughModalData();
      setWalkthroughStep(typeof stepIdx === "number" ? stepIdx : 0);
      const modal = document.getElementById("session-walkthrough-modal");
      if (modal) modal.classList.remove("hidden");
    }

    function closeSessionWalkthroughModal(openReadoutAfter) {
      if (state && state.roomCode) {
        try {
          localStorage.setItem("hq_vtt_walkthrough_seen_" + state.roomCode, "1");
        } catch {}
      }
      const modal = document.getElementById("session-walkthrough-modal");
      if (modal) modal.classList.add("hidden");
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (openReadoutAfter) {
        const activeNode = (state.storyNodes && (state.storyNodes.find(n => n.id === state.activeNodeId) || state.storyNodes[0])) || {};
        const promptToOpen = state.activeRpPrompt || (activeNode.rpPrompts && activeNode.rpPrompts[0]) || null;
        if (promptToOpen) {
          openRpReadoutModal(promptToOpen);
          return;
        }
      }
      if (state.activeRpPrompt && state.activeRpPrompt.id !== lastSeenRpPromptId) {
        openRpReadoutModal(state.activeRpPrompt);
      }
    }

    function speakWalkthroughReadout() {
      const hook = document.getElementById("walkthrough-read-hook")?.innerText || "";
      const scene = document.getElementById("walkthrough-read-scene")?.innerText || "";
      speakTextOutLoud([hook, scene].filter(Boolean).join(" "));
    }

    async function copyWalkthroughJoinUrl() {
      const urlText = document.getElementById("walkthrough-join-url")?.innerText || "";
      const btn = document.getElementById("btn-copy-wt-link");
      if (navigator.clipboard && urlText) {
        try {
          await navigator.clipboard.writeText(urlText);
          if (btn) btn.innerText = "✅ Copied!";
          setTimeout(() => { if (btn) btn.innerText = "📋 Copy Invite Link"; }, 2200);
        } catch {}
      }
    }

    let quickStartProgress = { readIntro: false, qrOpened: false, movedHero: false, rolledAction: false, hidden: false };

    function toggleStartHereGuideBar(show) {
      quickStartProgress.hidden = !show;
      if (show) {
        try { localStorage.removeItem("hq_vtt_hide_guide_" + (state.roomCode || "DEFAULT")); } catch {}
      } else {
        try { localStorage.setItem("hq_vtt_hide_guide_" + (state.roomCode || "DEFAULT"), "1"); } catch {}
      }
      renderStartHereGuideBar();
    }

    function renderStartHereGuideBar() {
      const bar = document.getElementById("start-here-guide-bar");
      if (!bar) return;
      if (displayMode !== "GM_COMMAND" || quickStartProgress.hidden) {
        bar.classList.add("hidden");
        return;
      }
      bar.classList.remove("hidden");
      if (state.rollHistory && state.rollHistory.length > 0) quickStartProgress.rolledAction = true;

      const steps = [
        [1, quickStartProgress.readIntro, "START", "📖 Next: Click '1. Read Story Intro' to show the Town Map & read the Opening Hook!"],
        [2, quickStartProgress.qrOpened, "QR", "📲 Optional: Click '2. Invite Kids / TV' if others are joining on phones/TV, or jump straight to '3. Move Hero'!"],
        [3, quickStartProgress.movedHero, "MOVE", "🕹️ Next: Move your hero toward the middle door using the D-Pad or clicking a square, then click the Door!"],
        [4, quickStartProgress.rolledAction, "ROLL", "🎲 Next: Roll an Action Card (right panel) or choose a Story Branch beneath the map!"],
      ];

      let nextHintText = "🎉 All 4 First-Session steps complete! Reveal rooms, pick locks, and follow the story choices below.";
      let foundNext = false;
      for (const [idx, done, idleTag, hint] of steps) {
        const card = document.getElementById("sh-step-" + idx);
        const badge = document.getElementById("sh-badge-" + idx);
        if (!card || !badge) continue;
        if (done) {
          card.className = "p-2.5 rounded-xl border border-emerald-500/50 bg-emerald-950/30 text-left transition flex items-start justify-between gap-2";
          badge.className = "px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-500 text-slate-950 shrink-0";
          badge.innerText = "DONE ✓";
        } else if (!foundNext) {
          foundNext = true;
          nextHintText = hint;
          card.className = "p-2.5 rounded-xl border-2 border-amber-400 bg-amber-950/40 hover:bg-amber-900/50 text-left transition flex items-start justify-between gap-2 shadow";
          badge.className = "px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-400 text-slate-950 shrink-0";
          badge.innerText = "NEXT";
        } else {
          card.className = "p-2.5 rounded-xl border theme-inner-box hover:border-slate-500 text-left transition flex items-start justify-between gap-2";
          badge.className = "px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 shrink-0";
          badge.innerText = idleTag;
        }
      }
      const hintEl = document.getElementById("start-here-next-hint");
      if (hintEl) hintEl.innerText = nextHintText;
    }

    function quickStartStep1ReadIntro() {
      quickStartProgress.readIntro = true;
      renderStartHereGuideBar();
      const activeNode = (state.storyNodes && (state.storyNodes.find(n => n.id === state.activeNodeId) || state.storyNodes[0])) || {};
      const prompt = state.activeRpPrompt || (activeNode.rpPrompts && activeNode.rpPrompts[0]) || null;
      if (prompt) {
        openRpReadoutModal(prompt);
      } else {
        document.getElementById("gm-story-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

    function quickStartStep2QrInvite() {
      quickStartProgress.qrOpened = true;
      renderStartHereGuideBar();
      if (typeof toggleQrJoinModal === "function") toggleQrJoinModal(true);
    }

    function quickStartStep3MoveHero() {
      quickStartProgress.movedHero = true;
      renderStartHereGuideBar();
      const hero = (state.heroes && state.heroes[0]) || null;
      if (hero) {
        selectedHeroId = hero.id;
        selectedTokenId = (state.tokens || []).find(t => t.characterId === hero.id)?.id || selectedTokenId;
        renderAll();
      }
      document.getElementById("vtt-dpad-controller")?.scrollIntoView({ behavior: "smooth", block: "center" });
      const dpad = document.getElementById("vtt-dpad-controller");
      if (dpad) {
        dpad.classList.add("ring-2", "ring-amber-400");
        setTimeout(() => dpad.classList.remove("ring-2", "ring-amber-400"), 2500);
      }
    }

    function quickStartStep4RollCheck() {
      renderStartHereGuideBar();
      const cardsEl = document.getElementById("hero-action-cards");
      cardsEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (cardsEl) {
        cardsEl.classList.add("ring-2", "ring-purple-400", "rounded-xl", "p-1");
        setTimeout(() => cardsEl.classList.remove("ring-2", "ring-purple-400", "rounded-xl", "p-1"), 2500);
      }
    }

    function maybeAutoOpenWalkthrough() {
      if (displayMode !== "GM_COMMAND" || vttGuestToken) return;
      try {
        quickStartProgress.hidden = localStorage.getItem("hq_vtt_hide_guide_" + (state.roomCode || "DEFAULT")) === "1";
      } catch {}
      const seenKey = "hq_vtt_walkthrough_seen_" + (state.roomCode || "DEFAULT");
      let alreadySeen = false;
      try {
        alreadySeen = localStorage.getItem(seenKey) === "1";
      } catch {}
      if (!alreadySeen) {
        openSessionWalkthroughModal(0);
      }
    }

    function applyAuthenticatedRoomSession(room, inviteSig) {
      if (!room || !room.roomCode) return;
      state = room;
      if (inviteSig) roomInviteSig = inviteSig;
      selectedHeroId = (state.heroes && state.heroes[0] && state.heroes[0].id) || "";
      selectedTokenId = (state.tokens && state.tokens.find(t => t.characterId === selectedHeroId)?.id) || "";
      lastSeenRpPromptId = "";
      connectRoomStream(state.roomCode);
      maybeAutoOpenWalkthrough();
      renderAll();
    }

    async function loadVttAuthStatus() {
      if (vttGuestToken && displayMode !== "GM_COMMAND") {
        return;
      }
      const headers = vttAuthToken ? { Authorization: "Bearer " + vttAuthToken } : {};
      const res = await fetch("/api/auth/me", { headers });
      const data = await res.json();
      if (data && data.account) {
        currentAccount = data.account;
        updateAccountUi();
        if (data.room && displayMode === "GM_COMMAND" && (data.room.roomCode !== state.roomCode || data.inviteSig)) {
          applyAuthenticatedRoomSession(data.room, data.inviteSig);
        }
        toggleVttAuthModal(false);
        return;
      }
      currentAccount = null;
      updateAccountUi();
      if (isAuthRequiredGateActive()) {
        switchAuthTab("login");
        toggleVttAuthModal(true);
      }
    }

    function updateModalPasswordMatchHint() {
      const pw = document.getElementById("reg-password").value;
      const confirmEl = document.getElementById("reg-password-confirm");
      const hint = document.getElementById("reg-pw-match");
      if (!confirmEl || !hint) return;
      const confirmPw = confirmEl.value;
      if (!confirmPw) {
        hint.classList.add("hidden");
        return;
      }
      hint.classList.remove("hidden");
      if (pw === confirmPw) {
        hint.className = "text-[11px] font-semibold text-emerald-400";
        hint.innerText = "✅ Passwords match";
      } else {
        hint.className = "text-[11px] font-semibold text-rose-400";
        hint.innerText = "⚠️ Passwords do not match";
      }
    }

    async function submitVttRegister(e) {
      e.preventDefault();
      const feedback = document.getElementById("vtt-auth-feedback");
      const password = document.getElementById("reg-password").value;
      const confirmPassword = document.getElementById("reg-password-confirm").value;
      if (password !== confirmPassword) {
        feedback.className = "text-[11px] font-semibold text-rose-400";
        feedback.innerText = "Passwords do not match. Please re-enter your password.";
        document.getElementById("reg-password-confirm").focus();
        return;
      }
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyName: document.getElementById("reg-family-name").value.trim(),
          email: document.getElementById("reg-email").value.trim(),
          password,
          confirmPassword,
          preferredRulesTier: document.getElementById("reg-rules-tier").value,
          preferredAgeGroup: document.getElementById("reg-age-group").value,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        feedback.className = "text-[11px] font-semibold text-rose-400";
        feedback.innerText = data.error || "Registration failed";
        return;
      }
      vttAuthToken = data.token;
      localStorage.setItem("hq_vtt_auth_token", vttAuthToken);
      currentAccount = data.account;
      updateAccountUi();
      if (data.room) {
        applyAuthenticatedRoomSession(data.room, data.inviteSig);
      }
      feedback.className = "text-[11px] font-semibold text-emerald-400";
      feedback.innerText = "🎉 Account ready! Custom adventure generated for your game system & age group!";
      toggleVttAuthModal(false);
    }

    async function saveVttAccountPreferences() {
      const feedback = document.getElementById("vtt-auth-feedback");
      const res = await fetch("/api/auth/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(vttAuthToken ? { Authorization: "Bearer " + vttAuthToken } : {}),
        },
        body: JSON.stringify({
          preferredRulesTier: document.getElementById("pref-rules-tier").value,
          preferredAgeGroup: document.getElementById("pref-age-group").value,
          roomCode: state.roomCode,
          regenerateRoom: true,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        feedback.className = "text-[11px] font-semibold text-rose-400";
        feedback.innerText = data.error || "Could not update preferences";
        return;
      }
      currentAccount = data.account;
      updateAccountUi();
      if (data.room) {
        applyAuthenticatedRoomSession(data.room, data.inviteSig);
      }
      toggleVttAuthModal(false);
    }

    async function submitVttLogin(e) {
      e.preventDefault();
      const feedback = document.getElementById("vtt-auth-feedback");
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: document.getElementById("login-email").value.trim(),
          password: document.getElementById("login-password").value,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        feedback.className = "text-[11px] font-semibold text-rose-400";
        feedback.innerText = data.error || "Sign in failed";
        return;
      }
      vttAuthToken = data.token;
      localStorage.setItem("hq_vtt_auth_token", vttAuthToken);
      currentAccount = data.account;
      updateAccountUi();
      if (data.room) {
        applyAuthenticatedRoomSession(data.room, data.inviteSig);
      }
      toggleVttAuthModal(false);
    }

    async function activateVttLicenseUi() {
      const key = document.getElementById("vtt-license-key-input").value.trim();
      const feedback = document.getElementById("vtt-auth-feedback");
      const res = await fetch("/api/auth/activate-license", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(vttAuthToken ? { Authorization: "Bearer " + vttAuthToken } : {}),
        },
        body: JSON.stringify({ licenseKey: key }),
      });
      const data = await res.json();
      if (!data.ok) {
        feedback.className = "text-[11px] font-semibold text-rose-400";
        feedback.innerText = data.error || "Could not activate license key";
        return;
      }
      currentAccount = data.account;
      updateAccountUi();
      feedback.className = "text-[11px] font-semibold text-emerald-400";
      feedback.innerText = "🔓 Unlocked! Your account now has full access (" + data.account.subscriptionTier + ").";
    }

    async function logoutVttAccountUi() {
      await fetch("/api/auth/logout", { method: "POST" });
      vttAuthToken = "";
      vttGuestToken = "";
      localStorage.removeItem("hq_vtt_auth_token");
      currentAccount = null;
      window.location.assign("/");
    }

    async function apiPost(url, data) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(vttAuthToken ? { Authorization: "Bearer " + vttAuthToken } : {}),
            ...(vttGuestToken ? { "X-HearthQuest-Guest": vttGuestToken } : {}),
          },
          body: JSON.stringify(data)
        });
        const json = await res.json();
        if (res.status === 401 || json.authRequired) {
          switchAuthTab("login");
          document.getElementById("vtt-auth-modal").classList.remove("hidden");
          return json;
        }
        if (json.paywallRequired) {
          const reasonEl = document.getElementById("vtt-paywall-reason");
          if (reasonEl && json.error) reasonEl.innerText = json.error;
          document.getElementById("vtt-paywall-modal").classList.remove("hidden");
          return json;
        }
        if (json.ok && json.room) {
          state = json.room;
          renderAll();
        }
        return json;
      } catch (err) {
        console.error("API error:", err);
      }
    }

    function setDisplayMode(mode) {
      displayMode = mode;
      renderAll();
    }

    async function setAmbientLighting(ambientLightMode) {
      await apiPost("/api/room/lighting", {
        roomCode: state.roomCode,
        ambientLightMode
      });
    }

    let activeLockpickDoorId = null;

    async function interactMapDoor(doorId) {
      const door = (state.walls || []).find(w => w.id === doorId && w.isDoor);
      if (!door) return;

      if (door.isLocked) {
        activeLockpickDoorId = doorId;
        const dcDisplay = state.rulesTier === "STORYBOOK_D6"
          ? Math.max(3, Math.min(6, Math.round((door.lockDc || 12) / 3)))
          : (door.lockDc || 12);
        const dieLabel = state.rulesTier === "STORYBOOK_D6" ? "d6" : "d20";
        document.getElementById("lockpick-door-title").innerText = "🔐 " + (door.lockLabel || "Locked Door");
        document.getElementById("lockpick-door-subtitle").innerText =
          "Requires a Lockpick Check (" + dieLabel + " vs DC " + dcDisplay + ") to unlock and open.";

        const heroSel = document.getElementById("lockpick-hero-select");
        heroSel.innerHTML = "";
        const heroes = state.heroes || [];
        heroes.forEach(h => {
          const opt = document.createElement("option");
          opt.value = h.id;
          const mod = Math.floor(((h.attributes5e?.dex || 10) - 10) / 2) + ((h.proficientSkills || []).includes("sleight_of_hand") ? 2 : 0);
          opt.innerText = h.avatarEmoji + " " + h.name + " (Lockpick " + (mod >= 0 ? "+" + mod : mod) + ")";
          if (h.id === selectedHeroId) opt.selected = true;
          heroSel.appendChild(opt);
        });

        const fb = document.getElementById("lockpick-feedback");
        fb.classList.add("hidden");
        document.getElementById("lockpick-physical-input").value = "";
        document.getElementById("lockpick-gm-actions").classList.toggle("hidden", displayMode !== "GM_COMMAND");
        document.getElementById("lockpick-modal").classList.remove("hidden");
        return;
      }

      const res = await apiPost("/api/room/door-interact", {
        roomCode: state.roomCode,
        doorId,
        characterId: selectedHeroId
      });
      if (res && res.room) {
        state = res.room;
        renderAll();
      }
    }

    async function submitLockpickRoll(usePhysical) {
      if (!activeLockpickDoorId) return;
      const characterId = document.getElementById("lockpick-hero-select").value || selectedHeroId;
      const rawInput = parseInt(document.getElementById("lockpick-physical-input").value, 10);
      const payload = {
        roomCode: state.roomCode,
        doorId: activeLockpickDoorId,
        characterId
      };
      if (usePhysical && !Number.isNaN(rawInput)) {
        payload.rawRollOverride = rawInput;
      }

      const res = await fetch("/api/room/door-interact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data && data.room) {
        state = data.room;
        renderAll();
      }
      if (data && data.roll && !usePhysical) {
        animateRollIn3D(data.roll);
      }

      const fb = document.getElementById("lockpick-feedback");
      fb.classList.remove("hidden");
      if (data && data.unlockedNow) {
        fb.className = "p-2.5 rounded-xl border text-xs font-semibold bg-emerald-950/60 border-emerald-500/60 text-emerald-200";
        fb.innerText = data.message;
        if (AudioEngine && AudioEngine.playChestOpen) AudioEngine.playChestOpen();
        setTimeout(() => {
          document.getElementById("lockpick-modal").classList.add("hidden");
        }, 950);
      } else {
        fb.className = "p-2.5 rounded-xl border text-xs font-semibold bg-rose-950/60 border-rose-500/60 text-rose-200";
        fb.innerText = (data && data.message) || "Lockpick check missed — try again!";
      }
    }

    async function gmForceUnlockAndOpenDoor() {
      if (!activeLockpickDoorId) return;
      await apiPost("/api/room/lighting", {
        roomCode: state.roomCode,
        toggleDoorId: activeLockpickDoorId
      });
      document.getElementById("lockpick-modal").classList.add("hidden");
    }

    async function gmToggleDoorLock(toggleLockDoorId) {
      await apiPost("/api/room/lighting", {
        roomCode: state.roomCode,
        toggleLockDoorId
      });
    }

    async function toggleMapDoor(toggleDoorId) {
      await interactMapDoor(toggleDoorId);
    }

    function setTabletopTool(toolName) {
      ToolsWeatherEngine.setTool(toolName);
      const btns = [
        ["MOVE", "tool-btn-move"],
        ["RULER", "tool-btn-ruler"],
        ["TEMPLATE_CIRCLE", "tool-btn-circle"],
        ["TEMPLATE_CONE", "tool-btn-cone"],
        ["TEMPLATE_LINE", "tool-btn-line"]
      ];
      for (const [t, id] of btns) {
        const b = document.getElementById(id);
        if (b) {
          b.className = t === toolName
            ? "px-2 py-1 rounded-lg font-bold border bg-sky-500 text-slate-950 border-sky-400 shadow-sm"
            : "px-2 py-1 rounded-lg font-semibold border bg-slate-800 text-slate-300 border-slate-700 hover:border-sky-400/50";
        }
      }
    }

    async function clearSpellTemplates() {
      await apiPost("/api/room/tools", {
        roomCode: state.roomCode,
        clearTemplates: true
      });
    }

    async function setAmbientWeather(ambientWeather) {
      await apiPost("/api/room/tools", {
        roomCode: state.roomCode,
        ambientWeather
      });
    }

    async function combatAction(action) {
      AudioEngine.playDiceRoll();
      await apiPost("/api/room/combat", {
        roomCode: state.roomCode,
        action
      });
    }

    async function updateAtmosphere(userInitiated) {
      const backdropSel = document.getElementById("select-scene-backdrop");
      const soundSel = document.getElementById("select-ambient-soundscape");
      const sceneBackdrop = backdropSel ? backdropSel.value : undefined;
      const ambientSoundscape = soundSel ? soundSel.value : undefined;
      if (userInitiated && ambientSoundscape) {
        AmbientAudioEngine.start(ambientSoundscape, true);
      }
      await apiPost("/api/room/atmosphere", {
        roomCode: state.roomCode,
        sceneBackdrop,
        ambientSoundscape
      });
    }

    async function rollHeroSkill(skillId) {
      const hero = state.heroes.find(h => h.id === selectedHeroId) || state.heroes[0];
      if (!hero) return;
      AudioEngine.playDiceRoll();
      const json = await apiPost("/api/room/skill-roll", {
        roomCode: state.roomCode,
        characterId: hero.id,
        skillId
      });
      if (json && json.roll) {
        animateRollIn3D(json.roll);
        if (json.roll.succeeded) AudioEngine.playSuccessChime();
        else AudioEngine.playFailForwardBoing();
      }
    }

    async function refreshCustomTokens() {
      try {
        const res = await fetch("/api/custom-tokens");
        const json = await res.json();
        const sel = document.getElementById("select-custom-token");
        if (!sel) return;
        sel.innerHTML = "";
        const items = (json && json.tokens) || [];
        if (items.length === 0) {
          const opt = document.createElement("option");
          opt.value = "";
          opt.innerText = "(No custom tokens in folder yet)";
          sel.appendChild(opt);
        } else {
          for (const tok of items) {
            const opt = document.createElement("option");
            opt.value = tok.url + "|" + tok.name;
            opt.innerText = "🖼️ " + tok.name;
            sel.appendChild(opt);
          }
        }
      } catch {}
    }

    async function spawnSelectedCustomToken() {
      const sel = document.getElementById("select-custom-token");
      if (!sel || !sel.value) return;
      const [assetUrl, name] = sel.value.split("|");
      await apiPost("/api/room/spawn-custom-token", {
        roomCode: state.roomCode,
        name: name || "Custom Token",
        assetUrl,
        type: "NPC",
        gridX: 2,
        gridY: 3
      });
    }

    function setReadAloudTone(tone) {
      activeTone = tone;
      renderAll();
    }

    let lastSeenRpPromptId = "";

    function speakTextOutLoud(textToSpeak) {
      if ("speechSynthesis" in window && textToSpeak) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.rate = 0.95;
        utterance.pitch = 1.05;
        window.speechSynthesis.speak(utterance);
      }
    }

    function speakReadAloudText() {
      const activeNode = state.storyNodes.find(n => n.id === state.activeNodeId) || state.storyNodes[0];
      const textToSpeak = activeNode?.readAloudByTone[activeTone] || activeNode?.readAloudByTone.COZY_SILLY || "";
      speakTextOutLoud(textToSpeak);
    }

    function resolveRoomStageUrls() {
      const activeNode = (state.storyNodes && (state.storyNodes.find(n => n.id === state.activeNodeId) || state.storyNodes[0])) || {};
      const cid = (state.campaignId || "").toLowerCase();
      const fallbackMap = (cid.includes("treehouse") || cid.includes("forest") || cid.includes("silverleaf"))
        ? "/assets/maps/map-silverleaf-canopy.svg"
        : (cid.includes("starlight") || cid.includes("otter") || cid.includes("starwatch"))
        ? "/assets/maps/map-starwatch-bastion.svg"
        : "/assets/maps/map-oakhaven-bakery-quarter.svg";
      const bg = (state.sceneBackdrop || "").toLowerCase();
      const fallbackMood = (bg.includes("wood") || cid.includes("treehouse") || cid.includes("forest"))
        ? "/assets/backgrounds/backdrop-enchanted-woods.svg"
        : (bg.includes("starlight") || cid.includes("starlight") || cid.includes("otter"))
        ? "/assets/backgrounds/backdrop-starlight-observatory.svg"
        : "/assets/backgrounds/backdrop-hearth-tavern.svg";
      return {
        areaMapUrl: activeNode.stageAreaMapUrl || state.stageAreaMapUrl || fallbackMap,
        moodArtUrl: activeNode.stageMoodArtUrl || state.stageMoodArtUrl || fallbackMood,
      };
    }

    function openStageArtLightbox(kind) {
      const urls = resolveRoomStageUrls();
      const img = document.getElementById("lightbox-img");
      const title = document.getElementById("lightbox-title");
      if (kind === "mood") {
        if (img) img.src = urls.moodArtUrl;
        if (title) title.innerText = "🎨 Scene Mood Illustration — Set the Stage";
      } else {
        if (img) img.src = urls.areaMapUrl;
        if (title) title.innerText = "🗺️ Town & Regional Area Map — Overview";
      }
      document.getElementById("stage-art-lightbox")?.classList.remove("hidden");
    }

    function closeStageArtLightbox() {
      document.getElementById("stage-art-lightbox")?.classList.add("hidden");
    }

    function showMonsterStatBlockCard(tok) {
      const card = document.getElementById("monster-statblock-card");
      if (!card || !tok) return;
      const sb = tok.statBlock5e;
      if (!sb) {
        card.classList.add("hidden");
        return;
      }
      const modStr = (score) => {
        const m = Math.floor((Number(score || 10) - 10) / 2);
        return (m >= 0 ? "+" : "") + m;
      };
      document.getElementById("msb-name").innerText = (tok.avatarEmoji || "👹") + " " + (sb.creatureName || tok.name);
      document.getElementById("msb-meta").innerText = sb.sizeTypeAlignment || "Creature";
      document.getElementById("msb-vitals").innerHTML =
        '<div>🛡️ AC <span class="text-amber-300">' + sb.armorClass + '</span></div>' +
        '<div>❤️ HP <span class="text-emerald-300">' + tok.hp + '/' + tok.maxHp + '</span> (' + sb.hitDice + ')</div>' +
        '<div>⚔️ CR <span class="text-sky-300">' + sb.challengeRating + '</span> (' + sb.xp + ' XP)</div>';
      const ab = sb.abilities || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
      document.getElementById("msb-abilities").innerHTML =
        [["STR", ab.str], ["DEX", ab.dex], ["CON", ab.con], ["INT", ab.int], ["WIS", ab.wis], ["CHA", ab.cha]]
          .map(([k, v]) => '<div class="p-1 rounded-lg bg-slate-900/70 border border-slate-700/60"><div class="text-[9px] text-slate-400">' + k + '</div><div class="font-bold text-slate-100">' + v + ' (' + modStr(v) + ')</div></div>')
          .join("");
      document.getElementById("msb-traits").innerHTML = (sb.traits || [])
        .map(t => '<div>• ' + t + '</div>')
        .join("");
      document.getElementById("msb-actions").innerHTML = '<div class="font-extrabold text-amber-300 uppercase text-[10px]">Actions • Speed ' + (sb.speed || "30 ft.") + '</div>' +
        (sb.actions || [])
          .map(a => '<div class="mt-0.5"><strong>' + a.name + '</strong> (' + (a.attackBonus >= 0 ? "+" : "") + a.attackBonus + ' to hit, ' + a.damageDice + ' ' + a.damageType + '): ' + a.description + '</div>')
          .join("");
      const rpBtn = document.getElementById("msb-rp-btn");
      if (rpBtn) {
        rpBtn.onclick = () => {
          const allPrompts = (state.storyNodes || []).flatMap(n => n.rpPrompts || []);
          const matched = allPrompts.find(p => tok.name.toLowerCase().includes((p.speakerName || "").toLowerCase().split(" ")[0])) || allPrompts[0];
          if (matched) triggerSceneRpCue(matched.id);
        };
      }
      card.classList.remove("hidden");
    }

    function openRpReadoutModal(prompt) {
      if (!prompt) return;
      lastSeenRpPromptId = prompt.id;
      const stageUrls = resolveRoomStageUrls();
      const rpMapImg = document.getElementById("rp-modal-map-img");
      const rpMoodImg = document.getElementById("rp-modal-mood-img");
      if (rpMapImg) rpMapImg.src = stageUrls.areaMapUrl;
      if (rpMoodImg) rpMoodImg.src = stageUrls.moodArtUrl;
      document.getElementById("rp-modal-emoji").innerText = prompt.speakerEmoji || "📖";
      document.getElementById("rp-modal-badge").innerText = (prompt.speakerRole || "NARRATOR") + " • " + (prompt.trigger || "SCENE");
      document.getElementById("rp-modal-title").innerText = prompt.title || "Story Moment";
      document.getElementById("rp-modal-speaker").innerText = (prompt.speakerName || "Adventure Narrator") + " says to the group:";
      document.getElementById("rp-modal-spoken-text").innerText = '"' + (prompt.spokenText || "") + '"';

      const qBox = document.getElementById("rp-modal-question-box");
      if (prompt.playerPromptQuestion) {
        qBox.classList.remove("hidden");
        qBox.innerText = "🗣️ Group Prompt: " + prompt.playerPromptQuestion;
      } else {
        qBox.classList.add("hidden");
      }

      const repliesEl = document.getElementById("rp-modal-replies");
      repliesEl.innerHTML = "";
      (prompt.suggestedReplyOptions || []).forEach(opt => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.onclick = () => dismissRpPrompt(opt);
        btn.className = "text-left px-3 py-2 rounded-xl bg-purple-950/60 hover:bg-purple-900 border border-purple-500/40 text-xs text-amber-200 font-semibold transition";
        btn.innerText = "💬 Say: " + opt;
        repliesEl.appendChild(btn);
      });

      document.getElementById("rp-readout-modal").classList.remove("hidden");
      const autoSpeak = document.getElementById("rp-auto-tts-toggle");
      if (autoSpeak && autoSpeak.checked) {
        speakRpPromptText();
      }
    }

    function speakRpPromptText() {
      const prompt = state.activeRpPrompt;
      const text = prompt
        ? (prompt.spokenText || "") + (prompt.playerPromptQuestion ? " " + prompt.playerPromptQuestion : "")
        : (document.getElementById("rp-modal-spoken-text").innerText || "");
      speakTextOutLoud(text);
    }

    async function dismissRpPrompt(playerReply) {
      quickStartProgress.readIntro = true;
      renderStartHereGuideBar();
      document.getElementById("rp-readout-modal").classList.add("hidden");
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      await apiPost("/api/room/rp-prompt", {
        roomCode: state.roomCode,
        dismiss: true,
        playerReply: playerReply || undefined,
      });
    }

    async function triggerSceneRpCue(promptId) {
      lastSeenRpPromptId = "";
      const res = await apiPost("/api/room/rp-prompt", {
        roomCode: state.roomCode,
        promptId: promptId || undefined,
      });
      if (res && res.room) {
        state = res.room;
        renderAll();
      }
    }

    let moveBlockedTimer = null;

    function hideMoveBlockedBanner() {
      const banner = document.getElementById("move-blocked-banner");
      if (banner) banner.classList.add("hidden");
    }

    function showMoveBlockedBanner(message, blockedByDoorId, isLockedDoor) {
      const banner = document.getElementById("move-blocked-banner");
      const textEl = document.getElementById("move-blocked-text");
      const btnEl = document.getElementById("move-blocked-action-btn");
      if (!banner || !textEl) return;

      textEl.innerText = message || "🧱 Blocked by wall or closed door.";
      if (btnEl) {
        if (blockedByDoorId) {
          btnEl.classList.remove("hidden");
          btnEl.innerText = isLockedDoor ? "🗝️ Pick Lock" : "🚪 Open Door";
          btnEl.onclick = () => {
            hideMoveBlockedBanner();
            interactMapDoor(blockedByDoorId);
          };
        } else {
          btnEl.classList.add("hidden");
        }
      }
      banner.classList.remove("hidden");
      if (moveBlockedTimer) clearTimeout(moveBlockedTimer);
      moveBlockedTimer = setTimeout(hideMoveBlockedBanner, 4500);
    }

    function getControllableHeroToken() {
      const heroExists = (state.heroes || []).some(h => h.id === selectedHeroId);
      if (!heroExists && state.heroes && state.heroes.length > 0) {
        selectedHeroId = state.heroes[0].id;
      }
      const tokens = state.tokens || [];
      return (
        tokens.find(t => t.id === selectedTokenId && (t.type === "HERO" || t.characterId)) ||
        tokens.find(t => t.characterId === selectedHeroId) ||
        tokens.find(t => t.type === "HERO") ||
        tokens[0] ||
        null
      );
    }

    async function moveTokenToCell(x, y) {
      const heroTok = getControllableHeroToken();
      if (!heroTok) return;
      selectedTokenId = heroTok.id;
      if (heroTok.characterId) selectedHeroId = heroTok.characterId;

      const res = await apiPost("/api/room/move-token", {
        roomCode: state.roomCode,
        tokenId: heroTok.id,
        targetX: x,
        targetY: y
      });

      if (res && res.moved === false) {
        AudioEngine.playFailForwardBoing();
        showMoveBlockedBanner(res.blockedMessage, res.blockedByDoorId, res.isLockedDoor);
        if (res.blockedByDoorId && res.isLockedDoor) {
          interactMapDoor(res.blockedByDoorId);
        }
        return;
      }

      hideMoveBlockedBanner();
      quickStartProgress.movedHero = true;
      renderStartHereGuideBar();
      const chestTok = (state.tokens || []).find(
        t => t.gridX === x && t.gridY === y && t.isLootChest && !t.isChestOpened
      );
      if (chestTok) {
        await openLootChest(chestTok.id);
      }
    }

    async function openLootChest(tokenId) {
      AudioEngine.playChestOpen();
      const res = await apiPost("/api/room/open-chest", {
        roomCode: state.roomCode,
        tokenId,
        characterId: selectedHeroId
      });
      if (res && res.rewardedItem) {
        const toast = document.getElementById("loot-toast");
        const msg = document.getElementById("loot-toast-message");
        msg.innerText = \`Treasure Found: \${res.rewardedItem.icon} \${res.rewardedItem.name} — \${res.rewardedItem.description}\`;
        toast.classList.remove("hidden");
        setTimeout(() => toast.classList.add("hidden"), 5000);
      }
    }

    async function moveSelectedHero(dx, dy) {
      const heroTok = getControllableHeroToken();
      if (!heroTok) return;
      selectedTokenId = heroTok.id;
      if (heroTok.characterId) selectedHeroId = heroTok.characterId;

      const rawTargetX = heroTok.gridX + dx;
      const rawTargetY = heroTok.gridY + dy;
      const res = await apiPost("/api/room/move-token", {
        roomCode: state.roomCode,
        tokenId: heroTok.id,
        deltaX: dx,
        deltaY: dy,
        targetX: rawTargetX,
        targetY: rawTargetY
      });

      if (res && res.moved === false) {
        AudioEngine.playFailForwardBoing();
        showMoveBlockedBanner(res.blockedMessage, res.blockedByDoorId, res.isLockedDoor);
        if (res.blockedByDoorId && res.isLockedDoor) {
          interactMapDoor(res.blockedByDoorId);
        }
        return;
      }

      hideMoveBlockedBanner();
      const movedHeroTok = (state.tokens || []).find(t => t.id === heroTok.id);
      if (movedHeroTok) {
        const chestTok = (state.tokens || []).find(
          t => t.gridX === movedHeroTok.gridX && t.gridY === movedHeroTok.gridY && t.isLootChest && !t.isChestOpened
        );
        if (chestTok) {
          await openLootChest(chestTok.id);
        }
      }
    }

    document.addEventListener("keydown", (e) => {
      const tag = (document.activeElement && document.activeElement.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const openModal = ["dice-modal", "lockpick-modal", "rp-readout-modal", "vtt-auth-modal", "hero-sheet-modal", "token-forge-modal"]
        .some(id => {
          const el = document.getElementById(id);
          return el && !el.classList.contains("hidden");
        });
      if (openModal) return;

      const keyMap = {
        ArrowUp: [0, -1],
        KeyW: [0, -1],
        ArrowDown: [0, 1],
        KeyS: [0, 1],
        ArrowLeft: [-1, 0],
        KeyA: [-1, 0],
        ArrowRight: [1, 0],
        KeyD: [1, 0],
      };
      const delta = keyMap[e.code];
      if (delta) {
        e.preventDefault();
        moveSelectedHero(delta[0], delta[1]);
      }
    });

    async function toggleZone(zoneId) {
      await apiPost("/api/room/zone-fog", { roomCode: state.roomCode, zoneId });
    }

    async function chooseBranch(targetNodeId, consequenceTag) {
      await apiPost("/api/room/story-branch", {
        roomCode: state.roomCode,
        targetNodeId,
        consequenceTag
      });
    }

    async function toggleBedtime() {
      AudioEngine.playBedtimeLullaby();
      await apiPost("/api/room/bedtime", { roomCode: state.roomCode });
    }

    async function switchCampaign(campaignId) {
      await apiPost("/api/room/switch-campaign", { roomCode: state.roomCode, campaignId });
    }

    async function regenerateProceduralMap() {
      await apiPost("/api/room/procedural-map", { roomCode: state.roomCode });
    }

    async function generateScaledOneShot() {
      const res = await apiPost("/api/room/generate-oneshot", { roomCode: state.roomCode });
      if (res && res.room && res.loreEntry) {
        const badge = document.getElementById("story-node-badge");
        if (badge) {
          badge.textContent = "ONE-SHOT L" + (res.partyLevel || 1) + ": " + res.loreEntry.title;
        }
      }
    }

    async function changeRoomSettings() {
      const rulesTier = document.getElementById("select-rules-tier").value;
      const contentRating = document.getElementById("select-content-rating").value;
      const difficulty = document.getElementById("select-difficulty")?.value || "BALANCED_NORMAL";
      await apiPost("/api/room/settings", {
        roomCode: state.roomCode,
        rulesTier,
        contentRating,
        difficulty
      });
    }

    async function askAiCoPilot() {
      const input = document.getElementById("gm-improv-input");
      const q = input.value.trim();
      if (!q) return;
      const res = await apiPost("/api/room/copilot", {
        roomCode: state.roomCode,
        question: q
      });
      if (res && res.whisper) {
        document.getElementById("copilot-whisper-text").innerText =
          (res.whisper.readAloudOptions[activeTone === "ACTION_HEROIC" ? "actionHeroic" : "cozySilly"] || "") +
          " • Tip: " + res.whisper.ruleGuidance;
      }
    }

    function toggleHeroCreatorModal() {
      document.getElementById("hero-creator-modal").classList.toggle("hidden");
    }

    function syncQrJoinModalUi() {
      const code = state.roomCode || "DRGN";
      const origin = window.location.origin;
      const inviteQuery = roomInviteSig ? "&invite=" + encodeURIComponent(roomInviteSig) : "";
      const kidUrl = origin + "/?room=" + encodeURIComponent(code) + "&mode=kid" + inviteQuery;
      const qrSrc = "/api/room/qr?room=" + encodeURIComponent(code) + "&origin=" + encodeURIComponent(origin) + inviteQuery;
      const titleEl = document.getElementById("qr-modal-title");
      const imgEl = document.getElementById("qr-modal-img");
      const codeEl = document.getElementById("qr-modal-code");
      const linkEl = document.getElementById("qr-modal-link");
      const topRoomBadge = document.getElementById("room-code-badge");
      const kidsJoinBadge = document.getElementById("kids-join-room-code");
      document.title = "HearthQuest VTT - Room " + code;
      if (topRoomBadge) topRoomBadge.innerText = "ROOM: " + code;
      if (kidsJoinBadge) kidsJoinBadge.innerText = code;
      if (titleEl) titleEl.innerText = "📲 Scan to Join Room " + code;
      if (imgEl && imgEl.getAttribute("data-qr-src") !== qrSrc) {
        imgEl.setAttribute("data-qr-src", qrSrc);
        imgEl.src = qrSrc;
        imgEl.alt = "QR Code for Room " + code;
      }
      if (codeEl) codeEl.innerText = code;
      if (linkEl) {
        linkEl.href = kidUrl;
        linkEl.innerText = "🔗 Open Direct Kid Tablet Link (" + kidUrl + ")";
      }
    }

    function toggleQrJoinModal() {
      syncQrJoinModalUi();
      document.getElementById("qr-join-modal").classList.toggle("hidden");
    }

    function openHeroSheetModal() {
      const hero = state.heroes.find(h => h.id === selectedHeroId) || state.heroes[0];
      if (!hero) return;
      document.getElementById("modal-hero-title").innerHTML = \`\${hero.avatarEmoji} \${hero.name} — Character Sheet\`;
      const stars = "⭐".repeat(hero.levelStars || 1);
      const content = document.getElementById("modal-hero-content");
      const isLight = document.body.getAttribute("data-theme") === "light";
      const profSet = new Set(hero.proficientSkills || []);
      const profBonus = state.rulesTier === "STORYBOOK_D6" ? 1 : 2;
      const calcMod = (score) => Math.floor((score - 10) / 2);
      const modalPortrait = hero.assetPath
        ? \`<img src="\${hero.assetPath}" class="w-12 h-12 rounded-full border-2 border-amber-400 shadow-md object-cover shrink-0" alt="\${hero.name}" />\`
        : \`<span class="text-3xl shrink-0">\${hero.avatarEmoji}</span>\`;

      const abilitiesHtml = state.rulesTier === "STORYBOOK_D6"
        ? \`
          <div class="grid grid-cols-3 gap-2">
            <div class="p-2 rounded-xl theme-inner-box border text-center"><div class="text-[10px] text-slate-400 font-bold">BRAWN</div><div class="text-base font-extrabold text-amber-500">+\${hero.storybookStats.brawn}</div></div>
            <div class="p-2 rounded-xl theme-inner-box border text-center"><div class="text-[10px] text-slate-400 font-bold">BRAINS</div><div class="text-base font-extrabold text-sky-500">+\${hero.storybookStats.brains}</div></div>
            <div class="p-2 rounded-xl theme-inner-box border text-center"><div class="text-[10px] text-slate-400 font-bold">CHARM</div><div class="text-base font-extrabold text-rose-500">+\${hero.storybookStats.charm}</div></div>
          </div>
        \`
        : \`
          <div class="grid grid-cols-6 gap-1.5">
            \${["str", "dex", "con", "int", "wis", "cha"].map(k => {
              const sc = hero.attributes5e[k];
              const m = calcMod(sc);
              return \`<div class="p-1.5 rounded-xl theme-inner-box border text-center"><div class="text-[9px] uppercase font-bold text-slate-400">\${k}</div><div class="text-sm font-extrabold">\${m >= 0 ? "+" + m : m}</div><div class="text-[10px] text-slate-400">\${sc}</div></div>\`;
            }).join("")}
          </div>
        \`;

      const skillsHtml = SKILL_CATALOG.map(sk => {
        const isProf = profSet.has(sk.id);
        const base = state.rulesTier === "STORYBOOK_D6"
          ? hero.storybookStats[sk.storybookStat]
          : calcMod(hero.attributes5e[sk.ability5e]);
        const totalMod = base + (isProf ? profBonus : 0);
        const modLabel = totalMod >= 0 ? "+" + totalMod : "" + totalMod;
        const themeCls = isLight ? sk.accentLightClass : sk.accentDarkClass;
        return \`
          <button onclick="rollHeroSkill('\${sk.id}')" class="p-2 rounded-xl border text-left flex items-center justify-between gap-1 hover:scale-[1.02] transition shadow-sm \${themeCls}">
            <span class="font-bold flex items-center gap-1 truncate"><span>\${sk.icon}</span><span class="truncate">\${sk.name}</span>\${isProf ? "<span title='Proficient'>★</span>" : ""}</span>
            <span class="font-mono font-extrabold px-1.5 py-0.5 rounded bg-black/15 text-[11px]">\${modLabel}</span>
          </button>
        \`;
      }).join("");

      content.innerHTML = \`
        <div class="flex items-center gap-3 p-3 rounded-xl theme-inner-box border">
          \${modalPortrait}
          <div class="flex-1">
            <div class="font-extrabold text-sm text-amber-500">\${hero.archetype}</div>
            <div class="text-slate-400">Played by \${hero.playerName} • Mode: \${isLight ? "☀️ Light Parchment" : "🌙 Dark Midnight"}</div>
          </div>
          <div class="text-right shrink-0">
            <div class="text-xs font-bold text-amber-400">Level: \${stars}</div>
            <div class="text-xs text-rose-500 font-bold">\${hero.rulesTier === "STORYBOOK_D6" ? "❤️".repeat(hero.storybookStats.hearts) + " Hearts" : "❤️ " + hero.attributes5e.hp + " HP • 🛡️ AC " + hero.attributes5e.armorClass}</div>
          </div>
        </div>

        \${abilitiesHtml}

        <div class="p-3 rounded-xl theme-inner-box border space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-bold text-indigo-400">🎯 Click Any Skill to Roll in 3D:</span>
            <span class="text-[10px] text-slate-400">★ Proficient (+\${profBonus})</span>
          </div>
          <div class="grid grid-cols-2 gap-1.5">\${skillsHtml}</div>
        </div>

        <div class="p-3 rounded-xl theme-inner-box border space-y-1">
          <div class="font-bold text-amber-500">🐾 Pet Companion: \${hero.companionPet}</div>
          <p class="text-slate-300">\${hero.petTrait || "Always loyal and ready to assist during family adventures!"}</p>
        </div>

        <div class="p-3 rounded-xl theme-inner-box border space-y-2">
          <div class="font-bold text-slate-300">🎒 Inventory & Magical Items:</div>
          <div class="space-y-1.5">
            \${hero.inventory.map(item => \`
              <div class="p-2 rounded-lg theme-inner-box border flex items-center gap-2">
                <span class="text-xl">\${item.icon}</span>
                <div>
                  <div class="font-bold text-amber-500">\${item.name}</div>
                  <div class="text-[11px] text-slate-400">\${item.description}</div>
                </div>
              </div>
            \`).join("")}
          </div>
        </div>
      \`;
      document.getElementById("hero-sheet-modal").classList.remove("hidden");
    }

    function closeHeroSheetModal() {
      document.getElementById("hero-sheet-modal").classList.add("hidden");
    }

    async function createNewHero() {
      const playerName = document.getElementById("new-hero-player").value || "Alex";
      const playerAge = Number(document.getElementById("new-hero-age").value || 8);
      const name = document.getElementById("new-hero-name").value || "Captain Sparkle";
      const rawArch = document.getElementById("new-hero-archetype").value.split("|");
      const companionPet = document.getElementById("new-hero-pet").value || "Bramble the Hedgehog";

      await apiPost("/api/room/add-hero", {
        playerName,
        playerAge,
        name,
        avatarEmoji: rawArch[0],
        archetype: rawArch[1],
        companionPet
      });
      toggleHeroCreatorModal();
    }

    function openDiceModal(cardId) {
      activeCardId = cardId;
      const hero = state.heroes.find(h => h.id === selectedHeroId) || state.heroes[0];
      const card = hero?.actionCards.find(c => c.id === cardId) || hero?.actionCards[0];
      if (!card) return;

      document.getElementById("dice-modal-title").innerText = card.icon + " " + card.title;
      document.getElementById("dice-modal-desc").innerText = card.description;

      const btnGrid = document.getElementById("physical-dice-buttons");
      btnGrid.innerHTML = "";
      const maxVal = state.rulesTier === "STORYBOOK_D6" ? 6 : 20;
      for (let v = 1; v <= maxVal; v++) {
        const b = document.createElement("button");
        b.className = "py-2 rounded-xl bg-slate-800 hover:bg-emerald-600 text-white font-extrabold text-xs transition border border-slate-700";
        b.innerText = v;
        b.onclick = () => submitActionRoll("PHYSICAL_DICE_TABLE", v);
        btnGrid.appendChild(b);
      }

      document.getElementById("dice-modal").classList.remove("hidden");
    }

    function closeDiceModal() {
      document.getElementById("dice-modal").classList.add("hidden");
    }

    let lastAnimatedRollId = (state.rollHistory && state.rollHistory[0] && state.rollHistory[0].id) || null;

    function animateRollIn3D(roll) {
      if (!roll || roll.id === lastAnimatedRollId) return;
      lastAnimatedRollId = roll.id;
      const hero = state.heroes.find(h => h.id === roll.characterId);
      Dice3DEngine.rollDie({
        die: roll.dieType || "d20",
        rawRoll: roll.rawRoll,
        modifier: roll.modifier,
        total: roll.total,
        succeeded: roll.succeeded,
        isCrit: roll.isCriticalSuccess,
        heroName: roll.characterName,
        actionTitle: roll.actionTitle,
        color: hero ? hero.tokenColor : "#f59e0b"
      });
    }

    async function triggerDigitalRoll() {
      await submitActionRoll("DIGITAL_3D_ROLLER");
    }

    async function quickRoll3D(dieType) {
      const res = await apiPost("/api/room/quick-roll", {
        roomCode: state.roomCode,
        dieType,
        characterId: selectedHeroId
      });
      if (res && res.roll) {
        animateRollIn3D(res.roll);
      }
    }

    async function submitActionRoll(source, physicalRollValue) {
      closeDiceModal();
      const res = await apiPost("/api/room/roll", {
        roomCode: state.roomCode,
        characterId: selectedHeroId,
        cardId: activeCardId,
        source,
        physicalRollValue
      });

      if (res && res.roll) {
        if (source === "DIGITAL_3D_ROLLER") {
          animateRollIn3D(res.roll);
        } else {
          lastAnimatedRollId = res.roll.id;
          if (res.roll.succeeded) {
            AudioEngine.playSuccessChime();
          } else {
            AudioEngine.playFailForwardBoing();
          }
        }
      }
    }

    /* ==========================================================
       4. MASTER RENDER DISPATCHER
       ========================================================== */
    function renderAll() {
      // Apply theme
      applyTheme(currentTheme);

      // Mode switch buttons
      const modes = [
        ["GM_COMMAND", "btn-mode-gm"],
        ["TABLE_TV_DISPLAY", "btn-mode-tv"],
        ["PLAYER_CONTROLLER", "btn-mode-player"]
      ];
      for (const [m, id] of modes) {
        const el = document.getElementById(id);
        if (m === displayMode) {
          el.className = "px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-400 text-slate-950 shadow";
        } else {
          el.className = "px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white";
        }
      }

      const modeBadge = document.getElementById("room-code-badge");
      if (modeBadge) modeBadge.innerText = "ROOM: " + state.roomCode;
      syncQrJoinModalUi();
      document.getElementById("select-rules-tier").value = state.rulesTier;
      document.getElementById("select-content-rating").value = state.contentRating;
      const diffSel = document.getElementById("select-difficulty");
      if (diffSel) diffSel.value = state.difficulty || "BALANCED_NORMAL";
      const headerMusicSel = document.getElementById("header-music-select");
      const drawerMusicSel = document.getElementById("select-ambient-soundscape");
      if (state.ambientSoundscape) {
        if (headerMusicSel) headerMusicSel.value = state.ambientSoundscape;
        if (drawerMusicSel) drawerMusicSel.value = state.ambientSoundscape;
      }
      if (typeof AmbientAudioEngine !== "undefined" && AmbientAudioEngine.syncButtons) {
        AmbientAudioEngine.syncButtons();
      }

      // Update pre-combat stage-setting pictures & difficulty badge
      const stageShowcase = document.getElementById("stage-art-showcase");
      const stageUrls = resolveRoomStageUrls();
      const stageMapImg = document.getElementById("stage-area-map-img");
      const stageMoodImg = document.getElementById("stage-mood-art-img");
      if (stageMapImg) stageMapImg.src = stageUrls.areaMapUrl;
      if (stageMoodImg) stageMoodImg.src = stageUrls.moodArtUrl;
      if (stageShowcase) {
        const hideForCombat = Boolean(state.combat && state.combat.isActive);
        stageShowcase.classList.toggle("hidden", hideForCombat);
      }
      const diffPill = document.getElementById("difficulty-effect-pill");
      if (diffPill) {
        const dMode = state.difficulty || "BALANCED_NORMAL";
        diffPill.innerText = dMode === "STORY_EASY"
          ? "🌟 Easy: Foes -45% HP / -3 AC / -3 DC • +2 Hero Rolls"
          : dMode === "HEROIC_HARD"
          ? "🔥 Heroic: Foes +35% HP / +2 AC / +2 DC"
          : "⚖️ Balanced: Standard 5e SRD Stats";
      }

      // Bedtime status
      const bedBanner = document.getElementById("bedtime-banner");
      const bedBtn = document.getElementById("btn-bedtime");
      if (state.isPausedForBedtime) {
        bedBanner.classList.remove("hidden");
        document.getElementById("bedtime-recap-text").innerText =
          state.bedtimeSnapshot?.previouslyOnRecap || "";
        bedBtn.innerText = "☀️ Resume Adventure";
      } else {
        bedBanner.classList.add("hidden");
        bedBtn.innerText = "🌙 Pause for Bedtime";
      }

      // Panel visibility by DisplayMode
      renderStartHereGuideBar();
      document.getElementById("gm-zone-controls").style.display =
        displayMode === "GM_COMMAND" ? "flex" : "none";
      document.getElementById("gm-story-panel").style.display =
        displayMode === "GM_COMMAND" ? "block" : "none";
      document.getElementById("gm-copilot-panel").style.display =
        displayMode === "GM_COMMAND" ? "flex" : "none";

      // Tactical Battlemap Theme Background
      const gridEl = document.getElementById("vtt-grid");
      gridEl.className = "grid-board w-full rounded-xl overflow-hidden border-2 border-amber-500/50 relative select-none shadow-inner " +
        (state.campaignId === "camp-clockwork-treehouse"
          ? "bg-treehouse"
          : state.campaignId === "camp-starlight-otter"
          ? "bg-starlight"
          : "bg-bakery");

      // Active story node
      const activeNode =
        state.storyNodes.find(n => n.id === state.activeNodeId) || state.storyNodes[0];
      document.getElementById("active-scene-title").innerText = activeNode.title;
      document.getElementById("read-aloud-box").innerText =
        activeNode.readAloudByTone[activeTone] || activeNode.readAloudByTone.COZY_SILLY;

      const cueWrap = document.getElementById("story-rp-cue-buttons");
      if (cueWrap) {
        cueWrap.innerHTML = "";
        (activeNode.rpPrompts || []).forEach(p => {
          const cb = document.createElement("button");
          cb.type = "button";
          cb.onclick = () => triggerSceneRpCue(p.id);
          cb.className = "px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-950/70 hover:bg-purple-800 border border-purple-500/40 text-purple-200 transition";
          cb.innerText = (p.speakerEmoji || "🗣️") + " " + p.title;
          cueWrap.appendChild(cb);
        });
      }

      const wtModal = document.getElementById("session-walkthrough-modal");
      const isWalkthroughOpen = Boolean(wtModal && !wtModal.classList.contains("hidden"));
      if (!isWalkthroughOpen && state.activeRpPrompt && state.activeRpPrompt.id !== lastSeenRpPromptId) {
        openRpReadoutModal(state.activeRpPrompt);
      }

      const whisperDefault = activeNode.gmWhisperTips.join(" • ");
      const whisperEl = document.getElementById("copilot-whisper-text");
      if (!whisperEl.innerText) {
        whisperEl.innerText = whisperDefault;
      }

      // Determine controllable/active hero remaining movement range in squares
      const activeHeroTok = getControllableHeroToken();
      const activeCombat = state.combat && state.combat.isActive ? state.combat : null;
      const turnEntry = activeCombat ? (activeCombat.entries[activeCombat.activeTurnIndex] || null) : null;
      const isTurnLockOn = Boolean(activeCombat && activeCombat.enforceTurnMovement !== false);
      let heroCanMoveNow = true;
      let allowedMoveSq = 6;
      if (activeHeroTok) {
        const linkedHero = (state.heroes || []).find(h => h.id === activeHeroTok.characterId);
        const heroSpeedFt = (linkedHero && linkedHero.attributes5e && linkedHero.attributes5e.speedFt) || activeHeroTok.speedFt || 30;
        if (isTurnLockOn && turnEntry) {
          heroCanMoveNow = turnEntry.tokenId === activeHeroTok.id || (Boolean(activeHeroTok.characterId) && turnEntry.characterId === activeHeroTok.characterId);
          const remFt = typeof turnEntry.movementRemainingFt === "number" ? turnEntry.movementRemainingFt : (turnEntry.speedFt || heroSpeedFt);
          allowedMoveSq = heroCanMoveNow ? Math.floor(remFt / 5) : 0;
        } else {
          allowedMoveSq = Math.floor(heroSpeedFt / 5);
        }
      }

      // Render Grid Cells (10x6)
      gridEl.innerHTML = "";
      for (let y = 0; y < state.gridRows; y++) {
        for (let x = 0; x < state.gridCols; x++) {
          const zone = state.zones.find(
            z => x >= z.gridX && x < z.gridX + z.width && y >= z.gridY && y < z.gridY + z.height
          );
          const isFogged = zone && !zone.isRevealed && displayMode !== "GM_COMMAND";
          const distFromHero = activeHeroTok
            ? Math.max(Math.abs(x - activeHeroTok.gridX), Math.abs(y - activeHeroTok.gridY))
            : 99;
          const isReachableSq = !isFogged && heroCanMoveNow && distFromHero > 0 && distFromHero <= allowedMoveSq;
          const cell = document.createElement("div");
          cell.onclick = () => moveTokenToCell(x, y);
          cell.className =
            "vtt-cell relative flex items-center justify-center cursor-pointer transition " +
            (isFogged
              ? "bg-slate-950/90"
              : zone && !zone.isRevealed
              ? "bg-slate-900/60"
              : isReachableSq
              ? "vtt-cell-reachable"
              : "hover:bg-amber-500/15");

          if (x === zone?.gridX && y === 0) {
            const label = document.createElement("span");
            label.className = "absolute top-1 left-1.5 text-[10px] font-bold text-slate-400 pointer-events-none whitespace-nowrap";
            label.innerText = isFogged ? "🌫️ Unexplored" : zone.name;
            cell.appendChild(label);
          }

          if (displayMode === "GM_COMMAND" && zone?.hasSecretTrap && x === zone.gridX + 1 && y === 2) {
            const desc = (zone.trapDescription || "Secret Trap").toLowerCase();
            const trapSvgPath = (desc.includes("rune") || desc.includes("star") || desc.includes("magic") || desc.includes("glow") || desc.includes("arcane") || desc.includes("glyph") || desc.includes("frost"))
              ? "/assets/traps/trap-arcane-rune.svg"
              : (desc.includes("flour") || desc.includes("snare") || desc.includes("rope") || desc.includes("honey") || desc.includes("dough") || desc.includes("trip") || desc.includes("bell") || desc.includes("pie"))
              ? "/assets/traps/trap-flour-snare.svg"
              : "/assets/traps/trap-spike-plate.svg";

            const trapWrap = document.createElement("div");
            trapWrap.className = "relative w-12 h-12 flex items-center justify-center pointer-events-auto cursor-help group";
            trapWrap.title = zone.trapDescription || "Secret Trap (GM Only)";

            const trapImg = document.createElement("img");
            trapImg.src = trapSvgPath;
            trapImg.alt = "GM Trap Overlay";
            trapImg.className = "w-11 h-11 object-contain trap-hazard-sprite drop-shadow-[0_2px_8px_rgba(244,63,94,0.55)]";
            trapWrap.appendChild(trapImg);

            const trapTag = document.createElement("span");
            trapTag.className = "absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] leading-none font-extrabold tracking-wide px-1.5 py-0.5 rounded bg-rose-950/90 text-rose-200 border border-rose-400/60 shadow whitespace-nowrap";
            trapTag.innerText = "TRAP";
            trapWrap.appendChild(trapTag);

            cell.appendChild(trapWrap);
          }

          if (!isFogged) {
            const cellTokens = state.tokens.filter(
              t => t.gridX === x && t.gridY === y && (!t.isHiddenFromPlayers || displayMode === "GM_COMMAND")
            );
            for (const tok of cellTokens) {
              const activeCombatEntry = state.combat && state.combat.isActive
                ? state.combat.entries[state.combat.activeTurnIndex]
                : null;
              const isTurnActive = activeCombatEntry && activeCombatEntry.tokenId === tok.id;
              const controllableTok = getControllableHeroToken();
              const isDpadSelected = controllableTok && controllableTok.id === tok.id;
              const badge = document.createElement("div");
              badge.className =
                "token-standee w-9 h-9 sm:w-11 sm:h-11 rounded-full flex flex-col items-center justify-center shadow-lg border-2 text-base sm:text-lg font-bold select-none" +
                (isDpadSelected ? " border-amber-300 ring-4 ring-amber-400/75" : " border-white") +
                (isTurnActive ? " active-turn-ring" : "");
              badge.style.backgroundColor = tok.color || "#f59e0b";
              badge.title = tok.name;

              // Floating status badge
              let statusOverlay = "";
              if (tok.isLootChest) {
                statusOverlay = tok.isChestOpened
                  ? \`<span class="absolute -top-1.5 -right-1.5 text-xs z-20">✨</span>\`
                  : \`<span class="absolute -top-1.5 -right-1.5 text-xs z-20 animate-bounce">🎁</span>\`;
              } else if (tok.statusBadge === "INSPIRATION_STAR") {
                statusOverlay = \`<span class="absolute -top-1.5 -right-1.5 text-xs z-20">⭐</span>\`;
              } else if (tok.statusBadge === "SHIELD_GUARD") {
                statusOverlay = \`<span class="absolute -top-1.5 -right-1.5 text-xs z-20">🛡️</span>\`;
              } else if (tok.statusBadge === "BONKED_DIZZY") {
                statusOverlay = \`<span class="absolute -top-1.5 -right-1.5 text-xs z-20">💫</span>\`;
              }

              const portraitContent = tok.assetPath
                ? \`<img src="\${tok.assetPath}" class="token-portrait-img" alt="\${tok.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='inline';" /><span style="display:none;">\${tok.avatarEmoji}</span>\`
                : \`<span>\${tok.avatarEmoji}</span>\`;

              badge.innerHTML = \`
                \${statusOverlay}
                <div class="w-full h-full relative rounded-full overflow-hidden flex items-center justify-center">
                  \${portraitContent}
                </div>
                <span class="absolute -bottom-2 text-[8px] font-bold bg-slate-900/90 text-white px-1 rounded shadow-sm leading-tight truncate max-w-[46px] pointer-events-none">\${tok.name.split(" ")[0]}</span>
              \`;

              // Click to inspect hero, open chest, or trigger NPC/Boss RP speech modal
              badge.onclick = (e) => {
                e.stopPropagation();
                if (tok.isLootChest && !tok.isChestOpened) {
                  openLootChest(tok.id);
                } else if (tok.characterId || tok.type === "HERO") {
                  if (tok.characterId) selectedHeroId = tok.characterId;
                  selectedTokenId = tok.id;
                  renderAll();
                } else if (tok.type === "MONSTER" && tok.statBlock5e) {
                  showMonsterStatBlockCard(tok);
                } else if (tok.type === "NPC" || tok.type === "MONSTER") {
                  const allPrompts = (state.storyNodes || []).flatMap(n => n.rpPrompts || []);
                  const matched = allPrompts.find(p => tok.name.toLowerCase().includes((p.speakerName || "").toLowerCase().split(" ")[0])) || allPrompts[0];
                  if (matched) {
                    triggerSceneRpCue(matched.id);
                  }
                }
              };

              cell.appendChild(badge);
            }
          }
          gridEl.appendChild(cell);
        }
      }

      // Zone Reveal buttons
      const zBtns = document.getElementById("zone-buttons");
      zBtns.innerHTML = "";
      for (const z of state.zones) {
        const b = document.createElement("button");
        b.onclick = () => toggleZone(z.id);
        b.className =
          "px-2.5 py-1 rounded-lg text-xs font-semibold border transition " +
          (z.isRevealed
            ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300"
            : "bg-slate-800 border-slate-700 text-slate-400");
        b.innerText = (z.isRevealed ? "👁️ Revealed: " : "🌫️ Hidden: ") + z.name;
        zBtns.appendChild(b);
      }

      // Dynamic Lighting controls, Tools, Weather, Backdrop, Combat Tracker & Door buttons
      Lighting2DEngine.init();
      ToolsWeatherEngine.init();
      renderCombatTrackerUI(state);

      const weatherSel = document.getElementById("select-ambient-weather");
      if (weatherSel && state.ambientWeather) {
        weatherSel.value = state.ambientWeather;
      }

      const backdropEl = document.getElementById("vtt-scene-backdrop");
      const backdropSel = document.getElementById("select-scene-backdrop");
      const curBackdrop = state.sceneBackdrop || "HEARTH_TAVERN";
      if (backdropSel) backdropSel.value = curBackdrop;
      const backdropMap = {
        HEARTH_TAVERN: "/assets/backgrounds/backdrop-hearth-tavern.svg",
        ENCHANTED_WOODS: "/assets/backgrounds/backdrop-enchanted-woods.svg",
        STARLIGHT_OBSERVATORY: "/assets/backgrounds/backdrop-starlight-observatory.svg",
      };
      if (backdropEl && gridEl) {
        if (curBackdrop !== "NONE" && backdropMap[curBackdrop]) {
          backdropEl.src = backdropMap[curBackdrop];
          backdropEl.classList.remove("hidden");
        } else {
          backdropEl.classList.add("hidden");
        }
        gridEl.style.opacity = "1";
      }

      const soundSel = document.getElementById("select-ambient-soundscape");
      if (soundSel && state.ambientSoundscape) {
        soundSel.value = state.ambientSoundscape;
      }
      const lightModes = [
        ["BRIGHT_DAYLIGHT", "btn-light-day"],
        ["COZY_TWILIGHT", "btn-light-twilight"],
        ["TORCHLIT_DUNGEON", "btn-light-dungeon"]
      ];
      const curLight = state.ambientLightMode || "COZY_TWILIGHT";
      for (const [m, id] of lightModes) {
        const btn = document.getElementById(id);
        if (btn) {
          btn.className =
            m === curLight
              ? "px-2.5 py-1 rounded-lg font-bold border bg-amber-500 text-slate-950 border-amber-400 shadow-sm transition"
              : "px-2.5 py-1 rounded-lg font-semibold border bg-slate-800 text-slate-300 border-slate-700 hover:border-amber-400/50 transition";
        }
      }

      const doorHitboxes = document.getElementById("vtt-door-hitboxes");
      if (doorHitboxes) {
        doorHitboxes.innerHTML = "";
      }
      const quickDoorBtns = document.getElementById("door-buttons");
      if (quickDoorBtns) quickDoorBtns.innerHTML = "";
      const doorBtns = document.getElementById("door-toggle-buttons");
      if (doorBtns) {
        doorBtns.innerHTML = "";
        const doors = (state.walls || []).filter(w => w.isDoor);
        doors.forEach((d, idx) => {
          const dcTag = state.rulesTier === "STORYBOOK_D6"
            ? Math.max(3, Math.min(6, Math.round((d.lockDc || 12) / 3)))
            : (d.lockDc || 12);
          if (quickDoorBtns) {
            const qdb = document.createElement("button");
            qdb.type = "button";
            qdb.onclick = () => interactMapDoor(d.id);
            qdb.className =
              "px-2.5 py-1 rounded-lg text-xs font-semibold border transition " +
              (d.isOpen
                ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-300"
                : d.isLocked
                ? "bg-rose-950/80 border-rose-500/60 text-rose-200 hover:border-rose-400"
                : "bg-amber-950/70 border-amber-500/50 text-amber-300 hover:border-amber-300");
            qdb.innerText = d.isOpen
              ? \`🚪 Door #\${idx + 1}: Open\`
              : d.isLocked
              ? \`🔐 Door #\${idx + 1}: Pick Lock (DC \${dcTag})\`
              : \`🔓 Door #\${idx + 1}: Open Now\`;
            quickDoorBtns.appendChild(qdb);
          }

          // 1. Bottom bar door button (clicking acts as character opening/lockpicking)
          const wrap = document.createElement("div");
          wrap.className = "inline-flex items-center gap-1";

          const db = document.createElement("button");
          db.onclick = () => interactMapDoor(d.id);
          db.className =
            "px-2.5 py-1 rounded-lg text-xs font-semibold border transition " +
            (d.isOpen
              ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-300"
              : d.isLocked
              ? "bg-rose-950/80 border-rose-500/60 text-rose-200 hover:border-rose-400"
              : "bg-amber-950/70 border-amber-500/50 text-amber-300 hover:border-amber-300");
          db.innerText = d.isOpen
            ? \`🚪 Door #\${idx + 1}: Open\`
            : d.isLocked
            ? \`🔐 Door #\${idx + 1}: Locked (DC \${dcTag})\`
            : \`🔓 Door #\${idx + 1}: Unlocked\`;
          wrap.appendChild(db);

          if (displayMode === "GM_COMMAND") {
            const lockBtn = document.createElement("button");
            lockBtn.onclick = () => gmToggleDoorLock(d.id);
            lockBtn.title = d.isLocked ? "Unlock this door as GM" : "Lock this door (requires Sleight of Hand Lockpick Check)";
            lockBtn.className = "px-2 py-1 rounded-lg text-[11px] font-bold border bg-slate-900 border-slate-600 text-slate-300 hover:border-amber-400";
            lockBtn.innerText = d.isLocked ? "🔓 GM Unlock" : "🔐 GM Lock";
            wrap.appendChild(lockBtn);
          }
          doorBtns.appendChild(wrap);

          // 2. Direct On-Map Interactive Door Handle / Padlock Hitbox overlay
          if (doorHitboxes) {
            const mx = ((d.x1 + d.x2) * 0.5) / (state.gridCols || 10) * 100;
            const my = ((d.y1 + d.y2) * 0.5) / (state.gridRows || 6) * 100;
            const hitbox = document.createElement("button");
            hitbox.type = "button";
            hitbox.setAttribute("data-door-id", d.id);
            hitbox.onclick = (e) => {
              e.stopPropagation();
              interactMapDoor(d.id);
            };
            hitbox.style.left = mx + "%";
            hitbox.style.top = my + "%";
            hitbox.style.transform = "translate(-50%, -50%)";
            hitbox.title = d.isOpen
              ? \`Open Door #\${idx + 1} — Click to close\`
              : d.isLocked
              ? \`Locked Door (\${d.lockLabel || "Brass Tumbler Lock"}, DC \${dcTag}) — Click to roll Lockpick Check!\`
              : \`Unlocked Door #\${idx + 1} — Click to open!\`;
            hitbox.className =
              "pointer-events-auto absolute w-8 h-8 rounded-full flex items-center justify-center text-xs shadow-lg border transition hover:scale-115 " +
              (d.isOpen
                ? "bg-emerald-950/70 border-emerald-400/70 text-emerald-200 opacity-75 hover:opacity-100"
                : d.isLocked
                ? "bg-rose-950/90 border-rose-400 text-amber-200 ring-2 ring-rose-500/40"
                : "bg-amber-950/85 border-amber-400/80 text-amber-200 hover:border-white");
            hitbox.innerText = d.isOpen ? "🚪" : d.isLocked ? "🔐" : "🔓";
            doorHitboxes.appendChild(hitbox);
          }
        });
      }

      // Story Branch choices
      const choicesEl = document.getElementById("branch-choices");
      choicesEl.innerHTML = "";
      for (const ch of activeNode.choices) {
        const btn = document.createElement("button");
        btn.onclick = () => chooseBranch(ch.targetNodeId, ch.consequenceTag);
        btn.className =
          "p-2.5 rounded-xl bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-500/40 text-left transition";
        btn.innerHTML = \`<div class="text-xs font-bold text-amber-300">\${ch.label}</div><div class="text-[11px] text-indigo-300 mt-0.5">🎲 Check: \${ch.requiredCheck || "Story Choice"}</div>\`;
        choicesEl.appendChild(btn);
      }

      // Spotlight Tracker
      const spotEl = document.getElementById("spotlight-list");
      spotEl.innerHTML = "";
      for (const sp of state.spotlightRecords) {
        const row = document.createElement("div");
        row.className =
          "p-2 rounded-lg border text-xs flex flex-col gap-1 " +
          (sp.needsSpotlightNudge
            ? "bg-amber-950/60 border-amber-400 text-amber-200"
            : "theme-inner-box border text-slate-300");
        row.innerHTML = \`<div class="flex justify-between font-semibold"><span>\${sp.characterName} (\${sp.playerName})</span><span>\${sp.turnsTaken} turns</span></div>\` +
          (sp.suggestedSpotlightHook ? \`<div class="text-[11px] text-amber-300">\${sp.suggestedSpotlightHook}</div>\` : "");
        spotEl.appendChild(row);
      }

      // Hero Selector Tabs
      const tabsEl = document.getElementById("hero-selector-tabs");
      tabsEl.innerHTML = "";
      for (const h of state.heroes) {
        const active = h.id === selectedHeroId;
        const t = document.createElement("button");
        t.onclick = () => {
          selectedHeroId = h.id;
          selectedTokenId = (state.tokens || []).find(tok => tok.characterId === h.id)?.id || "";
          renderAll();
        };
        t.className =
          "p-2 rounded-xl border text-left transition flex items-center gap-2 " +
          (active
            ? "bg-amber-500/20 border-amber-400 text-amber-300"
            : "theme-inner-box border text-slate-400");
        const tabPortrait = h.assetPath
          ? \`<img src="\${h.assetPath}" class="w-8 h-8 rounded-full border border-amber-400/60 object-cover shrink-0" alt="\${h.name}" />\`
          : \`<span class="text-xl shrink-0">\${h.avatarEmoji}</span>\`;
        t.innerHTML = \`\${tabPortrait}<div class="truncate"><div class="text-xs font-bold truncate">\${h.name}</div><div class="text-[10px] text-slate-400">\${h.playerName}</div></div>\`;
        tabsEl.appendChild(t);
      }

      // Sync Active D-Pad Readout + Turn/Move Speed Budget
      const activeTok = getControllableHeroToken();
      const dpadLabelEl = document.getElementById("dpad-active-label");
      const dpadCenterBtn = document.getElementById("dpad-btn-center");
      if (dpadLabelEl) {
        if (!activeTok) {
          dpadLabelEl.innerText = "No hero token on map";
        } else {
          const linkedHero = (state.heroes || []).find(h => h.id === activeTok.characterId);
          const baseSpd = (linkedHero && linkedHero.attributes5e && linkedHero.attributes5e.speedFt) || activeTok.speedFt || 30;
          const combatOn = state.combat && state.combat.isActive && state.combat.enforceTurnMovement !== false;
          const curTurn = combatOn ? (state.combat.entries[state.combat.activeTurnIndex] || null) : null;
          if (combatOn && curTurn) {
            const isMyTurn = curTurn.tokenId === activeTok.id || (Boolean(activeTok.characterId) && curTurn.characterId === activeTok.characterId);
            const rem = typeof curTurn.movementRemainingFt === "number" ? curTurn.movementRemainingFt : (curTurn.speedFt || baseSpd);
            dpadLabelEl.innerText = isMyTurn
              ? (activeTok.avatarEmoji || "🧙") + " " + activeTok.name + " • 🏃 " + rem + "/" + (curTurn.speedFt || baseSpd) + " ft"
              : "⏳ " + curTurn.name + "'s turn (" + activeTok.name + " paused)";
          } else {
            dpadLabelEl.innerText = (activeTok.avatarEmoji || "🧙") + " " + activeTok.name + " • 🏃 Speed " + baseSpd + " ft (" + Math.floor(baseSpd / 5) + " sq)";
          }
        }
      }
      if (dpadCenterBtn && activeTok) {
        dpadCenterBtn.innerText = activeTok.avatarEmoji || "🛡️";
      }

      // Active Hero Sheet Summary
      const currentHero = state.heroes.find(h => h.id === selectedHeroId) || state.heroes[0];
      if (currentHero) {
        const sheetEl = document.getElementById("active-hero-sheet");
        const healthDisplay =
          state.rulesTier === "STORYBOOK_D6"
            ? "❤️".repeat(currentHero.storybookStats.hearts) + " (" + currentHero.storybookStats.hearts + "/3 Hearts)"
            : \`❤️ \${currentHero.attributes5e.hp}/\${currentHero.attributes5e.maxHp} HP • 🛡️ AC \${currentHero.attributes5e.armorClass}\`;

        const headerPortrait = currentHero.assetPath
          ? \`<img src="\${currentHero.assetPath}" class="w-10 h-10 rounded-full border-2 border-amber-400 shadow-md object-cover shrink-0" alt="\${currentHero.name}" />\`
          : \`<span class="text-2xl shrink-0">\${currentHero.avatarEmoji}</span>\`;

        sheetEl.innerHTML = \`
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              \${headerPortrait}
              <div class="min-w-0">
                <div class="text-sm font-bold text-amber-400 truncate">\${currentHero.name}</div>
                <div class="text-[11px] text-slate-400 truncate">\${currentHero.archetype} • Pet: \${currentHero.companionPet}</div>
              </div>
            </div>
            <div class="text-right shrink-0 space-y-1">
              <div class="text-xs font-bold text-rose-400">\${healthDisplay}</div>
              <button type="button" onclick="openHeroSheetModal()" class="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[10px] font-bold text-slate-200">
                📋 Sheet & Skills
              </button>
            </div>
          </div>
        \`;

        // Action Cards
        const cardsEl = document.getElementById("hero-action-cards");
        cardsEl.innerHTML = "";
        for (const c of currentHero.actionCards) {
          const dieLabel = state.rulesTier === "STORYBOOK_D6" ? "d6 (4+ Wins)" : \`\${c.dieToRoll} +\${c.bonusByTier[state.rulesTier]}\`;
          const cardBtn = document.createElement("button");
          cardBtn.onclick = () => openDiceModal(c.id);
          cardBtn.className =
            "w-full p-3 rounded-xl theme-inner-box hover:border-amber-400 border text-left transition flex items-center justify-between";
          cardBtn.innerHTML = \`
            <div class="flex items-center gap-2.5">
              <span class="text-2xl">\${c.icon}</span>
              <div>
                <div class="text-xs font-extrabold text-amber-400">\${c.title}</div>
                <div class="text-[11px] text-slate-300">\${c.description}</div>
              </div>
            </div>
            <span class="px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 font-mono text-xs font-bold whitespace-nowrap">🎲 \${dieLabel}</span>
          \`;
          cardsEl.appendChild(cardBtn);
        }
      }

      // Dice Log
      const logEl = document.getElementById("dice-log-list");
      logEl.innerHTML = "";
      if (state.rollHistory.length === 0) {
        logEl.innerHTML = \`<p class="text-xs text-slate-500 italic">No dice rolled yet—tap any Action Card to roll!</p>\`;
      } else {
        for (const r of state.rollHistory) {
          const item = document.createElement("div");
          item.className =
            "p-2.5 rounded-xl border text-xs " +
            (r.succeeded
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
              : "bg-amber-950/40 border-amber-500/40 text-amber-200");
          const srcBadge = r.source === "PHYSICAL_DICE_TABLE" ? "🎲 Real Table Die" : "📱 Digital 3D Die";
          item.innerHTML = \`
            <div class="flex justify-between font-bold">
              <span>\${r.characterName}: \${r.actionTitle}</span>
              <span>Rolled \${r.total} (\${srcBadge})</span>
            </div>
            <div class="text-[11px] mt-1">\${r.narrativeOutcome}</div>
          \`;
          logEl.appendChild(item);
        }
      }
    }

    // Real-time Server-Sent Events subscription (reconnects cleanly whenever user logs into their private room)
    let evtSource = null;
    function connectRoomStream(roomCode) {
      if (evtSource) {
        evtSource.close();
      }
      const guestQuery = vttGuestToken ? "&guest=" + encodeURIComponent(vttGuestToken) : "";
      evtSource = new EventSource("/api/room/stream?roomCode=" + encodeURIComponent(roomCode) + guestQuery);
      evtSource.onmessage = (event) => {
        try {
          const updated = JSON.parse(event.data);
          if (updated && updated.roomCode && updated.roomCode === state.roomCode) {
            state = updated;
            renderAll();
            const latestRoll = state.rollHistory && state.rollHistory[0];
            if (latestRoll && latestRoll.source === "DIGITAL_3D_ROLLER" && latestRoll.id !== lastAnimatedRollId) {
              animateRollIn3D(latestRoll);
            }
          }
        } catch {}
      };
    }

    maybeAutoOpenWalkthrough();
    renderAll();
    connectRoomStream(state.roomCode);
    refreshCustomTokens();
    loadVttAuthStatus();
  </script>
</body>
</html>`;
}

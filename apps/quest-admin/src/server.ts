import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { URL } from "node:url";
import { probeRtx3080Health } from "@hearthquest/quest-ai-bridge";
import { getBuildMetadata } from "@hearthquest/shared-types";
import { SRD_51_CC_BY_40_ATTRIBUTION } from "@hearthquest/srd-rules";
import {
  advanceFulfillmentOrder,
  createCheckoutSession,
  generateLicenseKey,
  getAdminDatabasePath,
  getAdminStoreSnapshot,
  listLoreRegistry,
  PHYSICAL_PACKAGES,
  processPaymentWebhookEvent,
  registerLoreEntry,
  resetAdminStoreForTesting,
  signStripeWebhookPayloadForTest,
  SUBSCRIPTION_PLANS,
  verifyLicenseKey,
  verifyOperatorPin,
  verifyStripeWebhookSignature,
} from "./admin-store";
import {
  attemptAdvanceTrialToEncounter2,
  checkoutStoreCart,
  getStoreCart,
  getStoreCatalog,
  getTrialEncounterOverview,
  lookupCustomerOrder,
  playFreeTrialEncounter,
  quoteStoreItems,
  updateStoreCart,
} from "./store-backend";
import { renderStorefrontHtml } from "./store-frontend";

export {
  PHYSICAL_PACKAGES,
  SUBSCRIPTION_PLANS,
  advanceFulfillmentOrder,
  attemptAdvanceTrialToEncounter2,
  checkoutStoreCart,
  createCheckoutSession,
  generateLicenseKey,
  getAdminDatabasePath,
  getAdminStoreSnapshot,
  getStoreCart,
  getStoreCatalog,
  getTrialEncounterOverview,
  listLoreRegistry,
  lookupCustomerOrder,
  playFreeTrialEncounter,
  processPaymentWebhookEvent,
  quoteStoreItems,
  registerLoreEntry,
  renderStorefrontHtml,
  resetAdminStoreForTesting,
  signStripeWebhookPayloadForTest,
  updateStoreCart,
  verifyLicenseKey,
  verifyOperatorPin,
  verifyStripeWebhookSignature,
};

const PORT = Number(process.env.PORT_ADMIN || process.env.PORT || 3001);

export function renderAdminHtml(
  rtxStatus: Awaited<ReturnType<typeof probeRtx3080Health>>
): string {
  const buildMeta = getBuildMetadata();
  const storeSnap = getAdminStoreSnapshot();
  const serializedStore = JSON.stringify(storeSnap).replace(/</g, "\\u003c");
  const isLiveStripe = storeSnap.paymentGatewayMode === "STRIPE_LIVE";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#f59e0b" />
  <meta name="msapplication-TileColor" content="#f59e0b" />
  <title>HearthQuest Admin — Family Guides, Storefront, Payments & Print-on-Demand</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='48' fill='%231e1b4b' stroke='%23f59e0b' stroke-width='6'/%3E%3Cpath d='M50 18 C70 18 80 24 80 50 C80 72 64 84 50 90 C36 84 20 72 20 50 C20 24 30 18 50 18 Z' fill='%230f172a' stroke='%23fbbf24' stroke-width='4'/%3E%3Cpath d='M50 32 C58 44 68 52 66 68 C64 80 54 82 50 82 C46 82 36 80 34 68 C32 52 42 44 50 32 Z' fill='%23ea580c'/%3E%3Cpath d='M50 44 C54 52 60 58 58 70 C56 78 52 80 50 80 C48 80 44 78 42 70 C40 58 46 52 50 44 Z' fill='%23fde047'/%3E%3C/svg%3E" />
  <link rel="alternate icon" type="image/png" href="/assets/hearthquest-icon.png" />
  <link rel="apple-touch-icon" href="/assets/hearthquest-icon.png" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body[data-theme="dark"] {
      background-color: #020617;
      color: #f8fafc;
    }
    body[data-theme="light"] {
      background: radial-gradient(circle at top, #fdfbf7 0%, #f4ede4 100%);
      color: #1c1917;
    }
    body[data-theme="light"] header {
      background-color: #ffffff !important;
      border-color: #e5ded2 !important;
      color: #1c1917 !important;
    }
    body[data-theme="light"] section,
    body[data-theme="light"] .admin-card {
      background-color: #ffffff !important;
      border-color: #e5ded2 !important;
      color: #1c1917 !important;
      box-shadow: 0 4px 14px rgba(120, 53, 15, 0.05);
    }
    body[data-theme="light"] .admin-inner {
      background-color: #fbf9f5 !important;
      border-color: #e8e0d4 !important;
      color: #292524 !important;
    }
    body[data-theme="light"] h1,
    body[data-theme="light"] h2,
    body[data-theme="light"] h3 {
      color: #92400e !important;
    }
    body[data-theme="light"] .text-slate-400 {
      color: #78716c !important;
    }
    body[data-theme="light"] .text-slate-300 {
      color: #44403c !important;
    }
    body[data-theme="light"] input,
    body[data-theme="light"] select {
      background-color: #ffffff !important;
      color: #1c1917 !important;
      border-color: #cbd5e1 !important;
    }
  </style>
</head>
<body class="min-h-screen flex flex-col font-sans" data-theme="dark">
  <header class="border-b border-amber-500/30 bg-slate-900/90 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40 backdrop-blur">
    <div class="flex items-center gap-3">
      <span class="text-3xl">📦</span>
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="text-xl font-extrabold text-amber-300">HearthQuest Command & Storefront</h1>
          <span id="admin-build-version-badge" class="px-2.5 py-0.5 text-[11px] font-mono font-bold rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-500/40">
            ${buildMeta.badgeText}
          </span>
          <span id="payment-gateway-badge" class="px-2.5 py-0.5 text-[11px] font-mono font-bold rounded-full ${
            isLiveStripe
              ? "bg-indigo-950 text-indigo-300 border border-indigo-400/50"
              : "bg-amber-950/90 text-amber-300 border border-amber-500/40"
          }">
            ${isLiveStripe ? "💳 STRIPE LIVE" : "🧪 SANDBOX PAYMENTS"}
          </span>
          <span id="sqlite-db-badge" class="px-2.5 py-0.5 text-[11px] font-mono font-bold rounded-full bg-sky-950/90 text-sky-300 border border-sky-500/40">
            🗄️ SQLITE WAL
          </span>
        </div>
        <p class="text-xs text-slate-400">Subscriptions • Stripe Checkout & HMAC Webhooks • Print-on-Demand Queue • RTX 3080 Telemetry</p>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-2.5">
      <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-700 text-xs">
        <span>🔐 Operator PIN:</span>
        <input id="admin-pin-input" type="password" value="1234" class="w-16 bg-transparent font-mono text-amber-300 outline-none text-center" title="Default Dev PIN: 1234 (or HEARTHQUEST_ADMIN_PIN)" />
      </div>
      <button onclick="toggleTheme()" id="admin-theme-btn" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold transition">
        🌙 Dark
      </button>
      <a href="/store" target="_blank" class="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs">
        🛍️ Public Storefront (/store)
      </a>
      <a href="http://localhost:3000" target="_blank" class="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs">
        🛡️ Launch Live Family VTT (Port 3000)
      </a>
    </div>
  </header>

  <main class="flex-1 max-w-6xl w-full mx-auto p-6 space-y-8">
    <!-- 1. Unraid Fleet & RTX 3080 AI Bridge Telemetry -->
    <section class="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <h2 class="text-sm font-bold text-indigo-300 uppercase tracking-wider mb-3">
        ⚡ Unraid Container Fleet & RTX 3080 AI Bridge Status
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 admin-inner">
          <div class="text-slate-400">Local Gaming Rig (RTX 3080 Ollama)</div>
          <div id="rtx-online-badge" class="text-sm font-bold mt-1 ${
            rtxStatus.rtx3080Online ? "text-emerald-400" : "text-amber-300"
          }">
            ${
              rtxStatus.rtx3080Online
                ? "🟢 ONLINE (" + rtxStatus.activeModel + ")"
                : "🟡 STANDBY — Auto-Failover Active"
            }
          </div>
          <div id="rtx-host-label" class="text-[11px] text-slate-500 mt-1">Host: ${
            rtxStatus.rtx3080ConfiguredHost
          }</div>
        </div>
        <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 admin-inner">
          <div class="text-slate-400">Fail-Safe Game Night Engine</div>
          <div class="text-sm font-bold text-purple-300 mt-1">${rtxStatus.failoverEngine}</div>
          <div class="text-[11px] text-slate-500 mt-1">Zero-downtime switchover if gaming PC is asleep</div>
        </div>
        <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 admin-inner">
          <div class="text-slate-400">Multi-Device Sync & Safety</div>
          <div class="text-sm font-bold text-emerald-300 mt-1">Jackbox Room Codes + Cozy G-Rated Filter</div>
          <div class="text-[11px] text-slate-500 mt-1">Supports TV Display, GM Laptop & Kid Tablets</div>
        </div>
      </div>
      <div class="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center gap-3 text-xs">
        <label for="rtx-host-input" class="text-slate-400 font-semibold">Custom OLLAMA_HOST URL:</label>
        <input id="rtx-host-input" type="text" value="${
          rtxStatus.rtx3080ConfiguredHost
        }" class="flex-1 min-w-[220px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs" />
        <button onclick="testRtxConnection()" id="btn-test-rtx" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition">
          🔍 Test RTX 3080 Connection Now
        </button>
        <span id="rtx-test-result" class="text-xs text-slate-300 font-mono"></span>
      </div>
    </section>

    <!-- 2. Family Subscription Plans (Free Unraid vs Digital+ vs Game-in-a-Box Pro) -->
    <section class="space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-lg font-extrabold text-amber-300">👑 Household Membership & Cloud AI Tiers</h2>
          <p class="text-xs text-slate-400">Self-host for $0 on Unraid or unlock managed Cloud AI narration, campaign packs & quarterly physical box shipments</p>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        ${SUBSCRIPTION_PLANS.map(
          (plan) => `
          <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-4 admin-card">
            <div>
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">${
                  plan.badge
                }</span>
                <span class="font-black text-lg text-emerald-400">$${plan.priceMonthlyUsd}<span class="text-xs text-slate-400 font-normal">/mo</span></span>
              </div>
              <h3 class="font-extrabold text-base text-white mt-2">${plan.name}</h3>
              <ul class="mt-3 space-y-1.5 text-xs text-slate-300">
                ${plan.features.map((f) => `<li>✅ ${f}</li>`).join("")}
              </ul>
            </div>
            <button onclick="openCheckoutModal('SUBSCRIPTION', '${plan.tier}', '${
            plan.name
          }', ${plan.priceMonthlyUsd})" class="w-full py-2.5 rounded-xl ${
            plan.priceMonthlyUsd > 0
              ? "bg-amber-500 hover:bg-amber-400 text-slate-950"
              : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          } font-extrabold text-xs transition">
              ${
                plan.priceMonthlyUsd > 0
                  ? "💳 Subscribe / Issue License Key"
                  : "🔑 Generate Free Self-Hosted Key"
              }
            </button>
          </div>
        `
        ).join("")}
      </div>
    </section>

    <!-- 3. Physical Mailout Kits & Print-on-Demand Storefront -->
    <section class="space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-lg font-extrabold text-emerald-300">📬 "Game in a Box" Physical Mailout Kits & Printable Keepsakes</h2>
          <p class="text-xs text-slate-400">Shipped to families via Print-on-Demand (laminated 1-inch dry-erase maps, standees, cards & unplugged camping guide)</p>
        </div>
        <a href="/printable-kit" target="_blank" class="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs">
          🖨️ Preview Printable Home Kit & Storybook PDF
        </a>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${PHYSICAL_PACKAGES.map(
          (pkg) => `
          <div class="p-5 rounded-2xl bg-slate-900 border border-emerald-500/30 flex flex-col justify-between gap-4 admin-card">
            <div>
              <div class="flex items-center justify-between">
                <h3 class="font-extrabold text-base text-amber-300">${pkg.title}</h3>
                <span class="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-sm">$${pkg.priceUsd}</span>
              </div>
              <ul class="mt-3 space-y-1.5 text-xs text-slate-300">
                <li>🗺️ <strong>${pkg.includedMapsCount} Laminated Dry-Erase Battle Maps</strong> (1-inch tabletop scale + QR audio codes)</li>
                <li>🧝 <strong>${pkg.includedStandeesCount} Punch-Out Hero & Monster Standees</strong> with plastic bases</li>
                <li>🃏 <strong>${pkg.includedActionCardsCount} Color-Coded Action & Treasure Cards</strong></li>
                <li>🏕️ <strong>Unplugged Camping Flowchart Included</strong> (100% playable offline without Wi-Fi)</li>
                ${
                  pkg.includesHardcoverKeepsake
                    ? `<li class="text-amber-300 font-semibold">📖 Includes Custom Hardcover Family Adventure Storybook Keepsake!</li>`
                    : ""
                }
              </ul>
            </div>
            <button onclick="openCheckoutModal('PHYSICAL_KIT', '${pkg.id}', '${pkg.title.replace(
            /'/g,
            ""
          )}', ${pkg.priceUsd})" class="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition">
              📦 Order Physical Mailout Box ($${pkg.priceUsd})
            </button>
          </div>
        `
        ).join("")}
      </div>
    </section>

    <!-- 4. Operator Print-on-Demand Fulfillment Queue & License Key Manager -->
    <section id="orders-queue-section" class="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-sm font-bold text-amber-300 uppercase tracking-wider">
            🏭 Operator Print-on-Demand Fulfillment Queue & Household Licenses
          </h2>
          <p class="text-xs text-slate-400">Requires valid Operator PIN above to advance orders from PAID_QUEUED → RENDERING_PRINT_FILES → SENT_TO_PRINTER → SHIPPED</p>
        </div>
        <div class="flex items-center gap-2 text-xs">
          <input id="license-verify-input" type="text" placeholder="Verify Key: HQ-PRO-..." class="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 font-mono text-xs" />
          <button onclick="checkLicenseKey()" class="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold">🔑 Verify Key</button>
          <span id="license-verify-result" class="font-mono text-xs"></span>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs">
        <div class="lg:col-span-7 space-y-2">
          <h3 class="font-bold text-emerald-300">📬 Active Print-on-Demand Orders (<span id="orders-count">0</span>)</h3>
          <div id="orders-queue-list" class="space-y-2"></div>
        </div>
        <div class="lg:col-span-5 space-y-2">
          <h3 class="font-bold text-indigo-300">👨‍👩‍👧‍👦 Registered Households & License Keys (<span id="households-count">0</span>)</h3>
          <div id="households-list" class="space-y-2"></div>
        </div>
      </div>
    </section>

    <!-- 5. Lore & Map Continuity Ledger (Anti-Overlap Guard) -->
    <section id="lore-registry-section" class="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 admin-card">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-sm font-bold text-purple-300 uppercase tracking-wider">
            🗺️ Lore &amp; Map Continuity Registry (Anti-Overlap Guard)
          </h2>
          <p class="text-xs text-slate-400">Tracks every created campaign plot, boss, and map zone in SQLite so procedural one-shots never repeat or overlap.</p>
        </div>
        <button onclick="refreshAdminState()" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-purple-300 border border-slate-700">🔄 Sync Ledger</button>
      </div>
      <div id="lore-registry-list" class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs"></div>
    </section>

    <!-- 6. 5-Minute Family Quick-Start Guides -->
    <section class="space-y-3">
      <h2 class="text-lg font-extrabold text-amber-300">📚 5-Minute Parent & Family Quick-Start Guides</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 admin-card">
          <span class="text-2xl">⏱️</span>
          <h3 class="font-bold text-sm text-white">1. How to DM with Zero Prep</h3>
          <p class="text-xs text-slate-300 leading-relaxed">
            Open the VTT in <strong>GM Command Mode</strong> on your laptop. Cast the <strong>Living Room TV Mode</strong> to your TV. Have the kids scan the room code (<code>DRGN</code>) on their tablets—and simply read the highlighted box text aloud!
          </p>
        </div>
        <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 admin-card">
          <span class="text-2xl">🎲</span>
          <h3 class="font-bold text-sm text-white">2. Real Dice + Tablet Magic</h3>
          <p class="text-xs text-slate-300 leading-relaxed">
            Hand your kids real plastic dice at the kitchen table! When they tap an Action Card on their tablet, they roll their physical die on the table and tap the number they got for instant sound effects and story outcomes.
          </p>
        </div>
        <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 admin-card">
          <span class="text-2xl">⚖️</span>
          <h3 class="font-bold text-sm text-white">3. Sibling Spotlight & Bedtime Freeze</h3>
          <p class="text-xs text-slate-300 leading-relaxed">
            Our AI tracks how many turns each child takes and whispers custom hooks so quieter siblings get the spotlight. Need to stop for bedtime? Hit <strong>Pause for Bedtime</strong> to freeze everything and generate next week's storybook recap!
          </p>
        </div>
      </div>
    </section>
  </main>

  <!-- STOREFRONT CHECKOUT & SANDBOX RECEIPT MODAL -->
  <div id="checkout-modal" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-slate-900 border-2 border-amber-400 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 admin-card">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h3 id="checkout-modal-title" class="text-base font-extrabold text-amber-300">💳 Storefront Checkout</h3>
          <p class="text-[11px] text-slate-400">Authoritative server-side pricing • Signed HMAC Webhook pipeline</p>
        </div>
        <button onclick="closeCheckoutModal()" class="text-slate-400 hover:text-white font-bold">✕</button>
      </div>

      <div class="space-y-2.5 text-xs">
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-slate-400 mb-1">Family / Household Name</label>
            <input id="checkout-family" type="text" value="The Starlight Family" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white" />
          </div>
          <div>
            <label class="block text-slate-400 mb-1">Parent Email</label>
            <input id="checkout-email" type="email" value="parents@hearthquest.local" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white" />
          </div>
        </div>
        <div id="checkout-shipping-fields" class="space-y-2">
          <div>
            <label class="block text-slate-400 mb-1">Shipping Street, City, State &amp; ZIP</label>
            <input id="checkout-address" type="text" value="742 Evergreen Terrace, Tabletop City, TX 75001" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white" />
          </div>
          <div>
            <label class="block text-slate-400 mb-1">Adventure Campaign Included</label>
            <select id="checkout-campaign" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-amber-300">
              <option value="camp-goblin-bakery">🧁 The Great Goblin Bakery Heist</option>
              <option value="camp-clockwork-treehouse">⚙️ The Clockwork Treehouse Mystery</option>
              <option value="camp-starlight-otter">🦦 Voyage of the Starlight Otter</option>
            </select>
          </div>
        </div>

        <div id="checkout-receipt-box" class="hidden p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-400/50 space-y-1.5 text-emerald-200"></div>
      </div>

      <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
        <button onclick="closeCheckoutModal()" class="px-4 py-2 rounded-xl border border-slate-700 text-xs font-bold">Close</button>
        <button id="btn-submit-checkout" onclick="submitCheckoutSession()" class="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg">
          ✅ Complete Checkout
        </button>
      </div>
    </div>
  </div>

  <footer class="border-t border-slate-800 px-6 py-4 text-center text-[11px] text-slate-500 max-w-5xl mx-auto">
    ${SRD_51_CC_BY_40_ATTRIBUTION}
  </footer>
  <script>
    let adminStore = ${serializedStore};
    let activeCheckout = { kind: "PHYSICAL_KIT", itemId: "pkg-starter-box", title: "", priceUsd: 34 };

    function renderAdminQueues() {
      const ordersCountEl = document.getElementById("orders-count");
      const ordersListEl = document.getElementById("orders-queue-list");
      const hhCountEl = document.getElementById("households-count");
      const hhListEl = document.getElementById("households-list");

      if (ordersCountEl) ordersCountEl.innerText = String((adminStore.orders || []).length);
      if (hhCountEl) hhCountEl.innerText = String((adminStore.households || []).length);

      if (ordersListEl) {
        if (!adminStore.orders || adminStore.orders.length === 0) {
          ordersListEl.innerHTML = '<div class="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 italic admin-inner">No Print-on-Demand orders queued yet. Click any Physical Box or Subscription above to test the checkout pipeline!</div>';
        } else {
          ordersListEl.innerHTML = adminStore.orders.map((o) => {
            const nextMap = {
              PAID_QUEUED: ["RENDERING_PRINT_FILES", "🖨️ Render 300DPI PDF"],
              RENDERING_PRINT_FILES: ["SENT_TO_PRINTER", "🏭 Dispatch to Printer"],
              SENT_TO_PRINTER: ["SHIPPED", "🚚 Mark Shipped"],
            };
            const nextStep = nextMap[o.status];
            return \`
              <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 admin-inner">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span class="font-extrabold text-amber-300">\${o.packageTitle}</span>
                    <span class="ml-2 font-mono text-[10px] text-slate-400">(\${o.id})</span>
                  </div>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">\${o.status} • $\${(o.amountCents / 100).toFixed(2)}</span>
                </div>
                <div class="text-[11px] text-slate-300">
                  <strong>Ship To:</strong> \${o.shippingName} — \${o.shippingAddress}
                  \${o.trackingNumber ? \` • <span class="text-amber-300 font-mono">Tracking: \${o.trackingNumber}</span>\` : ""}
                </div>
                <div class="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                  <a href="\${o.printableBundleUrl}" target="_blank" class="text-[11px] font-bold text-indigo-400 hover:underline">📄 Open Printable Kit &amp; Manifest</a>
                  \${nextStep ? \`<button onclick="advanceOrder('\${o.id}', '\${nextStep[0]}')" class="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[11px]">\${nextStep[1]}</button>\` : '<span class="text-emerald-400 font-bold text-[11px]">✅ Fulfilled</span>'}
                </div>
              </div>
            \`;
          }).join("");
        }
      }

      if (hhListEl) {
        hhListEl.innerHTML = (adminStore.households || []).map((h) => \`
          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 admin-inner">
            <div class="flex items-center justify-between">
              <span class="font-bold text-white">\${h.familyName}</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">\${h.subscriptionTier}</span>
            </div>
            <div class="text-[11px] text-slate-400">\${h.email} • Status: \${h.subscriptionStatus}</div>
            <div class="font-mono text-[11px] text-amber-300 bg-black/30 px-2 py-1 rounded border border-amber-500/20">🔑 \${h.licenseKey}</div>
          </div>
        \`).join("");
      }

      const loreListEl = document.getElementById("lore-registry-list");
      if (loreListEl) {
        loreListEl.innerHTML = (adminStore.loreEntries || []).map((l) => \`
          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 admin-inner">
            <div class="flex items-center justify-between gap-1">
              <span class="font-bold text-amber-300 truncate">\${l.title}</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 shrink-0">\${l.entryType} (Lv.\${l.levelRange})</span>
            </div>
            <div class="text-[11px] text-slate-400">Boss: \${l.mainAntagonist} • Biome: \${l.biome}</div>
            <div class="text-[10px] text-slate-300">Zones: \${(l.keyLocations || []).join(", ")}</div>
          </div>
        \`).join("");
      }
    }

    async function refreshAdminState() {
      const res = await fetch("/api/admin/state");
      const data = await res.json();
      if (data && data.store) {
        adminStore = data.store;
        renderAdminQueues();
      }
    }

    function openCheckoutModal(kind, itemId, title, priceUsd) {
      activeCheckout = { kind, itemId, title, priceUsd };
      document.getElementById("checkout-modal-title").innerText = "💳 " + title + " ($" + priceUsd + ")";
      document.getElementById("checkout-shipping-fields").style.display = kind === "PHYSICAL_KIT" ? "block" : "none";
      document.getElementById("checkout-receipt-box").classList.add("hidden");
      document.getElementById("checkout-modal").classList.remove("hidden");
    }

    function closeCheckoutModal() {
      document.getElementById("checkout-modal").classList.add("hidden");
    }

    async function submitCheckoutSession() {
      const familyName = document.getElementById("checkout-family").value;
      const email = document.getElementById("checkout-email").value;
      const shippingAddress = document.getElementById("checkout-address").value;
      const campaignId = document.getElementById("checkout-campaign").value;
      const payload = {
        checkoutKind: activeCheckout.kind,
        packageId: activeCheckout.kind === "PHYSICAL_KIT" ? activeCheckout.itemId : undefined,
        subscriptionTier: activeCheckout.kind === "SUBSCRIPTION" ? activeCheckout.itemId : undefined,
        campaignId,
        familyName,
        email,
        shippingName: familyName,
        shippingAddress
      };
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data && data.ok) {
        if (data.session && data.session.mode === "STRIPE_LIVE" && data.session.checkoutUrl) {
          window.location.href = data.session.checkoutUrl;
          return;
        }
        if (data.store) {
          adminStore = data.store;
          renderAdminQueues();
        }
        const receiptEl = document.getElementById("checkout-receipt-box");
        const hh = data.session && data.session.household;
        const ord = data.session && data.session.order;
        receiptEl.innerHTML = \`
          <div class="font-extrabold text-sm">🎉 Order &amp; Entitlement Confirmed (\${data.session.mode})</div>
          \${hh ? \`<div>🔑 <strong>Signed License Key:</strong> <code class="text-amber-300 font-mono">\${hh.licenseKey}</code></div>\` : ""}
          \${ord ? \`<div>📦 <strong>Order Queued:</strong> <code>\${ord.id}</code> (<a href="\${ord.printableBundleUrl}" target="_blank" class="underline font-bold">Open Printable Order Manifest</a>)</div>\` : ""}
        \`;
        receiptEl.classList.remove("hidden");
      }
    }

    async function advanceOrder(orderId, nextStatus) {
      const adminPin = document.getElementById("admin-pin-input").value;
      const trackingNumber = nextStatus === "SHIPPED" ? "USPS-9400-1000-2026" : undefined;
      const res = await fetch("/api/admin/orders/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, nextStatus, trackingNumber, adminPin })
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.error || "Operator PIN rejected");
        return;
      }
      if (data.store) {
        adminStore = data.store;
        renderAdminQueues();
      }
    }

    async function checkLicenseKey() {
      const licenseKey = document.getElementById("license-verify-input").value;
      const out = document.getElementById("license-verify-result");
      const res = await fetch("/api/license/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey })
      });
      const data = await res.json();
      if (data && data.result && data.result.valid) {
        out.className = "font-mono text-xs text-emerald-400";
        out.innerText = "✅ VALID (" + data.result.tier + ")";
      } else {
        out.className = "font-mono text-xs text-rose-400";
        out.innerText = "❌ INVALID KEY";
      }
    }

    async function testRtxConnection() {
      const hostInput = document.getElementById("rtx-host-input");
      const resultEl = document.getElementById("rtx-test-result");
      const badgeEl = document.getElementById("rtx-online-badge");
      const hostLabel = document.getElementById("rtx-host-label");
      const ollamaUrl = hostInput ? hostInput.value.trim() : "";
      if (resultEl) resultEl.innerText = "⏳ Probing RTX 3080...";
      try {
        const res = await fetch("/api/rtx/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ollamaUrl })
        });
        const data = await res.json();
        if (data && data.rtxStatus) {
          const st = data.rtxStatus;
          if (badgeEl) {
            badgeEl.className = "text-sm font-bold mt-1 " + (st.rtx3080Online ? "text-emerald-400" : "text-amber-300");
            badgeEl.innerText = st.rtx3080Online ? "🟢 ONLINE (" + st.activeModel + ")" : "🟡 STANDBY — Auto-Failover Active";
          }
          if (hostLabel) {
            hostLabel.innerText = "Host: " + st.rtx3080ConfiguredHost;
          }
          if (resultEl) {
            resultEl.innerText = (st.rtx3080Online ? "✅ Connected" : "⚠️ Offline (Failover Ready)") + " • " + st.latencyMs + "ms";
          }
        }
      } catch (err) {
        if (resultEl) resultEl.innerText = "❌ Probe error";
      }
    }

    let adminTheme = localStorage.getItem("hearthquest_theme") || "dark";
    function applyAdminTheme(t) {
      adminTheme = t;
      localStorage.setItem("hearthquest_theme", t);
      document.body.setAttribute("data-theme", t);
      const b = document.getElementById("admin-theme-btn");
      if (b) b.innerText = t === "light" ? "☀️ Light" : "🌙 Dark";
    }
    function toggleTheme() {
      applyAdminTheme(adminTheme === "light" ? "dark" : "light");
    }
    applyAdminTheme(adminTheme);
    renderAdminQueues();
  </script>
</body>
</html>`;
}

export function renderPrintableKitHtml(orderId?: string): string {
  const snap = getAdminStoreSnapshot();
  const order = orderId ? snap.orders.find((o) => o.id === orderId) : undefined;
  const household = order
    ? snap.households.find((h) => h.id === order.householdId)
    : undefined;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>HearthQuest — Printable Family Tabletop Kit & Storybook Keepsake</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-white text-slate-900 p-8 max-w-4xl mx-auto space-y-8">
  <div class="flex items-center justify-between border-b-2 border-slate-900 pb-4 print:hidden">
    <div>
      <h1 class="text-2xl font-black">🖨️ HearthQuest Print-at-Home Tabletop Pack</h1>
      <p class="text-xs text-slate-600">Cut out these Action Cards, Standees, and Unplugged Camping Flowchart for kitchen-table play!</p>
    </div>
    <button onclick="window.print()" class="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs">
      🖨️ Print Kit / Save as PDF
    </button>
  </div>

  ${
    order
      ? `
  <section class="border-2 border-slate-900 rounded-2xl p-5 bg-amber-50/60 space-y-2 text-xs">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-black uppercase tracking-wider">📦 Print-on-Demand Packing Slip &amp; License Manifest</h2>
      <span class="font-mono font-bold">Order ID: ${order.id} (${order.status})</span>
    </div>
    <div><strong>Package:</strong> ${order.packageTitle} ($${(
          order.amountCents / 100
        ).toFixed(2)}) • <strong>Campaign:</strong> ${order.campaignId}</div>
    <div><strong>Ship To:</strong> ${order.shippingName} — ${order.shippingAddress}</div>
    ${
      household
        ? `<div><strong>Household License Key:</strong> <code class="font-mono font-bold">${household.licenseKey}</code> (${household.subscriptionTier})</div>`
        : ""
    }
  </section>
  `
      : ""
  }

  <section class="space-y-3">
    <h2 class="text-lg font-extrabold uppercase tracking-wider">1. Cut-Out Kid Action Cards</h2>
    <div class="grid grid-cols-2 gap-4">
      <div class="border-2 border-dashed border-slate-800 rounded-2xl p-4">
        <div class="text-xl font-black">🛡️ Mighty Shield Boop</div>
        <div class="text-xs font-bold text-slate-600">Sir Barnaby Paws • Roll d6 (4+ Wins) or d20 +4</div>
        <p class="text-xs mt-2">Bounce your shiny shield off a sneaky rascal or heavy oak door!</p>
      </div>
      <div class="border-2 border-dashed border-slate-800 rounded-2xl p-4">
        <div class="text-xl font-black">✨ Starlight Sparkle Bolt</div>
        <div class="text-xs font-bold text-slate-600">Lyra Starwhisper • Roll d6 (4+ Wins) or d20 +5</div>
        <p class="text-xs mt-2">Launch a dazzling beam of comet-fizz that lights crystals or zaps foes!</p>
      </div>
    </div>
  </section>

  <section class="space-y-3">
    <h2 class="text-lg font-extrabold uppercase tracking-wider">2. Unplugged Camping & Road-Trip Flowchart</h2>
    <div class="border-2 border-slate-800 rounded-2xl p-4 text-xs space-y-2">
      <p><strong>Scene 1 (Cinnamon Courtyard):</strong> Sprinkles the Goblin guards the bakery door. Roll 4+ on a d6 (or share a Honey Biscuit) to befriend him!</p>
      <p><strong>Scene 2 (Flour-Cloud Pantry):</strong> Floating sacks of flour fill the room. Watch out for the Tickle-Pepper floor tile!</p>
      <p><strong>Scene 3 (Chef Snickerdoodle's Vault):</strong> Beat Chef Snickerdoodle in the Great Frosting Duel to save the Royal Birthday Cake!</p>
    </div>
  </section>
</body>
</html>`;
}

function readRawBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      resolve(raw);
    });
  });
}

async function readJsonBody(req: http.IncomingMessage): Promise<any> {
  const raw = await readRawBody(req);
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = parsedUrl.pathname;

  if (pathname === "/" && req.method === "GET") {
    const rtxStatus = await probeRtx3080Health();
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderAdminHtml(rtxStatus));
    return;
  }

  if ((pathname === "/store" || pathname === "/store/") && req.method === "GET") {
    const level = Number(parsedUrl.searchParams.get("partyLevel") || 2);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderStorefrontHtml(level));
    return;
  }

  if (pathname === "/api/store/catalog" && req.method === "GET") {
    const level = Number(parsedUrl.searchParams.get("partyLevel") || 1);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, catalog: getStoreCatalog(level) }));
    return;
  }

  if (pathname === "/api/store/cart" && req.method === "GET") {
    const sessionId = parsedUrl.searchParams.get("sessionId") || "default-guest";
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, cart: getStoreCart(sessionId) }));
    return;
  }

  if (pathname === "/api/store/cart" && req.method === "POST") {
    const body = await readJsonBody(req);
    const cart = updateStoreCart({
      sessionId: body.sessionId || "default-guest",
      action: body.action || "ADD",
      item: body.item,
      productId: body.productId,
      oneShotSlug: body.oneShotSlug,
      quantity: body.quantity,
      promoCode: body.promoCode,
    });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, cart }));
    return;
  }

  if (pathname === "/api/store/quote" && req.method === "POST") {
    const body = await readJsonBody(req);
    const quote = quoteStoreItems(body.items || [], body.promoCode);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, quote }));
    return;
  }

  if (pathname === "/api/store/checkout" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const result = await checkoutStoreCart({
        sessionId: body.sessionId,
        items: body.items,
        promoCode: body.promoCode,
        familyName: body.familyName || "Adventuring Family",
        email: body.email || "",
        shippingName: body.shippingName,
        shippingAddress: body.shippingAddress,
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err: any) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: err?.message || "Store checkout failed" }));
    }
    return;
  }

  if (pathname === "/api/store/orders/lookup" && req.method === "GET") {
    const orderId = parsedUrl.searchParams.get("orderId") || "";
    const email = parsedUrl.searchParams.get("email") || "";
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, ...lookupCustomerOrder({ orderId, email }) }));
    return;
  }

  if (pathname === "/api/store/trial" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, trial: getTrialEncounterOverview() }));
    return;
  }

  if (pathname === "/api/store/trial/play" && req.method === "POST") {
    const body = await readJsonBody(req);
    const result = playFreeTrialEncounter({
      choiceId: body.choiceId || "biscuit",
      rollValue: typeof body.rollValue === "number" ? body.rollValue : undefined,
    });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
    return;
  }

  if (pathname === "/api/store/trial/advance" && req.method === "POST") {
    const body = await readJsonBody(req);
    const result = attemptAdvanceTrialToEncounter2({
      licenseKey: body.licenseKey || "",
    });
    res.writeHead(result.allowed ? 200 : 402, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: result.allowed, ...result }));
    return;
  }

  if (pathname === "/printable-kit" && req.method === "GET") {
    const orderId = parsedUrl.searchParams.get("orderId") || undefined;
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderPrintableKitHtml(orderId));
    return;
  }

  if (pathname === "/api/admin/state" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, store: getAdminStoreSnapshot() }));
    return;
  }

  if (pathname === "/api/admin/lore" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, loreEntries: listLoreRegistry() }));
    return;
  }

  if (pathname === "/api/admin/lore" && req.method === "POST") {
    const body = await readJsonBody(req);
    if (!verifyOperatorPin(body.adminPin || "")) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "Invalid Operator PIN" }));
      return;
    }
    const created = registerLoreEntry({
      entryType: body.entryType || "CAMPAIGN_ARC",
      title: body.title || "Untitled Plot",
      biome: body.biome || "BAKERY",
      plotPremise: body.plotPremise || "",
      mainAntagonist: body.mainAntagonist || "",
      keyLocations: Array.isArray(body.keyLocations) ? body.keyLocations : [],
      levelRange: body.levelRange || "1-3",
      roomCode: body.roomCode,
    });
    res.writeHead(created.ok ? 200 : 409, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ...created, loreEntries: listLoreRegistry() }));
    return;
  }

  if (pathname === "/api/checkout/create-session" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const session = await createCheckoutSession({
        checkoutKind: body.checkoutKind === "SUBSCRIPTION" ? "SUBSCRIPTION" : "PHYSICAL_KIT",
        packageId: body.packageId,
        subscriptionTier: body.subscriptionTier,
        campaignId: body.campaignId,
        familyName: body.familyName || "Adventuring Family",
        email: body.email || "family@hearthquest.local",
        shippingName: body.shippingName,
        shippingAddress: body.shippingAddress,
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, session, store: getAdminStoreSnapshot() }));
    } catch (err: any) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: err?.message || "Checkout failed" }));
    }
    return;
  }

  if (pathname === "/api/webhooks/stripe" && req.method === "POST") {
    const rawBody = await readRawBody(req);
    const sigHeader = String(req.headers["stripe-signature"] || "");
    const secret = process.env.STRIPE_WEBHOOK_SECRET || "whsec_hearthquest_dev_secret";
    if (!verifyStripeWebhookSignature(rawBody, sigHeader, secret)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "Invalid Stripe-Signature HMAC" }));
      return;
    }
    try {
      const event = JSON.parse(rawBody);
      const result = processPaymentWebhookEvent(event);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, ...result }));
    } catch (err: any) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: err?.message || "Webhook error" }));
    }
    return;
  }

  if (pathname === "/api/admin/orders/advance" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const order = advanceFulfillmentOrder({
        orderId: body.orderId,
        nextStatus: body.nextStatus,
        trackingNumber: body.trackingNumber,
        adminPin: body.adminPin || "",
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, order, store: getAdminStoreSnapshot() }));
    } catch (err: any) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: err?.message || "Forbidden" }));
    }
    return;
  }

  if (pathname === "/api/license/verify" && req.method === "POST") {
    const body = await readJsonBody(req);
    const result = verifyLicenseKey(body.licenseKey || "");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, result }));
    return;
  }

  if (pathname === "/api/rtx/test" && req.method === "POST") {
    const body = await readJsonBody(req);
    const customUrl =
      body.ollamaUrl || body.host || process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
    const rtxStatus = await probeRtx3080Health(customUrl);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, rtxStatus }));
    return;
  }

  if (pathname === "/api/health" && req.method === "GET") {
    const rtxStatus = await probeRtx3080Health();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        service: "quest-admin",
        build: getBuildMetadata(),
        packagesCount: PHYSICAL_PACKAGES.length,
        rtxStatus,
      })
    );
    return;
  }

  if (
    (pathname === "/favicon.svg" || pathname === "/assets/hearthquest-icon.svg") &&
    req.method === "GET"
  ) {
    const iconPath = path.resolve(
      __dirname,
      "..",
      "..",
      "..",
      "assets",
      "hearthquest-icon.svg"
    );
    if (fs.existsSync(iconPath)) {
      res.writeHead(200, {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
      });
      res.end(fs.readFileSync(iconPath));
      return;
    }
  }

  if (
    (pathname === "/favicon.ico" ||
      pathname === "/favicon.png" ||
      pathname === "/assets/hearthquest-icon.png") &&
    req.method === "GET"
  ) {
    const iconPath = path.resolve(
      __dirname,
      "..",
      "..",
      "..",
      "assets",
      "hearthquest-icon.png"
    );
    if (fs.existsSync(iconPath)) {
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      });
      res.end(fs.readFileSync(iconPath));
      return;
    }
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: false, error: "Route not found" }));
});

if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(
      `[quest-admin] Storefront, Guides & Print-on-Demand Portal listening on http://0.0.0.0:${PORT}`
    );
  });
}

export { server };

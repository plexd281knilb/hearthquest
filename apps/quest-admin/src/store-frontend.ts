/**
 * HearthQuest Public Storefront HTML Renderer (`GET /store`)
 * Customer-facing e-commerce experience backed by SQLite `store_carts`, `promo_codes`,
 * `orders`, `households`, and `lore_registry`.
 */

import { getBuildMetadata } from "@hearthquest/shared-types";
import { getStoreCatalog, getTrialEncounterOverview } from "./store-backend";

export function renderStorefrontHtml(initialPartyLevel = 2): string {
  const buildMeta = getBuildMetadata();
  const catalog = getStoreCatalog(initialPartyLevel);
  const trialEncounter = getTrialEncounterOverview();
  const serializedCatalog = JSON.stringify(catalog).replace(/</g, "\\u003c");
  const serializedTrial = JSON.stringify(trialEncounter).replace(/</g, "\\u003c");
  const isLiveStripe = catalog.paymentGatewayMode === "STRIPE_LIVE";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#f59e0b" />
  <title>HearthQuest Store — Starter Boxes, Monthly Chapter Envelopes & Level-Scaled One-Shots</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="alternate icon" type="image/png" href="/assets/hearthquest-icon.png" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body[data-theme="light"] {
      background: radial-gradient(circle at top, #fffdf9 0%, #f5efe6 100%);
      color: #1c1917;
    }
    body[data-theme="dark"] {
      background: radial-gradient(circle at top, #0f172a 0%, #020617 100%);
      color: #f8fafc;
    }
    body[data-theme="dark"] .store-header {
      background-color: rgba(15, 23, 42, 0.92) !important;
      border-color: rgba(245, 158, 11, 0.25) !important;
      color: #f8fafc !important;
    }
    body[data-theme="dark"] .store-card {
      background-color: #0f172a !important;
      border-color: #1e293b !important;
      color: #f1f5f9 !important;
    }
    body[data-theme="dark"] .store-muted {
      color: #94a3b8 !important;
    }
    body[data-theme="dark"] .store-input {
      background-color: #020617 !important;
      border-color: #334155 !important;
      color: #f8fafc !important;
    }
    body[data-theme="dark"] .store-drawer {
      background-color: #0f172a !important;
      color: #f8fafc !important;
      border-color: #334155 !important;
    }
    body[data-theme="dark"] .store-card .text-stone-900,
    body[data-theme="dark"] .store-card .text-stone-800,
    body[data-theme="dark"] .store-drawer .text-stone-900,
    body[data-theme="dark"] .store-drawer .text-stone-800 {
      color: #f8fafc !important;
    }
    body[data-theme="dark"] .store-card .text-stone-700,
    body[data-theme="dark"] .store-card .text-stone-600,
    body[data-theme="dark"] .store-drawer .text-stone-600 {
      color: #cbd5e1 !important;
    }
    body[data-theme="dark"] .store-card .text-stone-500,
    body[data-theme="dark"] .store-header .text-stone-500 {
      color: #94a3b8 !important;
    }
    body[data-theme="dark"] .store-header .text-amber-800,
    body[data-theme="dark"] .store-card .text-amber-900,
    body[data-theme="dark"] .store-card .text-amber-800,
    body[data-theme="dark"] .store-card .text-amber-700 {
      color: #fcd34d !important;
    }
    body[data-theme="dark"] .store-card .text-emerald-900,
    body[data-theme="dark"] .store-card .text-emerald-800 {
      color: #6ee7b7 !important;
    }
    body[data-theme="dark"] .store-card .bg-stone-50,
    body[data-theme="dark"] .store-card .bg-stone-100,
    body[data-theme="dark"] .store-drawer .bg-stone-50 {
      background-color: #1e293b !important;
      border-color: #334155 !important;
    }
    body[data-theme="dark"] .store-card .bg-amber-50,
    body[data-theme="dark"] .store-card .bg-amber-100 {
      background-color: rgba(180, 83, 9, 0.25) !important;
    }
    body[data-theme="dark"] .store-card .bg-emerald-50,
    body[data-theme="dark"] .store-card .bg-emerald-100 {
      background-color: rgba(6, 95, 70, 0.35) !important;
    }
  </style>
</head>
<body class="min-h-screen flex flex-col font-sans" data-theme="light">
  <!-- Store Navigation Bar -->
  <header class="store-header sticky top-0 z-40 border-b border-amber-200 bg-white/95 backdrop-blur px-6 py-3.5 shadow-sm">
    <div class="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <span class="text-3xl">🛡️</span>
        <div>
          <div class="flex items-center gap-2">
            <span class="text-lg font-black tracking-tight text-amber-800">HearthQuest Store</span>
            <span class="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
              ${buildMeta.badgeText}
            </span>
            <span class="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full ${
              isLiveStripe
                ? "bg-indigo-100 text-indigo-800 border border-indigo-300"
                : "bg-emerald-100 text-emerald-800 border border-emerald-300"
            }">
              ${isLiveStripe ? "STRIPE SECURE" : "SANDBOX STORE"}
            </span>
          </div>
          <p class="text-[11px] text-stone-500 store-muted">Physical Starter Kits • Monthly Chapter Envelopes • Level-Scaled One-Shots</p>
        </div>
      </div>

      <nav class="flex flex-wrap items-center gap-3 text-xs font-bold">
        <a href="#try-free" class="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition">🎮 Play Encounter 1 Free</a>
        <a href="#starter-boxes" class="hover:text-amber-600 transition">📦 Kits &amp; DIY ($15–$69)</a>
        <a href="#subscriptions" class="hover:text-amber-600 transition">📬 Monthly ($5–$19)</a>
        <a href="#one-shots" class="hover:text-amber-600 transition">⚡ One-Shots ($4)</a>
        <a href="#track-order" class="hover:text-amber-600 transition">🔍 Track Order</a>
        <a href="/" class="px-2.5 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-700 store-card">⚙️ Operator Admin</a>
        <button onclick="toggleStoreTheme()" id="store-theme-btn" class="px-2.5 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-700 store-card">
          ☀️ Light
        </button>
        <button onclick="toggleCartDrawer(true)" id="open-cart-btn" class="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black shadow-sm flex items-center gap-1.5">
          <span>🛍️ Cart</span>
          <span id="cart-count-badge" class="px-1.5 py-0.5 rounded-full bg-stone-950 text-amber-300 text-[10px] font-mono">0</span>
        </button>
      </nav>
    </div>
  </header>

  <main class="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-12">
    <!-- Hero Showcase -->
    <section class="rounded-3xl bg-gradient-to-br from-amber-900 via-stone-900 to-indigo-950 text-white p-8 md:p-10 shadow-xl border border-amber-500/30 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
      <div class="lg:col-span-8 space-y-4">
        <span class="inline-block px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-extrabold uppercase tracking-wider border border-amber-400/30">
          Hybrid Physical + Digital Tabletop
        </span>
        <h1 class="text-3xl md:text-4xl font-black leading-tight">
          Start with a Full Family Tabletop Box.<br/>
          <span class="text-amber-300">Continue Every Month — or Play Endless Level-Scaled One-Shots.</span>
        </h1>
        <p class="text-sm text-stone-300 max-w-2xl">
          Try the complete first encounter right below for $0! Continue with an affordable <strong>$5/mo Digital Updates Pass</strong>, save by downloading <strong>$15 Print-at-Home DIY PDFs</strong> (zero shipping), or order our <strong>$49 Shipped Starter Box</strong> with engraved dice &amp; dry-erase battle maps.
        </p>
        <div class="flex flex-wrap gap-3 pt-1">
          <a href="#try-free" class="px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-extrabold text-xs shadow-md">
            🎮 Play First Encounter Free Now
          </a>
          <a href="#starter-boxes" class="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-extrabold text-xs shadow-md">
            🖨️ Print-at-Home ($15) &amp; Boxes ($49)
          </a>
          <a href="#one-shots" class="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20">
            ⚡ Browse $4 Level-Scaled One-Shots
          </a>
        </div>
      </div>
      <div class="lg:col-span-4 bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2 text-xs">
        <div class="font-extrabold text-amber-300 uppercase tracking-wider">🏷️ Active Launch Promos</div>
        <div class="p-2.5 rounded-xl bg-black/30 border border-amber-400/20 flex items-center justify-between">
          <div>
            <div class="font-mono font-black text-emerald-300">HEARTH10</div>
            <div class="text-[11px] text-stone-300">10% off entire store order</div>
          </div>
          <button onclick="applyQuickPromo('HEARTH10')" class="px-2.5 py-1 rounded-lg bg-emerald-500 text-stone-950 font-bold text-[11px]">Apply</button>
        </div>
        <div class="p-2.5 rounded-xl bg-black/30 border border-amber-400/20 flex items-center justify-between">
          <div>
            <div class="font-mono font-black text-amber-300">FAMILYFIRST</div>
            <div class="text-[11px] text-stone-300">$5 off Starter Box ($40+ order)</div>
          </div>
          <button onclick="applyQuickPromo('FAMILYFIRST')" class="px-2.5 py-1 rounded-lg bg-amber-400 text-stone-950 font-bold text-[11px]">Apply</button>
        </div>
        <p class="text-[11px] text-stone-400 pt-1">🚚 Free US Shipping on all $49+ Starter Box orders.</p>
      </div>
    </section>

    <!-- 0. Interactive Free First Encounter Demo (Play Free -> Pay to Continue) -->
    <section id="try-free" class="store-card rounded-3xl bg-white border-2 border-emerald-400/70 p-6 md:p-8 shadow-md space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">Free Interactive Sample • Encounter 1 of 3</span>
          <h2 class="text-2xl font-black text-amber-900 mt-1">${trialEncounter.encounterTitle}</h2>
          <p class="text-xs text-stone-600 store-muted">Play the opening encounter right here on the website for free! Unlock Encounter 2 &amp; beyond with a $5/mo Digital Pass, $15 Print-at-Home Kit, or $49 Shipped Box.</p>
        </div>
        <div class="flex items-center gap-2 text-xs">
          <span id="trial-status-badge" class="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black">🟢 ENCOUNTER 1: FREE</span>
        </div>
      </div>

      <div class="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2 store-card">
        <div class="text-xs font-black uppercase tracking-wider text-amber-700">🎙️ Read Aloud to the Table</div>
        <p class="text-sm font-medium leading-relaxed">${trialEncounter.readAloudCozy}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        ${trialEncounter.choices
          .map(
            (c) => `
          <button onclick="playTrialChoice('${c.id}')" class="p-4 rounded-2xl border border-stone-200 hover:border-amber-400 hover:bg-amber-50/50 text-left space-y-1 transition store-card">
            <div class="font-extrabold text-xs">${c.label}</div>
            <div class="text-[11px] text-stone-500 store-muted">Target Roll: ${c.dcStoryD6}+ on d6 (Family Heroic Rally safety enabled)</div>
          </button>
        `
          )
          .join("")}
      </div>

      <div id="trial-outcome-box" class="hidden p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-3 text-xs">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div id="trial-roll-badge" class="font-black text-sm"></div>
          <span class="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold">🍪 Reward Unlocked: Cookie of Bravery</span>
        </div>
        <p id="trial-narrative-text" class="text-sm font-medium"></p>
        <div class="pt-2 border-t border-emerald-200 flex flex-wrap items-center justify-between gap-3">
          <span class="font-bold text-stone-700">Ready for ${trialEncounter.nextLockedEncounterTitle}?</span>
          <button id="btn-continue-encounter-2" onclick="attemptContinueEncounter2()" class="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow">
            ➡️ Continue to Encounter 2: Flour-Cloud Pantry
          </button>
        </div>
      </div>

      <!-- Paywall Gate Panel shown when user clicks Continue without paid license -->
      <div id="trial-paywall-panel" class="hidden p-5 rounded-2xl bg-gradient-to-br from-indigo-950 to-slate-900 text-white border border-amber-400/50 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div class="text-xs font-extrabold uppercase tracking-wider text-amber-300">🔒 Paywall Checkpoint — Encounter 2 &amp; Full Campaign</div>
            <h3 class="text-lg font-black mt-0.5">You Finished the Free Preview! Pick How Your Family Wants to Continue:</h3>
          </div>
          <span class="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold border border-amber-400/40">No $0 Free Host Tier</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <button onclick="addSubscriptionToCart('DIGITAL_UPDATES')" class="p-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-emerald-400/40 text-left space-y-1">
            <div class="font-black text-emerald-300">Digital Explorer Updates — $5/mo</div>
            <div class="text-stone-300 text-[11px]">Play full campaigns online + receive ongoing creator chapter updates ($0 shipping).</div>
          </button>
          <button onclick="addPhysicalToCart('pkg-starter-diy')" class="p-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-sky-400/40 text-left space-y-1">
            <div class="font-black text-sky-300">Print-at-Home DIY PDF Pack — $15</div>
            <div class="text-stone-300 text-[11px]">Lower price! Print your own maps &amp; standees + unlock Campaign 1 online ($0 shipping).</div>
          </button>
          <button onclick="addPhysicalToCart('pkg-starter-box')" class="p-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-amber-400/40 text-left space-y-1">
            <div class="font-black text-amber-300">Shipped Starter Box — $49</div>
            <div class="text-stone-300 text-[11px]">We print &amp; mail engraved dice, plastic bases &amp; dry-erase battle maps + unlock online!</div>
          </button>
        </div>
        <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10 text-xs">
          <span class="text-stone-300 font-semibold">Already paid? Activate License Key:</span>
          <input id="trial-license-input" type="text" placeholder="HQ-UPD-..." class="flex-1 min-w-[180px] bg-black/40 border border-slate-600 rounded-xl px-3 py-1.5 font-mono text-amber-300" />
          <button onclick="unlockWithLicenseKey()" class="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-extrabold">🔑 Unlock Encounter 2</button>
        </div>
      </div>

      <!-- Unlocked Encounter 2 Preview -->
      <div id="trial-encounter2-unlocked" class="hidden p-5 rounded-2xl bg-indigo-50 border border-indigo-300 text-indigo-950 space-y-2 text-xs">
        <div class="font-black text-sm text-indigo-800" id="trial-enc2-title"></div>
        <p id="trial-enc2-readaloud" class="text-sm"></p>
        <div id="trial-enc2-boss" class="font-bold text-purple-800"></div>
      </div>
    </section>

    <!-- 1. Starter Kits: Cheaper DIY Print-at-Home vs Shipped Physical Boxes -->
    <section id="starter-boxes" class="space-y-4">
      <div class="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 class="text-2xl font-black text-amber-900">1. Print-at-Home DIY ($15) &amp; Shipped Starter Boxes ($49–$69)</h2>
          <p class="text-sm text-stone-600 store-muted">Print your own maps &amp; paper minis for $15 ($0 shipping!), or let us print &amp; mail engraved dice, plastic bases &amp; laminated dry-erase maps starting at $49.</p>
        </div>
        <a href="/printable-kit" target="_blank" class="text-xs font-bold text-indigo-600 hover:underline">
          🖨️ Preview Sample Print-at-Home Layout →
        </a>
      </div>

      <div id="starter-packages-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"></div>
    </section>

    <!-- 2. Monthly Next-Chapter Mailer & Digital Creator Updates -->
    <section id="subscriptions" class="space-y-4">
      <div>
        <h2 class="text-2xl font-black text-amber-900">2. Creator Story Updates ($5–$9/mo) &amp; Monthly Chapter Envelopes ($19/mo)</h2>
        <p class="text-sm text-stone-600 store-muted">Stay purely digital for $5–$9/mo to receive ongoing creator updates and DIY PDFs with $0 shipping, or upgrade to $19/mo for a slim mailed chapter refill every month.</p>
      </div>
      <div id="subscriptions-grid" class="grid grid-cols-1 md:grid-cols-3 gap-5"></div>
    </section>

    <!-- 3. Dynamic Party-Level-Scaled One-Shot Store Shelf -->
    <section id="one-shots" class="store-card rounded-3xl bg-white border border-amber-200 p-6 md:p-8 shadow-sm space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span class="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black uppercase tracking-wider">Lore Continuity Verified</span>
          <h2 class="text-2xl font-black text-amber-900 mt-1">3. Print-at-Home Party-Level-Scaled One-Shots ($4 — Zero Shipping)</h2>
          <p class="text-xs text-stone-600 store-muted">Slide your family party's level below to preview boss HP/DC scaling. Digital + Print-at-Home packs cost just $4 since nothing needs to be shipped.</p>
        </div>
        <div class="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 store-card">
          <label for="store-party-level" class="text-xs font-extrabold">Party Level:</label>
          <input id="store-party-level" type="range" min="1" max="5" value="${initialPartyLevel}" oninput="onPartyLevelSlider(this.value)" class="accent-amber-600" />
          <span id="store-party-level-label" class="px-2.5 py-1 rounded-lg bg-amber-500 text-stone-950 font-black text-xs">Lvl ${initialPartyLevel}</span>
        </div>
      </div>
      <div id="oneshots-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"></div>
    </section>

    <!-- 4. Self-Service Order Tracking & Printable Kit Portal -->
    <section id="track-order" class="store-card rounded-3xl bg-white border border-stone-200 p-6 md:p-8 shadow-sm space-y-4">
      <div>
        <h2 class="text-xl font-black text-amber-900">🔍 Track Your Physical Shipment &amp; Recover License Keys</h2>
        <p class="text-xs text-stone-600 store-muted">Enter your Order ID and checkout email to view USPS/Print-on-Demand fulfillment progress and open your Printable Home Kit.</p>
      </div>
      <form onsubmit="handleOrderLookup(event)" class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <input id="lookup-order-id" type="text" required placeholder="Order ID (e.g., ord_...)" class="store-input border border-stone-300 rounded-xl px-3.5 py-2.5 font-mono" />
        <input id="lookup-order-email" type="email" required placeholder="Checkout Email (e.g., family@example.com)" class="store-input border border-stone-300 rounded-xl px-3.5 py-2.5" />
        <button type="submit" class="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 font-extrabold">
          🔎 Check Order Status
        </button>
      </form>
      <div id="order-lookup-result" class="hidden p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs space-y-2 store-card"></div>
    </section>
  </main>

  <footer class="border-t border-amber-200/70 py-6 text-center text-xs text-stone-500 store-muted">
    HearthQuest Family Tabletop Storefront • Powered by SQLite WAL &amp; Stripe Checkout
  </footer>

  <!-- Slide-Over Shopping Cart & Checkout Drawer -->
  <div id="cart-drawer-backdrop" onclick="toggleCartDrawer(false)" class="hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50"></div>
  <aside id="cart-drawer" class="hidden fixed top-0 right-0 h-full w-full max-w-md store-drawer bg-white border-l border-stone-200 shadow-2xl z-50 flex flex-col justify-between p-6 overflow-y-auto">
    <div class="space-y-4">
      <div class="flex items-center justify-between border-b border-stone-200 pb-3">
        <h3 class="text-lg font-black flex items-center gap-2">🛍️ Your HearthQuest Cart</h3>
        <button onclick="toggleCartDrawer(false)" class="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold">✕ Close</button>
      </div>

      <div id="cart-items-container" class="space-y-2.5 text-xs"></div>

      <!-- Promo Input -->
      <div class="pt-2 border-t border-stone-200 space-y-2 text-xs">
        <div class="flex gap-2">
          <input id="cart-promo-input" type="text" placeholder="Promo Code (HEARTH10 / FAMILYFIRST)" class="flex-1 store-input border border-stone-300 rounded-xl px-3 py-2 font-mono uppercase" />
          <button onclick="applyCartPromo()" class="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold">Apply</button>
        </div>
        <div id="cart-promo-feedback" class="text-[11px]"></div>
      </div>

      <!-- Quote Totals -->
      <div class="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-1.5 text-xs store-card">
        <div class="flex justify-between"><span>Subtotal</span><span id="cart-subtotal" class="font-bold">$0.00</span></div>
        <div class="flex justify-between text-emerald-700 font-semibold"><span>Promo Discount</span><span id="cart-discount">-$0.00</span></div>
        <div class="flex justify-between"><span>USPS Shipping</span><span id="cart-shipping" class="font-bold">$0.00</span></div>
        <div class="flex justify-between text-base font-black border-t border-amber-200 pt-2">
          <span>Total Due</span><span id="cart-total">$0.00</span>
        </div>
      </div>
    </div>

    <!-- Shipping & Checkout Form -->
    <form onsubmit="submitStoreCheckout(event)" class="space-y-2.5 pt-4 border-t border-stone-200 text-xs mt-4">
      <div class="font-extrabold text-amber-800 uppercase tracking-wider text-[11px]">📦 Shipping &amp; Digital License Delivery</div>
      <input id="store-checkout-family" type="text" required placeholder="Family Name (e.g., The Miller Family)" class="w-full store-input border border-stone-300 rounded-xl px-3 py-2" />
      <input id="store-checkout-email" type="email" required placeholder="Receipt & License Email" class="w-full store-input border border-stone-300 rounded-xl px-3 py-2" />
      <input id="store-checkout-address" type="text" placeholder="Shipping Street, City, State ZIP (Required for physical boxes)" class="w-full store-input border border-stone-300 rounded-xl px-3 py-2" />
      <button type="submit" id="btn-store-checkout" class="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-md">
        🔒 Complete Order
      </button>
      <div id="store-checkout-receipt" class="hidden p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-1.5"></div>
    </form>
  </aside>

  <script>
    let catalog = ${serializedCatalog};
    const trialConfig = ${serializedTrial};
    let cartState = { sessionId: "", items: [], promoCode: "", quote: { lines: [], subtotalCents: 0, discountCents: 0, shippingCents: 0, totalCents: 0 } };
    let selectedStarterCampaigns = {};

    async function playTrialChoice(choiceId) {
      const res = await fetch("/api/store/trial/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choiceId }),
      });
      const data = await res.json();
      if (data && data.ok) {
        document.getElementById("trial-outcome-box").classList.remove("hidden");
        document.getElementById("trial-roll-badge").innerText = "🎲 Rolled " + data.rolled + " on d6 — " + data.outcomeType.replace("_", " ") + "!";
        document.getElementById("trial-narrative-text").innerText = data.narrative;
      }
    }

    async function attemptContinueEncounter2(overrideKey) {
      const storedKey = overrideKey || document.getElementById("trial-license-input").value.trim() || localStorage.getItem("hq_store_license_key") || "";
      const res = await fetch("/api/store/trial/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey: storedKey }),
      });
      const data = await res.json();
      if (data.allowed && data.nextEncounter) {
        localStorage.setItem("hq_store_license_key", storedKey);
        document.getElementById("trial-paywall-panel").classList.add("hidden");
        document.getElementById("trial-encounter2-unlocked").classList.remove("hidden");
        document.getElementById("trial-enc2-title").innerText = "🔓 " + data.nextEncounter.title;
        document.getElementById("trial-enc2-readaloud").innerText = data.nextEncounter.readAloud;
        document.getElementById("trial-enc2-boss").innerText = "Upcoming Challenge: " + data.nextEncounter.bossName;
        document.getElementById("trial-status-badge").innerText = "🔓 FULL CAMPAIGN UNLOCKED";
      } else {
        document.getElementById("trial-paywall-panel").classList.remove("hidden");
      }
    }

    async function unlockWithLicenseKey() {
      const key = document.getElementById("trial-license-input").value.trim();
      if (!key) return;
      await attemptContinueEncounter2(key);
    }

    function getCartSessionId() {
      let sid = localStorage.getItem("hq_store_session_id");
      if (!sid) {
        sid = "sess_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
        localStorage.setItem("hq_store_session_id", sid);
      }
      return sid;
    }

    function fmtUsd(cents) {
      return "$" + ((cents || 0) / 100).toFixed(2);
    }

    function toggleStoreTheme() {
      const next = document.body.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.body.setAttribute("data-theme", next);
      document.getElementById("store-theme-btn").innerText = next === "light" ? "☀️ Light" : "🌙 Dark";
      localStorage.setItem("hq_store_theme", next);
    }
    if (localStorage.getItem("hq_store_theme") === "dark") {
      toggleStoreTheme();
    }

    function renderCatalog() {
      const starterGrid = document.getElementById("starter-packages-grid");
      starterGrid.innerHTML = catalog.packages.map((pkg) => {
        const defaultCamp = selectedStarterCampaigns[pkg.id] || pkg.campaignId;
        const campOptions = catalog.campaigns.map((c) =>
          "<option value='" + c.id + "' " + (c.id === defaultCamp ? "selected" : "") + ">" + c.title + "</option>"
        ).join("");
        const isDiy = !pkg.includesPhysicalDiceSet && !pkg.includesDryEraseGrid;
        return \`
          <div class="store-card rounded-3xl bg-white border \${pkg.includesHardcoverKeepsake ? 'border-amber-400 shadow-md ring-2 ring-amber-400/20' : isDiy ? 'border-sky-300 shadow-sm' : 'border-stone-200 shadow-sm'} p-6 flex flex-col justify-between gap-4">
            <div class="space-y-3">
              <div class="flex items-center justify-between gap-2">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase \${isDiy ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'}">\${isDiy ? '🖨️ Print-at-Home ($0 Shipping)' : '📦 Shipped Box'}</span>
                <span class="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black text-sm shrink-0">$\${pkg.priceUsd}</span>
              </div>
              <h3 class="font-black text-base leading-snug">\${pkg.title}</h3>
              <ul class="space-y-1.5 text-xs text-stone-600 store-muted">
                <li>🗺️ <strong>\${pkg.includedMapsCount} \${isDiy ? 'Printable DIY Battle Maps' : 'Laminated Dry-Erase Maps'}</strong></li>
                <li>🧝 <strong>\${pkg.includedStandeesCount} \${isDiy ? 'Paper Fold-Out Standees (PDF)' : 'Punch-Out Standees'}</strong> \${pkg.includesPhysicalDiceSet ? '+ Engraved Polyhedral Dice' : ''}</li>
                <li>🃏 <strong>\${pkg.includedActionCardsCount} Action Cards</strong></li>
                <li>🏕️ Unplugged Camping Flowchart Included</li>
                \${pkg.includesHardcoverKeepsake ? '<li class="text-amber-700 font-bold">📖 Custom Printed Hardcover Family Storybook!</li>' : ''}
              </ul>
              <div class="pt-1">
                <label class="text-[11px] font-bold text-stone-500 block mb-1">Included Story Arc:</label>
                <select onchange="selectedStarterCampaigns['\${pkg.id}'] = this.value" class="w-full store-input border border-stone-300 rounded-xl px-2.5 py-1.5 text-xs">
                  \${campOptions}
                </select>
              </div>
            </div>
            <button onclick="addPhysicalToCart('\${pkg.id}')" class="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs transition shadow-sm">
              + Add to Cart ($\${pkg.priceUsd})
            </button>
          </div>
        \`;
      }).join("");

      const subGrid = document.getElementById("subscriptions-grid");
      subGrid.innerHTML = catalog.subscriptions.map((plan) => \`
        <div class="store-card rounded-3xl bg-white border \${plan.tier === 'GAME_IN_A_BOX_PRO' ? 'border-indigo-400 shadow-md' : 'border-stone-200 shadow-sm'} p-6 flex flex-col justify-between gap-4">
          <div class="space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase">\${plan.badge}</span>
              <span class="text-xl font-black text-emerald-600">$\${plan.priceMonthlyUsd}<span class="text-xs font-normal text-stone-500">/mo</span></span>
            </div>
            <h3 class="font-black text-base">\${plan.name}</h3>
            <ul class="space-y-1.5 text-xs text-stone-600 store-muted">
              \${plan.features.map((f) => '<li>✅ ' + f + '</li>').join('')}
            </ul>
          </div>
          <button onclick="addSubscriptionToCart('\${plan.tier}')" class="w-full py-2.5 rounded-xl \${plan.priceMonthlyUsd > 0 ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-stone-800 hover:bg-stone-700 text-white'} font-extrabold text-xs transition">
            + Select Plan ($\${plan.priceMonthlyUsd}/mo)
          </button>
        </div>
      \`).join("");

      renderOneShots();
    }

    function renderOneShots() {
      const level = Number(document.getElementById("store-party-level").value || 2);
      const grid = document.getElementById("oneshots-grid");
      grid.innerHTML = catalog.oneShots.map((os) => \`
        <div class="store-card rounded-2xl bg-amber-50/40 border border-amber-200 p-4 flex flex-col justify-between gap-3">
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="text-2xl">\${os.antagonistEmoji}</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">Lvl \${level} • HP \${os.scaledBossHp}</span>
            </div>
            <h3 class="font-black text-sm leading-snug">\${os.title}</h3>
            <p class="text-[11px] text-stone-600 store-muted">\${os.premise}</p>
            <div class="text-[10px] text-stone-500 pt-1">
              <strong>Boss:</strong> \${os.antagonist} • <strong>DC \${os.scaledDc5e}</strong>
            </div>
          </div>
          <button onclick="addOneShotToCart('\${os.slug}', \${level})" class="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs">
            ⚡ Add One-Shot ($\${os.priceUsd})
          </button>
        </div>
      \`).join("");
    }

    async function onPartyLevelSlider(val) {
      document.getElementById("store-party-level-label").innerText = "Lvl " + val;
      const res = await fetch("/api/store/catalog?partyLevel=" + encodeURIComponent(val));
      const data = await res.json();
      if (data && data.ok && data.catalog) {
        catalog = data.catalog;
        renderOneShots();
      }
    }

    function toggleCartDrawer(open) {
      document.getElementById("cart-drawer-backdrop").classList.toggle("hidden", !open);
      document.getElementById("cart-drawer").classList.toggle("hidden", !open);
    }

    function renderCart() {
      const lines = cartState.quote?.lines || [];
      const totalItems = lines.reduce((sum, l) => sum + (l.quantity || 1), 0);
      document.getElementById("cart-count-badge").innerText = String(totalItems);

      const container = document.getElementById("cart-items-container");
      if (lines.length === 0) {
        container.innerHTML = "<div class='p-4 rounded-xl bg-stone-100 text-stone-500 text-center'>Your cart is empty. Pick a Starter Box or One-Shot!</div>";
      } else {
        container.innerHTML = lines.map((line) => \`
          <div class="p-3 rounded-xl border border-stone-200 flex items-center justify-between gap-2">
            <div class="flex-1 min-w-0">
              <div class="font-bold truncate">\${line.title}</div>
              <div class="text-[11px] text-stone-500">\${fmtUsd(line.unitPriceCents)} each</div>
            </div>
            <div class="flex items-center gap-1.5">
              \${line.itemType !== 'SUBSCRIPTION' ? \`
                <button onclick="setCartItemQty('\${line.productId}', '\${line.oneShotSlug || ''}', \${line.quantity - 1})" class="w-6 h-6 rounded-md bg-stone-200 text-stone-800 font-bold">-</button>
                <span class="w-5 text-center font-mono font-bold">\${line.quantity}</span>
                <button onclick="setCartItemQty('\${line.productId}', '\${line.oneShotSlug || ''}', \${line.quantity + 1})" class="w-6 h-6 rounded-md bg-stone-200 text-stone-800 font-bold">+</button>
              \` : '<span class="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">MONTHLY</span>'}
              <button onclick="removeCartItem('\${line.productId}', '\${line.oneShotSlug || ''}')" class="ml-1 text-rose-600 font-bold text-xs">✕</button>
            </div>
          </div>
        \`).join("");
      }

      const q = cartState.quote || {};
      document.getElementById("cart-subtotal").innerText = fmtUsd(q.subtotalCents);
      document.getElementById("cart-discount").innerText = "-" + fmtUsd(q.discountCents);
      document.getElementById("cart-shipping").innerText = q.shippingCents === 0 && (q.subtotalCents || 0) > 0 ? "FREE" : fmtUsd(q.shippingCents);
      document.getElementById("cart-total").innerText = fmtUsd(q.totalCents);
      if (cartState.promoCode) {
        document.getElementById("cart-promo-input").value = cartState.promoCode;
      }
      const feedback = document.getElementById("cart-promo-feedback");
      if (q.promoError) {
        feedback.className = "text-[11px] text-rose-600 font-semibold";
        feedback.innerText = q.promoError;
      } else if (q.appliedPromo) {
        feedback.className = "text-[11px] text-emerald-700 font-semibold";
        feedback.innerText = "✅ " + q.appliedPromo.code + ": " + q.appliedPromo.description;
      } else {
        feedback.innerText = "";
      }
    }

    async function mutateCart(payload) {
      const res = await fetch("/api/store/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: getCartSessionId(), ...payload }),
      });
      const data = await res.json();
      if (data && data.cart) {
        cartState = data.cart;
        renderCart();
      }
    }

    async function addPhysicalToCart(pkgId) {
      const campaignId = selectedStarterCampaigns[pkgId] || undefined;
      await mutateCart({ action: "ADD", item: { itemType: "PHYSICAL_KIT", productId: pkgId, campaignId, quantity: 1 } });
      toggleCartDrawer(true);
    }

    async function addSubscriptionToCart(tier) {
      await mutateCart({ action: "ADD", item: { itemType: "SUBSCRIPTION", productId: tier, quantity: 1 } });
      toggleCartDrawer(true);
    }

    async function addOneShotToCart(slug, partyLevel) {
      await mutateCart({ action: "ADD", item: { itemType: "ONE_SHOT_PACK", productId: "pkg-oneshot-pack", oneShotSlug: slug, partyLevel, quantity: 1 } });
      toggleCartDrawer(true);
    }

    async function setCartItemQty(productId, oneShotSlug, qty) {
      await mutateCart({ action: "SET_QTY", productId, oneShotSlug: oneShotSlug || undefined, quantity: qty });
    }

    async function removeCartItem(productId, oneShotSlug) {
      await mutateCart({ action: "REMOVE", productId, oneShotSlug: oneShotSlug || undefined });
    }

    async function applyCartPromo() {
      const code = document.getElementById("cart-promo-input").value.trim();
      await mutateCart({ action: "APPLY_PROMO", promoCode: code });
    }

    async function applyQuickPromo(code) {
      document.getElementById("cart-promo-input").value = code;
      await mutateCart({ action: "APPLY_PROMO", promoCode: code });
      toggleCartDrawer(true);
    }

    async function submitStoreCheckout(e) {
      e.preventDefault();
      const familyName = document.getElementById("store-checkout-family").value.trim();
      const email = document.getElementById("store-checkout-email").value.trim();
      const shippingAddress = document.getElementById("store-checkout-address").value.trim();
      const btn = document.getElementById("btn-store-checkout");
      btn.disabled = true;
      btn.innerText = "Processing...";
      try {
        const res = await fetch("/api/store/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: getCartSessionId(),
            familyName,
            email,
            shippingAddress,
          }),
        });
        const data = await res.json();
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }
        const receiptBox = document.getElementById("store-checkout-receipt");
        receiptBox.classList.remove("hidden");
        if (!data.ok) {
          receiptBox.className = "p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs";
          receiptBox.innerText = data.error || "Checkout failed";
        } else {
          const orderLinks = (data.orders || []).map((o) =>
            "<div class='font-mono text-[11px]'>Order: <strong>" + o.id + "</strong> (<a class='underline font-bold' target='_blank' href='" + o.printableBundleUrl + "'>Printable Kit</a>)</div>"
          ).join("");
          receiptBox.className = "p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-1.5 text-xs";
          receiptBox.innerHTML =
            "<div class='font-black'>🎉 Order Confirmed! Receipt " + data.receiptNumber + " (" + fmtUsd(data.quote.totalCents) + ")</div>" +
            orderLinks +
            (data.licenseKey ? "<div class='font-mono text-[11px]'>License Key: <strong>" + data.licenseKey + "</strong></div>" : "");
          if (data.licenseKey) {
            localStorage.setItem("hq_store_license_key", data.licenseKey);
            const inp = document.getElementById("trial-license-input");
            if (inp) inp.value = data.licenseKey;
          }
          if (data.orders && data.orders[0]) {
            document.getElementById("lookup-order-id").value = data.orders[0].id;
            document.getElementById("lookup-order-email").value = email;
          }
          await loadInitialCart();
        }
      } finally {
        btn.disabled = false;
        btn.innerText = "🔒 Complete Order";
      }
    }

    async function handleOrderLookup(e) {
      e.preventDefault();
      const orderId = document.getElementById("lookup-order-id").value.trim();
      const email = document.getElementById("lookup-order-email").value.trim();
      const res = await fetch("/api/store/orders/lookup?orderId=" + encodeURIComponent(orderId) + "&email=" + encodeURIComponent(email));
      const data = await res.json();
      const box = document.getElementById("order-lookup-result");
      box.classList.remove("hidden");
      if (!data.found || !data.order) {
        box.innerHTML = "<div class='text-rose-700 font-bold'>❌ No matching order found for that Order ID and Email.</div>";
        return;
      }
      const o = data.order;
      box.innerHTML =
        "<div class='flex flex-wrap justify-between gap-2'><strong>" + o.packageTitle + "</strong><span class='px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold'>" + o.status + "</span></div>" +
        "<div>Shipping To: " + o.shippingName + " — " + o.shippingAddress + "</div>" +
        (o.trackingNumber ? "<div>Tracking Number: <span class='font-mono font-bold'>" + o.trackingNumber + "</span></div>" : "<div class='text-stone-500'>Tracking number will appear once status moves to SHIPPED.</div>") +
        (data.householdLicenseKey ? "<div>License Key: <span class='font-mono font-bold'>" + data.householdLicenseKey + "</span></div>" : "") +
        "<div><a href='" + o.printableBundleUrl + "' target='_blank' class='inline-block mt-1 px-3 py-1.5 rounded-lg bg-amber-500 text-stone-950 font-bold'>🖨️ Open Printable Home Kit & Packing Slip</a></div>";
    }

    async function loadInitialCart() {
      const res = await fetch("/api/store/cart?sessionId=" + encodeURIComponent(getCartSessionId()));
      const data = await res.json();
      if (data && data.cart) {
        cartState = data.cart;
        renderCart();
      }
    }

    renderCatalog();
    loadInitialCart();
  </script>
</body>
</html>`;
}

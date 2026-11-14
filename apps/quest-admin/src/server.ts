import http from "node:http";
import { probeRtx3080Health } from "@hearthquest/quest-ai-bridge";
import { PrintFulfillmentPackage, getBuildMetadata } from "@hearthquest/shared-types";
import { SRD_51_CC_BY_40_ATTRIBUTION } from "@hearthquest/srd-rules";

const PORT = Number(process.env.PORT || 3001);

export const PHYSICAL_PACKAGES: PrintFulfillmentPackage[] = [
  {
    id: "pkg-starter-box",
    campaignId: "camp-goblin-bakery",
    title: "The Goblin Bakery Heist — Family Tabletop Box",
    includedMapsCount: 3,
    includedStandeesCount: 12,
    includedActionCardsCount: 24,
    includesDryEraseGrid: true,
    includesPhysicalDiceSet: true,
    includesHardcoverKeepsake: false,
    priceUsd: 34,
    unpluggedCampingFlowchartIncluded: true,
  },
  {
    id: "pkg-deluxe-keepsake",
    campaignId: "camp-goblin-bakery",
    title: "Deluxe Collector Box + Custom Hardcover Family Storybook",
    includedMapsCount: 6,
    includedStandeesCount: 24,
    includedActionCardsCount: 48,
    includesDryEraseGrid: true,
    includesPhysicalDiceSet: true,
    includesHardcoverKeepsake: true,
    priceUsd: 59,
    unpluggedCampingFlowchartIncluded: true,
  },
];

export function renderAdminHtml(rtxStatus: Awaited<ReturnType<typeof probeRtx3080Health>>): string {
  const buildMeta = getBuildMetadata();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>HearthQuest Admin — Family Guides, Storefront & Print-on-Demand</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
  <header class="border-b border-amber-500/30 bg-slate-900/90 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
    <div class="flex items-center gap-3">
      <span class="text-3xl">📦</span>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-xl font-extrabold text-amber-300">HearthQuest Command & Storefront</h1>
          <span id="admin-build-version-badge" class="px-2.5 py-0.5 text-[11px] font-mono font-bold rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-500/40">
            ${buildMeta.badgeText}
          </span>
        </div>
        <p class="text-xs text-slate-400">Family Quick-Start Guides • Print-on-Demand Fulfillment • RTX 3080 AI Telemetry</p>
      </div>
    </div>
    <div class="flex items-center gap-3">
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
        <div class="p-4 rounded-xl bg-slate-950 border border-slate-800">
          <div class="text-slate-400">Local Gaming Rig (RTX 3080 Ollama)</div>
          <div class="text-sm font-bold mt-1 ${rtxStatus.rtx3080Online ? "text-emerald-400" : "text-amber-300"}">
            ${rtxStatus.rtx3080Online ? "🟢 ONLINE (" + rtxStatus.activeModel + ")" : "🟡 STANDBY — Auto-Failover Active"}
          </div>
          <div class="text-[11px] text-slate-500 mt-1">Host: ${rtxStatus.rtx3080ConfiguredHost}</div>
        </div>
        <div class="p-4 rounded-xl bg-slate-950 border border-slate-800">
          <div class="text-slate-400">Fail-Safe Game Night Engine</div>
          <div class="text-sm font-bold text-purple-300 mt-1">${rtxStatus.failoverEngine}</div>
          <div class="text-[11px] text-slate-500 mt-1">Zero-downtime switchover if gaming PC is asleep</div>
        </div>
        <div class="p-4 rounded-xl bg-slate-950 border border-slate-800">
          <div class="text-slate-400">Multi-Device Sync & Safety</div>
          <div class="text-sm font-bold text-emerald-300 mt-1">Jackbox Room Codes + Cozy G-Rated Filter</div>
          <div class="text-[11px] text-slate-500 mt-1">Supports TV Display, GM Laptop & Kid Tablets</div>
        </div>
      </div>
    </section>

    <!-- 2. 5-Minute Family Quick-Start Guides -->
    <section class="space-y-3">
      <h2 class="text-lg font-extrabold text-amber-300">📚 5-Minute Parent & Family Quick-Start Guides</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <span class="text-2xl">⏱️</span>
          <h3 class="font-bold text-sm text-white">1. How to DM with Zero Prep</h3>
          <p class="text-xs text-slate-300 leading-relaxed">
            Open the VTT in <strong>GM Command Mode</strong> on your laptop. Cast the <strong>Living Room TV Mode</strong> to your TV. Have the kids scan the room code (<code>DRGN</code>) on their tablets—and simply read the highlighted box text aloud!
          </p>
        </div>
        <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <span class="text-2xl">🎲</span>
          <h3 class="font-bold text-sm text-white">2. Real Dice + Tablet Magic</h3>
          <p class="text-xs text-slate-300 leading-relaxed">
            Hand your kids real plastic dice at the kitchen table! When they tap an Action Card on their tablet, they roll their physical die on the table and tap the number they got for instant sound effects and story outcomes.
          </p>
        </div>
        <div class="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <span class="text-2xl">⚖️</span>
          <h3 class="font-bold text-sm text-white">3. Sibling Spotlight & Bedtime Freeze</h3>
          <p class="text-xs text-slate-300 leading-relaxed">
            Our AI tracks how many turns each child takes and whispers custom hooks so quieter siblings get the spotlight. Need to stop for bedtime? Hit <strong>Pause for Bedtime</strong> to freeze everything and generate next week's storybook recap!
          </p>
        </div>
      </div>
    </section>

    <!-- 3. Physical Mailout Kits & Print-on-Demand Storefront -->
    <section class="space-y-3">
      <div class="flex items-center justify-between">
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
          <div class="p-5 rounded-2xl bg-slate-900 border border-emerald-500/30 flex flex-col justify-between gap-4">
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
            <button onclick="alert('Order staged in Print-on-Demand queue for: ${pkg.title}')" class="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs">
              📦 Stage Physical Mailout Order
            </button>
          </div>
        `
        ).join("")}
      </div>
    </section>
  </main>

  <footer class="border-t border-slate-800 px-6 py-4 text-center text-[11px] text-slate-500 max-w-5xl mx-auto">
    ${SRD_51_CC_BY_40_ATTRIBUTION}
  </footer>
</body>
</html>`;
}

function renderPrintableKitHtml(): string {
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

const server = http.createServer(async (req, res) => {
  if (req.url === "/" && req.method === "GET") {
    const rtxStatus = await probeRtx3080Health();
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderAdminHtml(rtxStatus));
    return;
  }

  if (req.url === "/printable-kit" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderPrintableKitHtml());
    return;
  }

  if (req.url === "/api/health" && req.method === "GET") {
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

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: false, error: "Route not found" }));
});

if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[quest-admin] Storefront, Guides & Print-on-Demand Portal listening on http://0.0.0.0:${PORT}`);
  });
}

export { server };

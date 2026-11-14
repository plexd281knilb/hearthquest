import { RoomSessionState, getBuildMetadata } from "@hearthquest/shared-types";

export function renderVttAppHtml(initialState: RoomSessionState): string {
  const serialized = JSON.stringify(initialState).replace(/</g, "\\u003c");
  const buildMeta = getBuildMetadata();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>HearthQuest VTT — Room ${initialState.roomCode}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      background: radial-gradient(circle at top, #1e1b4b 0%, #090d16 100%);
      color: #f8fafc;
      font-family: system-ui, -apple-system, sans-serif;
      touch-action: manipulation;
    }
    .grid-board {
      display: grid;
      grid-template-columns: repeat(10, minmax(0, 1fr));
      grid-template-rows: repeat(6, minmax(0, 1fr));
      aspect-ratio: 10 / 6;
    }
  </style>
</head>
<body class="min-h-screen flex flex-col">
  <!-- Top Navigation & 3-Screen Mode Switcher -->
  <header class="border-b border-indigo-500/30 bg-slate-950/90 backdrop-blur px-4 py-3 flex flex-wrap items-center justify-between gap-3">
    <div class="flex items-center gap-3">
      <span class="text-2xl">🛡️</span>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="font-bold text-lg tracking-tight text-amber-300">HearthQuest</h1>
          <span id="room-code-badge" class="px-2.5 py-0.5 text-xs font-mono font-bold rounded-full bg-indigo-600 text-white border border-indigo-400">
            ROOM: ${initialState.roomCode}
          </span>
          <span id="build-version-badge" class="px-2.5 py-0.5 text-[11px] font-mono font-bold rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-500/40" title="Build updated ${buildMeta.updatedAt}">
            ${buildMeta.badgeText}
          </span>
          <button onclick="toggleQrJoinModal()" id="btn-qr-join" class="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/50 transition">
            📲 QR Join Modal
          </button>
        </div>
        <p id="campaign-subtitle" class="text-xs text-slate-400">${initialState.campaignTitle}</p>
      </div>
    </div>

    <!-- 3-Screen Ecosystem Switcher -->
    <div class="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-700">
      <button onclick="setDisplayMode('GM_COMMAND')" id="btn-mode-gm" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition">
        👑 GM Command (Parent)
      </button>
      <button onclick="setDisplayMode('TABLE_TV_DISPLAY')" id="btn-mode-tv" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition">
        📺 Living Room TV
      </button>
      <button onclick="setDisplayMode('PLAYER_CONTROLLER')" id="btn-mode-player" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition">
        🎮 Kid Tablet / Phone
      </button>
    </div>

    <!-- Rules Tier & Bedtime Freeze -->
    <div class="flex items-center gap-2">
      <select id="select-rules-tier" onchange="changeRoomSettings()" class="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-200">
        <option value="STORYBOOK_D6">🧸 Storybook (Ages 5-8 • d6)</option>
        <option value="APPRENTICE_5E_LITE">⚔️ Apprentice (Ages 8-12 • 5e Lite)</option>
        <option value="STANDARD_5E">🐉 Standard 5e (Teens & Adults)</option>
      </select>
      <select id="select-content-rating" onchange="changeRoomSettings()" class="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300">
        <option value="COZY_G">🌈 Cozy G-Rated (Zero Gore)</option>
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

  <!-- Main Workspace Container -->
  <main class="flex-1 p-4 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4">
    <!-- Left / Center Column: Interactive Tabletop Grid Map (Shown in GM & TV modes, compact in Player mode) -->
    <section id="map-column" class="lg:col-span-8 flex flex-col gap-4">
      <div class="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 shadow-2xl">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 id="active-scene-title" class="text-base font-bold text-amber-300"></h2>
            <p class="text-xs text-slate-400">Tap any square or use the Touch D-Pad to move your hero token across the grid.</p>
          </div>
          <!-- Jackbox-Style Room Join Pill for TV Mode -->
          <div class="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-amber-500/40">
            <span class="text-xs text-slate-300">📱 Kids Join on Tablet/Phone:</span>
            <span class="font-mono font-extrabold text-sm text-amber-400">${initialState.roomCode}</span>
          </div>
        </div>

        <!-- 10x6 Interactive Tabletop Grid -->
        <div id="vtt-grid" class="grid-board w-full rounded-xl overflow-hidden border-2 border-amber-500/40 bg-slate-950 relative select-none"></div>

        <!-- Zone Fog-of-War Controls (GM Only) -->
        <div id="gm-zone-controls" class="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs font-semibold text-slate-400">🗺️ GM Room Fog of War Reveal:</span>
            <div id="zone-buttons" class="flex flex-wrap gap-2"></div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <select id="campaign-select" onchange="switchCampaign(this.value)" class="bg-slate-950 border border-indigo-500/40 rounded-lg px-2 py-1 text-xs text-amber-200">
              <option value="camp-goblin-bakery">🧁 The Great Goblin Bakery Heist</option>
              <option value="camp-clockwork-treehouse">⚙️ The Clockwork Treehouse Mystery</option>
              <option value="camp-starlight-otter">🦦 Voyage of the Starlight Otter</option>
            </select>
            <button onclick="regenerateProceduralMap()" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white">
              🎲 New Procedural Map
            </button>
          </div>
        </div>
      </div>

      <!-- GM Story Branching & Read-Aloud Box Text Panel (GM Only) -->
      <div id="gm-story-panel" class="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-4">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h3 class="text-sm font-bold text-indigo-300">📖 Zero-Prep Read-Aloud Box Text (Pick Your Tone)</h3>
          <div class="flex flex-wrap gap-1 items-center">
            <button onclick="setReadAloudTone('COZY_SILLY')" id="tone-cozy" class="px-2.5 py-1 rounded text-xs font-semibold bg-amber-500 text-slate-950">😂 Cozy & Silly</button>
            <button onclick="setReadAloudTone('ACTION_HEROIC')" id="tone-action" class="px-2.5 py-1 rounded text-xs font-semibold bg-slate-800 text-slate-300">⚔️ Action Heroic</button>
            <button onclick="setReadAloudTone('MYSTERY_ATMOSPHERIC')" id="tone-mystery" class="px-2.5 py-1 rounded text-xs font-semibold bg-slate-800 text-slate-300">🕯️ Mystery</button>
            <button onclick="speakReadAloudText()" id="btn-read-aloud-tts" class="px-2.5 py-1 rounded text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50 transition">
              🔊 Read Aloud (Voice TTS)
            </button>
          </div>
        </div>
        <blockquote id="read-aloud-box" class="p-3.5 rounded-xl bg-slate-950 border-l-4 border-amber-400 text-sm text-amber-100 italic leading-relaxed"></blockquote>

        <div class="mt-3">
          <p class="text-xs font-semibold text-slate-400 mb-2">🔀 Branching Story Choices (Tap what the kids decide to do):</p>
          <div id="branch-choices" class="grid grid-cols-1 sm:grid-cols-2 gap-2"></div>
        </div>
      </div>
    </section>

    <!-- Right Column: Context-Aware Panel (GM Co-Pilot Sidebar OR Kid Tablet Action Controller) -->
    <aside id="side-column" class="lg:col-span-4 flex flex-col gap-4">
      <!-- PANEL A: GM AI Co-Pilot & Sibling Spotlight Tracker -->
      <div id="gm-copilot-panel" class="bg-slate-900/90 border border-purple-500/40 rounded-2xl p-4 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-purple-300 flex items-center gap-1.5">
            <span>🤖</span> AI GM Co-Pilot Whisper
          </h3>
          <span class="text-[11px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700">
            RTX 3080 + Failover Ready
          </span>
        </div>

        <p class="text-xs text-slate-400">
          Kids trying something wild? Type what they asked or hit the emergency button:
        </p>

        <div class="flex gap-2">
          <input id="gm-improv-input" type="text" placeholder="e.g. Can we feed the goblin our cookie?" class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
          <button onclick="askAiCoPilot()" class="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold whitespace-nowrap">
            ✨ Help Me GM!
          </button>
        </div>

        <div id="copilot-response-box" class="p-3 rounded-xl bg-slate-950/90 border border-purple-500/30 text-xs space-y-2">
          <p class="text-purple-200 font-semibold">💡 GM Tip for this Scene:</p>
          <p id="copilot-whisper-text" class="text-slate-300"></p>
        </div>

        <!-- Sibling Spotlight Fairness Meter -->
        <div class="pt-2 border-t border-slate-800">
          <h4 class="text-xs font-bold text-amber-300 mb-2">⚖️ Sibling Spotlight Fairness Tracker</h4>
          <div id="spotlight-list" class="space-y-1.5"></div>
        </div>
      </div>

      <!-- PANEL B: Kid Tablet / Phone Controller (Hero Picker, Touch D-Pad & Action Cards) -->
      <div id="player-controller-panel" class="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-4 flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-amber-300">🎮 Kid Hero Controller</h3>
          <button onclick="toggleHeroCreatorModal()" class="text-xs px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
            + 5-Min Hero Creator
          </button>
        </div>

        <!-- Select Active Hero on This Tablet/Phone -->
        <div>
          <label class="text-xs text-slate-400 block mb-1">Tap Your Hero:</label>
          <div id="hero-selector-tabs" class="grid grid-cols-2 gap-2"></div>
        </div>

        <!-- Selected Hero Card & Touch D-Pad -->
        <div id="active-hero-sheet" class="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-3"></div>

        <!-- Big Color-Coded Action Cards -->
        <div>
          <h4 class="text-xs font-bold text-slate-300 mb-2">🃏 Tap an Action Card to Roll Dice:</h4>
          <div id="hero-action-cards" class="space-y-2"></div>
        </div>
      </div>

      <!-- Live Family Dice Roll Feed -->
      <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
        <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">🎲 Live Table Dice Log</h3>
        <div id="dice-log-list" class="space-y-2 max-h-48 overflow-y-auto"></div>
      </div>
    </aside>
  </main>

  <!-- HYBRID REAL DICE vs. DIGITAL DICE MODAL -->
  <div id="dice-modal" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-slate-900 border-2 border-amber-400 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
      <div class="flex items-center justify-between">
        <h3 id="dice-modal-title" class="text-lg font-extrabold text-amber-300"></h3>
        <button onclick="closeDiceModal()" class="text-slate-400 hover:text-white text-sm">✕</button>
      </div>
      <p id="dice-modal-desc" class="text-xs text-slate-300"></p>

      <!-- Option 1: Roll Digital 3D Die -->
      <button onclick="triggerDigitalRoll()" class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-sm shadow-lg">
        📱 Roll Digital 3D Dice Now!
      </button>

      <!-- Option 2: Roll Real Physical Dice on the Table -->
      <div class="pt-3 border-t border-slate-800">
        <p id="physical-dice-prompt" class="text-xs font-bold text-emerald-300 mb-2 text-center">
          🎲 Or roll your REAL physical die on the table & tap what you got:
        </p>
        <div id="physical-dice-buttons" class="grid grid-cols-5 gap-1.5"></div>
      </div>
    </div>
  </div>

  <!-- 5-MINUTE VISUAL HERO CREATOR MODAL -->
  <div id="hero-creator-modal" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-slate-900 border-2 border-emerald-400 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-extrabold text-emerald-300">✨ 5-Minute Kid Hero Creator</h3>
        <button onclick="toggleHeroCreatorModal()" class="text-slate-400 hover:text-white text-sm">✕</button>
      </div>
      <div class="space-y-2 text-xs">
        <label class="block text-slate-300">Kid's First Name & Age:</label>
        <div class="flex gap-2">
          <input id="new-hero-player" type="text" placeholder="e.g. Sam" class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white" />
          <input id="new-hero-age" type="number" value="8" class="w-20 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white" />
        </div>
        <label class="block text-slate-300">Hero Name:</label>
        <input id="new-hero-name" type="text" placeholder="e.g. Captain Bramble" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white" />
        <label class="block text-slate-300">Choose Your Hero Style:</label>
        <select id="new-hero-archetype" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white">
          <option value="🏹|Forest Ranger">🏹 Forest Ranger</option>
          <option value="🗡️|Sneaky Ninja Rogue">🗡️ Sneaky Ninja Rogue</option>
          <option value="🎵|Musical Bard">🎵 Musical Bard</option>
          <option value="🐻|Druid Shapeshifter">🐻 Druid Shapeshifter</option>
        </select>
        <label class="block text-slate-300">Choose Your Pet Companion:</label>
        <input id="new-hero-pet" type="text" placeholder="e.g. Marshmallow the Baby Dragon" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white" />
      </div>
      <button onclick="createNewHero()" class="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm">
        🚀 Join the Adventure!
      </button>
    </div>
  </div>

  <!-- QR JOIN MODAL -->
  <div id="qr-join-modal" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-slate-900 border-2 border-amber-400 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-extrabold text-amber-300">📲 Scan to Join Room ${initialState.roomCode}</h3>
        <button onclick="toggleQrJoinModal()" class="text-slate-400 hover:text-white text-sm">✕</button>
      </div>
      <p class="text-xs text-slate-300">
        Kids & family members can scan this QR badge or tap the link to open the Kid Tablet Controller:
      </p>
      <div class="flex justify-center">
        <img src="/api/room/qr?room=${initialState.roomCode}" alt="QR Code for Room ${initialState.roomCode}" class="rounded-2xl shadow-lg border border-amber-500/40" />
      </div>
      <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
        <div class="text-xs text-slate-400">4-Letter Room Code:</div>
        <div class="text-2xl font-mono font-extrabold text-amber-400 tracking-widest">${initialState.roomCode}</div>
        <a href="/?room=${initialState.roomCode}&mode=kid" class="inline-block mt-2 text-xs font-bold text-emerald-300 hover:underline">
          🔗 Open Direct Kid Tablet Link (/?room=${initialState.roomCode}&mode=kid)
        </a>
      </div>
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
    let activeTone = "COZY_SILLY";
    let selectedHeroId = state.heroes[0]?.id || "";
    let pendingCardId = "";

    function toggleQrJoinModal() {
      document.getElementById("qr-join-modal").classList.toggle("hidden");
    }

    function speakReadAloudText() {
      const textEl = document.getElementById("read-aloud-box");
      const text = textEl ? textEl.innerText : "";
      if (!text) return;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.98;
        utterance.pitch = activeTone === "COZY_SILLY" ? 1.1 : activeTone === "MYSTERY_ATMOSPHERIC" ? 0.9 : 1.0;
        window.speechSynthesis.speak(utterance);
      }
    }

    function setDisplayMode(mode) {
      displayMode = mode;
      renderAll();
    }

    function setReadAloudTone(tone) {
      activeTone = tone;
      renderAll();
    }

    async function apiPost(path, payload) {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode: state.roomCode, ...payload })
      });
      const data = await res.json();
      if (data.room) {
        state = data.room;
        renderAll();
      }
      return data;
    }

    function moveSelectedHero(dx, dy) {
      const token = state.tokens.find(t => t.characterId === selectedHeroId) || state.tokens[0];
      if (!token) return;
      apiPost("/api/room/move-token", { tokenId: token.id, deltaX: dx, deltaY: dy });
    }

    function moveTokenToCell(gx, gy) {
      const token = state.tokens.find(t => t.characterId === selectedHeroId) || state.tokens[0];
      if (!token) return;
      apiPost("/api/room/move-token", { tokenId: token.id, targetX: gx, targetY: gy });
    }

    function toggleZone(zoneId) {
      apiPost("/api/room/toggle-zone", { zoneId });
    }

    function chooseBranch(targetNodeId, consequenceTag) {
      apiPost("/api/room/advance-story", { targetNodeId, consequenceTag });
    }

    function changeRoomSettings() {
      const rulesTier = document.getElementById("select-rules-tier").value;
      const contentRating = document.getElementById("select-content-rating").value;
      apiPost("/api/room/settings", { rulesTier, contentRating });
    }

    function toggleBedtime() {
      apiPost("/api/room/bedtime", {});
    }

    async function askAiCoPilot() {
      const input = document.getElementById("gm-improv-input");
      const question = input.value || "What happens next?";
      const res = await apiPost("/api/room/copilot", { question });
      if (res.whisper) {
        document.getElementById("copilot-whisper-text").innerText =
          res.whisper.readAloudOptions.cozySilly + "\\n\\n🎲 Rule Check: " + res.whisper.ruleGuidance;
      }
    }

    function openDiceModal(cardId) {
      pendingCardId = cardId;
      const hero = state.heroes.find(h => h.id === selectedHeroId) || state.heroes[0];
      const card = hero?.actionCards.find(c => c.id === cardId);
      if (!card) return;

      const isStorybook = state.rulesTier === "STORYBOOK_D6";
      const dieFaces = isStorybook ? 6 : 20;
      document.getElementById("dice-modal-title").innerText = card.icon + " " + card.title;
      document.getElementById("dice-modal-desc").innerText = card.description;
      document.getElementById("physical-dice-prompt").innerText =
        "🎲 Or roll your REAL physical d" + dieFaces + " on the table & tap what you got:";

      const btnContainer = document.getElementById("physical-dice-buttons");
      btnContainer.innerHTML = "";
      for (let i = 1; i <= dieFaces; i++) {
        const b = document.createElement("button");
        b.className = "py-2 rounded-xl bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 font-bold text-xs border border-slate-700 transition";
        b.innerText = String(i);
        b.onclick = () => submitRoll("PHYSICAL_DICE_TABLE", i);
        btnContainer.appendChild(b);
      }

      document.getElementById("dice-modal").classList.remove("hidden");
    }

    function closeDiceModal() {
      document.getElementById("dice-modal").classList.add("hidden");
    }

    async function triggerDigitalRoll() {
      await submitRoll("DIGITAL_3D_ROLLER");
    }

    async function submitRoll(source, physicalRollValue) {
      closeDiceModal();
      await apiPost("/api/room/roll", {
        characterId: selectedHeroId,
        cardId: pendingCardId,
        source,
        physicalRollValue
      });
    }

    function toggleHeroCreatorModal() {
      document.getElementById("hero-creator-modal").classList.toggle("hidden");
    }

    async function switchCampaign(campaignId) {
      await apiPost("/api/room/switch-campaign", { roomCode: state.roomCode, campaignId });
    }

    async function regenerateProceduralMap() {
      await apiPost("/api/room/procedural-map", { roomCode: state.roomCode });
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

    function renderAll() {
      // Mode buttons
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
          el.className = "px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white";
        }
      }

      document.getElementById("select-rules-tier").value = state.rulesTier;
      document.getElementById("select-content-rating").value = state.contentRating;

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
      document.getElementById("gm-zone-controls").style.display =
        displayMode === "GM_COMMAND" ? "flex" : "none";
      document.getElementById("gm-story-panel").style.display =
        displayMode === "GM_COMMAND" ? "block" : "none";
      document.getElementById("gm-copilot-panel").style.display =
        displayMode === "GM_COMMAND" ? "flex" : "none";

      // Active story node
      const activeNode =
        state.storyNodes.find(n => n.id === state.activeNodeId) || state.storyNodes[0];
      document.getElementById("active-scene-title").innerText = activeNode.title;
      document.getElementById("read-aloud-box").innerText =
        activeNode.readAloudByTone[activeTone] || activeNode.readAloudByTone.COZY_SILLY;

      const whisperDefault = activeNode.gmWhisperTips.join(" • ");
      const whisperEl = document.getElementById("copilot-whisper-text");
      if (!whisperEl.innerText) {
        whisperEl.innerText = whisperDefault;
      }

      // Render Grid Cells (10x6)
      const gridEl = document.getElementById("vtt-grid");
      gridEl.innerHTML = "";
      for (let y = 0; y < state.gridRows; y++) {
        for (let x = 0; x < state.gridCols; x++) {
          const zone = state.zones.find(
            z => x >= z.gridX && x < z.gridX + z.width && y >= z.gridY && y < z.gridY + z.height
          );
          const isFogged = zone && !zone.isRevealed && displayMode !== "GM_COMMAND";
          const cell = document.createElement("div");
          cell.onclick = () => moveTokenToCell(x, y);
          cell.className =
            "border border-slate-800/70 relative flex items-center justify-center cursor-pointer transition " +
            (isFogged
              ? "bg-slate-950"
              : zone && !zone.isRevealed
              ? "bg-slate-900/60"
              : "bg-indigo-950/30 hover:bg-indigo-900/40");

          if (x === zone?.gridX && y === 0) {
            const label = document.createElement("span");
            label.className = "absolute top-1 left-1.5 text-[10px] font-bold text-slate-400 pointer-events-none whitespace-nowrap";
            label.innerText = isFogged ? "🌫️ Unexplored" : zone.name;
            cell.appendChild(label);
          }

          if (displayMode === "GM_COMMAND" && zone?.hasSecretTrap && x === zone.gridX + 1 && y === 2) {
            const trap = document.createElement("span");
            trap.className = "text-[10px] px-1 rounded bg-rose-900/80 text-rose-200 border border-rose-500/40";
            trap.title = zone.trapDescription || "Secret Trap";
            trap.innerText = "⚠️ Trap";
            cell.appendChild(trap);
          }

          if (!isFogged) {
            const cellTokens = state.tokens.filter(
              t => t.gridX === x && t.gridY === y && (!t.isHiddenFromPlayers || displayMode === "GM_COMMAND")
            );
            for (const tok of cellTokens) {
              const badge = document.createElement("div");
              badge.className =
                "w-9 h-9 sm:w-11 sm:h-11 rounded-full flex flex-col items-center justify-center shadow-lg border-2 border-white text-base sm:text-lg font-bold transition transform hover:scale-110";
              badge.style.backgroundColor = tok.color;
              badge.innerHTML = \`<span>\${tok.avatarEmoji}</span><span class="text-[9px] bg-black/75 px-1 rounded text-white leading-none">\${tok.name.split(" ")[0]}</span>\`;
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
            : "bg-slate-950 border-slate-800 text-slate-300");
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
          renderAll();
        };
        t.className =
          "p-2 rounded-xl border text-left transition flex items-center gap-2 " +
          (active
            ? "bg-amber-500/20 border-amber-400 text-white"
            : "bg-slate-950 border-slate-800 text-slate-400");
        t.innerHTML = \`<span class="text-xl">\${h.avatarEmoji}</span><div class="truncate"><div class="text-xs font-bold truncate">\${h.name}</div><div class="text-[10px] text-slate-400">\${h.playerName}</div></div>\`;
        tabsEl.appendChild(t);
      }

      // Active Hero Sheet + Touch D-Pad
      const currentHero = state.heroes.find(h => h.id === selectedHeroId) || state.heroes[0];
      if (currentHero) {
        const sheetEl = document.getElementById("active-hero-sheet");
        const healthDisplay =
          state.rulesTier === "STORYBOOK_D6"
            ? "❤️".repeat(currentHero.storybookStats.hearts) + " (" + currentHero.storybookStats.hearts + "/3 Hearts)"
            : \`❤️ \${currentHero.attributes5e.hp}/\${currentHero.attributes5e.maxHp} HP • 🛡️ AC \${currentHero.attributes5e.armorClass}\`;

        sheetEl.innerHTML = \`
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-bold text-amber-300">\${currentHero.avatarEmoji} \${currentHero.name}</div>
              <div class="text-[11px] text-slate-400">\${currentHero.archetype} • Pet: \${currentHero.companionPet}</div>
            </div>
            <div class="text-xs font-bold text-rose-400">\${healthDisplay}</div>
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-slate-800">
            <span class="text-xs text-slate-400">🕹️ Touch Move Token:</span>
            <div class="flex gap-1.5">
              <button onclick="moveSelectedHero(-1, 0)" class="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold">⬅️</button>
              <button onclick="moveSelectedHero(0, -1)" class="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold">⬆️</button>
              <button onclick="moveSelectedHero(0, 1)" class="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold">⬇️</button>
              <button onclick="moveSelectedHero(1, 0)" class="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold">➡️</button>
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
            "w-full p-3 rounded-xl bg-gradient-to-r from-slate-950 to-slate-900 hover:from-indigo-950 hover:to-slate-900 border border-amber-500/40 text-left transition flex items-center justify-between";
          cardBtn.innerHTML = \`
            <div class="flex items-center gap-2.5">
              <span class="text-2xl">\${c.icon}</span>
              <div>
                <div class="text-xs font-extrabold text-amber-300">\${c.title}</div>
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

    // Real-time Server-Sent Events subscription
    const evtSource = new EventSource("/api/room/stream?roomCode=" + state.roomCode);
    evtSource.onmessage = (event) => {
      try {
        const updated = JSON.parse(event.data);
        if (updated && updated.roomCode) {
          state = updated;
          renderAll();
        }
      } catch {}
    };

    renderAll();
  </script>
</body>
</html>`;
}

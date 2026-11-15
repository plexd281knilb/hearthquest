import { RoomSessionState, getBuildMetadata } from "@hearthquest/shared-types";
import { HEARTHQUEST_SKILLS } from "@hearthquest/srd-rules";
import {
  renderAtmosphereControlsHtml,
  renderCombatAndAmbientAudioScript,
  renderCombatInitiativeBarHtml,
} from "./combat-audio-engine";
import { renderDice3DEngineScript, renderDice3DOverlayHtml } from "./dice-3d-engine";
import { renderLighting2DEngineScript, renderLightingControlsHtml } from "./lighting-engine";
import { renderTabletopToolsControlsHtml, renderToolsAndWeatherEngineScript } from "./tools-weather-engine";
import { renderTokenForgeClientScript, renderTokenForgeModalHtml } from "./token-forge-engine";

export function renderVttAppHtml(initialState: RoomSessionState): string {
  const serialized = JSON.stringify(initialState).replace(/</g, "\\u003c");
  const buildMeta = getBuildMetadata();

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
    body[data-theme="light"] h3 {
      color: #92400e !important;
    }
    body[data-theme="light"] .text-slate-400 {
      color: #78716c !important;
    }
    body[data-theme="light"] .text-slate-300 {
      color: #44403c !important;
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

    /* Themed Battlemap Backgrounds */
    .bg-bakery {
      background-image: url('/assets/tiles/tile-bakery-floor.svg');
      background-size: 80px 80px;
      background-repeat: repeat;
    }
    .bg-treehouse {
      background-image: url('/assets/tiles/tile-treehouse-wood.svg');
      background-size: 80px 80px;
      background-repeat: repeat;
    }
    .bg-starlight {
      background-image: url('/assets/tiles/tile-starlight-deck.svg');
      background-size: 80px 80px;
      background-repeat: repeat;
    }

    body[data-theme="light"] .bg-bakery {
      background-image: url('/assets/tiles/tile-bakery-floor.svg');
      background-size: 80px 80px;
      background-repeat: repeat;
      filter: brightness(1.22) contrast(0.92);
    }
    body[data-theme="light"] .bg-treehouse {
      background-image: url('/assets/tiles/tile-treehouse-wood.svg');
      background-size: 80px 80px;
      background-repeat: repeat;
      filter: brightness(1.22) contrast(0.92);
    }
    body[data-theme="light"] .bg-starlight {
      background-image: url('/assets/tiles/tile-starlight-deck.svg');
      background-size: 80px 80px;
      background-repeat: repeat;
      filter: brightness(1.28) contrast(0.9);
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

      <!-- Audio Mute / Unmute Toggle -->
      <button onclick="toggleAudioMute()" id="btn-audio-toggle" class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-600 transition flex items-center gap-1.5" title="Toggle Sound Effects">
        🔊 Sound: ON
      </button>

      <select id="select-rules-tier" onchange="changeRoomSettings()" class="theme-input border rounded-lg px-2 py-1.5 text-xs text-amber-300">
        <option value="STORYBOOK_D6">🧸 Storybook (d6)</option>
        <option value="APPRENTICE_5E_LITE">⚔️ Apprentice (5e Lite)</option>
        <option value="STANDARD_5E">🐉 Standard 5e</option>
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
    <!-- Left / Center Column: Interactive Tabletop Grid Map -->
    <section id="map-column" class="lg:col-span-8 flex flex-col gap-4">
      ${renderCombatInitiativeBarHtml()}
      <div class="theme-card rounded-2xl p-4 shadow-2xl border">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 id="active-scene-title" class="text-base font-bold text-amber-400"></h2>
            <p class="text-xs text-slate-400">Tap any square or use the Touch D-Pad to move your hero token across the grid.</p>
          </div>
          <!-- Jackbox-Style Room Join Pill for TV Mode -->
          <div class="flex items-center gap-2 theme-inner-box px-3 py-1.5 rounded-xl border">
            <span class="text-xs text-slate-400">📱 Kids Join:</span>
            <span class="font-mono font-extrabold text-sm text-amber-400">${initialState.roomCode}</span>
          </div>
        </div>

        <!-- 10x6 Interactive Tabletop Grid + Scenic Backdrop + 2D Raycast Lighting + Ruler/Templates/Weather Canvas -->
        <div id="vtt-grid-wrapper" class="relative w-full rounded-xl overflow-hidden shadow-inner">
          <img id="vtt-scene-backdrop" src="/assets/backgrounds/backdrop-hearth-tavern.svg" alt="Scene Backdrop" class="hidden absolute inset-0 w-full h-full object-cover opacity-35 pointer-events-none z-0 transition-opacity duration-500" />
          <div id="vtt-grid" class="grid-board w-full rounded-xl overflow-hidden border-2 border-amber-500/50 bg-bakery relative z-10 select-none"></div>
          <canvas id="vtt-lighting-canvas" class="absolute inset-0 w-full h-full pointer-events-none z-20 rounded-xl"></canvas>
          <canvas id="vtt-tools-canvas" style="touch-action: none;" class="absolute inset-0 w-full h-full pointer-events-none z-30 rounded-xl"></canvas>
        </div>

        <!-- Zone Fog-of-War, Dynamic Lighting, Ruler/Templates & Unraid Custom Tokens (GM Only) -->
        <div id="gm-zone-controls" class="mt-3 pt-3 border-t border-slate-700/50 flex flex-col gap-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs font-semibold text-slate-400">🗺️ Fog of War Reveal:</span>
              <div id="zone-buttons" class="flex flex-wrap gap-2"></div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <select id="campaign-select" onchange="switchCampaign(this.value)" class="theme-input border rounded-lg px-2 py-1 text-xs text-amber-300">
                <option value="camp-goblin-bakery">🧁 The Goblin Bakery Heist</option>
                <option value="camp-clockwork-treehouse">⚙️ The Clockwork Treehouse</option>
                <option value="camp-starlight-otter">🦦 Voyage of the Starlight Otter</option>
              </select>
              <button onclick="regenerateProceduralMap()" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm">
                🎲 New Procedural Map
              </button>
            </div>
          </div>
          ${renderLightingControlsHtml()}
          ${renderTabletopToolsControlsHtml()}
          ${renderAtmosphereControlsHtml()}
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
          </div>
        </div>
        <blockquote id="read-aloud-box" class="p-3.5 rounded-xl theme-inner-box border-l-4 border-amber-400 text-sm text-amber-200 italic leading-relaxed"></blockquote>

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

        <!-- Selected Hero Card & Touch D-Pad -->
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
        <h3 class="text-lg font-extrabold text-amber-400">📲 Scan to Join Room ${initialState.roomCode}</h3>
        <button onclick="toggleQrJoinModal()" class="text-slate-400 hover:text-white text-sm">✕</button>
      </div>
      <p class="text-xs text-slate-300">
        Kids & family members can scan this QR badge or tap the link to open the Kid Tablet Controller:
      </p>
      <div class="flex justify-center">
        <img src="/api/room/qr?room=${initialState.roomCode}" alt="QR Code for Room ${initialState.roomCode}" class="rounded-2xl shadow-lg border border-amber-500/40" />
      </div>
      <div class="p-3 rounded-xl theme-inner-box border space-y-1">
        <div class="text-xs text-slate-400">4-Letter Room Code:</div>
        <div class="text-2xl font-mono font-extrabold text-amber-400 tracking-widest">${initialState.roomCode}</div>
        <a href="/?room=${initialState.roomCode}&mode=kid" class="inline-block mt-2 text-xs font-bold text-emerald-400 hover:underline">
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

    let selectedHeroId = state.heroes[0]?.id || "";
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
      btn.innerText = AudioEngine.muted ? "🔇 Sound: OFF" : "🔊 Sound: ON";
      btn.className = AudioEngine.muted
        ? "px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700"
        : "px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-emerald-300 border border-slate-600";
      if (AudioEngine.muted) {
        AmbientAudioEngine.stop();
      } else if (state.ambientSoundscape && state.ambientSoundscape !== "SILENT") {
        AmbientAudioEngine.start(state.ambientSoundscape, true);
      }
    }

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
    async function apiPost(url, data) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
        const json = await res.json();
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

    async function toggleMapDoor(toggleDoorId) {
      await apiPost("/api/room/lighting", {
        roomCode: state.roomCode,
        toggleDoorId
      });
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

    function speakReadAloudText() {
      const activeNode = state.storyNodes.find(n => n.id === state.activeNodeId) || state.storyNodes[0];
      const textToSpeak = activeNode?.readAloudByTone[activeTone] || activeNode?.readAloudByTone.COZY_SILLY || "";
      if ("speechSynthesis" in window && textToSpeak) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.rate = 0.95;
        utterance.pitch = 1.05;
        window.speechSynthesis.speak(utterance);
      }
    }

    async function moveTokenToCell(x, y) {
      const heroTok = state.tokens.find(t => t.characterId === selectedHeroId) || state.tokens[0];
      if (!heroTok) return;

      // Check if moving onto a loot chest
      const chestTok = state.tokens.find(t => t.gridX === x && t.gridY === y && t.isLootChest && !t.isChestOpened);
      if (chestTok) {
        await openLootChest(chestTok.id);
      }

      await apiPost("/api/room/move-token", {
        roomCode: state.roomCode,
        tokenId: heroTok.id,
        targetX: x,
        targetY: y
      });
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
      const heroTok = state.tokens.find(t => t.characterId === selectedHeroId) || state.tokens[0];
      if (!heroTok) return;
      const targetX = Math.max(0, Math.min(state.gridCols - 1, heroTok.gridX + dx));
      const targetY = Math.max(0, Math.min(state.gridRows - 1, heroTok.gridY + dy));
      await moveTokenToCell(targetX, targetY);
    }

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

    async function changeRoomSettings() {
      const rulesTier = document.getElementById("select-rules-tier").value;
      const contentRating = document.getElementById("select-content-rating").value;
      await apiPost("/api/room/settings", {
        roomCode: state.roomCode,
        rulesTier,
        contentRating
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

    function toggleQrJoinModal() {
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

      const whisperDefault = activeNode.gmWhisperTips.join(" • ");
      const whisperEl = document.getElementById("copilot-whisper-text");
      if (!whisperEl.innerText) {
        whisperEl.innerText = whisperDefault;
      }

      // Render Grid Cells (10x6)
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
            "border border-slate-700/40 relative flex items-center justify-center cursor-pointer transition " +
            (isFogged
              ? "bg-slate-950/90"
              : zone && !zone.isRevealed
              ? "bg-slate-900/60"
              : "hover:bg-amber-500/10");

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
              const activeCombatEntry = state.combat && state.combat.isActive
                ? state.combat.entries[state.combat.activeTurnIndex]
                : null;
              const isTurnActive = activeCombatEntry && activeCombatEntry.tokenId === tok.id;
              const badge = document.createElement("div");
              badge.className =
                "token-standee w-9 h-9 sm:w-11 sm:h-11 rounded-full flex flex-col items-center justify-center shadow-lg border-2 border-white text-base sm:text-lg font-bold select-none" +
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

              // Click to inspect or open chest
              badge.onclick = (e) => {
                e.stopPropagation();
                if (tok.isLootChest && !tok.isChestOpened) {
                  openLootChest(tok.id);
                } else if (tok.characterId) {
                  selectedHeroId = tok.characterId;
                  openHeroSheetModal();
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
          gridEl.style.opacity = "0.84";
        } else {
          backdropEl.classList.add("hidden");
          gridEl.style.opacity = "1";
        }
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

      const doorBtns = document.getElementById("door-toggle-buttons");
      if (doorBtns) {
        doorBtns.innerHTML = "";
        const doors = (state.walls || []).filter(w => w.isDoor);
        doors.forEach((d, idx) => {
          const db = document.createElement("button");
          db.onclick = () => toggleMapDoor(d.id);
          db.className =
            "px-2.5 py-1 rounded-lg text-xs font-semibold border transition " +
            (d.isOpen
              ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-300"
              : "bg-amber-950/70 border-amber-500/50 text-amber-300");
          db.innerText = d.isOpen ? \`🚪 Door #\${idx + 1}: Open\` : \`🔒 Door #\${idx + 1}: Closed\`;
          doorBtns.appendChild(db);
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

      // Active Hero Sheet + Touch D-Pad
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
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              \${headerPortrait}
              <div>
                <div class="text-sm font-bold text-amber-400">\${currentHero.name}</div>
                <div class="text-[11px] text-slate-400">\${currentHero.archetype} • Pet: \${currentHero.companionPet}</div>
              </div>
            </div>
            <div class="text-xs font-bold text-rose-400">\${healthDisplay}</div>
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-slate-700/50">
            <span class="text-xs text-slate-400">🕹️ Touch D-Pad:</span>
            <div class="flex gap-1.5">
              <button onclick="moveSelectedHero(-1, 0)" class="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-white">⬅️</button>
              <button onclick="moveSelectedHero(0, -1)" class="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-white">⬆️</button>
              <button onclick="moveSelectedHero(0, 1)" class="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-white">⬇️</button>
              <button onclick="moveSelectedHero(1, 0)" class="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-white">➡️</button>
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

    // Real-time Server-Sent Events subscription
    const evtSource = new EventSource("/api/room/stream?roomCode=" + state.roomCode);
    evtSource.onmessage = (event) => {
      try {
        const updated = JSON.parse(event.data);
        if (updated && updated.roomCode) {
          state = updated;
          renderAll();
          const latestRoll = state.rollHistory && state.rollHistory[0];
          if (latestRoll && latestRoll.source === "DIGITAL_3D_ROLLER" && latestRoll.id !== lastAnimatedRollId) {
            animateRollIn3D(latestRoll);
          }
        }
      } catch {}
    };

    renderAll();
    refreshCustomTokens();
  </script>
</body>
</html>`;
}

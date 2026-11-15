/**
 * HearthQuest Foundry-Style Combat Initiative Tracker & Procedural Ambient Soundscape Engine
 */

export function renderCombatInitiativeBarHtml(): string {
  return `
  <div id="combat-tracker-bar" class="theme-card border rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
    <div class="flex items-center gap-2 shrink-0">
      <span class="text-xs font-extrabold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
        <span>⚔️</span> Turn Tracker
      </span>
      <span id="combat-round-badge" class="hidden text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-500 border border-rose-500/40">
        Round 1
      </span>
    </div>
    <div id="combat-entries-list" class="flex-1 flex items-center gap-2 overflow-x-auto py-0.5 min-h-[36px]">
      <span class="text-xs text-slate-400 italic">Peaceful exploration — press Roll Initiative to begin a turn-based encounter.</span>
    </div>
    <div class="flex items-center gap-1.5 shrink-0">
      <button onclick="combatAction('ROLL_INITIATIVE')" class="text-xs px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-sm transition">
        🎲 Roll Initiative
      </button>
      <button id="btn-next-turn" onclick="combatAction('NEXT_TURN')" class="hidden text-xs px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-sm transition">
        ⏭️ Next Turn
      </button>
      <button id="btn-end-combat" onclick="combatAction('END_COMBAT')" class="hidden text-xs px-2 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold transition">
        🏁 End
      </button>
    </div>
  </div>`;
}

export function renderAtmosphereControlsHtml(): string {
  return `
  <div class="flex flex-wrap items-center gap-2 text-xs">
    <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl theme-inner-box border">
      <span>🖼️ Backdrop:</span>
      <select id="select-scene-backdrop" onchange="updateAtmosphere()" class="bg-transparent font-bold outline-none cursor-pointer">
        <option value="HEARTH_TAVERN">🔥 Hearth & Bakery</option>
        <option value="ENCHANTED_WOODS">🌲 Enchanted Woods</option>
        <option value="STARLIGHT_OBSERVATORY">🌌 Starlight Observatory</option>
        <option value="NONE">🗺️ Grid Only</option>
      </select>
    </div>
    <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl theme-inner-box border">
      <span>🎶 Soundscape:</span>
      <select id="select-ambient-soundscape" onchange="updateAtmosphere(true)" class="bg-transparent font-bold outline-none cursor-pointer">
        <option value="SILENT">🔇 Silent</option>
        <option value="COZY_TAVERN">🔥 Cozy Tavern Hearth</option>
        <option value="WHISPERING_WOODS">🍃 Whispering Woods</option>
        <option value="GOBLIN_KITCHEN">🍲 Goblin Kitchen</option>
        <option value="CRYSTAL_CAVERN">💎 Crystal Cavern</option>
      </select>
      <input id="ambient-volume-slider" type="range" min="0" max="100" value="35" oninput="AmbientAudioEngine.setVolume(this.value)" class="w-16 accent-amber-500 cursor-pointer" title="Ambient Volume" />
    </div>
  </div>`;
}

export function renderCombatAndAmbientAudioScript(): string {
  return [
    "const AmbientAudioEngine = {",
    "  activeLoopTimer: null,",
    "  masterGain: null,",
    "  currentMode: 'SILENT',",
    "  volume: 0.35,",
    "  ensureMaster() {",
    "    if (typeof AudioEngine === 'undefined' || AudioEngine.muted) return null;",
    "    AudioEngine.init();",
    "    if (!AudioEngine.ctx) return null;",
    "    if (!this.masterGain) {",
    "      this.masterGain = AudioEngine.ctx.createGain();",
    "      this.masterGain.gain.value = this.volume * 0.25;",
    "      this.masterGain.connect(AudioEngine.ctx.destination);",
    "    }",
    "    return AudioEngine.ctx;",
    "  },",
    "  setVolume(val) {",
    "    this.volume = Math.max(0, Math.min(1, Number(val || 35) / 100));",
    "    if (this.masterGain && AudioEngine.ctx) {",
    "      this.masterGain.gain.setTargetAtTime(this.volume * 0.25, AudioEngine.ctx.currentTime, 0.1);",
    "    }",
    "  },",
    "  stop() {",
    "    if (this.activeLoopTimer) {",
    "      clearInterval(this.activeLoopTimer);",
    "      this.activeLoopTimer = null;",
    "    }",
    "    this.currentMode = 'SILENT';",
    "  },",
    "  playAmbientPulse(mode) {",
    "    if (typeof AudioEngine !== 'undefined' && AudioEngine.muted) return;",
    "    var ctx = this.ensureMaster();",
    "    if (!ctx || !this.masterGain) return;",
    "    var now = ctx.currentTime;",
    "    var notes = mode === 'COZY_TAVERN' ? [261.63, 329.63, 392.00]",
    "      : mode === 'WHISPERING_WOODS' ? [349.23, 440.00, 523.25, 659.25]",
    "      : mode === 'GOBLIN_KITCHEN' ? [293.66, 369.99, 440.00, 587.33]",
    "      : [392.00, 523.25, 659.25, 783.99, 1046.50];",
    "    var freq = notes[Math.floor(Math.random() * notes.length)];",
    "    var osc = ctx.createOscillator();",
    "    var g = ctx.createGain();",
    "    osc.type = mode === 'COZY_TAVERN' ? 'triangle' : 'sine';",
    "    osc.frequency.setValueAtTime(freq, now);",
    "    g.gain.setValueAtTime(0.001, now);",
    "    g.gain.linearRampToValueAtTime(mode === 'CRYSTAL_CAVERN' ? 0.18 : 0.12, now + 0.4);",
    "    g.gain.exponentialRampToValueAtTime(0.001, now + 2.1);",
    "    osc.connect(g);",
    "    g.connect(this.masterGain);",
    "    osc.start(now);",
    "    osc.stop(now + 2.2);",
    "  },",
    "  start(mode, forcePlay) {",
    "    if (!mode || mode === 'SILENT') { this.stop(); return; }",
    "    if (this.currentMode === mode && this.activeLoopTimer) return;",
    "    this.stop();",
    "    this.currentMode = mode;",
    "    if (forcePlay) this.playAmbientPulse(mode);",
    "    var self = this;",
    "    this.activeLoopTimer = setInterval(function () {",
    "      self.playAmbientPulse(self.currentMode);",
    "    }, mode === 'GOBLIN_KITCHEN' ? 1400 : 2100);",
    "  }",
    "};",
    "function renderCombatTrackerUI(roomState) {",
    "  var combat = roomState.combat;",
    "  var listEl = document.getElementById('combat-entries-list');",
    "  var roundEl = document.getElementById('combat-round-badge');",
    "  var nextBtn = document.getElementById('btn-next-turn');",
    "  var endBtn = document.getElementById('btn-end-combat');",
    "  if (!listEl) return;",
    "  if (!combat || !combat.isActive || !combat.entries || combat.entries.length === 0) {",
    "    listEl.innerHTML = '<span class=\"text-xs text-slate-400 italic\">Peaceful exploration — press Roll Initiative to start a turn-based encounter.</span>';",
    "    if (roundEl) roundEl.classList.add('hidden');",
    "    if (nextBtn) nextBtn.classList.add('hidden');",
    "    if (endBtn) endBtn.classList.add('hidden');",
    "    return;",
    "  }",
    "  if (roundEl) {",
    "    roundEl.classList.remove('hidden');",
    "    roundEl.innerText = 'Round ' + combat.round;",
    "  }",
    "  if (nextBtn) nextBtn.classList.remove('hidden');",
    "  if (endBtn) endBtn.classList.remove('hidden');",
    "  var html = '';",
    "  for (var i = 0; i < combat.entries.length; i++) {",
    "    var e = combat.entries[i];",
    "    var isActive = i === combat.activeTurnIndex;",
    "    var activeCls = isActive ? 'ring-2 ring-amber-400 bg-amber-500/20 border-amber-400 scale-105' : 'theme-inner-box opacity-85';",
    "    var portrait = e.assetPath ? '<img src=\"' + e.assetPath + '\" class=\"w-5 h-5 rounded-full object-cover\" />' : '<span>' + e.avatarEmoji + '</span>';",
    "    html += '<div class=\"px-2.5 py-1 rounded-xl border text-xs flex items-center gap-1.5 shrink-0 transition ' + activeCls + '\">' +",
    "      portrait +",
    "      '<span class=\"font-bold\">' + e.name + '</span>' +",
    "      '<span class=\"px-1.5 py-0.5 rounded bg-black/20 font-mono text-[10px]\">' + e.initiative + '</span>' +",
    "      '</div>';",
    "  }",
    "  listEl.innerHTML = html;",
    "}",
  ].join("\n");
}

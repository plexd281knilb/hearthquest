/**
 * HearthQuest Foundry-Style Combat Initiative Tracker & Procedural Ambient Soundscape Engine
 */

export function renderCombatInitiativeBarHtml(): string {
  return `
  <div id="combat-tracker-bar" class="theme-card border rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2.5">
    <div class="flex items-center gap-2 shrink-0 flex-wrap">
      <span class="text-xs font-extrabold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
        <span>⚔️</span> Turn Order
      </span>
      <span id="combat-round-badge" class="hidden text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40">
        Round 1
      </span>
      <span id="combat-move-left-badge" class="hidden text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
        🏃 30/30 ft
      </span>
      <button id="btn-toggle-turn-lock" type="button" onclick="combatAction('TOGGLE_TURN_MOVEMENT')" title="DM Switch: When ON, only the active turn hero can move and is capped to their Move Speed per turn" class="text-[11px] px-2 py-0.5 rounded-full border font-bold transition bg-amber-500/20 text-amber-300 border-amber-400/50">
        🔒 Turn Lock: ON
      </button>
    </div>
    <div id="combat-entries-list" class="flex-1 flex items-center gap-2 overflow-x-auto py-0.5 min-h-[38px]">
      <span class="text-xs text-slate-400 italic">Peaceful exploration (capped by character speed per move) — press Roll Initiative for Turn Order.</span>
    </div>
    <div class="flex items-center gap-1.5 shrink-0 flex-wrap">
      <button onclick="combatAction('ROLL_INITIATIVE')" class="text-xs px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-sm transition">
        🎲 Roll Initiative
      </button>
      <button id="btn-prev-turn" onclick="combatAction('PREV_TURN')" class="hidden text-xs px-2 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold transition" title="Previous Turn">
        ⏮️
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
      <span>🎶 Music:</span>
      <select id="select-ambient-soundscape" onchange="updateAtmosphere(true)" class="bg-transparent font-bold outline-none cursor-pointer">
        <option value="SILENT">🔇 Off</option>
        <option value="COZY_TAVERN">🎻 Cozy Tavern Lute</option>
        <option value="WHISPERING_WOODS">🍃 Whispering Woods Harp</option>
        <option value="GOBLIN_KITCHEN">🥁 Mischief March</option>
        <option value="CRYSTAL_CAVERN">💎 Starlight Chimes</option>
        <option value="HEROIC_BATTLE">⚔️ Heroic Battle Brass</option>
      </select>
      <input id="ambient-volume-slider" type="range" min="0" max="100" value="35" oninput="AmbientAudioEngine.setVolume(this.value)" class="w-16 accent-amber-500 cursor-pointer" title="Music Volume" />
    </div>
  </div>`;
}

export function renderCombatAndAmbientAudioScript(): string {
  return [
    "const AmbientAudioEngine = {",
    "  activeLoopTimer: null,",
    "  masterGain: null,",
    "  currentMode: 'SILENT',",
    "  lastTrack: 'COZY_TAVERN',",
    "  musicEnabled: false,",
    "  stepIdx: 0,",
    "  volume: 0.35,",
    "  ensureMaster() {",
    "    if (typeof AudioEngine === 'undefined') return null;",
    "    AudioEngine.init();",
    "    if (!AudioEngine.ctx) return null;",
    "    if (AudioEngine.ctx.state === 'suspended' && AudioEngine.ctx.resume) {",
    "      AudioEngine.ctx.resume().catch(function(){});",
    "    }",
    "    if (!this.masterGain) {",
    "      this.masterGain = AudioEngine.ctx.createGain();",
    "      this.masterGain.gain.value = this.volume * 0.28;",
    "      this.masterGain.connect(AudioEngine.ctx.destination);",
    "    }",
    "    return AudioEngine.ctx;",
    "  },",
    "  setVolume(val) {",
    "    this.volume = Math.max(0, Math.min(1, Number(val || 35) / 100));",
    "    if (this.masterGain && typeof AudioEngine !== 'undefined' && AudioEngine.ctx) {",
    "      this.masterGain.gain.setTargetAtTime(this.volume * 0.28, AudioEngine.ctx.currentTime, 0.1);",
    "    }",
    "  },",
    "  syncButtons() {",
    "    var btn = document.getElementById('btn-music-toggle');",
    "    if (btn) {",
    "      btn.innerText = this.musicEnabled ? '🎵 Music: ON' : '🔇 Music: OFF';",
    "      btn.className = this.musicEnabled",
    "        ? 'px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400 transition'",
    "        : 'px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 transition';",
    "    }",
    "  },",
    "  stop() {",
    "    if (this.activeLoopTimer) {",
    "      clearInterval(this.activeLoopTimer);",
    "      this.activeLoopTimer = null;",
    "    }",
    "    this.currentMode = 'SILENT';",
    "    this.musicEnabled = false;",
    "    this.syncButtons();",
    "  },",
    "  playAmbientPulse(mode) {",
    "    if (!this.musicEnabled) return;",
    "    var ctx = this.ensureMaster();",
    "    if (!ctx || !this.masterGain) return;",
    "    var now = ctx.currentTime;",
    "    var scales = {",
    "      COZY_TAVERN: [261.63, 329.63, 392.00, 440.00, 392.00, 329.63],",
    "      WHISPERING_WOODS: [349.23, 440.00, 523.25, 659.25, 523.25, 440.00],",
    "      GOBLIN_KITCHEN: [293.66, 369.99, 440.00, 587.33, 493.88, 369.99],",
    "      CRYSTAL_CAVERN: [392.00, 523.25, 659.25, 783.99, 1046.50, 783.99],",
    "      HEROIC_BATTLE: [220.00, 261.63, 329.63, 440.00, 392.00, 329.63]",
    "    };",
    "    var notes = scales[mode] || scales.COZY_TAVERN;",
    "    var idx = this.stepIdx % notes.length;",
    "    this.stepIdx++;",
    "    var freq = notes[idx];",
    "    var osc = ctx.createOscillator();",
    "    var g = ctx.createGain();",
    "    osc.type = mode === 'HEROIC_BATTLE' ? 'sawtooth' : (mode === 'COZY_TAVERN' || mode === 'GOBLIN_KITCHEN' ? 'triangle' : 'sine');",
    "    osc.frequency.setValueAtTime(freq, now);",
    "    g.gain.setValueAtTime(0.001, now);",
    "    g.gain.linearRampToValueAtTime(mode === 'HEROIC_BATTLE' ? 0.14 : 0.16, now + 0.18);",
    "    g.gain.exponentialRampToValueAtTime(0.001, now + 1.55);",
    "    osc.connect(g);",
    "    g.connect(this.masterGain);",
    "    osc.start(now);",
    "    osc.stop(now + 1.65);",
    "    if (idx % 2 === 0) {",
    "      var bass = ctx.createOscillator();",
    "      var bg = ctx.createGain();",
    "      bass.type = 'sine';",
    "      bass.frequency.setValueAtTime(freq * 0.5, now);",
    "      bg.gain.setValueAtTime(0.001, now);",
    "      bg.gain.linearRampToValueAtTime(0.11, now + 0.15);",
    "      bg.gain.exponentialRampToValueAtTime(0.001, now + 1.7);",
    "      bass.connect(bg);",
    "      bg.connect(this.masterGain);",
    "      bass.start(now);",
    "      bass.stop(now + 1.75);",
    "    }",
    "  },",
    "  start(mode, forcePlay) {",
    "    if (!mode || mode === 'SILENT') { this.stop(); return; }",
    "    this.lastTrack = mode;",
    "    this.musicEnabled = true;",
    "    if (this.currentMode === mode && this.activeLoopTimer) { this.syncButtons(); return; }",
    "    if (this.activeLoopTimer) clearInterval(this.activeLoopTimer);",
    "    this.currentMode = mode;",
    "    this.syncButtons();",
    "    if (forcePlay) this.playAmbientPulse(mode);",
    "    var self = this;",
    "    var stepMs = mode === 'HEROIC_BATTLE' ? 650 : (mode === 'GOBLIN_KITCHEN' ? 850 : 1200);",
    "    this.activeLoopTimer = setInterval(function () {",
    "      self.playAmbientPulse(self.currentMode);",
    "    }, stepMs);",
    "  }",
    "};",
    "function promptCombatEntryInitiative(entryId, curVal, actorName) {",
    "  if (typeof displayMode !== 'undefined' && displayMode !== 'GM_COMMAND') return;",
    "  var raw = prompt('Enter table Initiative roll for ' + actorName + ':', String(curVal || 10));",
    "  if (raw === null) return;",
    "  var parsed = parseInt(raw, 10);",
    "  if (Number.isNaN(parsed)) return;",
    "  if (typeof apiPost === 'function') {",
    "    apiPost('/api/room/combat', { roomCode: state.roomCode, action: 'SET_INITIATIVE', entryId: entryId, initiative: parsed });",
    "  }",
    "}",
    "function renderCombatTrackerUI(roomState) {",
    "  var combat = roomState.combat;",
    "  var listEl = document.getElementById('combat-entries-list');",
    "  var roundEl = document.getElementById('combat-round-badge');",
    "  var moveEl = document.getElementById('combat-move-left-badge');",
    "  var lockBtn = document.getElementById('btn-toggle-turn-lock');",
    "  var prevBtn = document.getElementById('btn-prev-turn');",
    "  var nextBtn = document.getElementById('btn-next-turn');",
    "  var endBtn = document.getElementById('btn-end-combat');",
    "  var locked = !combat || combat.enforceTurnMovement !== false;",
    "  if (lockBtn) {",
    "    lockBtn.innerText = locked ? '🔒 Turn Lock: ON' : '🔓 Free Move: ON';",
    "    lockBtn.className = locked",
    "      ? 'text-[11px] px-2 py-0.5 rounded-full border font-bold transition bg-amber-500/20 text-amber-300 border-amber-400/50'",
    "      : 'text-[11px] px-2 py-0.5 rounded-full border font-bold transition bg-emerald-500/20 text-emerald-300 border-emerald-400/50';",
    "  }",
    "  if (!listEl) return;",
    "  if (!combat || !combat.isActive || !combat.entries || combat.entries.length === 0) {",
    "    listEl.innerHTML = '<span class=\"text-xs text-slate-400 italic\">Exploration mode (each move capped at hero speed) — click Roll Initiative to lock into Turn Order.</span>';",
    "    if (roundEl) roundEl.classList.add('hidden');",
    "    if (moveEl) moveEl.classList.add('hidden');",
    "    if (prevBtn) prevBtn.classList.add('hidden');",
    "    if (nextBtn) nextBtn.classList.add('hidden');",
    "    if (endBtn) endBtn.classList.add('hidden');",
    "    return;",
    "  }",
    "  if (roundEl) {",
    "    roundEl.classList.remove('hidden');",
    "    roundEl.innerText = 'Round ' + combat.round;",
    "  }",
    "  var activeEntry = combat.entries[combat.activeTurnIndex] || combat.entries[0];",
    "  if (moveEl && activeEntry) {",
    "    moveEl.classList.remove('hidden');",
    "    var sp = activeEntry.speedFt || 30;",
    "    var rem = typeof activeEntry.movementRemainingFt === 'number' ? activeEntry.movementRemainingFt : sp;",
    "    moveEl.innerText = '🏃 ' + activeEntry.name.split(' ')[0] + ': ' + rem + '/' + sp + ' ft';",
    "  }",
    "  if (prevBtn) prevBtn.classList.remove('hidden');",
    "  if (nextBtn) nextBtn.classList.remove('hidden');",
    "  if (endBtn) endBtn.classList.remove('hidden');",
    "  var html = '';",
    "  for (var i = 0; i < combat.entries.length; i++) {",
    "    var e = combat.entries[i];",
    "    var isActive = i === combat.activeTurnIndex;",
    "    var activeCls = isActive ? 'ring-2 ring-amber-400 bg-amber-500/20 border-amber-400 scale-105' : 'theme-inner-box opacity-85';",
    "    var portrait = e.assetPath ? '<img src=\"' + e.assetPath + '\" class=\"w-5 h-5 rounded-full object-cover\" />' : '<span>' + e.avatarEmoji + '</span>';",
    "    var remFt = typeof e.movementRemainingFt === 'number' ? e.movementRemainingFt : (e.speedFt || 30);",
    "    var moveTag = isActive ? '<span class=\"px-1 py-0.5 rounded bg-emerald-500/25 text-emerald-300 font-mono text-[9px]\">' + remFt + 'ft</span>' : '';",
    "    var safeName = (e.name || '').replace(/['\"]/g, '');",
    "    html += '<button type=\"button\" onclick=\"promptCombatEntryInitiative(\\'' + e.id + '\\', ' + e.initiative + ', \\'' + safeName + '\\')\" title=\"DM: Click to adjust table Initiative roll (Speed ' + (e.speedFt || 30) + 'ft)\" class=\"px-2.5 py-1 rounded-xl border text-xs flex items-center gap-1.5 shrink-0 transition cursor-pointer ' + activeCls + '\">' +",
    "      portrait +",
    "      '<span class=\"font-bold\">' + e.name + '</span>' +",
    "      moveTag +",
    "      '<span class=\"px-1.5 py-0.5 rounded bg-black/25 font-mono text-[10px]\">' + e.initiative + '</span>' +",
    "      '</button>';",
    "  }",
    "  listEl.innerHTML = html;",
    "}",
  ].join("\n");
}

/**
 * HearthQuest Foundry-Style Actor & Token Forge
 * Generates double-beveled Foundry VTT circular SVG token portraits + complete Hero/Monster actor sheets
 * and persists forged SVG tokens directly to /app/data/custom-tokens for Unraid & SSE sync.
 */

export type TokenBezelStyle =
  | "ANTIQUE_BRASS"
  | "OBSIDIAN_CRIMSON"
  | "ASTRAL_SILVER"
  | "EMERALD_RUNE";

export type TokenEmblemPreset =
  | "KNIGHT_HELM"
  | "WIZARD_HAT"
  | "RANGER_HOOD"
  | "ROGUE_MASK"
  | "BARD_LUTE"
  | "DRUID_ANTLERS"
  | "DRAGON_HEAD"
  | "GOBLIN_EARS"
  | "SLIME_OOZE"
  | "CLOCKWORK_GOLEM"
  | "OWLBEAR_CREST"
  | "SKELETON_GUARD";

export interface ForgeActorPreset {
  id: string;
  label: string;
  actorType: "HERO" | "MONSTER";
  name: string;
  archetype: string;
  bezelStyle: TokenBezelStyle;
  emblem: TokenEmblemPreset;
  primaryColor: string;
  accentColor: string;
  hp: number;
  armorClass: number;
  lightRadius: number;
  avatarEmoji: string;
  companionPet: string;
  proficientSkills: string[];
  attributes5e: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
}

export const FOUNDRY_ACTOR_PRESETS: ForgeActorPreset[] = [
  {
    id: "preset-paladin",
    label: "🛡️ Sunfire Paladin (Hero)",
    actorType: "HERO",
    name: "Seraphina",
    archetype: "Sunfire Paladin",
    bezelStyle: "ANTIQUE_BRASS",
    emblem: "KNIGHT_HELM",
    primaryColor: "#d97706",
    accentColor: "#fde047",
    hp: 26,
    armorClass: 17,
    lightRadius: 4,
    avatarEmoji: "🛡️",
    companionPet: "Lumina the Golden Owl",
    proficientSkills: ["athletics", "persuasion", "perception"],
    attributes5e: { str: 16, dex: 10, con: 14, int: 10, wis: 13, cha: 15 },
  },
  {
    id: "preset-frostmage",
    label: "🪄 Astral Frost Mage (Hero)",
    actorType: "HERO",
    name: "Zephyr",
    archetype: "Astral Frost Wizard",
    bezelStyle: "ASTRAL_SILVER",
    emblem: "WIZARD_HAT",
    primaryColor: "#4f46e5",
    accentColor: "#38bdf8",
    hp: 18,
    armorClass: 13,
    lightRadius: 3.5,
    avatarEmoji: "🪄",
    companionPet: "Pip the Frost sprite",
    proficientSkills: ["arcana", "investigation", "nature"],
    attributes5e: { str: 8, dex: 14, con: 12, int: 17, wis: 13, cha: 11 },
  },
  {
    id: "preset-ember-drake",
    label: "🐉 Crimson Ember Drake (Monster)",
    actorType: "MONSTER",
    name: "Cinderfang Drake",
    archetype: "Young Ember Dragon",
    bezelStyle: "OBSIDIAN_CRIMSON",
    emblem: "DRAGON_HEAD",
    primaryColor: "#b91c1c",
    accentColor: "#fb923c",
    hp: 34,
    armorClass: 15,
    lightRadius: 3,
    avatarEmoji: "🐉",
    companionPet: "Smoke Wisp",
    proficientSkills: ["perception", "stealth", "athletics"],
    attributes5e: { str: 16, dex: 13, con: 15, int: 10, wis: 12, cha: 14 },
  },
  {
    id: "preset-clockwork-warden",
    label: "⚙️ Clockwork Warden (Monster)",
    actorType: "MONSTER",
    name: "Gearheart Sentinel",
    archetype: "Brass Construct Boss",
    bezelStyle: "ANTIQUE_BRASS",
    emblem: "CLOCKWORK_GOLEM",
    primaryColor: "#92400e",
    accentColor: "#fbbf24",
    hp: 40,
    armorClass: 16,
    lightRadius: 2.5,
    avatarEmoji: "⚙️",
    companionPet: "Wind-up Finch",
    proficientSkills: ["athletics", "investigation", "perception"],
    attributes5e: { str: 17, dex: 9, con: 16, int: 11, wis: 10, cha: 7 },
  },
  {
    id: "preset-moss-owlbear",
    label: "🦉 Mossback Owlbear (Monster)",
    actorType: "MONSTER",
    name: "Bramblebeak",
    archetype: "Forest Guardian Beast",
    bezelStyle: "EMERALD_RUNE",
    emblem: "OWLBEAR_CREST",
    primaryColor: "#047857",
    accentColor: "#a3e635",
    hp: 30,
    armorClass: 14,
    lightRadius: 0,
    avatarEmoji: "🦉",
    companionPet: "Acorn Beetle",
    proficientSkills: ["nature", "survival", "perception"],
    attributes5e: { str: 16, dex: 12, con: 15, int: 6, wis: 13, cha: 8 },
  },
  {
    id: "preset-goblin-sapper",
    label: "🧁 Goblin Pastry Sapper (Monster)",
    actorType: "MONSTER",
    name: "Fizzwick",
    archetype: "Mischievous Goblin",
    bezelStyle: "EMERALD_RUNE",
    emblem: "GOBLIN_EARS",
    primaryColor: "#15803d",
    accentColor: "#facc15",
    hp: 14,
    armorClass: 13,
    lightRadius: 1.5,
    avatarEmoji: "👺",
    companionPet: "Sugar Rat",
    proficientSkills: ["stealth", "acrobatics", "perception"],
    attributes5e: { str: 9, dex: 16, con: 11, int: 11, wis: 10, cha: 10 },
  },
];

function escapeXml(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getBezelPalette(style: TokenBezelStyle): {
  rimStart: string;
  rimMid: string;
  rimEnd: string;
  innerStroke: string;
  dishBg: string;
} {
  if (style === "OBSIDIAN_CRIMSON") {
    return {
      rimStart: "#450a0a",
      rimMid: "#dc2626",
      rimEnd: "#1f2937",
      innerStroke: "#fca5a5",
      dishBg: "#18090d",
    };
  }
  if (style === "ASTRAL_SILVER") {
    return {
      rimStart: "#e2e8f0",
      rimMid: "#64748b",
      rimEnd: "#1e1b4b",
      innerStroke: "#93c5fd",
      dishBg: "#0b1128",
    };
  }
  if (style === "EMERALD_RUNE") {
    return {
      rimStart: "#34d399",
      rimMid: "#065f46",
      rimEnd: "#022c22",
      innerStroke: "#a7f3d0",
      dishBg: "#071c16",
    };
  }
  return {
    rimStart: "#fef08a",
    rimMid: "#d97706",
    rimEnd: "#78350f",
    innerStroke: "#fde68a",
    dishBg: "#1c1308",
  };
}

function buildEmblemPathsSvg(
  emblem: TokenEmblemPreset,
  primaryColor: string,
  accentColor: string
): string {
  const p = escapeXml(primaryColor || "#d97706");
  const a = escapeXml(accentColor || "#fde047");

  switch (emblem) {
    case "DRAGON_HEAD":
      return `
        <path d="M128 52 L166 76 L186 64 L172 108 L188 134 L158 148 L152 184 L128 198 L104 184 L98 148 L68 134 L84 108 L70 64 L90 76 Z" fill="${p}" stroke="${a}" stroke-width="5" stroke-linejoin="round"/>
        <path d="M98 112 L118 124 L102 132 Z M158 112 L138 124 L154 132 Z" fill="${a}"/>
        <path d="M114 156 L128 172 L142 156" fill="none" stroke="${a}" stroke-width="5" stroke-linecap="round"/>`;
    case "GOBLIN_EARS":
      return `
        <path d="M56 106 L96 96 L102 136 L64 130 Z M200 106 L160 96 L154 136 L192 130 Z" fill="${p}" stroke="${a}" stroke-width="4" stroke-linejoin="round"/>
        <circle cx="128" cy="128" r="44" fill="${p}" stroke="${a}" stroke-width="5"/>
        <circle cx="111" cy="120" r="8" fill="${a}"/><circle cx="145" cy="120" r="8" fill="${a}"/>
        <circle cx="112" cy="120" r="3" fill="#0f172a"/><circle cx="146" cy="120" r="3" fill="#0f172a"/>
        <path d="M106 146 Q128 164 150 146" fill="none" stroke="${a}" stroke-width="5" stroke-linecap="round"/>`;
    case "SLIME_OOZE":
      return `
        <path d="M74 154 C68 116 90 76 128 76 C166 76 188 116 182 154 C178 176 156 184 128 184 C100 184 78 176 74 154 Z" fill="${p}" stroke="${a}" stroke-width="5"/>
        <circle cx="110" cy="130" r="9" fill="#0f172a"/><circle cx="146" cy="130" r="9" fill="#0f172a"/>
        <circle cx="107" cy="127" r="3" fill="#ffffff"/><circle cx="143" cy="127" r="3" fill="#ffffff"/>
        <circle cx="154" cy="98" r="7" fill="${a}" opacity="0.85"/><circle cx="94" cy="108" r="5" fill="${a}" opacity="0.7"/>`;
    case "CLOCKWORK_GOLEM":
      return `
        <rect x="84" y="78" width="88" height="96" rx="18" fill="${p}" stroke="${a}" stroke-width="5"/>
        <circle cx="128" cy="64" r="14" fill="${a}" stroke="#0f172a" stroke-width="3"/>
        <rect x="98" y="106" width="60" height="22" rx="8" fill="#0f172a" stroke="${a}" stroke-width="3"/>
        <circle cx="114" cy="117" r="6" fill="${a}"/><circle cx="142" cy="117" r="6" fill="${a}"/>
        <path d="M104 150 H152 M116 142 V158 M128 142 V158 M140 142 V158" stroke="${a}" stroke-width="4" stroke-linecap="round"/>`;
    case "OWLBEAR_CREST":
      return `
        <circle cx="128" cy="130" r="50" fill="${p}" stroke="${a}" stroke-width="5"/>
        <path d="M84 96 L104 74 L118 96 M172 96 L152 74 L138 96" fill="${p}" stroke="${a}" stroke-width="4" stroke-linejoin="round"/>
        <circle cx="110" cy="120" r="14" fill="#fef3c7" stroke="#0f172a" stroke-width="3"/>
        <circle cx="146" cy="120" r="14" fill="#fef3c7" stroke="#0f172a" stroke-width="3"/>
        <circle cx="110" cy="120" r="5" fill="#0f172a"/><circle cx="146" cy="120" r="5" fill="#0f172a"/>
        <polygon points="128,128 118,144 138,144" fill="${a}" stroke="#0f172a" stroke-width="2"/>`;
    case "SKELETON_GUARD":
      return `
        <path d="M86 118 C86 80 170 80 170 118 C170 140 156 150 150 158 L150 180 L106 180 L106 158 C100 150 86 140 86 118 Z" fill="#f8fafc" stroke="${a}" stroke-width="5"/>
        <circle cx="111" cy="120" r="11" fill="#0f172a"/><circle cx="145" cy="120" r="11" fill="#0f172a"/>
        <circle cx="111" cy="120" r="4" fill="${p}"/><circle cx="145" cy="120" r="4" fill="${p}"/>
        <path d="M128 136 L122 148 H134 Z" fill="#0f172a"/>
        <path d="M114 164 V180 M128 164 V180 M142 164 V180" stroke="#0f172a" stroke-width="4"/>`;
    case "WIZARD_HAT":
      return `
        <path d="M128 54 L162 134 L94 134 Z" fill="${p}" stroke="${a}" stroke-width="5" stroke-linejoin="round"/>
        <ellipse cx="128" cy="136" rx="64" ry="16" fill="${p}" stroke="${a}" stroke-width="5"/>
        <circle cx="128" cy="100" r="10" fill="${a}"/>
        <path d="M104 162 Q128 186 152 162" fill="none" stroke="${a}" stroke-width="6" stroke-linecap="round"/>`;
    case "RANGER_HOOD":
      return `
        <path d="M128 60 L176 116 L162 178 L94 178 L80 116 Z" fill="${p}" stroke="${a}" stroke-width="5" stroke-linejoin="round"/>
        <ellipse cx="128" cy="132" rx="26" ry="30" fill="#0f172a"/>
        <circle cx="118" cy="126" r="4" fill="${a}"/><circle cx="138" cy="126" r="4" fill="${a}"/>`;
    case "ROGUE_MASK":
      return `
        <circle cx="128" cy="126" r="46" fill="#1e293b" stroke="${a}" stroke-width="5"/>
        <path d="M84 128 L172 128 L166 168 Q128 184 90 168 Z" fill="${p}" stroke="${a}" stroke-width="4"/>
        <path d="M104 114 L120 120 L104 122 Z M152 114 L136 120 L152 122 Z" fill="${a}"/>`;
    case "BARD_LUTE":
      return `
        <ellipse cx="128" cy="144" rx="40" ry="34" fill="${p}" stroke="${a}" stroke-width="5"/>
        <rect x="121" y="64" width="14" height="58" rx="4" fill="${p}" stroke="${a}" stroke-width="4"/>
        <circle cx="128" cy="144" r="13" fill="#0f172a" stroke="${a}" stroke-width="3"/>
        <line x1="124" y1="68" x2="124" y2="170" stroke="${a}" stroke-width="2"/>
        <line x1="132" y1="68" x2="132" y2="170" stroke="${a}" stroke-width="2"/>`;
    case "DRUID_ANTLERS":
      return `
        <path d="M98 112 C82 94 74 74 86 58 M98 92 L78 86 M158 112 C174 94 182 74 170 58 M158 92 L178 86" fill="none" stroke="${a}" stroke-width="7" stroke-linecap="round"/>
        <circle cx="128" cy="136" r="38" fill="${p}" stroke="${a}" stroke-width="5"/>
        <circle cx="114" cy="132" r="5" fill="${a}"/><circle cx="142" cy="132" r="5" fill="${a}"/>`;
    case "KNIGHT_HELM":
    default:
      return `
        <path d="M88 108 C88 68 168 68 168 108 L164 166 L128 186 L92 166 Z" fill="${p}" stroke="${a}" stroke-width="5" stroke-linejoin="round"/>
        <path d="M100 120 H156 L148 134 H108 Z" fill="#0f172a" stroke="${a}" stroke-width="3"/>
        <path d="M128 66 V182" stroke="${a}" stroke-width="4" opacity="0.8"/>`;
  }
}

/**
 * Generates an authentic Foundry VTT style double-beveled circular SVG token portrait.
 */
export function buildFoundryTokenSvg(params: {
  name: string;
  actorType: "HERO" | "MONSTER";
  bezelStyle: TokenBezelStyle;
  emblem: TokenEmblemPreset;
  primaryColor: string;
  accentColor: string;
}): string {
  const pal = getBezelPalette(params.bezelStyle);
  const safeName = escapeXml((params.name || "Hero").slice(0, 18));
  const emblemSvg = buildEmblemPathsSvg(
    params.emblem,
    params.primaryColor,
    params.accentColor
  );
  const badgeTag = params.actorType === "MONSTER" ? "FOE" : "HERO";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="foundryRim" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${pal.rimStart}"/>
      <stop offset="50%" stop-color="${pal.rimMid}"/>
      <stop offset="100%" stop-color="${pal.rimEnd}"/>
    </linearGradient>
    <radialGradient id="foundryDish" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="${escapeXml(params.primaryColor)}" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="${pal.dishBg}"/>
    </radialGradient>
  </defs>
  <!-- Outer Drop Shadow & Foundry Beveled Metallic Ring -->
  <circle cx="128" cy="128" r="122" fill="url(#foundryRim)" stroke="#090d16" stroke-width="4"/>
  <circle cx="128" cy="128" r="106" fill="url(#foundryDish)" stroke="${pal.innerStroke}" stroke-width="4"/>
  <!-- 8 Engraved Corner Rivets -->
  <g fill="${pal.innerStroke}" opacity="0.9">
    <circle cx="128" cy="15" r="4"/><circle cx="128" cy="241" r="4"/>
    <circle cx="15" cy="128" r="4"/><circle cx="241" cy="128" r="4"/>
    <circle cx="48" cy="48" r="3.5"/><circle cx="208" cy="48" r="3.5"/>
    <circle cx="48" cy="208" r="3.5"/><circle cx="208" cy="208" r="3.5"/>
  </g>
  <!-- Vector Portrait / Silhouette -->
  ${emblemSvg}
  <!-- Foundry Bottom Nameplate Ribbon -->
  <rect x="44" y="196" width="168" height="28" rx="14" fill="#0f172a" stroke="${pal.innerStroke}" stroke-width="3"/>
  <text x="128" y="214" text-anchor="middle" fill="#f8fafc" font-family="system-ui, sans-serif" font-weight="800" font-size="13">${safeName}</text>
  <!-- Top Actor Type Pip -->
  <rect x="102" y="20" width="52" height="16" rx="8" fill="#0f172a" stroke="${pal.innerStroke}" stroke-width="2"/>
  <text x="128" y="31" text-anchor="middle" fill="${pal.innerStroke}" font-family="system-ui, sans-serif" font-weight="800" font-size="9">${badgeTag}</text>
</svg>`;
}

export function renderTokenForgeModalHtml(): string {
  return `
  <!-- FOUNDRY-STYLE ACTOR & TOKEN FORGE MODAL -->
  <div id="token-forge-modal" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="theme-card border-2 border-amber-400 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
      <div class="flex items-center justify-between border-b border-slate-700/40 pb-3">
        <div>
          <h3 class="text-lg font-extrabold text-amber-400">⚒️ Foundry Actor &amp; Token Forge</h3>
          <p class="text-[11px] text-slate-400">Design a beveled Foundry-grade Hero or Monster, save its SVG token to /app/data/custom-tokens, and spawn it live.</p>
        </div>
        <button onclick="closeTokenForgeModal()" class="text-slate-400 hover:text-white text-base font-bold">✕</button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
        <!-- Live Circular Foundry Token Preview Column -->
        <div class="md:col-span-5 flex flex-col items-center gap-3 p-4 rounded-2xl theme-inner-box border">
          <div id="forge-preview-container" class="w-40 h-40 rounded-full shadow-2xl flex items-center justify-center"></div>
          <div class="w-full space-y-1.5 text-xs">
            <label class="block text-[11px] font-bold text-amber-400">⚡ Quick Foundry Preset:</label>
            <select id="forge-preset-select" onchange="applyForgePreset(this.value)" class="w-full theme-input border rounded-xl px-2.5 py-1.5 text-xs">
              <option value="">-- Load Preset Template --</option>
              ${FOUNDRY_ACTOR_PRESETS.map((p) => `<option value="${p.id}">${p.label}</option>`).join("")}
            </select>
          </div>
          <div class="grid grid-cols-2 gap-2 w-full text-xs">
            <div>
              <label class="text-[10px] text-slate-400 block">Primary Color</label>
              <input id="forge-primary-color" type="color" value="#d97706" oninput="updateForgePreview()" class="w-full h-8 rounded cursor-pointer bg-transparent" />
            </div>
            <div>
              <label class="text-[10px] text-slate-400 block">Accent / Glow</label>
              <input id="forge-accent-color" type="color" value="#fde047" oninput="updateForgePreview()" class="w-full h-8 rounded cursor-pointer bg-transparent" />
            </div>
          </div>
        </div>

        <!-- Actor Stats, Frame & Emblem Config Column -->
        <div class="md:col-span-7 space-y-2.5 text-xs">
          <div>
            <label class="block text-[11px] font-bold text-amber-400 mb-0.5">Apply Custom Token To Character</label>
            <select id="forge-target-hero" onchange="onForgeTargetHeroChange(this.value)" class="w-full theme-input border rounded-xl px-2.5 py-1.5 font-bold">
              <option value="">✨ Create New Hero Character Token</option>
            </select>
          </div>
          <div>
            <label class="block text-[11px] text-slate-400 mb-0.5">📷 Optional: Upload Custom Character Token Image (PNG/JPG/WebP/SVG)</label>
            <div class="flex items-center gap-2">
              <input id="forge-custom-image-file" type="file" accept="image/*" onchange="handleForgeCustomImageUpload(event)" class="text-[11px] text-slate-300 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-500/20 file:text-amber-300 hover:file:bg-amber-500/30" />
              <button type="button" onclick="clearForgeCustomImage()" class="px-2 py-1 rounded-lg border border-slate-600 text-[10px] font-bold">Reset SVG</button>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div id="forge-actor-type-wrap">
              <label class="block text-[11px] text-slate-400 mb-0.5">Actor Role</label>
              <select id="forge-actor-type" onchange="updateForgePreview()" class="w-full theme-input border rounded-xl px-2.5 py-1.5 font-bold">
                <option value="HERO">🛡️ Playable Hero</option>
                <option value="MONSTER" id="forge-option-monster">🐉 Monster / Boss (Admin Only)</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] text-slate-400 mb-0.5">Foundry Bezel Ring</label>
              <select id="forge-bezel-style" onchange="updateForgePreview()" class="w-full theme-input border rounded-xl px-2.5 py-1.5 font-bold">
                <option value="ANTIQUE_BRASS">🏅 Antique Brass</option>
                <option value="OBSIDIAN_CRIMSON">🔥 Obsidian Crimson</option>
                <option value="ASTRAL_SILVER">🌙 Astral Silver</option>
                <option value="EMERALD_RUNE">🌿 Emerald Runestone</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[11px] text-slate-400 mb-0.5">Actor &amp; Token Name</label>
              <input id="forge-name" type="text" value="Seraphina" oninput="updateForgePreview()" class="w-full theme-input border rounded-xl px-2.5 py-1.5" />
            </div>
            <div>
              <label class="block text-[11px] text-slate-400 mb-0.5">Class / Species Title</label>
              <input id="forge-archetype" type="text" value="Sunfire Paladin" class="w-full theme-input border rounded-xl px-2.5 py-1.5" />
            </div>
          </div>

          <div>
            <label class="block text-[11px] text-slate-400 mb-0.5">Vector Silhouette / Token Art</label>
            <select id="forge-emblem" onchange="updateForgePreview()" class="w-full theme-input border rounded-xl px-2.5 py-1.5 font-bold">
              <option value="KNIGHT_HELM">🛡️ Knight Greathelm</option>
              <option value="WIZARD_HAT">🪄 Arcane Wizard Hat</option>
              <option value="RANGER_HOOD">🏹 Forest Ranger Hood</option>
              <option value="ROGUE_MASK">🗡️ Shadow Rogue Mask</option>
              <option value="BARD_LUTE">🎵 Enchanted Lute</option>
              <option value="DRUID_ANTLERS">🐻 Druid Crown Antlers</option>
              <option value="DRAGON_HEAD">🐉 Ember Dragon Crest</option>
              <option value="GOBLIN_EARS">👺 Goblin Guard</option>
              <option value="SLIME_OOZE">🧪 Gelatinous Slime</option>
              <option value="CLOCKWORK_GOLEM">⚙️ Clockwork Golem</option>
              <option value="OWLBEAR_CREST">🦉 Wild Owlbear</option>
              <option value="SKELETON_GUARD">💀 Crypt Guard</option>
            </select>
          </div>

          <div class="grid grid-cols-4 gap-2">
            <div>
              <label class="block text-[10px] text-slate-400">Max HP</label>
              <input id="forge-hp" type="number" value="24" min="1" class="w-full theme-input border rounded-xl px-2 py-1" />
            </div>
            <div>
              <label class="block text-[10px] text-slate-400">Armor (AC)</label>
              <input id="forge-ac" type="number" value="16" min="8" class="w-full theme-input border rounded-xl px-2 py-1" />
            </div>
            <div>
              <label class="block text-[10px] text-slate-400">Torch (sq)</label>
              <input id="forge-light" type="number" value="3.5" step="0.5" min="0" max="6" class="w-full theme-input border rounded-xl px-2 py-1" />
            </div>
            <div>
              <label class="block text-[10px] text-slate-400">Spawn X,Y</label>
              <div class="flex gap-1">
                <input id="forge-x" type="number" value="2" min="0" max="9" class="w-1/2 theme-input border rounded-lg px-1 py-1 text-center" />
                <input id="forge-y" type="number" value="2" min="0" max="5" class="w-1/2 theme-input border rounded-lg px-1 py-1 text-center" />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-6 gap-1">
            <div><label class="text-[9px] text-slate-400 block text-center">STR</label><input id="forge-str" type="number" value="16" class="w-full theme-input border rounded-lg px-1 py-1 text-center" /></div>
            <div><label class="text-[9px] text-slate-400 block text-center">DEX</label><input id="forge-dex" type="number" value="12" class="w-full theme-input border rounded-lg px-1 py-1 text-center" /></div>
            <div><label class="text-[9px] text-slate-400 block text-center">CON</label><input id="forge-con" type="number" value="14" class="w-full theme-input border rounded-lg px-1 py-1 text-center" /></div>
            <div><label class="text-[9px] text-slate-400 block text-center">INT</label><input id="forge-int" type="number" value="10" class="w-full theme-input border rounded-lg px-1 py-1 text-center" /></div>
            <div><label class="text-[9px] text-slate-400 block text-center">WIS</label><input id="forge-wis" type="number" value="13" class="w-full theme-input border rounded-lg px-1 py-1 text-center" /></div>
            <div><label class="text-[9px] text-slate-400 block text-center">CHA</label><input id="forge-cha" type="number" value="14" class="w-full theme-input border rounded-lg px-1 py-1 text-center" /></div>
          </div>

          <div>
            <label class="block text-[11px] text-slate-400 mb-1">Proficient Skills (Comma List)</label>
            <input id="forge-skills" type="text" value="athletics, perception, persuasion" class="w-full theme-input border rounded-xl px-2.5 py-1.5" />
          </div>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-700/40">
        <button onclick="closeTokenForgeModal()" class="px-4 py-2 rounded-xl border border-slate-600 text-xs font-bold">Cancel</button>
        <button onclick="forgeNewActorAndToken()" class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm shadow-lg">
          ⚒️ Forge Actor &amp; Spawn Token
        </button>
      </div>
    </div>
  </div>`;
}

export function renderTokenForgeClientScript(): string {
  const presetsJson = JSON.stringify(FOUNDRY_ACTOR_PRESETS);
  return [
    "const FORGE_PRESETS = " + presetsJson + ";",
    "function hqSafeHexColor(val, fallback) {",
    "  var s = String(val || '').trim();",
    "  return /^#[0-9a-fA-F]{3,8}$/.test(s) ? s : fallback;",
    "}",
    "function hqEscForge(val) {",
    "  return String(val == null ? '' : val).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;');",
    "}",
    "function buildBrowserFoundryTokenSvg(cfg) {",
    "  var bez = cfg.bezelStyle === 'OBSIDIAN_CRIMSON'",
    "    ? { s:'#450a0a', m:'#dc2626', e:'#1f2937', st:'#fca5a5', d:'#18090d' }",
    "    : cfg.bezelStyle === 'ASTRAL_SILVER'",
    "    ? { s:'#e2e8f0', m:'#64748b', e:'#0f172a', st:'#93c5fd', d:'#0b1128' }",
    "    : cfg.bezelStyle === 'EMERALD_RUNE'",
    "    ? { s:'#34d399', m:'#065f46', e:'#022c22', st:'#a7f3d0', d:'#071c16' }",
    "    : { s:'#fef08a', m:'#d97706', e:'#78350f', st:'#fde68a', d:'#1c1308' };",
    "  var p = hqSafeHexColor(cfg.primaryColor, '#d97706');",
    "  var a = hqSafeHexColor(cfg.accentColor, '#fde047');",
    "  var emblem = '<circle cx=\"128\" cy=\"124\" r=\"42\" fill=\"' + p + '\" stroke=\"' + a + '\" stroke-width=\"5\"/>';",
    "  if (cfg.emblem === 'DRAGON_HEAD') emblem = '<path d=\"M128 52 L166 76 L186 64 L172 108 L188 134 L158 148 L152 184 L128 198 L104 184 L98 148 L68 134 L84 108 L70 64 L90 76 Z\" fill=\"' + p + '\" stroke=\"' + a + '\" stroke-width=\"5\"/>';",
    "  else if (cfg.emblem === 'WIZARD_HAT') emblem = '<path d=\"M128 54 L162 134 L94 134 Z\" fill=\"' + p + '\" stroke=\"' + a + '\" stroke-width=\"5\"/><ellipse cx=\"128\" cy=\"136\" rx=\"64\" ry=\"16\" fill=\"' + p + '\" stroke=\"' + a + '\" stroke-width=\"5\"/>';",
    "  else if (cfg.emblem === 'KNIGHT_HELM') emblem = '<path d=\"M88 108 C88 68 168 68 168 108 L164 166 L128 186 L92 166 Z\" fill=\"' + p + '\" stroke=\"' + a + '\" stroke-width=\"5\"/><path d=\"M100 120 H156 L148 134 H108 Z\" fill=\"#0f172a\" stroke=\"' + a + '\" stroke-width=\"3\"/>';",
    "  else if (cfg.emblem === 'CLOCKWORK_GOLEM') emblem = '<rect x=\"84\" y=\"78\" width=\"88\" height=\"96\" rx=\"18\" fill=\"' + p + '\" stroke=\"' + a + '\" stroke-width=\"5\"/><rect x=\"98\" y=\"106\" width=\"60\" height=\"22\" rx=\"8\" fill=\"#0f172a\" stroke=\"' + a + '\" stroke-width=\"3\"/>';",
    "  else if (cfg.emblem === 'GOBLIN_EARS') emblem = '<path d=\"M56 106 L96 96 L102 136 L64 130 Z M200 106 L160 96 L154 136 L192 130 Z\" fill=\"' + p + '\" stroke=\"' + a + '\" stroke-width=\"4\"/><circle cx=\"128\" cy=\"128\" r=\"44\" fill=\"' + p + '\" stroke=\"' + a + '\" stroke-width=\"5\"/>';",
    "  else if (cfg.emblem === 'OWLBEAR_CREST') emblem = '<circle cx=\"128\" cy=\"130\" r=\"50\" fill=\"' + p + '\" stroke=\"' + a + '\" stroke-width=\"5\"/><circle cx=\"110\" cy=\"120\" r=\"13\" fill=\"#fef3c7\"/><circle cx=\"146\" cy=\"120\" r=\"13\" fill=\"#fef3c7\"/><polygon points=\"128,128 118,144 138,144\" fill=\"' + a + '\"/>';",
    "  else if (cfg.emblem === 'SKELETON_GUARD') emblem = '<circle cx=\"128\" cy=\"120\" r=\"42\" fill=\"#f8fafc\" stroke=\"' + a + '\" stroke-width=\"5\"/><circle cx=\"111\" cy=\"118\" r=\"10\" fill=\"#0f172a\"/><circle cx=\"145\" cy=\"118\" r=\"10\" fill=\"#0f172a\"/>';",
    "  var safeName = hqEscForge(String(cfg.name || 'Hero').slice(0, 18));",
    "  var badge = cfg.actorType === 'MONSTER' ? 'FOE' : 'HERO';",
    "  return '<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 256 256\" class=\"w-full h-full\">' +",
    "    '<defs><linearGradient id=\"pRim\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0%\" stop-color=\"' + bez.s + '\"/><stop offset=\"50%\" stop-color=\"' + bez.m + '\"/><stop offset=\"100%\" stop-color=\"' + bez.e + '\"/></linearGradient></defs>' +",
    "    '<circle cx=\"128\" cy=\"128\" r=\"122\" fill=\"url(#pRim)\" stroke=\"#090d16\" stroke-width=\"4\"/>' +",
    "    '<circle cx=\"128\" cy=\"128\" r=\"106\" fill=\"' + bez.d + '\" stroke=\"' + bez.st + '\" stroke-width=\"4\"/>' +",
    "    emblem +",
    "    '<rect x=\"44\" y=\"196\" width=\"168\" height=\"28\" rx=\"14\" fill=\"#0f172a\" stroke=\"' + bez.st + '\" stroke-width=\"3\"/><text x=\"128\" y=\"214\" text-anchor=\"middle\" fill=\"#f8fafc\" font-weight=\"800\" font-size=\"13\">' + safeName + '</text>' +",
    "    '<rect x=\"102\" y=\"20\" width=\"52\" height=\"16\" rx=\"8\" fill=\"#0f172a\" stroke=\"' + bez.st + '\" stroke-width=\"2\"/><text x=\"128\" y=\"31\" text-anchor=\"middle\" fill=\"' + bez.st + '\" font-weight=\"800\" font-size=\"9\">' + badge + '</text>' +",
    "    '</svg>';",
    "}",
    "var uploadedForgeImageDataUrl = '';",
    "function clearForgeCustomImage() {",
    "  uploadedForgeImageDataUrl = '';",
    "  var f = document.getElementById('forge-custom-image-file');",
    "  if (f) f.value = '';",
    "  updateForgePreview();",
    "}",
    "function handleForgeCustomImageUpload(ev) {",
    "  var file = ev && ev.target && ev.target.files && ev.target.files[0];",
    "  if (!file) return;",
    "  var reader = new FileReader();",
    "  reader.onload = function() {",
    "    var img = new Image();",
    "    img.onload = function() {",
    "      var canvas = document.createElement('canvas');",
    "      canvas.width = 192;",
    "      canvas.height = 192;",
    "      var ctx = canvas.getContext('2d');",
    "      ctx.beginPath();",
    "      ctx.arc(96, 96, 94, 0, Math.PI * 2);",
    "      ctx.closePath();",
    "      ctx.clip();",
    "      var scale = Math.max(192 / img.width, 192 / img.height);",
    "      var w = img.width * scale;",
    "      var h = img.height * scale;",
    "      ctx.drawImage(img, (192 - w) / 2, (192 - h) / 2, w, h);",
    "      uploadedForgeImageDataUrl = canvas.toDataURL('image/png');",
    "      updateForgePreview();",
    "    };",
    "    img.src = String(reader.result || '');",
    "  };",
    "  reader.readAsDataURL(file);",
    "}",
    "function onForgeTargetHeroChange(heroId) {",
    "  if (!heroId || typeof state === 'undefined' || !state.heroes) return;",
    "  var h = state.heroes.find(function(x){ return x.id === heroId; });",
    "  if (h) {",
    "    document.getElementById('forge-name').value = h.name;",
    "    document.getElementById('forge-archetype').value = h.archetype || 'Hero';",
    "    document.getElementById('forge-actor-type').value = 'HERO';",
    "    updateForgePreview();",
    "  }",
    "}",
    "function readForgeForm() {",
    "  return {",
    "    targetHeroId: (document.getElementById('forge-target-hero') || {}).value || '',",
    "    customImageDataUrl: uploadedForgeImageDataUrl || '',",
    "    actorType: (document.getElementById('forge-actor-type') || {}).value || 'HERO',",
    "    bezelStyle: (document.getElementById('forge-bezel-style') || {}).value || 'ANTIQUE_BRASS',",
    "    emblem: (document.getElementById('forge-emblem') || {}).value || 'KNIGHT_HELM',",
    "    name: (document.getElementById('forge-name') || {}).value || 'Seraphina',",
    "    archetype: (document.getElementById('forge-archetype') || {}).value || 'Heroic Adventurer',",
    "    primaryColor: (document.getElementById('forge-primary-color') || {}).value || '#d97706',",
    "    accentColor: (document.getElementById('forge-accent-color') || {}).value || '#fde047',",
    "    hp: Number((document.getElementById('forge-hp') || {}).value || 20),",
    "    armorClass: Number((document.getElementById('forge-ac') || {}).value || 15),",
    "    lightRadius: Number((document.getElementById('forge-light') || {}).value || 3),",
    "    gridX: Number((document.getElementById('forge-x') || {}).value || 2),",
    "    gridY: Number((document.getElementById('forge-y') || {}).value || 2),",
    "    str: Number((document.getElementById('forge-str') || {}).value || 14),",
    "    dex: Number((document.getElementById('forge-dex') || {}).value || 12),",
    "    con: Number((document.getElementById('forge-con') || {}).value || 14),",
    "    int: Number((document.getElementById('forge-int') || {}).value || 10),",
    "    wis: Number((document.getElementById('forge-wis') || {}).value || 12),",
    "    cha: Number((document.getElementById('forge-cha') || {}).value || 13),",
    "    proficientSkills: ((document.getElementById('forge-skills') || {}).value || '').split(',').map(function(s){ return s.trim().toLowerCase(); }).filter(Boolean)",
    "  };",
    "}",
    "function updateForgePreview() {",
    "  var el = document.getElementById('forge-preview-container');",
    "  if (!el) return;",
    "  if (uploadedForgeImageDataUrl && /^data:image\\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(uploadedForgeImageDataUrl)) {",
    "    el.innerHTML = '';",
    "    var img = document.createElement('img');",
    "    img.src = uploadedForgeImageDataUrl;",
    "    img.className = 'w-full h-full rounded-full object-cover border-4 border-amber-400 shadow-lg';",
    "    img.alt = 'Custom Hero Token';",
    "    el.appendChild(img);",
    "    return;",
    "  }",
    "  el.innerHTML = buildBrowserFoundryTokenSvg(readForgeForm());",
    "}",
    "function applyForgePreset(presetId) {",
    "  var p = FORGE_PRESETS.find(function(x){ return x.id === presetId; });",
    "  if (!p) return;",
    "  var isAdminUser = typeof currentAccount !== 'undefined' && currentAccount && currentAccount.role === 'ADMIN';",
    "  document.getElementById('forge-actor-type').value = isAdminUser ? p.actorType : 'HERO';",
    "  document.getElementById('forge-bezel-style').value = p.bezelStyle;",
    "  document.getElementById('forge-emblem').value = p.emblem;",
    "  document.getElementById('forge-name').value = p.name;",
    "  document.getElementById('forge-archetype').value = p.archetype;",
    "  document.getElementById('forge-primary-color').value = p.primaryColor;",
    "  document.getElementById('forge-accent-color').value = p.accentColor;",
    "  document.getElementById('forge-hp').value = p.hp;",
    "  document.getElementById('forge-ac').value = p.armorClass;",
    "  document.getElementById('forge-light').value = p.lightRadius;",
    "  document.getElementById('forge-str').value = p.attributes5e.str;",
    "  document.getElementById('forge-dex').value = p.attributes5e.dex;",
    "  document.getElementById('forge-con').value = p.attributes5e.con;",
    "  document.getElementById('forge-int').value = p.attributes5e.int;",
    "  document.getElementById('forge-wis').value = p.attributes5e.wis;",
    "  document.getElementById('forge-cha').value = p.attributes5e.cha;",
    "  document.getElementById('forge-skills').value = p.proficientSkills.join(', ');",
    "  updateForgePreview();",
    "}",
    "function openTokenForgeModal() {",
    "  var isAdminUser = typeof currentAccount !== 'undefined' && currentAccount && currentAccount.role === 'ADMIN';",
    "  var monOpt = document.getElementById('forge-option-monster');",
    "  var typeSel = document.getElementById('forge-actor-type');",
    "  if (monOpt) monOpt.classList.toggle('hidden', !isAdminUser);",
    "  if (!isAdminUser && typeSel) typeSel.value = 'HERO';",
    "  var targetSel = document.getElementById('forge-target-hero');",
    "  if (targetSel && typeof state !== 'undefined' && state.heroes) {",
    "    targetSel.innerHTML = '';",
    "    var defOpt = document.createElement('option');",
    "    defOpt.value = '';",
    "    defOpt.textContent = '✨ Create New Hero Character Token';",
    "    targetSel.appendChild(defOpt);",
    "    state.heroes.forEach(function(h){",
    "      var opt = document.createElement('option');",
    "      opt.value = String(h.id || '');",
    "      opt.textContent = '🛡️ Apply Token to ' + String(h.name || 'Hero');",
    "      targetSel.appendChild(opt);",
    "    });",
    "  }",
    "  updateForgePreview();",
    "  document.getElementById('token-forge-modal').classList.remove('hidden');",
    "}",
    "function closeTokenForgeModal() {",
    "  document.getElementById('token-forge-modal').classList.add('hidden');",
    "}",
    "async function forgeNewActorAndToken() {",
    "  var cfg = readForgeForm();",
    "  var isAdminUser = typeof currentAccount !== 'undefined' && currentAccount && currentAccount.role === 'ADMIN';",
    "  if (!isAdminUser) cfg.actorType = 'HERO';",
    "  if (typeof AudioEngine !== 'undefined') AudioEngine.playChestOpen();",
    "  await apiPost('/api/room/forge-actor', Object.assign({ roomCode: state.roomCode }, cfg));",
    "  closeTokenForgeModal();",
    "  if (typeof refreshCustomTokens === 'function') refreshCustomTokens();",
    "}",
  ].join("\n");
}

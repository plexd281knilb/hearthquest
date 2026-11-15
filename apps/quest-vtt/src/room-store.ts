import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  AmbientLightingMode,
  AmbientSoundscapeType,
  AmbientWeatherType,
  CharacterSheet,
  ContentRating,
  DiceInputMode,
  DiceRollResult,
  DieType,
  LoreEntryType,
  LoreRegistryEntry,
  RoomSessionState,
  RulesTier,
  SceneBackdropType,
  SkillId,
  SpellTemplate,
  WallSegment,
  resolveArchetypeAsset,
} from "@hearthquest/shared-types";
import {
  buildCoreCampaignLoreSeeds,
  computeSiblingSpotlightFairness,
  createBedtimeFreezeSnapshot,
  createCampaignSession,
  createDefaultZoneWalls,
  createStarterFamilySession,
  evaluateActionCardRoll,
  FAMILY_CAMPAIGNS,
  generateLevelScaledOneShot,
  generateProceduralMapLayout,
  rollHeroSkillCheck,
  rollRoomCombatInitiative,
} from "@hearthquest/srd-rules";
import {
  buildFoundryTokenSvg,
  TokenBezelStyle,
  TokenEmblemPreset,
} from "./token-forge-engine";

const rooms = new Map<string, RoomSessionState>();

export function getVttDatabasePath(): string {
  if (process.env.NODE_ENV === "test") {
    return path.join(process.cwd(), "data", ".test", "test-hearthquest.db");
  }
  const dataDir = process.env.HEARTHQUEST_DATA_DIR || path.join(process.cwd(), "data");
  return path.join(dataDir, "hearthquest.db");
}

function getLegacyRoomsJsonPath(): string {
  const dataDir = process.env.HEARTHQUEST_DATA_DIR || path.join(process.cwd(), "data");
  return path.join(dataDir, "rooms.json");
}

function withRoomDb<T>(fn: (db: DatabaseSync) => T): T {
  const dbPath = getVttDatabasePath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  try {
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA busy_timeout = 5000;");
    db.exec(`
      CREATE TABLE IF NOT EXISTS rooms (
        room_code TEXT PRIMARY KEY,
        state_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS lore_registry (
        id TEXT PRIMARY KEY,
        entry_type TEXT NOT NULL,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        biome TEXT NOT NULL,
        plot_premise TEXT NOT NULL,
        main_antagonist TEXT NOT NULL,
        key_locations_json TEXT NOT NULL,
        level_range TEXT NOT NULL,
        room_code TEXT,
        created_at TEXT NOT NULL
      );
    `);

    const seedStmt = db.prepare(
      `INSERT OR IGNORE INTO lore_registry (
        id, entry_type, title, slug, biome, plot_premise, main_antagonist,
        key_locations_json, level_range, room_code, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const seed of buildCoreCampaignLoreSeeds()) {
      seedStmt.run(
        seed.id,
        seed.entryType,
        seed.title,
        seed.slug,
        seed.biome,
        seed.plotPremise,
        seed.mainAntagonist,
        JSON.stringify(seed.keyLocations),
        seed.levelRange,
        seed.roomCode || null,
        seed.createdAt
      );
    }

    return fn(db);
  } finally {
    try {
      db.close();
    } catch {
      // Ignore close error
    }
  }
}

export function resetRoomsForTesting(): void {
  rooms.clear();
  try {
    if (fs.existsSync(getVttDatabasePath())) {
      withRoomDb((db) => {
        db.exec("DELETE FROM rooms;");
      });
    }
  } catch {
    // Non-fatal in test cleanup
  }
}

export function saveRoomsToDisk(): string {
  const dbPath = getVttDatabasePath();
  try {
    withRoomDb((db) => {
      const now = new Date().toISOString();
      const upsert = db.prepare(
        `INSERT INTO rooms (room_code, state_json, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(room_code) DO UPDATE SET
           state_json = excluded.state_json,
           updated_at = excluded.updated_at`
      );
      for (const [code, state] of rooms.entries()) {
        upsert.run(code.toUpperCase(), JSON.stringify(state), now);
      }
    });
  } catch {
    // Non-fatal in read-only environments
  }
  return dbPath;
}

export function loadRoomsFromDisk(): number {
  try {
    return withRoomDb((db) => {
      const rows = db
        .prepare("SELECT room_code, state_json FROM rooms")
        .all() as Array<{ room_code: string; state_json: string }>;
      let count = 0;
      for (const row of rows) {
        const roomState = JSON.parse(String(row.state_json)) as RoomSessionState;
        if (roomState && typeof roomState === "object" && roomState.roomCode) {
          rooms.set(String(row.room_code).toUpperCase(), roomState);
          count++;
        }
      }

      // One-time auto-migration from legacy rooms.json in production if SQLite table is empty
      if (count === 0 && process.env.NODE_ENV !== "test") {
        const legacyPath = getLegacyRoomsJsonPath();
        if (fs.existsSync(legacyPath)) {
          const parsed = JSON.parse(fs.readFileSync(legacyPath, "utf-8"));
          const mapObj: Record<string, RoomSessionState> = parsed?.rooms || parsed || {};
          const now = new Date().toISOString();
          const upsert = db.prepare(
            `INSERT INTO rooms (room_code, state_json, updated_at)
             VALUES (?, ?, ?)
             ON CONFLICT(room_code) DO UPDATE SET
               state_json = excluded.state_json,
               updated_at = excluded.updated_at`
          );
          for (const [code, roomState] of Object.entries(mapObj)) {
            if (roomState && typeof roomState === "object" && roomState.roomCode) {
              const upper = code.toUpperCase();
              rooms.set(upper, roomState);
              upsert.run(upper, JSON.stringify(roomState), now);
              count++;
            }
          }
        }
      }
      return count;
    });
  } catch {
    return 0;
  }
}

function autoPersistRooms(): void {
  if (process.env.NODE_ENV !== "test") {
    saveRoomsToDisk();
  }
}

if (process.env.NODE_ENV !== "test") {
  loadRoomsFromDisk();
}

export function generateJoinQrSvg(roomCode: string, joinUrl: string): string {
  const cleanCode = (roomCode || "DRGN").trim().toUpperCase();
  const seedText = `${cleanCode}:${joinUrl}`;
  const gridSize = 15;
  const cellSize = 10;
  const offset = 20;

  const isFinderCell = (r: number, c: number): boolean => {
    const inTopLeft = r < 5 && c < 5;
    const inTopRight = r < 5 && c >= gridSize - 5;
    const inBottomLeft = r >= gridSize - 5 && c < 5;
    return inTopLeft || inTopRight || inBottomLeft;
  };

  const isFinderFilled = (r: number, c: number): boolean => {
    const localR = r >= gridSize - 5 ? r - (gridSize - 5) : r;
    const localC = c >= gridSize - 5 ? c - (gridSize - 5) : c;
    if (localR === 0 || localR === 4 || localC === 0 || localC === 4) return true;
    if (localR === 2 && localC === 2) return true;
    return false;
  };

  let rects = "";
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      let filled = false;
      if (isFinderCell(r, c)) {
        filled = isFinderFilled(r, c);
      } else {
        const idx = (r * gridSize + c) % seedText.length;
        const charCode = seedText.charCodeAt(idx);
        filled = ((charCode + r * 7 + c * 13) & 1) === 1;
      }
      if (filled) {
        const x = offset + c * cellSize;
        const y = offset + r * cellSize;
        rects += `<rect x="${x}" y="${y}" width="${cellSize - 1}" height="${cellSize - 1}" rx="2" fill="#0f172a" />`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 225" width="190" height="225" role="img" aria-label="Join Room ${cleanCode} QR Code">
  <rect width="190" height="225" rx="16" fill="#ffffff" stroke="#f59e0b" stroke-width="4" />
  ${rects}
  <rect x="45" y="75" width="100" height="40" rx="8" fill="#0f172a" stroke="#f59e0b" stroke-width="2" />
  <text x="95" y="101" text-anchor="middle" fill="#fbbf24" font-family="monospace" font-weight="bold" font-size="20">${cleanCode}</text>
  <text x="95" y="192" text-anchor="middle" fill="#0f172a" font-family="sans-serif" font-weight="bold" font-size="11">ROOM: ${cleanCode}</text>
  <text x="95" y="209" text-anchor="middle" fill="#475569" font-family="monospace" font-size="8">${joinUrl}</text>
</svg>`;
}

export function getOrCreateRoom(roomCode = "DRGN"): RoomSessionState {
  const normalized = roomCode.trim().toUpperCase() || "DRGN";
  let room = rooms.get(normalized);
  if (!room) {
    room = createStarterFamilySession(normalized);
    rooms.set(normalized, room);
    autoPersistRooms();
  }
  if (!room.ambientLightMode) {
    room.ambientLightMode = "COZY_TWILIGHT";
  }
  if (!room.walls || room.walls.length === 0) {
    room.walls = createDefaultZoneWalls(room.zones);
  }
  if (!room.ambientWeather) {
    room.ambientWeather = "HEARTH_EMBERS";
  }
  if (!room.spellTemplates) {
    room.spellTemplates = [];
  }
  if (!room.ambientSoundscape) {
    room.ambientSoundscape = room.zones[0]?.ambientSoundscape ?? "COZY_TAVERN";
  }
  if (!room.sceneBackdrop) {
    room.sceneBackdrop = "HEARTH_TAVERN";
  }
  if (!room.combat) {
    room.combat = {
      isActive: false,
      round: 1,
      activeTurnIndex: 0,
      entries: [],
    };
  }
  return room;
}

export function moveRoomToken(params: {
  roomCode: string;
  tokenId: string;
  deltaX?: number;
  deltaY?: number;
  targetX?: number;
  targetY?: number;
}): RoomSessionState {
  const room = getOrCreateRoom(params.roomCode);
  if (room.isPausedForBedtime) return room;

  const token = room.tokens.find((t) => t.id === params.tokenId);
  if (!token) return room;

  const nextX =
    typeof params.targetX === "number"
      ? params.targetX
      : token.gridX + (params.deltaX || 0);
  const nextY =
    typeof params.targetY === "number"
      ? params.targetY
      : token.gridY + (params.deltaY || 0);

  token.gridX = Math.max(0, Math.min(room.gridCols - 1, nextX));
  token.gridY = Math.max(0, Math.min(room.gridRows - 1, nextY));
  autoPersistRooms();
  return room;
}

export function toggleRoomZoneFog(params: {
  roomCode: string;
  zoneId: string;
}): RoomSessionState {
  const room = getOrCreateRoom(params.roomCode);
  const zone = room.zones.find((z) => z.id === params.zoneId);
  if (zone) {
    zone.isRevealed = !zone.isRevealed;
    if (room.walls) {
      for (const w of room.walls) {
        if (w.isDoor && w.zoneId === zone.id) {
          w.isOpen = zone.isRevealed;
          w.blocksVision = !zone.isRevealed;
        }
      }
    }
    // If revealing the oven vault, unhide Chef Snickerdoodle
    if (zone.id === "zone-oven-vault" && zone.isRevealed) {
      const boss = room.tokens.find((t) => t.id === "tok-chef-boss");
      if (boss) boss.isHiddenFromPlayers = false;
    }
    autoPersistRooms();
  }
  return room;
}

export function advanceRoomStoryNode(params: {
  roomCode: string;
  targetNodeId: string;
  consequenceTag?: string;
}): RoomSessionState {
  const room = getOrCreateRoom(params.roomCode);
  const node = room.storyNodes.find((n) => n.id === params.targetNodeId);
  if (!node) return room;

  room.activeNodeId = node.id;
  if (params.consequenceTag && !room.storyFlags.includes(params.consequenceTag)) {
    room.storyFlags.push(params.consequenceTag);
  }

  // Auto-reveal the zone associated with the new story node
  const targetZone = room.zones.find((z) => z.id === node.sceneZoneId);
  if (targetZone) {
    targetZone.isRevealed = true;
    if (room.walls) {
      for (const w of room.walls) {
        if (w.isDoor && w.zoneId === targetZone.id) {
          w.isLocked = false;
          w.isOpen = true;
          w.blocksVision = false;
        }
      }
    }
    if (targetZone.id === "zone-oven-vault") {
      const boss = room.tokens.find((t) => t.id === "tok-chef-boss");
      if (boss) boss.isHiddenFromPlayers = false;
    }
  }

  autoPersistRooms();
  return room;
}

export function updateRoomSettings(params: {
  roomCode: string;
  rulesTier?: RulesTier;
  contentRating?: ContentRating;
  diceInputMode?: DiceInputMode;
}): RoomSessionState {
  const room = getOrCreateRoom(params.roomCode);
  if (params.rulesTier) room.rulesTier = params.rulesTier;
  if (params.contentRating) room.contentRating = params.contentRating;
  if (params.diceInputMode) room.diceInputMode = params.diceInputMode;
  autoPersistRooms();
  return room;
}

export function submitPlayerActionRoll(params: {
  roomCode: string;
  characterId: string;
  cardId: string;
  source: "PHYSICAL_DICE_TABLE" | "DIGITAL_3D_ROLLER";
  physicalRollValue?: number;
}): { room: RoomSessionState; roll?: DiceRollResult } {
  const room = getOrCreateRoom(params.roomCode);
  const hero = room.heroes.find((h) => h.id === params.characterId);
  if (!hero) return { room };

  const card = hero.actionCards.find((c) => c.id === params.cardId) || hero.actionCards[0];
  if (!card) return { room };

  const roll = evaluateActionCardRoll({
    character: hero,
    card,
    rulesTier: room.rulesTier,
    source: params.source,
    physicalRollValue: params.physicalRollValue,
  });

  room.rollHistory.unshift(roll);
  if (room.rollHistory.length > 25) {
    room.rollHistory.length = 25;
  }

  // Update Sibling Spotlight Fairness tracker
  const existing = room.spotlightRecords.find((r) => r.characterId === hero.id);
  if (existing) {
    existing.turnsTaken += 1;
    existing.lastActionAt = new Date().toISOString();
  }
  room.spotlightRecords = computeSiblingSpotlightFairness(
    room.heroes,
    room.spotlightRecords
  );

  autoPersistRooms();
  return { room, roll };
}

export function toggleRoomBedtimeFreeze(roomCode: string): RoomSessionState {
  const room = getOrCreateRoom(roomCode);
  if (!room.isPausedForBedtime) {
    room.isPausedForBedtime = true;
    room.bedtimeSnapshot = createBedtimeFreezeSnapshot(room);
  } else {
    room.isPausedForBedtime = false;
  }
  autoPersistRooms();
  return room;
}

export function addCustomHeroToRoom(params: {
  roomCode: string;
  name: string;
  playerName: string;
  playerAge: number;
  archetype: string;
  companionPet: string;
  avatarEmoji: string;
}): RoomSessionState {
  const room = getOrCreateRoom(params.roomCode);
  const id = `hero_${Date.now()}`;
  const archetypeAsset = resolveArchetypeAsset(params.archetype || "Forest Ranger");
  const newHero: CharacterSheet = {
    id,
    name: params.name || "Captain Sparkle",
    playerName: `${params.playerName || "Adventurer"} (Age ${params.playerAge || 8})`,
    playerAge: params.playerAge || 8,
    archetype: params.archetype || "Forest Ranger",
    companionPet: params.companionPet || "Bramble the Hedgehog",
    avatarEmoji: params.avatarEmoji || "🏹",
    assetPath: archetypeAsset,
    tokenColor: "#14b8a6",
    rulesTier: room.rulesTier,
    storybookStats: { brawn: 2, brains: 2, charm: 3, hearts: 3, maxHearts: 3 },
    attributes5e: {
      str: 13,
      dex: 16,
      con: 14,
      int: 12,
      wis: 15,
      cha: 14,
      hp: 13,
      maxHp: 13,
      armorClass: 15,
    },
    actionCards: [
      {
        id: `card_${Date.now()}_1`,
        title: "Acorn Trick Shot",
        subtitle: "Brawn / Ranged Action",
        icon: params.avatarEmoji || "🏹",
        colorTheme: "emerald",
        dieToRoll: "d20",
        bonusByTier: { STORYBOOK_D6: 1, APPRENTICE_5E_LITE: 4, STANDARD_5E: 5 },
        targetDifficultyByTier: { STORYBOOK_D6: 4, APPRENTICE_5E_LITE: 11, STANDARD_5E: 13 },
        description: "Bounce an enchanted acorn to ring a bell or bonk a target!",
        cozySuccessFlavor: "BULLSEYE! The enchanted acorn ricochets three times and hits the mark!",
        cozyFailForwardFlavor: "The acorn pops open into a friendly squirrel that chatters loudly!",
      },
      {
        id: `card_${Date.now()}_2`,
        title: `${params.companionPet || "Companion"} Teamwork`,
        subtitle: "Charm / Pet Helper",
        icon: "🐾",
        colorTheme: "amber",
        dieToRoll: "d20",
        bonusByTier: { STORYBOOK_D6: 1, APPRENTICE_5E_LITE: 4, STANDARD_5E: 5 },
        targetDifficultyByTier: { STORYBOOK_D6: 4, APPRENTICE_5E_LITE: 10, STANDARD_5E: 12 },
        description: "Team up with your pet companion to solve a obstacle!",
        cozySuccessFlavor: "Your companion leaps into action and saves the day!",
        cozyFailForwardFlavor: "Your pet does a silly backflip that makes everyone in the room laugh!",
      },
    ],
    inventory: [
      {
        id: `item_${Date.now()}`,
        name: "Lantern of Fireflies",
        icon: "🏮",
        description: "Shines with friendly green fireflies that love music.",
      },
    ],
  };

  room.heroes.push(newHero);
  room.tokens.push({
    id: `tok_${Date.now()}`,
    characterId: id,
    name: newHero.name,
    type: "HERO",
    avatarEmoji: newHero.avatarEmoji,
    assetPath: archetypeAsset,
    color: newHero.tokenColor,
    gridX: 0,
    gridY: Math.min(room.gridRows - 1, room.tokens.length),
    hp: 3,
    maxHp: 3,
    isHiddenFromPlayers: false,
    statusBadge: "INSPIRATION_STAR",
    lightRadius: 3.8,
    lightColor: newHero.tokenColor,
  });

  room.spotlightRecords = computeSiblingSpotlightFairness(
    room.heroes,
    room.spotlightRecords
  );
  autoPersistRooms();
  return room;
}

export function openRoomLootChest(params: {
  roomCode: string;
  tokenId: string;
  characterId?: string;
}): { room: RoomSessionState; rewardedItem?: { name: string; icon: string; description: string } } {
  const room = getOrCreateRoom(params.roomCode);
  const token = room.tokens.find((t) => t.id === params.tokenId);
  const hero = room.heroes.find((h) => h.id === params.characterId) || room.heroes[0];

  if (!token) return { room };

  token.isLootChest = true;
  token.isChestOpened = true;
  token.avatarEmoji = "✨";
  token.assetPath = "/assets/tokens/props/chest-open.svg";
  token.statusBadge = "INSPIRATION_STAR";

  const FUN_LOOT = [
    { name: "Cookie of Bravery", icon: "🍪", description: "Bite it for an instant burst of confidence!" },
    { name: "Glowstone of Whispers", icon: "🔮", description: "Softly illuminates dark corners with friendly sparkles." },
    { name: "Feather-Light Boots", icon: "🥾", description: "Allows the wearer to tiptoe without making a sound." },
    { name: "Cape of Fluttering", icon: "🧣", description: "Billows heroically even when there is no wind." },
    { name: "Compass of Wonder", icon: "🧭", description: "Always points toward the nearest exciting family snack!" },
  ];
  const item = FUN_LOOT[Math.floor(Math.random() * FUN_LOOT.length)];
  token.lootRewardName = item.name;

  if (hero) {
    hero.inventory.push({
      id: `item_loot_${Date.now()}`,
      name: item.name,
      icon: item.icon,
      description: item.description,
    });
    hero.levelStars = Math.min(5, (hero.levelStars || 1) + 1);
  }

  autoPersistRooms();
  return { room, rewardedItem: item };
}

export function switchRoomCampaign(params: {
  roomCode: string;
  campaignId: string;
}): RoomSessionState {
  const code = (params.roomCode || "DRGN").toUpperCase().slice(0, 4);
  const existing = rooms.get(code);
  const nextSession = createCampaignSession(code, params.campaignId);
  if (existing) {
    nextSession.rulesTier = existing.rulesTier;
    nextSession.contentRating = existing.contentRating;
    nextSession.diceInputMode = existing.diceInputMode;
  }
  rooms.set(code, nextSession);
  autoPersistRooms();
  return nextSession;
}

export function regenerateRoomProceduralMap(params: {
  roomCode: string;
  theme?: "BAKERY" | "FOREST_TREEHOUSE" | "STARLIGHT_SHIP";
}): RoomSessionState {
  const room = getOrCreateRoom(params.roomCode);
  const theme =
    params.theme ||
    (room.campaignId === "camp-clockwork-treehouse"
      ? "FOREST_TREEHOUSE"
      : room.campaignId === "camp-starlight-otter"
      ? "STARLIGHT_SHIP"
      : "BAKERY");
  const layout = generateProceduralMapLayout(theme);
  room.zones = layout.zones;
  room.tokens = layout.tokens;
  room.walls = createDefaultZoneWalls(layout.zones);
  autoPersistRooms();
  return room;
}

/**
 * Updates the room's Foundry-style dynamic lighting mode or toggles an interactive door segment.
 */
export function updateRoomLighting(params: {
  roomCode: string;
  ambientLightMode?: AmbientLightingMode;
  toggleDoorId?: string;
  toggleLockDoorId?: string;
  lockDc?: number;
}): RoomSessionState {
  const room = getOrCreateRoom(params.roomCode);
  if (params.ambientLightMode) {
    room.ambientLightMode = params.ambientLightMode;
  }
  if (params.toggleLockDoorId && room.walls) {
    const door = room.walls.find((w) => w.id === params.toggleLockDoorId && w.isDoor);
    if (door) {
      door.isLocked = !door.isLocked;
      if (door.isLocked) {
        door.isOpen = false;
        door.blocksVision = true;
        door.lockDc = params.lockDc ?? door.lockDc ?? 12;
        door.lockLabel = door.lockLabel || "Brass Tumbler Lock";
      }
    }
  }
  if (params.toggleDoorId && room.walls) {
    const door = room.walls.find((w) => w.id === params.toggleDoorId && w.isDoor);
    if (door) {
      door.isOpen = !door.isOpen;
      if (door.isOpen) {
        door.isLocked = false;
      }
      door.blocksVision = !door.isOpen;
    }
  }
  autoPersistRooms();
  return room;
}

/**
 * Character Door Interaction & Lockpicking:
 * - Unlocked doors swing open/closed freely and reveal attached room lighting when opened.
 * - Locked doors require a Sleight of Hand lockpick check by the acting character to unlock & open.
 */
export function attemptInteractDoor(params: {
  roomCode: string;
  doorId: string;
  characterId?: string;
  rawRollOverride?: number;
}): {
  room: RoomSessionState;
  door?: WallSegment;
  unlockedNow: boolean;
  openedNow: boolean;
  lockedBlocked: boolean;
  roll?: DiceRollResult;
  message: string;
} {
  const room = getOrCreateRoom(params.roomCode);
  const door = (room.walls || []).find((w) => w.id === params.doorId && w.isDoor);
  if (!door) {
    return {
      room,
      unlockedNow: false,
      openedNow: false,
      lockedBlocked: false,
      message: "Door not found on this map.",
    };
  }

  // Case 1: Unlocked door — character can open/close freely
  if (!door.isLocked) {
    door.isOpen = !door.isOpen;
    door.blocksVision = !door.isOpen;
    if (door.isOpen && door.zoneId) {
      const zone = room.zones.find((z) => z.id === door.zoneId);
      if (zone) zone.isRevealed = true;
    }
    autoPersistRooms();
    return {
      room,
      door,
      unlockedNow: false,
      openedNow: Boolean(door.isOpen),
      lockedBlocked: false,
      message: door.isOpen ? "🚪 Door swung open cleanly!" : "🚪 Door closed.",
    };
  }

  // Case 2: Locked door — must pass a Sleight of Hand lockpick check
  const hero = room.heroes.find((h) => h.id === params.characterId) || room.heroes[0];
  const lockName = door.lockLabel || "Locked Door";
  const roll = rollHeroSkillCheck({
    hero,
    skillId: "sleight_of_hand",
    rulesTier: room.rulesTier,
    targetDcOverride: door.lockDc ?? 12,
    actionLabelOverride: `🗝️ Lockpick: ${lockName}`,
    rawRollOverride: params.rawRollOverride,
  });

  room.rollHistory = [roll, ...room.rollHistory].slice(0, 25);
  const existing = room.spotlightRecords.find((r) => r.characterId === hero.id);
  if (existing) {
    existing.turnsTaken += 1;
    existing.lastActionAt = new Date().toISOString();
  }
  room.spotlightRecords = computeSiblingSpotlightFairness(room.heroes, room.spotlightRecords);

  if (roll.succeeded) {
    door.isLocked = false;
    door.isOpen = true;
    door.blocksVision = false;
    if (door.zoneId) {
      const zone = room.zones.find((z) => z.id === door.zoneId);
      if (zone) zone.isRevealed = true;
    }
    autoPersistRooms();
    return {
      room,
      door,
      unlockedNow: true,
      openedNow: true,
      lockedBlocked: false,
      roll,
      message: `🔓 Click-clack! ${hero.name} picked the ${lockName} (Total ${roll.total} vs DC ${roll.targetDC}) and opened the door!`,
    };
  }

  door.isOpen = false;
  door.blocksVision = true;
  autoPersistRooms();
  return {
    room,
    door,
    unlockedNow: false,
    openedNow: false,
    lockedBlocked: true,
    roll,
    message: `🔐 Tumbler jammed! ${hero.name} rolled ${roll.total} vs DC ${roll.targetDC}. Try again or let another hero assist!`,
  };
}

/**
 * Rolls any polyhedral die (d4, d6, d8, d10, d12, d20) from the Foundry-style
 * quick dice tray and records it into the room's synchronized rollHistory.
 */
export function submitQuickPolyhedralRoll(params: {
  roomCode: string;
  dieType: DieType;
  characterId?: string;
}): { room: RoomSessionState; roll: DiceRollResult } {
  const room = getOrCreateRoom(params.roomCode);
  const hero = room.heroes.find((h) => h.id === params.characterId) || room.heroes[0];
  const DIE_MAX: Record<DieType, number> = {
    d4: 4,
    d6: 6,
    d8: 8,
    d10: 10,
    d12: 12,
    d20: 20,
  };
  const dieType: DieType = DIE_MAX[params.dieType] ? params.dieType : "d20";
  const maxFace = DIE_MAX[dieType];
  const rawRoll = Math.floor(Math.random() * maxFace) + 1;
  const isCrit = rawRoll === maxFace;

  const roll: DiceRollResult = {
    id: `qroll_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    characterId: hero?.id || "gm",
    playerName: hero?.playerName || "Game Master",
    characterName: hero?.name || "Tabletop Dice",
    actionTitle: `Quick ${dieType.toUpperCase()} Roll`,
    dieType,
    source: "DIGITAL_3D_ROLLER",
    rawRoll,
    modifier: 0,
    total: rawRoll,
    targetDC: Math.ceil(maxFace / 2),
    succeeded: rawRoll >= Math.ceil(maxFace / 2),
    isCriticalSuccess: isCrit,
    narrativeOutcome: isCrit
      ? `✨ Rolled a glowing maximum ${rawRoll} on ${dieType}!`
      : `🎲 Tossed a ${dieType} and landed on ${rawRoll}.`,
    timestamp: new Date().toISOString(),
  };

  room.rollHistory = [roll, ...room.rollHistory].slice(0, 15);
  autoPersistRooms();
  return { room, roll };
}

/**
 * Updates ambient tabletop weather particles and places/clears Spell AoE Templates (Circle/Cone/Line).
 */
export function updateRoomToolsAndWeather(params: {
  roomCode: string;
  ambientWeather?: AmbientWeatherType;
  addTemplate?: Omit<SpellTemplate, "id">;
  clearTemplates?: boolean;
}): RoomSessionState {
  const room = getOrCreateRoom(params.roomCode);
  if (params.ambientWeather) {
    room.ambientWeather = params.ambientWeather;
  }
  if (params.clearTemplates) {
    room.spellTemplates = [];
  }
  if (params.addTemplate) {
    const existing = room.spellTemplates || [];
    const template: SpellTemplate = {
      id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ...params.addTemplate,
    };
    room.spellTemplates = [...existing.slice(-7), template];
  }
  autoPersistRooms();
  return room;
}

/**
 * Returns the Unraid disk directory for personal custom tokens (/app/data/custom-tokens).
 */
export function getCustomTokensDir(): string {
  if (process.env.NODE_ENV === "test") {
    return path.join(process.cwd(), "data", ".test", "custom-tokens");
  }
  const dataDir = process.env.HEARTHQUEST_DATA_DIR || path.join(process.cwd(), "data");
  return path.join(dataDir, "custom-tokens");
}

/**
 * Scans /app/data/custom-tokens for personal token images dropped on Unraid.
 */
export function listCustomTokenAssets(): Array<{ filename: string; name: string; url: string }> {
  try {
    const dir = getCustomTokensDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const files = fs.readdirSync(dir);
    const allowedExt = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg"]);
    return files
      .filter((f) => allowedExt.has(path.extname(f).toLowerCase()))
      .map((filename) => ({
        filename,
        name: path.basename(filename, path.extname(filename)).replace(/[-_]+/g, " "),
        url: `/custom-tokens/${encodeURIComponent(filename)}`,
      }));
  } catch {
    return [];
  }
}

/**
 * Spawns a custom user token (from Unraid disk drop) onto the tactical battlemap.
 */
export function spawnCustomTokenInRoom(params: {
  roomCode: string;
  name: string;
  assetUrl: string;
  type?: "HERO" | "NPC" | "MONSTER" | "PROP";
  gridX?: number;
  gridY?: number;
}): RoomSessionState {
  const room = getOrCreateRoom(params.roomCode);
  room.tokens.push({
    id: `tok_custom_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    name: params.name || "Custom Companion",
    type: params.type || "NPC",
    avatarEmoji: "🖼️",
    assetPath: params.assetUrl,
    color: params.type === "MONSTER" ? "#ef4444" : "#38bdf8",
    gridX: typeof params.gridX === "number" ? params.gridX : 2,
    gridY: typeof params.gridY === "number" ? params.gridY : 2,
    hp: 3,
    maxHp: 3,
    isHiddenFromPlayers: false,
    lightRadius: params.type === "HERO" ? 3.5 : 0,
    lightColor: "#38bdf8",
  });
  autoPersistRooms();
  return room;
}

/**
 * Foundry-style Combat Tracker actions: Roll Initiative, Advance Turn, or End Combat.
 */
export function updateRoomCombat(params: {
  roomCode: string;
  action: "ROLL_INITIATIVE" | "NEXT_TURN" | "END_COMBAT";
}): RoomSessionState {
  const room = getOrCreateRoom(params.roomCode);
  if (params.action === "ROLL_INITIATIVE") {
    room.combat = rollRoomCombatInitiative(room.tokens, room.heroes);
  } else if (params.action === "NEXT_TURN") {
    if (!room.combat || room.combat.entries.length === 0) {
      room.combat = rollRoomCombatInitiative(room.tokens, room.heroes);
    } else {
      room.combat.isActive = true;
      const nextIdx = room.combat.activeTurnIndex + 1;
      if (nextIdx >= room.combat.entries.length) {
        room.combat.activeTurnIndex = 0;
        room.combat.round += 1;
      } else {
        room.combat.activeTurnIndex = nextIdx;
      }
    }
  } else if (params.action === "END_COMBAT") {
    room.combat = {
      isActive: false,
      round: 1,
      activeTurnIndex: 0,
      entries: [],
    };
  }
  autoPersistRooms();
  return room;
}

/**
 * Rolls a 5e or Storybook Skill Check for a hero directly from the Character Sheet modal.
 */
export function submitHeroSkillRoll(params: {
  roomCode: string;
  characterId: string;
  skillId: SkillId;
}): { room: RoomSessionState; roll: DiceRollResult } {
  const room = getOrCreateRoom(params.roomCode);
  const hero = room.heroes.find((h) => h.id === params.characterId) || room.heroes[0];
  const roll = rollHeroSkillCheck({
    hero,
    skillId: params.skillId,
    rulesTier: room.rulesTier,
  });
  room.rollHistory = [roll, ...room.rollHistory].slice(0, 25);
  const existing = room.spotlightRecords.find((r) => r.characterId === hero.id);
  if (existing) {
    existing.turnsTaken += 1;
    existing.lastActionAt = new Date().toISOString();
  }
  room.spotlightRecords = computeSiblingSpotlightFairness(room.heroes, room.spotlightRecords);
  autoPersistRooms();
  return { room, roll };
}

/**
 * Updates persistent room Ambient Soundscape and Scenic Tabletop Backdrop.
 */
export function updateRoomAtmosphere(params: {
  roomCode: string;
  ambientSoundscape?: AmbientSoundscapeType;
  sceneBackdrop?: SceneBackdropType;
}): RoomSessionState {
  const room = getOrCreateRoom(params.roomCode);
  if (params.ambientSoundscape) {
    room.ambientSoundscape = params.ambientSoundscape;
  }
  if (params.sceneBackdrop) {
    room.sceneBackdrop = params.sceneBackdrop;
  }
  autoPersistRooms();
  return room;
}

/**
 * Foundry Actor & Token Forge:
 * Builds a custom beveled circular SVG token, persists it to /app/data/custom-tokens,
 * registers a new CharacterSheet (if HERO) or Monster Token, and spawns it onto the grid.
 */
export function forgeActorAndTokenInRoom(params: {
  roomCode: string;
  actorType: "HERO" | "MONSTER";
  name: string;
  archetype?: string;
  bezelStyle?: TokenBezelStyle;
  emblem?: TokenEmblemPreset;
  primaryColor?: string;
  accentColor?: string;
  hp?: number;
  armorClass?: number;
  lightRadius?: number;
  gridX?: number;
  gridY?: number;
  str?: number;
  dex?: number;
  con?: number;
  int?: number;
  wis?: number;
  cha?: number;
  proficientSkills?: SkillId[];
}): { room: RoomSessionState; tokenAssetUrl: string; tokenFilePath: string } {
  const room = getOrCreateRoom(params.roomCode);
  const safeName = (params.name || "Forged Adventurer").trim();
  const slug =
    safeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
    "forged-token";
  const filename = `forge-${slug}-${Date.now().toString(36)}.svg`;
  const customDir = getCustomTokensDir();
  if (!fs.existsSync(customDir)) {
    fs.mkdirSync(customDir, { recursive: true });
  }
  const tokenFilePath = path.join(customDir, filename);
  const svgContent = buildFoundryTokenSvg({
    name: safeName,
    actorType: params.actorType,
    bezelStyle: params.bezelStyle || "ANTIQUE_BRASS",
    emblem:
      params.emblem ||
      (params.actorType === "MONSTER" ? "DRAGON_HEAD" : "KNIGHT_HELM"),
    primaryColor: params.primaryColor || "#d97706",
    accentColor: params.accentColor || "#fde047",
  });
  fs.writeFileSync(tokenFilePath, svgContent, "utf-8");

  const tokenAssetUrl = `/custom-tokens/${encodeURIComponent(filename)}`;
  const maxHp = Math.max(1, Number(params.hp || (params.actorType === "MONSTER" ? 24 : 20)));
  const ac = Math.max(8, Number(params.armorClass || 14));
  const gridX = Math.max(0, Math.min(9, Number(params.gridX ?? 2)));
  const gridY = Math.max(0, Math.min(5, Number(params.gridY ?? 2)));
  const lightRadius = Math.max(0, Number(params.lightRadius ?? (params.actorType === "HERO" ? 3.5 : 0)));

  let characterId: string | undefined;
  if (params.actorType === "HERO") {
    characterId = `hero_forged_${Date.now()}`;
    const str = Number(params.str || 14);
    const dex = Number(params.dex || 12);
    const con = Number(params.con || 14);
    const int = Number(params.int || 10);
    const wis = Number(params.wis || 12);
    const cha = Number(params.cha || 13);
    const baseHero = createStarterFamilySession().heroes[0];
    const clonedCards = baseHero ? JSON.parse(JSON.stringify(baseHero.actionCards)) : [];
    const newHero: CharacterSheet = {
      id: characterId,
      name: safeName,
      playerName: "Table Hero",
      playerAge: 10,
      archetype: params.archetype || "Foundry Champion",
      companionPet: "Ember Fox",
      avatarEmoji: "🛡️",
      tokenColor: params.primaryColor || "#d97706",
      assetPath: tokenAssetUrl,
      rulesTier: room.rulesTier,
      storybookStats: {
        brawn: Math.max(1, Math.floor((str - 8) / 2)),
        brains: Math.max(1, Math.floor((Math.max(int, wis) - 8) / 2)),
        charm: Math.max(1, Math.floor((cha - 8) / 2)),
        hearts: 3,
        maxHearts: 3,
      },
      attributes5e: {
        str,
        dex,
        con,
        int,
        wis,
        cha,
        hp: maxHp,
        maxHp,
        armorClass: ac,
      },
      proficientSkills:
        params.proficientSkills && params.proficientSkills.length > 0
          ? params.proficientSkills
          : ["athletics", "perception", "persuasion"],
      actionCards: clonedCards,
      inventory: baseHero ? JSON.parse(JSON.stringify(baseHero.inventory)) : [],
      levelStars: 1,
      petTrait: "Forged in the Foundry Workshop to illuminate dark corridors!",
    };
    room.heroes.push(newHero);
    room.spotlightRecords = computeSiblingSpotlightFairness(
      room.heroes,
      room.spotlightRecords
    );
  }

  room.tokens.push({
    id: `tok_forge_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    characterId,
    name: safeName,
    type: params.actorType === "MONSTER" ? "MONSTER" : "HERO",
    avatarEmoji: params.actorType === "MONSTER" ? "🐉" : "🛡️",
    assetPath: tokenAssetUrl,
    color: params.primaryColor || "#d97706",
    gridX,
    gridY,
    hp: maxHp,
    maxHp,
    isHiddenFromPlayers: false,
    lightRadius,
    lightColor: params.accentColor || "#fbbf24",
  });

  autoPersistRooms();
  return { room, tokenAssetUrl, tokenFilePath };
}

/**
 * Generates a unique, party-level-scaled procedural One-Shot adventure for the table
 * and logs it in SQLite `lore_registry` so plots, villains, and zones never overlap
 * with core campaigns or prior One-Shots.
 */
export function generateOneShotInRoom(roomCode: string): {
  room: RoomSessionState;
  loreEntry: LoreRegistryEntry;
  partyLevel: number;
} {
  const room = getOrCreateRoom(roomCode);
  const generated = withRoomDb((db) => {
    const existingRows = db
      .prepare("SELECT * FROM lore_registry ORDER BY created_at DESC")
      .all() as Array<Record<string, any>>;
    const existingLore: LoreRegistryEntry[] = existingRows.map((r) => ({
      id: String(r.id),
      entryType: r.entry_type as LoreEntryType,
      title: String(r.title),
      slug: String(r.slug),
      biome: String(r.biome),
      plotPremise: String(r.plot_premise),
      mainAntagonist: String(r.main_antagonist),
      keyLocations: JSON.parse(String(r.key_locations_json || "[]")),
      levelRange: String(r.level_range),
      roomCode: r.room_code ? String(r.room_code) : undefined,
      createdAt: String(r.created_at),
    }));

    const out = generateLevelScaledOneShot({
      roomCode: room.roomCode,
      heroes: room.heroes,
      existingLore,
    });

    db.prepare(
      `INSERT OR IGNORE INTO lore_registry (
        id, entry_type, title, slug, biome, plot_premise, main_antagonist,
        key_locations_json, level_range, room_code, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      out.loreEntry.id,
      out.loreEntry.entryType,
      out.loreEntry.title,
      out.loreEntry.slug,
      out.loreEntry.biome,
      out.loreEntry.plotPremise,
      out.loreEntry.mainAntagonist,
      JSON.stringify(out.loreEntry.keyLocations),
      out.loreEntry.levelRange,
      out.loreEntry.roomCode || room.roomCode,
      out.loreEntry.createdAt
    );

    return out;
  });

  room.campaignId = generated.campaignId;
  room.campaignTitle = generated.campaignTitle;
  room.partyLevel = generated.partyLevel;
  room.isOneShot = true;
  room.activeNodeId = generated.storyNodes[0]?.id || room.activeNodeId;
  room.zones = generated.zones;
  room.tokens = generated.tokens;
  room.walls = generated.walls;
  room.storyNodes = generated.storyNodes;
  room.sceneBackdrop = generated.blueprint.backdrop;
  room.ambientWeather = generated.blueprint.weather;
  room.ambientSoundscape = generated.blueprint.soundscape;
  room.combat = undefined;

  autoPersistRooms();
  return {
    room,
    loreEntry: generated.loreEntry,
    partyLevel: generated.partyLevel,
  };
}

export { FAMILY_CAMPAIGNS };

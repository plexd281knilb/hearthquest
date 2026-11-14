import fs from "node:fs";
import path from "node:path";
import {
  CharacterSheet,
  ContentRating,
  DiceInputMode,
  DiceRollResult,
  RoomSessionState,
  RulesTier,
} from "@hearthquest/shared-types";
import {
  computeSiblingSpotlightFairness,
  createBedtimeFreezeSnapshot,
  createCampaignSession,
  createStarterFamilySession,
  evaluateActionCardRoll,
  FAMILY_CAMPAIGNS,
  generateProceduralMapLayout,
} from "@hearthquest/srd-rules";

const rooms = new Map<string, RoomSessionState>();

function getRoomsFilePath(): string {
  if (process.env.NODE_ENV === "test") {
    const testDir = path.join(process.cwd(), "data", ".test");
    return path.join(testDir, "test-rooms.json");
  }
  const dataDir = process.env.HEARTHQUEST_DATA_DIR || path.join(process.cwd(), "data");
  return path.join(dataDir, "rooms.json");
}

export function resetRoomsForTesting(): void {
  rooms.clear();
}

export function saveRoomsToDisk(): string {
  const filePath = getRoomsFilePath();
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const serializedRooms: Record<string, RoomSessionState> = {};
    for (const [code, state] of rooms.entries()) {
      serializedRooms[code] = state;
    }
    fs.writeFileSync(
      filePath,
      JSON.stringify(
        {
          updatedAt: new Date().toISOString(),
          rooms: serializedRooms,
        },
        null,
        2
      ),
      "utf-8"
    );
  } catch {
    // Non-fatal in read-only environments
  }
  return filePath;
}

export function loadRoomsFromDisk(): number {
  const filePath = getRoomsFilePath();
  try {
    if (!fs.existsSync(filePath)) return 0;
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    const mapObj: Record<string, RoomSessionState> = parsed?.rooms || parsed || {};
    let count = 0;
    for (const [code, roomState] of Object.entries(mapObj)) {
      if (roomState && typeof roomState === "object" && roomState.roomCode) {
        rooms.set(code.toUpperCase(), roomState);
        count++;
      }
    }
    return count;
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
  const newHero: CharacterSheet = {
    id,
    name: params.name || "Captain Sparkle",
    playerName: `${params.playerName || "Adventurer"} (Age ${params.playerAge || 8})`,
    playerAge: params.playerAge || 8,
    archetype: params.archetype || "Forest Ranger",
    companionPet: params.companionPet || "Bramble the Hedgehog",
    avatarEmoji: params.avatarEmoji || "🏹",
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
    color: newHero.tokenColor,
    gridX: 0,
    gridY: Math.min(room.gridRows - 1, room.tokens.length),
    hp: 3,
    maxHp: 3,
    isHiddenFromPlayers: false,
    statusBadge: "INSPIRATION_STAR",
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
  autoPersistRooms();
  return room;
}

export { FAMILY_CAMPAIGNS };

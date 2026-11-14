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
  createStarterFamilySession,
  evaluateActionCardRoll,
} from "@hearthquest/srd-rules";

const rooms = new Map<string, RoomSessionState>();

export function getOrCreateRoom(roomCode = "DRGN"): RoomSessionState {
  const normalized = roomCode.trim().toUpperCase() || "DRGN";
  let room = rooms.get(normalized);
  if (!room) {
    room = createStarterFamilySession(normalized);
    rooms.set(normalized, room);
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
  });

  room.spotlightRecords = computeSiblingSpotlightFairness(
    room.heroes,
    room.spotlightRecords
  );
  return room;
}

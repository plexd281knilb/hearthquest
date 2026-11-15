import {
  ActionCard,
  AgeGroupPreset,
  AmbientLightingMode,
  AmbientSoundscapeType,
  AmbientWeatherType,
  BedtimeFreezeSnapshot,
  CharacterSheet,
  CombatState,
  ContentRating,
  DiceRollResult,
  DieType,
  DifficultyPreset,
  FamilyCampaignTemplate,
  GroundTileTheme,
  InitiativeEntry,
  LoreRegistryEntry,
  MapPropPlacement,
  MapRoomZone,
  MapToken,
  MonsterStatBlock5e,
  PlayerSpotlightRecord,
  RoomSessionState,
  RulesTier,
  SceneBackdropType,
  SkillDefinition,
  SkillId,
  StoryBranchChoice,
  StoryBranchNode,
  StoryRpPrompt,
  WallSegment,
  HEARTHQUEST_ASSETS,
  resolveAreaMapAsset,
  resolveSceneBackdropAsset,
  resolveTokenAsset,
} from "@hearthquest/shared-types";

export type { FamilyCampaignTemplate };

export const SRD_51_CC_BY_40_ATTRIBUTION =
  'This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.';

const DIE_MAX: Record<DieType, number> = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20,
};

/**
 * SRD 5.1 Base Monster Stat Block Catalog (CC-BY-4.0).
 */
export const SRD_5E_MONSTERS: Record<string, MonsterStatBlock5e> = {
  goblin: {
    creatureName: "Goblin",
    sizeTypeAlignment: "Small humanoid (goblinoid), neutral evil",
    armorClass: 15,
    maxHp: 7,
    hitDice: "2d6",
    speed: "30 ft.",
    abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
    challengeRating: "1/4",
    xp: 50,
    traits: ["Nimble Escape: Can take Disengage or Hide as a bonus action on each turn."],
    actions: [
      { name: "Scimitar", attackBonus: 4, damageDice: "1d6 + 2", damageType: "slashing", description: "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage." },
      { name: "Shortbow", attackBonus: 4, damageDice: "1d6 + 2", damageType: "piercing", description: "Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 (1d6 + 2) piercing damage." },
    ],
  },
  goblin_boss: {
    creatureName: "Goblin Boss",
    sizeTypeAlignment: "Small humanoid (goblinoid), neutral evil",
    armorClass: 17,
    maxHp: 21,
    hitDice: "6d6",
    speed: "30 ft.",
    abilities: { str: 10, dex: 14, con: 10, int: 10, wis: 8, cha: 10 },
    challengeRating: "1",
    xp: 200,
    traits: ["Nimble Escape: Bonus action Disengage or Hide.", "Redirect Attack: When targeted, swaps places with an ally within 5 ft."],
    actions: [
      { name: "Multiattack", attackBonus: 4, damageDice: "2x (1d6 + 2)", damageType: "slashing", description: "Makes two attacks with its scimitar (second attack at disadvantage)." },
      { name: "Javelin", attackBonus: 2, damageDice: "1d6", damageType: "piercing", description: "Melee or Ranged Weapon Attack: +2 to hit, reach 5 ft. or range 30/120 ft." },
    ],
  },
  wolf: {
    creatureName: "Wolf",
    sizeTypeAlignment: "Medium beast, unaligned",
    armorClass: 13,
    maxHp: 11,
    hitDice: "2d8 + 2",
    speed: "40 ft.",
    abilities: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 },
    challengeRating: "1/4",
    xp: 50,
    traits: ["Keen Hearing and Smell: Advantage on Wisdom (Perception) checks relying on hearing or smell.", "Pack Tactics: Advantage on attack rolls if an ally is within 5 ft. of target."],
    actions: [
      { name: "Bite", attackBonus: 4, damageDice: "2d4 + 2", damageType: "piercing", description: "Melee Weapon Attack: +4 to hit, reach 5 ft. Hit: 7 (2d4 + 2) piercing damage; target must succeed on DC 11 Strength save or be knocked prone." },
    ],
  },
  bugbear: {
    creatureName: "Bugbear",
    sizeTypeAlignment: "Medium humanoid (goblinoid), chaotic evil",
    armorClass: 16,
    maxHp: 27,
    hitDice: "5d8 + 5",
    speed: "30 ft.",
    abilities: { str: 15, dex: 14, con: 13, int: 8, wis: 11, cha: 9 },
    challengeRating: "1",
    xp: 200,
    traits: ["Brute: Melee weapon deals one extra die of damage on a hit.", "Surprise Attack: +2d6 damage on the first turn against a surprised target."],
    actions: [
      { name: "Morningstar", attackBonus: 4, damageDice: "2d8 + 2", damageType: "piercing", description: "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 11 (2d8 + 2) piercing damage." },
      { name: "Javelin", attackBonus: 4, damageDice: "1d6 + 2", damageType: "piercing", description: "Ranged Weapon Attack: +4 to hit, range 30/120 ft. Hit: 5 (1d6 + 2) piercing damage." },
    ],
  },
  bandit: {
    creatureName: "Bandit",
    sizeTypeAlignment: "Medium humanoid (any race), any non-lawful alignment",
    armorClass: 12,
    maxHp: 11,
    hitDice: "2d8 + 2",
    speed: "30 ft.",
    abilities: { str: 11, dex: 12, con: 12, int: 10, wis: 10, cha: 10 },
    challengeRating: "1/8",
    xp: 25,
    actions: [
      { name: "Scimitar", attackBonus: 3, damageDice: "1d6 + 1", damageType: "slashing", description: "Melee Weapon Attack: +3 to hit, reach 5 ft. Hit: 4 (1d6 + 1) slashing damage." },
      { name: "Light Crossbow", attackBonus: 3, damageDice: "1d8 + 1", damageType: "piercing", description: "Ranged Weapon Attack: +3 to hit, range 80/320 ft. Hit: 5 (1d8 + 1) piercing damage." },
    ],
  },
  bandit_captain: {
    creatureName: "Bandit Captain",
    sizeTypeAlignment: "Medium humanoid (any race), any non-lawful alignment",
    armorClass: 15,
    maxHp: 65,
    hitDice: "10d8 + 20",
    speed: "30 ft.",
    abilities: { str: 15, dex: 16, con: 14, int: 14, wis: 11, cha: 14 },
    challengeRating: "2",
    xp: 450,
    traits: ["Parry (Reaction): Adds +2 to AC against one melee attack that would hit it."],
    actions: [
      { name: "Multiattack", attackBonus: 5, damageDice: "2x Scimitar + Dagger", damageType: "slashing", description: "Makes three melee attacks: two with its scimitar and one with its dagger." },
      { name: "Scimitar", attackBonus: 5, damageDice: "1d6 + 3", damageType: "slashing", description: "Melee Weapon Attack: +5 to hit, reach 5 ft. Hit: 6 (1d6 + 3) slashing damage." },
    ],
  },
  animated_armor: {
    creatureName: "Animated Armor",
    sizeTypeAlignment: "Medium construct, unaligned",
    armorClass: 18,
    maxHp: 33,
    hitDice: "6d8 + 6",
    speed: "25 ft.",
    abilities: { str: 14, dex: 11, con: 13, int: 1, wis: 3, cha: 1 },
    challengeRating: "1",
    xp: 200,
    traits: ["Antimagic Susceptibility: Incapacitated in an antimagic field.", "False Appearance: Indistinguishable from a normal suit of armor while motionless."],
    actions: [
      { name: "Multiattack", attackBonus: 4, damageDice: "2x (1d6 + 2)", damageType: "bludgeoning", description: "Makes two melee slam attacks." },
    ],
  },
  skeleton: {
    creatureName: "Skeleton",
    sizeTypeAlignment: "Medium undead, lawful evil",
    armorClass: 13,
    maxHp: 13,
    hitDice: "2d8 + 4",
    speed: "30 ft.",
    abilities: { str: 10, dex: 14, con: 15, int: 6, wis: 8, cha: 5 },
    challengeRating: "1/4",
    xp: 50,
    traits: ["Damage Vulnerabilities: bludgeoning", "Damage Immunities: poison"],
    actions: [
      { name: "Shortsword", attackBonus: 4, damageDice: "1d6 + 2", damageType: "piercing", description: "Melee Weapon Attack: +4 to hit, reach 5 ft. Hit: 5 (1d6 + 2) piercing damage." },
      { name: "Shortbow", attackBonus: 4, damageDice: "1d6 + 2", damageType: "piercing", description: "Ranged Weapon Attack: +4 to hit, range 80/320 ft. Hit: 5 (1d6 + 2) piercing damage." },
    ],
  },
  specter: {
    creatureName: "Specter",
    sizeTypeAlignment: "Medium undead, chaotic evil",
    armorClass: 12,
    maxHp: 22,
    hitDice: "5d8",
    speed: "0 ft., fly 50 ft. (hover)",
    abilities: { str: 1, dex: 14, con: 11, int: 10, wis: 10, cha: 11 },
    challengeRating: "1",
    xp: 200,
    traits: ["Incorporeal Movement: Can move through creatures and objects as difficult terrain.", "Sunlight Sensitivity: Disadvantage on attack rolls and sight Perception in sunlight."],
    actions: [
      { name: "Life Drain", attackBonus: 4, damageDice: "3d6", damageType: "necrotic", description: "Melee Spell Attack: +4 to hit, reach 5 ft. Hit: 10 (3d6) necrotic damage." },
    ],
  },
  gelatinous_cube: {
    creatureName: "Gelatinous Cube",
    sizeTypeAlignment: "Large ooze, unaligned",
    armorClass: 6,
    maxHp: 84,
    hitDice: "8d10 + 40",
    speed: "15 ft.",
    abilities: { str: 14, dex: 3, con: 20, int: 1, wis: 6, cha: 1 },
    challengeRating: "2",
    xp: 450,
    traits: ["Transparent: Requires DC 15 Wisdom (Perception) check to spot while motionless.", "Engulf: Creatures inside take acid damage and are restrained."],
    actions: [
      { name: "Pseudopod", attackBonus: 4, damageDice: "3d6", damageType: "acid", description: "Melee Weapon Attack: +4 to hit, reach 5 ft. Hit: 10 (3d6) acid damage." },
    ],
  },
};

export function findSrdMonsterStatBlock(name: string): MonsterStatBlock5e {
  const norm = (name || "").toLowerCase();
  if (norm.includes("goblin boss") || norm.includes("snickerdoodle") || norm.includes("chef")) {
    return JSON.parse(JSON.stringify(SRD_5E_MONSTERS.goblin_boss));
  }
  if (norm.includes("goblin") || norm.includes("sprinkles")) {
    return JSON.parse(JSON.stringify(SRD_5E_MONSTERS.goblin));
  }
  if (norm.includes("bandit captain")) {
    return JSON.parse(JSON.stringify(SRD_5E_MONSTERS.bandit_captain));
  }
  if (norm.includes("bandit")) {
    return JSON.parse(JSON.stringify(SRD_5E_MONSTERS.bandit));
  }
  if (norm.includes("bugbear")) {
    return JSON.parse(JSON.stringify(SRD_5E_MONSTERS.bugbear));
  }
  if (norm.includes("wolf")) {
    return JSON.parse(JSON.stringify(SRD_5E_MONSTERS.wolf));
  }
  if (norm.includes("animated armor") || norm.includes("vanguard") || norm.includes("squirrel") || norm.includes("owl")) {
    return JSON.parse(JSON.stringify(SRD_5E_MONSTERS.animated_armor));
  }
  if (norm.includes("skeleton")) {
    return JSON.parse(JSON.stringify(SRD_5E_MONSTERS.skeleton));
  }
  if (norm.includes("specter") || norm.includes("solis") || norm.includes("warden")) {
    return JSON.parse(JSON.stringify(SRD_5E_MONSTERS.specter));
  }
  if (norm.includes("gelatinous") || norm.includes("jelly") || norm.includes("lumina")) {
    return JSON.parse(JSON.stringify(SRD_5E_MONSTERS.gelatinous_cube));
  }
  return JSON.parse(JSON.stringify(SRD_5E_MONSTERS.goblin));
}

export interface DifficultyTuning {
  difficulty: DifficultyPreset;
  label: string;
  enemyHpMultiplier: number;
  enemyAcDelta: number;
  enemyAttackDelta: number;
  dcDelta: number;
  playerRollBonus: number;
  heroHpBonus: number;
  heroHeartBonus: number;
  summary: string;
}

export function getDifficultyTuning(difficulty?: DifficultyPreset): DifficultyTuning {
  const mode: DifficultyPreset =
    difficulty === "STORY_EASY" || difficulty === "HEROIC_HARD" ? difficulty : "BALANCED_NORMAL";
  if (mode === "STORY_EASY") {
    return {
      difficulty: "STORY_EASY",
      label: "Easy / Story Mode",
      enemyHpMultiplier: 0.55,
      enemyAcDelta: -3,
      enemyAttackDelta: -2,
      dcDelta: -3,
      playerRollBonus: 2,
      heroHpBonus: 4,
      heroHeartBonus: 1,
      summary: "Enemies 45% softer (-3 AC, -2 atk), DCs -3, Heroes +2 rolls & +4 HP",
    };
  }
  if (mode === "HEROIC_HARD") {
    return {
      difficulty: "HEROIC_HARD",
      label: "Heroic / Hard Mode",
      enemyHpMultiplier: 1.35,
      enemyAcDelta: 2,
      enemyAttackDelta: 2,
      dcDelta: 2,
      playerRollBonus: 0,
      heroHpBonus: -2,
      heroHeartBonus: 0,
      summary: "Enemies +35% HP (+2 AC, +2 atk), DCs +2, Hero Max HP -2",
    };
  }
  return {
    difficulty: "BALANCED_NORMAL",
    label: "Balanced / Normal Mode",
    enemyHpMultiplier: 1,
    enemyAcDelta: 0,
    enemyAttackDelta: 0,
    dcDelta: 0,
    playerRollBonus: 0,
    heroHpBonus: 0,
    heroHeartBonus: 0,
    summary: "Standard SRD 5e creature HP, AC, attacks & check DCs",
  };
}

/**
 * Applies concrete difficulty math to a room's heroes, enemies, stat blocks, combat entries, and door lock DCs.
 */
export function applyRoomDifficulty(
  room: RoomSessionState,
  nextDifficulty?: DifficultyPreset
): RoomSessionState {
  const tuning = getDifficultyTuning(nextDifficulty ?? room.difficulty);
  room.difficulty = tuning.difficulty;

  for (const h of room.heroes || []) {
    const baseHp = h.attributes5e.baseMaxHp ?? h.attributes5e.maxHp;
    h.attributes5e.baseMaxHp = baseHp;
    const prevMaxHp = h.attributes5e.maxHp;
    const scaledMaxHp = Math.max(4, baseHp + tuning.heroHpBonus);
    h.attributes5e.maxHp = scaledMaxHp;
    if (h.attributes5e.hp >= prevMaxHp) {
      h.attributes5e.hp = scaledMaxHp;
    } else {
      h.attributes5e.hp = Math.min(scaledMaxHp, Math.max(1, h.attributes5e.hp));
    }

    const baseHearts = h.baseMaxHearts ?? h.storybookStats.maxHearts;
    h.baseMaxHearts = baseHearts;
    const prevHearts = h.storybookStats.maxHearts;
    const scaledHearts = Math.max(2, baseHearts + tuning.heroHeartBonus);
    h.storybookStats.maxHearts = scaledHearts;
    if (h.storybookStats.hearts >= prevHearts) {
      h.storybookStats.hearts = scaledHearts;
    } else {
      h.storybookStats.hearts = Math.min(scaledHearts, Math.max(1, h.storybookStats.hearts));
    }
  }

  for (const tok of room.tokens || []) {
    if (tok.type === "HERO" && tok.characterId) {
      const hero = room.heroes.find((h) => h.id === tok.characterId);
      if (hero) {
        tok.maxHp = room.rulesTier === "STORYBOOK_D6" ? hero.storybookStats.maxHearts : hero.attributes5e.maxHp;
        tok.hp = Math.min(tok.maxHp, room.rulesTier === "STORYBOOK_D6" ? hero.storybookStats.hearts : hero.attributes5e.hp);
      }
      continue;
    }
    if (tok.type === "MONSTER") {
      if (!tok.statBlock5e) {
        tok.statBlock5e = findSrdMonsterStatBlock(tok.name);
      }
      const baselineHp = tok.baseMaxHp ?? tok.maxHp;
      tok.baseMaxHp = baselineHp;
      const baseAc = tok.baseArmorClass ?? tok.statBlock5e.armorClass;
      tok.baseArmorClass = baseAc;

      const ratio = tok.maxHp > 0 ? tok.hp / tok.maxHp : 1;
      const scaledHp = Math.max(2, Math.round(baselineHp * tuning.enemyHpMultiplier));
      tok.maxHp = scaledHp;
      tok.hp = Math.max(ratio > 0 ? 1 : 0, Math.min(scaledHp, Math.round(scaledHp * ratio)));

      const sb = findSrdMonsterStatBlock(tok.statBlock5e.creatureName || tok.name);
      sb.armorClass = Math.max(8, baseAc + tuning.enemyAcDelta);
      sb.maxHp = scaledHp;
      sb.actions = sb.actions.map((act) => ({
        ...act,
        attackBonus: act.attackBonus + tuning.enemyAttackDelta,
      }));
      tok.statBlock5e = sb;
    }
  }

  for (const wall of room.walls || []) {
    if (wall.isDoor && typeof wall.lockDc === "number") {
      const baseLock = wall.baseLockDc ?? wall.lockDc;
      wall.baseLockDc = baseLock;
      const minDc = room.rulesTier === "STORYBOOK_D6" ? 2 : 5;
      wall.lockDc = Math.max(minDc, baseLock + tuning.dcDelta);
    }
  }

  if (room.combat?.isActive) {
    room.combat.entries = room.combat.entries.map((entry) => {
      const tok = room.tokens.find((t) => t.id === entry.tokenId);
      return tok ? { ...entry, hp: tok.hp, maxHp: tok.maxHp } : entry;
    });
  }

  return room;
}

/**
 * Evaluates either a physical die roll entered by a kid on their tablet
 * OR generates a cryptographic/random digital roll, applying the active RulesTier math and DifficultyPreset tuning.
 */
export function evaluateActionCardRoll(params: {
  character: CharacterSheet;
  card: ActionCard;
  rulesTier: RulesTier;
  source: "PHYSICAL_DICE_TABLE" | "DIGITAL_3D_ROLLER";
  physicalRollValue?: number;
  difficulty?: DifficultyPreset;
}): DiceRollResult {
  const { character, card, rulesTier, source, physicalRollValue, difficulty } = params;
  const tuning = getDifficultyTuning(difficulty);

  // In Storybook mode (Ages 5-8), all checks use a simple d6 (4+ succeeds)
  const effectiveDie: DieType = rulesTier === "STORYBOOK_D6" ? "d6" : card.dieToRoll;
  const maxFace = DIE_MAX[effectiveDie];

  let rawRoll: number;
  if (
    source === "PHYSICAL_DICE_TABLE" &&
    typeof physicalRollValue === "number" &&
    Number.isFinite(physicalRollValue)
  ) {
    rawRoll = Math.max(1, Math.min(maxFace, Math.round(physicalRollValue)));
  } else {
    rawRoll = Math.floor(Math.random() * maxFace) + 1;
  }

  const baseModifier = card.bonusByTier[rulesTier] ?? 0;
  const modifier = baseModifier + tuning.playerRollBonus;
  const baseTargetDC = card.targetDifficultyByTier[rulesTier] ?? (rulesTier === "STORYBOOK_D6" ? 4 : 10);
  const dcShift = rulesTier === "STORYBOOK_D6" ? Math.sign(tuning.dcDelta) : tuning.dcDelta;
  const minDc = rulesTier === "STORYBOOK_D6" ? 2 : 5;
  const targetDC = Math.max(minDc, baseTargetDC + dcShift);
  const total = rawRoll + modifier;
  const isCriticalSuccess = rawRoll === maxFace;
  const succeeded = isCriticalSuccess || total >= targetDC;

  const narrativeOutcome = succeeded
    ? isCriticalSuccess
      ? `🌟 CRITICAL HEROIC ROLL! ${card.cozySuccessFlavor}`
      : `✅ Success! ${card.cozySuccessFlavor}`
    : `🎲 Fail-Forward Twist: ${card.cozyFailForwardFlavor}`;

  return {
    id: `roll_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    characterId: character.id,
    playerName: character.playerName,
    characterName: character.name,
    actionTitle: card.title,
    dieType: effectiveDie,
    source,
    rawRoll,
    modifier,
    total,
    targetDC,
    succeeded,
    isCriticalSuccess,
    narrativeOutcome,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Anti-TPK Dynamic Encounter Auto-Balancer.
 * Ensures kids never suffer frustrating Total Party Kills while keeping tension fun.
 */
export function calculateEncounterAutoBalance(state: RoomSessionState): {
  status: "BALANCED" | "HEROIC_RALLY_ACTIVE" | "PACING_WRAP_UP_RECOMMENDED";
  gmAdvice: string;
  monsterHpMultiplier: number;
  grantPartyInspiration: boolean;
} {
  const lowHealthHeroes = state.heroes.filter((h) => {
    if (state.rulesTier === "STORYBOOK_D6") {
      return h.storybookStats.hearts <= 1;
    }
    return h.attributes5e.hp <= Math.ceil(h.attributes5e.maxHp * 0.25);
  });

  if (lowHealthHeroes.length > 0) {
    const names = lowHealthHeroes.map((h) => h.name).join(" & ");
    return {
      status: "HEROIC_RALLY_ACTIVE",
      gmAdvice: `🛡️ Anti-TPK Heroic Rally Triggered for ${names}! Lower remaining monster HP by 40% and have the villain gloat or target scenery on their next turn while ${names} gets a free Heroic Rally bonus die!`,
      monsterHpMultiplier: 0.6,
      grantPartyInspiration: true,
    };
  }

  if (state.rollHistory.length >= 12) {
    return {
      status: "PACING_WRAP_UP_RECOMMENDED",
      gmAdvice:
        "⏱️ Kid Pacing Alert: The party has made 12+ rolls in this scene. Trigger a dramatic finale (e.g., the Goblin Chef surrenders and offers warm cinnamon rolls) so attention stays high!",
      monsterHpMultiplier: 0.75,
      grantPartyInspiration: false,
    };
  }

  return {
    status: "BALANCED",
    gmAdvice: "⚖️ Encounter pacing and party health are optimal.",
    monsterHpMultiplier: 1.0,
    grantPartyInspiration: false,
  };
}

/**
 * Sibling Spotlight Fairness Engine.
 * Identifies when one child has taken significantly fewer turns than their siblings
 * and generates a custom character-specific spotlight prompt for the GM.
 */
export function computeSiblingSpotlightFairness(
  heroes: CharacterSheet[],
  existingRecords: PlayerSpotlightRecord[]
): PlayerSpotlightRecord[] {
  const recordsMap = new Map<string, PlayerSpotlightRecord>();
  for (const rec of existingRecords) {
    recordsMap.set(rec.characterId, { ...rec });
  }

  for (const hero of heroes) {
    if (!recordsMap.has(hero.id)) {
      recordsMap.set(hero.id, {
        characterId: hero.id,
        playerName: hero.playerName,
        characterName: hero.name,
        turnsTaken: 0,
        lastActionAt: new Date().toISOString(),
        needsSpotlightNudge: false,
      });
    }
  }

  const all = Array.from(recordsMap.values());
  const maxTurns = all.reduce((max, r) => Math.max(max, r.turnsTaken), 0);

  return all.map((rec) => {
    const hero = heroes.find((h) => h.id === rec.characterId);
    const turnGap = maxTurns - rec.turnsTaken;
    const needsNudge = maxTurns >= 2 && turnGap >= 2;
    const petName = hero?.companionPet || "their trusty companion";
    const firstItem = hero?.inventory[0]?.name || "their special gear";

    return {
      ...rec,
      needsSpotlightNudge: needsNudge,
      suggestedSpotlightHook: needsNudge
        ? `💡 Spotlight Nudge for ${rec.playerName} (${rec.characterName}): They are ${turnGap} turns behind! Have a friendly creature walk right up to ${petName}, or present a locked chest that only responds to ${firstItem}!`
        : undefined,
    };
  });
}

/**
 * Enforces strict Age-Tiered Content Guardrails on any AI or custom text.
 */
export function enforceAgeTieredGuardrails(text: string, rating: ContentRating): string {
  if (rating !== "COZY_G") return text;

  const replacements: Array<[RegExp, string]> = [
    [/\b(kills?|killed|slaughters?|murders?|decapitates?)\b/gi, "bonks dizzy"],
    [/\b(blood|bloody|gore|gory|bleeding)\b/gi, "sparkling starlight"],
    [/\b(corpse|dead body|cadaver)\b/gi, "sleeping pile"],
    [/\b(dies|died)\b/gi, "poofs into colorful smoke"],
  ];

  let safe = text;
  for (const [pattern, replacement] of replacements) {
    safe = safe.replace(pattern, replacement);
  }
  return safe;
}

/**
 * Serializes current room state into a 1-Click "Pause for Bedtime" snapshot
 * and generates a "Previously On..." storybook recap.
 */
export function createBedtimeFreezeSnapshot(state: RoomSessionState): BedtimeFreezeSnapshot {
  const activeNode =
    state.storyNodes.find((n) => n.id === state.activeNodeId) || state.storyNodes[0];
  const heroNames = state.heroes.map((h) => `${h.name} (${h.playerName})`).join(", ");
  const lastRoll = state.rollHistory[0];

  const lastRollSnippet = lastRoll
    ? ` Most recently, ${lastRoll.characterName} rolled a ${lastRoll.total} on "${lastRoll.actionTitle}"!`
    : "";

  const recap = `📖 Previously on "${state.campaignTitle}": Our brave family heroes — ${heroNames} — ventured into ${activeNode?.title || "the adventure"}.${lastRollSnippet} Everyone rests safely at camp until next game night!`;

  return {
    frozenAt: new Date().toISOString(),
    roomCode: state.roomCode,
    campaignTitle: state.campaignTitle,
    activeNodeId: state.activeNodeId,
    tokens: state.tokens.map((t) => ({ ...t })),
    revealedZoneIds: state.zones.filter((z) => z.isRevealed).map((z) => z.id),
    storyFlags: [...state.storyFlags],
    previouslyOnRecap: recap,
  };
}

/**
 * Default starter hero sheets: Sir Roland Oakenshield & Lyra Dawnstar
 */
export const DEFAULT_STARTER_HEROES: CharacterSheet[] = [
  {
    id: "hero-barnaby",
    name: "Sir Roland Oakenshield",
    playerName: "Leo (Age 7)",
    playerAge: 7,
    archetype: "Shield Knight",
    companionPet: "Pippin the Watch-Hound",
    avatarEmoji: "🛡️",
    tokenColor: "#f59e0b",
    rulesTier: "STORYBOOK_D6",
    storybookStats: { brawn: 3, brains: 1, charm: 2, hearts: 3, maxHearts: 3 },
    attributes5e: {
      str: 16,
      dex: 12,
      con: 14,
      int: 10,
      wis: 11,
      cha: 14,
      hp: 14,
      maxHp: 14,
      armorClass: 16,
    },
    actionCards: [
      {
        id: "card-shield-bonk",
        title: "Oakenshield Bash",
        subtitle: "Brawn / Melee Attack",
        icon: "🛡️",
        colorTheme: "amber",
        dieToRoll: "d20",
        bonusByTier: { STORYBOOK_D6: 1, APPRENTICE_5E_LITE: 4, STANDARD_5E: 5 },
        targetDifficultyByTier: { STORYBOOK_D6: 4, APPRENTICE_5E_LITE: 11, STANDARD_5E: 13 },
        description: "Drive your oak-rimmed buckler forward to knock foes back or force heavy doors!",
        cozySuccessFlavor:
          "CLANG! Your oak shield rings like a watchtower bell and sends the obstacle reeling!",
        cozyFailForwardFlavor:
          "Your shield scrapes past the target, knocking loose a loose flagstone that reveals their footing!",
      },
      {
        id: "card-puppy-sniff",
        title: "Scout's Keen Track",
        subtitle: "Brains / Clues & Secrets",
        icon: "🐾",
        colorTheme: "emerald",
        dieToRoll: "d20",
        bonusByTier: { STORYBOOK_D6: 1, APPRENTICE_5E_LITE: 3, STANDARD_5E: 4 },
        targetDifficultyByTier: { STORYBOOK_D6: 4, APPRENTICE_5E_LITE: 10, STANDARD_5E: 12 },
        description: "Have Pippin the watch-hound track hidden doors, traps, or goblin boot-prints!",
        cozySuccessFlavor: "Pippin gives a sharp alert bark and points straight toward the hidden latch!",
        cozyFailForwardFlavor:
          "Pippin chases an echo down the hall—leading the party straight to a fresh footprint!",
      },
    ],
    inventory: [
      {
        id: "item-sun-shield",
        name: "Sunbeam Heater Shield",
        icon: "☀️",
        description: "Steel-bossed buckler etched with the Oakhaven watch-crest.",
      },
      {
        id: "item-honey-biscuit",
        name: "Potion of Healing (Minor)",
        icon: "🧪",
        description: "Restores 1 Heart (or 1d4+2 HP) to a companion in need.",
      },
    ],
    levelStars: 2,
    bioStory: "A steadfast young paladin of the Oakhaven Watch who stands between danger and every villager.",
    petTrait: "Keen Hearing & Smell: Alerts allies to hidden ambushes!",
    assetPath: HEARTHQUEST_ASSETS.heroes.shieldKnight.path,
  },
  {
    id: "hero-lyra",
    name: "Lyra Dawnstar",
    playerName: "Maya (Age 10)",
    playerAge: 10,
    archetype: "Starlight Wizard",
    companionPet: "Archimedes the Familiar Owl",
    avatarEmoji: "🪄",
    tokenColor: "#8b5cf6",
    rulesTier: "APPRENTICE_5E_LITE",
    storybookStats: { brawn: 1, brains: 3, charm: 2, hearts: 3, maxHearts: 3 },
    attributes5e: {
      str: 9,
      dex: 14,
      con: 12,
      int: 17,
      wis: 13,
      cha: 14,
      hp: 11,
      maxHp: 11,
      armorClass: 13,
    },
    actionCards: [
      {
        id: "card-rainbow-bolt",
        title: "Magic Missile",
        subtitle: "Brains / Evocation Spell",
        icon: "✨",
        colorTheme: "purple",
        dieToRoll: "d20",
        bonusByTier: { STORYBOOK_D6: 1, APPRENTICE_5E_LITE: 5, STANDARD_5E: 6 },
        targetDifficultyByTier: { STORYBOOK_D6: 4, APPRENTICE_5E_LITE: 11, STANDARD_5E: 13 },
        description: "Loosen three glowing darts of arcane force that illuminate runes or strike enemies!",
        cozySuccessFlavor:
          "FWOOSH! Three silver star-bolts streak across the room and strike true!",
        cozyFailForwardFlavor:
          "Arcane sparks burst harmlessly overhead, illuminating hidden carvings along the stone ceiling!",
      },
      {
        id: "card-owl-scout",
        title: "Familiar Recon",
        subtitle: "Charm / Arcane & Trick",
        icon: "🦉",
        colorTheme: "sky",
        dieToRoll: "d20",
        bonusByTier: { STORYBOOK_D6: 1, APPRENTICE_5E_LITE: 4, STANDARD_5E: 4 },
        targetDifficultyByTier: { STORYBOOK_D6: 4, APPRENTICE_5E_LITE: 10, STANDARD_5E: 12 },
        description: "Send Archimedes aloft to scout guards, trigger distant levers, or cast Mage Hand!",
        cozySuccessFlavor: "Archimedes glides silent as shadow, spotting patrol routes and lifting the latch!",
        cozyFailForwardFlavor:
          "A sharp owl hoot echoes through the rafters, drawing the guards out of formation!",
      },
    ],
    inventory: [
      {
        id: "item-star-wand",
        name: "Wand of Shooting Stars",
        icon: "🪄",
        description: "Draws glowing doodles in mid-air.",
      },
      {
        id: "item-feather-cloak",
        name: "Cloak of Feather Fall",
        icon: "🪶",
        description: "Lets you float down gently like a dandelion seed.",
      },
    ],
    levelStars: 3,
    bioStory: "A curious star-weaver apprentice who sings lullabies to magical fireflies and knows every constellation.",
    petTrait: "Spots shiny hidden levers from high up in the air!",
    assetPath: HEARTHQUEST_ASSETS.heroes.starlightWizard.path,
  },
];

/**
 * Creates fresh, deep-cloned copies of the default starter heroes.
 */
export function createDefaultStarterHeroes(): CharacterSheet[] {
  const heroes: CharacterSheet[] = JSON.parse(JSON.stringify(DEFAULT_STARTER_HEROES));
  return heroes.map((h) => {
    if (!h.proficientSkills || h.proficientSkills.length === 0) {
      const arch = h.archetype.toLowerCase();
      if (arch.includes("knight") || arch.includes("paladin")) {
        h.proficientSkills = ["athletics", "perception", "persuasion"];
      } else if (arch.includes("wizard") || arch.includes("mage")) {
        h.proficientSkills = ["arcana", "investigation", "nature"];
      } else {
        h.proficientSkills = ["stealth", "acrobatics", "perception"];
      }
    }
    return h;
  });
}

/**
 * Complete Family Campaign Templates:
 * 1. camp-goblin-bakery: "The Great Goblin Bakery Heist"
 * 2. camp-clockwork-treehouse: "The Clockwork Treehouse Mystery"
 * 3. camp-starlight-otter: "Voyage of the Starlight Otter"
 *
 * Each campaign features:
 * - 3 map zones (MapRoomZone[]) covering a 10x6 tactical grid with Fog-of-War
 * - Themed hero, NPC, monster, and interactive prop tokens (MapToken[])
 * - 3 branching story nodes (StoryBranchNode[]) with age-tiered readAloudByRating
 *   supporting COZY_G, ADVENTURE_PG, and CLASSIC_PG13 guardrails.
 */
export const FAMILY_CAMPAIGNS: FamilyCampaignTemplate[] = [
  {
    id: "camp-goblin-bakery",
    title: "The Great Goblin Bakery Heist",
    theme: "BAKERY",
    description:
      "Sneak into Chef Snickerdoodle's fortress bakery to recover the stolen royal birthday cake!",
    defaultRulesTier: "STORYBOOK_D6",
    defaultContentRating: "COZY_G",
    initialActiveNodeId: "node-bakery-courtyard",
    zones: [
      {
        id: "zone-courtyard",
        name: "1. Cinnamon Courtyard",
        gridX: 0,
        gridY: 0,
        width: 4,
        height: 6,
        isRevealed: true,
        ambientSoundscape: "COZY_TAVERN",
      },
      {
        id: "zone-pantry",
        name: "2. The Flour-Cloud Pantry",
        gridX: 4,
        gridY: 0,
        width: 3,
        height: 6,
        isRevealed: false,
        hasSecretTrap: true,
        trapDescription: "Tickle-Pepper Floor Tile (DC 10 or sneeze loudly!)",
        ambientSoundscape: "GOBLIN_KITCHEN",
      },
      {
        id: "zone-oven-vault",
        name: "3. Chef Snickerdoodle's Vault",
        gridX: 7,
        gridY: 0,
        width: 3,
        height: 6,
        isRevealed: false,
        ambientSoundscape: "CRYSTAL_CAVERN",
      },
    ],
    tokens: [
      {
        id: "tok-barnaby",
        characterId: "hero-barnaby",
        name: "Sir Barnaby",
        type: "HERO",
        avatarEmoji: "🛡️",
        assetPath: HEARTHQUEST_ASSETS.heroes.shieldKnight.path,
        color: "#f59e0b",
        gridX: 1,
        gridY: 2,
        hp: 3,
        maxHp: 3,
        isHiddenFromPlayers: false,
      },
      {
        id: "tok-lyra",
        characterId: "hero-lyra",
        name: "Lyra",
        type: "HERO",
        avatarEmoji: "🪄",
        assetPath: HEARTHQUEST_ASSETS.heroes.starlightWizard.path,
        color: "#8b5cf6",
        gridX: 1,
        gridY: 4,
        hp: 3,
        maxHp: 3,
        isHiddenFromPlayers: false,
      },
      {
        id: "tok-goblin-guard",
        name: "Sprinkles the Goblin Guard",
        type: "NPC",
        avatarEmoji: "🧁",
        assetPath: HEARTHQUEST_ASSETS.monsters.goblinSprinkles.path,
        color: "#10b981",
        gridX: 3,
        gridY: 3,
        hp: 2,
        maxHp: 2,
        isHiddenFromPlayers: false,
      },
      {
        id: "tok-chef-boss",
        name: "Chef Snickerdoodle",
        type: "MONSTER",
        avatarEmoji: "👨‍🍳",
        assetPath: HEARTHQUEST_ASSETS.monsters.chefSnickerdoodle.path,
        color: "#ef4444",
        gridX: 8,
        gridY: 3,
        hp: 4,
        maxHp: 4,
        isHiddenFromPlayers: true,
      },
      {
        id: "tok-bakery-chest",
        name: "Frosted Treasure Chest",
        type: "PROP",
        avatarEmoji: "🎁",
        assetPath: HEARTHQUEST_ASSETS.props.chestClosed.path,
        color: "#f59e0b",
        gridX: 5,
        gridY: 2,
        hp: 1,
        maxHp: 1,
        isHiddenFromPlayers: false,
        isLootChest: true,
        isChestOpened: false,
      },
    ],
    storyNodes: [
      {
        id: "node-bakery-courtyard",
        title: "Scene 1: The Cinnamon Courtyard",
        sceneZoneId: "zone-courtyard",
        readAloudByTone: {
          COZY_SILLY:
            "Warm clouds of cinnamon-sugar float out of the crooked chimney! Blocking the giant oak door is Sprinkles the Goblin, wearing a giant copper mixing bowl as a helmet and trying to lick frosting off his nose.",
          ACTION_HEROIC:
            "You stand before the fortress of the Goblin Bakers! The royal birthday cake is locked inside, and a sentry in gleaming copper kitchen-armor guards the gate!",
          MYSTERY_ATMOSPHERIC:
            "Golden lantern light spills across the cobblestones, carrying the scent of enchanted vanilla. Beside the door, a lone goblin sentry mutters a secret recipe under his breath.",
        },
        readAloudByRating: {
          COZY_G:
            "Sweet aromas of vanilla and cinnamon drift from the bakery chimney! Sprinkles the Goblin is wearing a funny copper mixing bowl on his head and trying to lick frosting off his nose while guarding the colorful gate.",
          ADVENTURE_PG:
            "You stand before the fortress of the Goblin Bakers! The royal birthday cake is locked inside, and a sentry in gleaming kitchen-armor grips his rolling-pin staff and watches the gate.",
          CLASSIC_PG13:
            "Moonlight outlines the fortified masonry of the goblin bakery redoubt. A sentry clad in hammered copper patrols the gatehouse, muttering alchemical confections under his breath.",
        },
        gmWhisperTips: [
          "Ask the kids how they want to get past Sprinkles: they can trade a snack, tell a joke, sneak past, or challenge him to a thumb-wrestle!",
          "If they use the Emergency Honey Biscuit, Sprinkles immediately becomes their best friend and hands over the Pantry Key.",
        ],
        choices: [
          {
            id: "choice-befriend-sprinkles",
            label: "🍪 Share a snack or tell a joke to befriend Sprinkles",
            targetNodeId: "node-flour-pantry",
            requiredCheck: "Charm / Owl Scout or Honey Biscuit",
            consequenceTag: "BEFRIENDED_SPRINKLES",
          },
          {
            id: "choice-sneak-window",
            label: "🐾 Sneak through the buttery pie-cooling window",
            targetNodeId: "node-flour-pantry",
            requiredCheck: "Pip's Super Sniff or Shield Boop",
            consequenceTag: "SNEAKED_WINDOW",
          },
        ],
      },
      {
        id: "node-flour-pantry",
        title: "Scene 2: The Flour-Cloud Pantry",
        sceneZoneId: "zone-pantry",
        readAloudByTone: {
          COZY_SILLY:
            "POOF! Giant sacks of enchanted baking flour float in mid-air like puffy white clouds! Across the room, the Golden Oven Vault sparkles—but the floor is dusted with giggly Tickle-Pepper!",
          ACTION_HEROIC:
            "You burst into the grand pantry! Floating flour barrels drift between you and the Vault door, while a shimmering pressure plate guards the hallway!",
          MYSTERY_ATMOSPHERIC:
            "Silvery flour dust hangs suspended in beams of moonlight. A faint humming vibration echoes from the brass vault door at the far end of the pantry.",
        },
        readAloudByRating: {
          COZY_G:
            "POOF! Giant sacks of enchanted baking flour float in mid-air like puffy white clouds! Across the room, the Golden Oven Vault sparkles, but the floor is dusted with giggly Tickle-Pepper!",
          ADVENTURE_PG:
            "You burst into the high-vaulted pantry! Floating flour barrels drift through the air like an obstacle course, and a glowing pressure trap guards the corridor.",
          CLASSIC_PG13:
            "Suspended flour dust limits visibility in the cold pantry. Beneath the powdery floor, alarm runes hum softly, wired to trigger the vault's defensive mechanism.",
        },
        gmWhisperTips: [
          "Reveal Zone 2 ('The Flour-Cloud Pantry') on the map so the kids' tablets update!",
          "Watch the Sibling Spotlight tracker—have whichever kid hasn't rolled recently lead the way across the floating flour sacks!",
        ],
        choices: [
          {
            id: "choice-enter-vault",
            label: "🔑 Unlock Chef Snickerdoodle's Golden Vault",
            targetNodeId: "node-chef-vault",
            requiredCheck: "Any Heroic Roll",
            consequenceTag: "OPENED_VAULT",
          },
        ],
      },
      {
        id: "node-chef-vault",
        title: "Scene 3: Chef Snickerdoodle's Grand Finale",
        sceneZoneId: "zone-oven-vault",
        readAloudByTone: {
          COZY_SILLY:
            "Inside the glowing kitchen stands Chef Snickerdoodle atop a three-tiered strawberry cake! 'Nobody takes my masterpiece unless they beat me in the Great Frosting Duel!' he squeaks, brandishing two giant pastry bags!",
          ACTION_HEROIC:
            "The vault doors swing wide! Atop a towering banquet table stands the Master Goblin Chef, dual-wielding enchanted frosting cannons!",
          MYSTERY_ATMOSPHERIC:
            "At the heart of the vault, glowing sugar-crystals illuminate the legendary three-tier cake—and its eccentric goblin creator.",
        },
        readAloudByRating: {
          COZY_G:
            "Inside the glowing kitchen stands Chef Snickerdoodle atop a three-tiered strawberry cake! 'Nobody takes my masterpiece unless they beat me in the Great Frosting Duel!' he squeaks, brandishing two giant pastry bags of pink frosting!",
          ADVENTURE_PG:
            "The vault doors swing wide! Atop a towering banquet table stands the Master Goblin Chef, dual-wielding enchanted frosting cannons and demanding a cooking duel to prove your party's worth!",
          CLASSIC_PG13:
            "The heavy vault portal yields to reveal a blazing hearth. Chef Snickerdoodle brandishes twin pressurized culinary nozzles, prepared to defend his culinary relic to the last drop of batter.",
        },
        gmWhisperTips: [
          "Reveal Zone 3 on the map and unhide Chef Snickerdoodle!",
          "If you befriended Sprinkles in Scene 1, Sprinkles runs in with a tray of cupcakes to help the kids!",
        ],
        choices: [
          {
            id: "choice-restart-courtyard",
            label: "🎉 Victory! Reset Adventure to Scene 1",
            targetNodeId: "node-bakery-courtyard",
            consequenceTag: "VICTORY_CAKE_SAVED",
          },
        ],
      },
    ],
  },
  {
    id: "camp-clockwork-treehouse",
    title: "The Clockwork Treehouse Mystery",
    theme: "FOREST_TREEHOUSE",
    description:
      "Climb the ancient Great Oak to discover why the treehouse's singing brass gears have stopped turning!",
    defaultRulesTier: "APPRENTICE_5E_LITE",
    defaultContentRating: "COZY_G",
    initialActiveNodeId: "node-canopy-landing",
    zones: [
      {
        id: "zone-canopy-landing",
        name: "1. Mossy Canopy Landing",
        gridX: 0,
        gridY: 0,
        width: 4,
        height: 6,
        isRevealed: true,
        ambientSoundscape: "WHISPERING_WOODS",
      },
      {
        id: "zone-gear-loft",
        name: "2. Whispering Gear Loft",
        gridX: 4,
        gridY: 0,
        width: 3,
        height: 6,
        isRevealed: false,
        hasSecretTrap: true,
        trapDescription: "Swinging Pendulum Bridge (DC 11 Dex or swing into a comfy leaf hammock!)",
        ambientSoundscape: "COZY_TAVERN",
      },
      {
        id: "zone-heart-spring",
        name: "3. The Grand Heart-Spring Aviary",
        gridX: 7,
        gridY: 0,
        width: 3,
        height: 6,
        isRevealed: false,
        ambientSoundscape: "CRYSTAL_CAVERN",
      },
    ],
    tokens: [
      {
        id: "tok-barnaby",
        characterId: "hero-barnaby",
        name: "Sir Barnaby",
        type: "HERO",
        avatarEmoji: "🛡️",
        assetPath: HEARTHQUEST_ASSETS.heroes.shieldKnight.path,
        color: "#f59e0b",
        gridX: 1,
        gridY: 2,
        hp: 3,
        maxHp: 3,
        isHiddenFromPlayers: false,
      },
      {
        id: "tok-lyra",
        characterId: "hero-lyra",
        name: "Lyra",
        type: "HERO",
        avatarEmoji: "🪄",
        assetPath: HEARTHQUEST_ASSETS.heroes.starlightWizard.path,
        color: "#8b5cf6",
        gridX: 1,
        gridY: 4,
        hp: 3,
        maxHp: 3,
        isHiddenFromPlayers: false,
      },
      {
        id: "tok-cogsworth",
        name: "Cogsworth the Brass Squirrel",
        type: "NPC",
        avatarEmoji: "🐿️",
        assetPath: HEARTHQUEST_ASSETS.monsters.brassSquirrel.path,
        color: "#f59e0b",
        gridX: 3,
        gridY: 2,
        hp: 2,
        maxHp: 2,
        isHiddenFromPlayers: false,
      },
      {
        id: "tok-rustwing-boss",
        name: "Rustwing the Overwound Golem",
        type: "MONSTER",
        avatarEmoji: "🤖",
        assetPath: HEARTHQUEST_ASSETS.monsters.brassSquirrel.path,
        color: "#ef4444",
        gridX: 8,
        gridY: 3,
        hp: 5,
        maxHp: 5,
        isHiddenFromPlayers: true,
      },
      {
        id: "tok-clockwork-nest",
        name: "Singing Brass Bird Nest",
        type: "PROP",
        avatarEmoji: "🪺",
        assetPath: HEARTHQUEST_ASSETS.props.chestClosed.path,
        color: "#10b981",
        gridX: 7,
        gridY: 1,
        hp: 1,
        maxHp: 1,
        isHiddenFromPlayers: true,
      },
    ],
    storyNodes: [
      {
        id: "node-canopy-landing",
        title: "Scene 1: Canopy Arrival & The Clattering Squirrel",
        sceneZoneId: "zone-canopy-landing",
        readAloudByTone: {
          COZY_SILLY:
            "You scramble up the rope ladder into the giant oak branches! A tiny mechanical squirrel with brass goggles is dropping acorns onto a rusted gear and chattering frantically: 'The gears! They have the hiccups!'",
          ACTION_HEROIC:
            "You reach the canopy gate of the legendary Great Oak Treehouse! Brass pipes hiss steam through the leaves, and an alarmed clockwork sentry chatters a warning from the branches!",
          MYSTERY_ATMOSPHERIC:
            "Fog clings to ancient moss-draped boughs. Ahead, rhythmic ticking echoes through hollow bark, punctuated by the metallic clink of a clockwork creature trying to fix a jammed pulley.",
        },
        readAloudByRating: {
          COZY_G:
            "A warm breeze rustles through the giant green leaves! A friendly brass squirrel wearing tiny goggles scampers up, squeaking cheerfully and showing you that the treehouse gears have got the hiccups.",
          ADVENTURE_PG:
            "High above the forest floor, wind whistles across the wooden canopy platform. A brass squirrel engineer frantically signals for help before a swinging pendulum knocks him off his perch!",
          CLASSIC_PG13:
            "Perched eighty feet above the forest canopy, the treehouse groans under mechanical stress. A clockwork construct scurries toward your party, its optical lenses clicking erratically.",
        },
        gmWhisperTips: [
          "Ask the players if they want to speak with Cogsworth using animal friendship, inspect the jammed rope pulley, or climb directly into the gear loft.",
          "Storybook D6 players can make a Brains check to decode Cogsworth's squirrel chatter.",
        ],
        choices: [
          {
            id: "choice-help-cogsworth",
            label: "🐿️ Offer an acorn snack and examine Cogsworth's wrench",
            targetNodeId: "node-gear-loft",
            requiredCheck: "Brains / Repair or Animal Friendship",
            consequenceTag: "FRIENDED_COGSWORTH",
          },
          {
            id: "choice-climb-gear-loft",
            label: "🧗 Swing across the vine ropes straight into the Gear Loft",
            targetNodeId: "node-gear-loft",
            requiredCheck: "Brawn / Athletics or Shield Boop",
            consequenceTag: "SWUNG_VINE",
          },
        ],
      },
      {
        id: "node-gear-loft",
        title: "Scene 2: The Whispering Gear Loft",
        sceneZoneId: "zone-gear-loft",
        readAloudByTone: {
          COZY_SILLY:
            "CLINK-CLANK-SPUTTER! Giant wooden gears the size of tractor tires are spinning in reverse! Golden pollen sprinkles down like glitter, and shiny brass cogs roll around like runaway hula-hoops!",
          ACTION_HEROIC:
            "You step onto the swaying gear-platform! Massive oak and brass cogs grind against each other, threatening to shake the rope bridge apart unless someone jams the release lever!",
          MYSTERY_ATMOSPHERIC:
            "Intricate clockwork mechanisms fill the hollow tree trunk. Starlight filters through gaps in the wood, revealing gears engraved with ancient druidic runes that thrum with elemental power.",
        },
        readAloudByRating: {
          COZY_G:
            "Spinning wooden wheels make cheerful click-clack sounds, showering golden sparkles everywhere! Cute glowing snails are riding the gears like a fun carnival merry-go-round.",
          ADVENTURE_PG:
            "The gear loft trembles! Runaway copper flywheels spin at dizzying speeds. The heroes must leap between rocking platforms to reach the master bypass switch.",
          CLASSIC_PG13:
            "Interlocking brass cogs churn violently through the dim chamber. The party must navigate grinding pinions and pressurized steam vents to reach the upper aviary.",
        },
        gmWhisperTips: [
          "Reveal Zone 2 ('Whispering Gear Loft') on the map so players can see the moving gear hazards.",
          "Spotlight check: If a player hasn't acted recently, have them spot the secret golden lever wedged behind the main pinion.",
        ],
        choices: [
          {
            id: "choice-jam-overwound-spring",
            label: "⚙️ Use magic or tools to brake the runaway flywheel",
            targetNodeId: "node-heart-spring",
            requiredCheck: "Any Heroic Roll",
            consequenceTag: "STOPPED_FLYWHEEL",
          },
          {
            id: "choice-bypass-aviary",
            label: "🕊️ Crawl through the steam-exhaust tunnel into the Aviary",
            targetNodeId: "node-heart-spring",
            consequenceTag: "TUNNEL_SNEAK",
          },
        ],
      },
      {
        id: "node-heart-spring",
        title: "Scene 3: Rustwing and the Grand Heart-Spring",
        sceneZoneId: "zone-heart-spring",
        readAloudByTone: {
          COZY_SILLY:
            "At the top of the tree, the Grand Aviary is filled with brass bird cages singing out-of-tune melodies! Guarding the Heart-Spring is Rustwing, an overwound owl golem flapping copper wings and hooting like a runaway alarm clock!",
          ACTION_HEROIC:
            "The Aviary opens to the open sky! Guarding the pulsating Heart-Spring is Rustwing, a colossal winged automaton radiating emerald steam! Its eyes ignite with amber fire as it prepares to dive!",
          MYSTERY_ATMOSPHERIC:
            "In the open-air dome atop the ancient oak, the primal Heart-Spring glows with pulsing emerald light. Rustwing, the guardian golem, spreads wings of tarnished copper and tests its razor-talons.",
        },
        readAloudByRating: {
          COZY_G:
            "The top chamber is bathed in warm sunshine! Rustwing the big brass owl is flapping dizzy circles because his key was wound too tight! He just wants someone to help him unwind so he can sing his sweet lullaby.",
          ADVENTURE_PG:
            "Rustwing shrieks a steam-whistle challenge and swoops across the roost! Gale-force gusts buffet the platform as the heroes coordinate to calm the guardian and reset the Heart-Spring.",
          CLASSIC_PG13:
            "Arcane surges crackle through the Heart-Spring core. Rustwing deploys bladed copper wings and prepares to defend the roost against any who approach the clockwork nexus.",
        },
        gmWhisperTips: [
          "Reveal Zone 3 and unhide Rustwing the Overwound Golem!",
          "In Cozy G mode, unwinding Rustwing's key with a successful Charm or Dex check calms him down and causes him to sing a sweet lullaby.",
        ],
        choices: [
          {
            id: "choice-reset-treehouse",
            label: "🎉 Celebrate Victory & Return to the Canopy Landing",
            targetNodeId: "node-canopy-landing",
            consequenceTag: "CLOCKWORK_HEART_RESTORED",
          },
        ],
      },
    ],
  },
  {
    id: "camp-starlight-otter",
    title: "Voyage of the Starlight Otter",
    theme: "STARLIGHT_SHIP",
    description:
      "Sail the astral currents aboard the flying schooner Starlight Otter and restore the cosmic navigation crystals!",
    defaultRulesTier: "APPRENTICE_5E_LITE",
    defaultContentRating: "COZY_G",
    initialActiveNodeId: "node-starlight-quarterdeck",
    zones: [
      {
        id: "zone-quarterdeck",
        name: "1. The Starlight Quarterdeck",
        gridX: 0,
        gridY: 0,
        width: 4,
        height: 6,
        isRevealed: true,
        ambientSoundscape: "COZY_TAVERN",
      },
      {
        id: "zone-astral-engine",
        name: "2. The Comet-Core Engine Room",
        gridX: 4,
        gridY: 0,
        width: 3,
        height: 6,
        isRevealed: false,
        hasSecretTrap: true,
        trapDescription:
          "Zero-G Floating Bubble (DC 11 Dex or float harmlessly toward the ceiling like a balloon!)",
        ambientSoundscape: "CRYSTAL_CAVERN",
      },
      {
        id: "zone-astrolabe-bridge",
        name: "3. The Grand Astrolabe Observatory",
        gridX: 7,
        gridY: 0,
        width: 3,
        height: 6,
        isRevealed: false,
        ambientSoundscape: "CRYSTAL_CAVERN",
      },
    ],
    tokens: [
      {
        id: "tok-barnaby",
        characterId: "hero-barnaby",
        name: "Sir Barnaby",
        type: "HERO",
        avatarEmoji: "🛡️",
        assetPath: HEARTHQUEST_ASSETS.heroes.shieldKnight.path,
        color: "#f59e0b",
        gridX: 1,
        gridY: 2,
        hp: 3,
        maxHp: 3,
        isHiddenFromPlayers: false,
      },
      {
        id: "tok-lyra",
        characterId: "hero-lyra",
        name: "Lyra",
        type: "HERO",
        avatarEmoji: "🪄",
        assetPath: HEARTHQUEST_ASSETS.heroes.starlightWizard.path,
        color: "#8b5cf6",
        gridX: 1,
        gridY: 4,
        hp: 3,
        maxHp: 3,
        isHiddenFromPlayers: false,
      },
      {
        id: "tok-captain-barnacle",
        name: "Captain Barnacle the Otter",
        type: "NPC",
        avatarEmoji: "🦦",
        assetPath: HEARTHQUEST_ASSETS.heroes.forestRanger.path,
        color: "#3b82f6",
        gridX: 3,
        gridY: 3,
        hp: 3,
        maxHp: 3,
        isHiddenFromPlayers: false,
      },
      {
        id: "tok-lumina-jelly",
        name: "Queen Lumina the Nebula Jelly",
        type: "MONSTER",
        avatarEmoji: "🪼",
        assetPath: HEARTHQUEST_ASSETS.monsters.nebulaJelly.path,
        color: "#a855f7",
        gridX: 8,
        gridY: 2,
        hp: 4,
        maxHp: 4,
        isHiddenFromPlayers: true,
      },
      {
        id: "tok-astrolabe-prop",
        name: "The Starlight Astrolabe",
        type: "PROP",
        avatarEmoji: "🔮",
        assetPath: HEARTHQUEST_ASSETS.props.chestClosed.path,
        color: "#06b6d4",
        gridX: 7,
        gridY: 4,
        hp: 1,
        maxHp: 1,
        isHiddenFromPlayers: true,
      },
    ],
    storyNodes: [
      {
        id: "node-starlight-quarterdeck",
        title: "Scene 1: All Paws on Deck!",
        sceneZoneId: "zone-quarterdeck",
        readAloudByTone: {
          COZY_SILLY:
            "The ship sails through a sea of purple starlight! Captain Barnacle, a river otter in a captain's coat twice his size, is sliding belly-first across the polished wood deck trying to catch glowing floating star-bubbles!",
          ACTION_HEROIC:
            "The astral schooner Starlight Otter glides across the galactic sea! Solar winds ripple the crystal sails as Captain Barnacle grips the helm against cosmic turbulence!",
          MYSTERY_ATMOSPHERIC:
            "Silent starlight washes over the vessel's silverwood planks. Deep in the astral void, phosphorescent constellations pulse to a mysterious celestial heartbeat.",
        },
        readAloudByRating: {
          COZY_G:
            "A warm glow of shooting stars twinkles overhead! Captain Barnacle chirps merrily and slides on his belly across the deck, offering shiny sea-glass and star-fruit biscuits.",
          ADVENTURE_PG:
            "Cosmic swells rock the astral deck! Comets trail azure sparks past the rigging as Captain Barnacle orders all hands to secure the star-crystal sails!",
          CLASSIC_PG13:
            "Sailing through the uncharted void of the Astral Plane, artificial gravity flickers. Captain Barnacle inspects his planar compass as a rift opens on the starboard horizon.",
        },
        gmWhisperTips: [
          "Ask the players if they want to help steer the ship, catch floating star-bubbles, or inspect the glowing engine hatch.",
          "Pip the puppy or Hootie the owl can sniff/scout the engine hatch to find the safe entryway.",
        ],
        choices: [
          {
            id: "choice-steer-ship",
            label: "🧭 Take the helm and ride the cosmic starlight wave",
            targetNodeId: "node-astral-engine",
            requiredCheck: "Brains / Navigation or Wand Sparkle",
            consequenceTag: "NAVIGATED_WAVE",
          },
          {
            id: "choice-dive-engine-hatch",
            label: "⚓ Slide down the brass chute into the Comet-Core Engine Room",
            targetNodeId: "node-astral-engine",
            requiredCheck: "Brawn / Athletics or Shield Boop",
            consequenceTag: "SLID_CHUTE",
          },
        ],
      },
      {
        id: "node-astral-engine",
        title: "Scene 2: The Zero-G Engine Room",
        sceneZoneId: "zone-astral-engine",
        readAloudByTone: {
          COZY_SILLY:
            "WHOA! Your feet float off the floor! Gravity turned into fizzy soda pop! Friendly glowing jellyfish are booping into buttons and purring like kittens as they float past!",
          ACTION_HEROIC:
            "You enter the engine room in zero gravity! The glowing comet-core pulses erratically, surrounded by shimmering jellyfish whose electric tentacles threaten the warp conduits!",
          MYSTERY_ATMOSPHERIC:
            "Luminescent vapors drift in complete weightlessness. At the center of the chamber, a raw cosmic singularity hums softly, casting dancing prism reflections on the bulkheads.",
        },
        readAloudByRating: {
          COZY_G:
            "Wheee! Everyone is floating gently like fluffy balloons! The glowing jellyfish make funny squeaky sounds when nudged and tickle with warm, harmless sparkles.",
          ADVENTURE_PG:
            "Weightless chaos! Flying toolboxes and sparking astral conduits tumble through the air. The heroes must propel themselves between handholds to reach the control console.",
          CLASSIC_PG13:
            "Zero-G hazard: Kinetic recoil pushes combatants backward. The reactor containment fields are destabilizing, threatening an astral core breach.",
        },
        gmWhisperTips: [
          "Reveal Zone 2 ('The Comet-Core Engine Room') on the map!",
          "Players can do crazy acrobatic zero-g maneuvers using Shield Boops or Spell Flairs!",
        ],
        choices: [
          {
            id: "choice-realign-crystals",
            label: "💎 Realign the floating starlight crystals with steady hands",
            targetNodeId: "node-astrolabe-bridge",
            requiredCheck: "Any Heroic Roll",
            consequenceTag: "REALIGNED_CRYSTALS",
          },
          {
            id: "choice-sing-jellyfish",
            label: "🎵 Hum a soothing cosmic melody to guide the jellyfish safely",
            targetNodeId: "node-astrolabe-bridge",
            consequenceTag: "JELLYFISH_SERENADED",
          },
        ],
      },
      {
        id: "node-astrolabe-bridge",
        title: "Scene 3: Realigning the Star-Core",
        sceneZoneId: "zone-astrolabe-bridge",
        readAloudByTone: {
          COZY_SILLY:
            "In the glass observatory dome, Queen Lumina the giant jellyfish is wearing the ship's spare captain's hat and spinning the giant golden astrolabe like a hamster wheel!",
          ACTION_HEROIC:
            "The glass observatory opens to the panoramic galaxy! Queen Lumina floats protectively over the master astrolabe, ready to unleash a dazzling nova flash!",
          MYSTERY_ATMOSPHERIC:
            "Under a vast cathedral of endless stars, Queen Lumina's translucent body pulses with the secret frequencies of the cosmos, guarding the ancient navigation matrix.",
        },
        readAloudByRating: {
          COZY_G:
            "Queen Lumina spins the shiny golden wheels and giggles bubbles! When you offer her a star-biscuit, she happily lets you tune the ship toward home with a warm cosmic hug!",
          ADVENTURE_PG:
            "The astrolabe spins wildly out of control, threatening to slingshot the ship off course! The party must coordinate to calm Queen Lumina and lock the navigation matrix.",
          CLASSIC_PG13:
            "Planar currents converge upon Queen Lumina atop the celestial bridge. The party must withstand the psionic shockwaves to recalibrate the astral warp drive.",
        },
        gmWhisperTips: [
          "Reveal Zone 3 and unhide Queen Lumina and the Starlight Astrolabe!",
          "A successful roll aligns the ship toward the Hearth Constellation, ending the voyage in joyous celebration!",
        ],
        choices: [
          {
            id: "choice-return-quarterdeck",
            label: "🎉 Jump to Hyperspace! Return safely to Port",
            targetNodeId: "node-starlight-quarterdeck",
            consequenceTag: "VOYAGE_COMPLETED",
          },
        ],
      },
    ],
  },
];

/**
 * Generates Foundry-style shadow-casting wall & door segments for a 10x6 zone layout.
 * Includes outer perimeter boundaries, partition walls with toggleable doorways between zones,
 * and interior stone pillars that cast dynamic geometric shadows as heroes move.
 */
export function createDefaultZoneWalls(zones: MapRoomZone[]): WallSegment[] {
  const z1 = zones[0] || { id: "z1", gridX: 0, width: 4, isRevealed: true };
  const z2 = zones[1] || { id: "z2", gridX: 4, width: 3, isRevealed: false };
  const z3 = zones[2] || { id: "z3", gridX: 7, width: 3, isRevealed: false };

  const xSplit1 = z2.gridX;
  const xSplit2 = z3.gridX;

  return [
    // Outer map boundaries
    { id: "wall-border-top", x1: 0, y1: 0, x2: 10, y2: 0, blocksVision: true },
    { id: "wall-border-right", x1: 10, y1: 0, x2: 10, y2: 6, blocksVision: true },
    { id: "wall-border-bottom", x1: 10, y1: 6, x2: 0, y2: 6, blocksVision: true },
    { id: "wall-border-left", x1: 0, y1: 6, x2: 0, y2: 0, blocksVision: true },

    // Partition wall between Zone 1 and Zone 2
    { id: "wall-z1-top", x1: xSplit1, y1: 0, x2: xSplit1, y2: 2.1, blocksVision: true },
    {
      id: "door-zone-2",
      x1: xSplit1,
      y1: 2.1,
      x2: xSplit1,
      y2: 3.9,
      isDoor: true,
      isOpen: Boolean(z2.isRevealed),
      isLocked: false,
      blocksVision: !z2.isRevealed,
      zoneId: z2.id,
    },
    { id: "wall-z1-bottom", x1: xSplit1, y1: 3.9, x2: xSplit1, y2: 6, blocksVision: true },

    // Partition wall between Zone 2 and Zone 3
    { id: "wall-z2-top", x1: xSplit2, y1: 0, x2: xSplit2, y2: 2.1, blocksVision: true },
    {
      id: "door-zone-3",
      x1: xSplit2,
      y1: 2.1,
      x2: xSplit2,
      y2: 3.9,
      isDoor: true,
      isOpen: Boolean(z3.isRevealed),
      isLocked: !z3.isRevealed,
      lockDc: 12,
      lockLabel: "Brass Tumbler Lock",
      blocksVision: !z3.isRevealed,
      zoneId: z3.id,
    },
    { id: "wall-z2-bottom", x1: xSplit2, y1: 3.9, x2: xSplit2, y2: 6, blocksVision: true },

    // Interior shadow-casting pillars & alcoves
    { id: "pillar-z1-hearth", x1: 2.2, y1: 1.1, x2: 2.2, y2: 2.1, blocksVision: true },
    {
      id: "pillar-z2-alcove",
      x1: xSplit1 + 1.5,
      y1: 3.8,
      x2: xSplit1 + 1.5,
      y2: 4.8,
      blocksVision: true,
    },
  ];
}

/**
 * Assigns default torch/lantern point-light radii and colors to tokens.
 */
export function enrichTokensWithLighting(tokens: MapToken[]): MapToken[] {
  return tokens.map((t) => {
    if (t.type === "HERO") {
      return {
        ...t,
        lightRadius: t.lightRadius ?? 3.8,
        lightColor: t.lightColor ?? (t.color || "#fbbf24"),
      };
    }
    if (t.type === "PROP" || t.isLootChest) {
      return {
        ...t,
        lightRadius: t.lightRadius ?? 2.6,
        lightColor: t.lightColor ?? "#f97316",
      };
    }
    return t;
  });
}

/**
 * Pure 2D Ray-Segment Intersection:
 * Computes intersection of ray P + t*D (t >= 0) with segment A -> B (0 <= u <= 1).
 */
export function computeRaySegmentIntersection(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { x: number; y: number; t: number } | null {
  const sx = x2 - x1;
  const sy = y2 - y1;
  const denom = dx * sy - dy * sx;
  if (Math.abs(denom) < 1e-9) return null;
  const qpx = x1 - ox;
  const qpy = y1 - oy;
  const t = (qpx * sy - qpy * sx) / denom;
  const u = (qpx * dy - qpy * dx) / denom;
  if (t >= 0 && u >= -1e-6 && u <= 1 + 1e-6) {
    return {
      x: ox + t * dx,
      y: oy + t * dy,
      t,
    };
  }
  return null;
}

/**
 * Computes the sorted 2D Raycast Visibility Polygon from light origin (ox, oy)
 * bounded by active shadow-casting walls and maxRadius.
 */
export function computeVisibilityPolygon(
  ox: number,
  oy: number,
  maxRadius: number,
  walls: WallSegment[],
  radialSamples = 48
): Array<{ x: number; y: number; angle: number }> {
  const activeWalls = walls.filter((w) => w.blocksVision && !w.isOpen);
  const angles: number[] = [];

  for (let i = 0; i < radialSamples; i++) {
    angles.push((i * 2 * Math.PI) / radialSamples - Math.PI);
  }

  for (const w of activeWalls) {
    const a1 = Math.atan2(w.y1 - oy, w.x1 - ox);
    const a2 = Math.atan2(w.y2 - oy, w.x2 - ox);
    angles.push(a1 - 0.0002, a1, a1 + 0.0002);
    angles.push(a2 - 0.0002, a2, a2 + 0.0002);
  }

  const pts: Array<{ x: number; y: number; angle: number }> = [];
  for (const angle of angles) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let minT = maxRadius;
    let hitX = ox + dx * maxRadius;
    let hitY = oy + dy * maxRadius;

    for (const w of activeWalls) {
      const hit = computeRaySegmentIntersection(ox, oy, dx, dy, w.x1, w.y1, w.x2, w.y2);
      if (hit && hit.t < minT) {
        minT = hit.t;
        hitX = hit.x;
        hitY = hit.y;
      }
    }
    pts.push({ x: hitX, y: hitY, angle });
  }

  pts.sort((a, b) => a.angle - b.angle);
  return pts;
}

/**
 * Computes 5e grid ruler distance between two board coordinates (1 square = 5 ft).
 */
export function calculateGridDistanceFeet(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { squares: number; feet: number } {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  return {
    squares: Math.round(dist * 10) / 10,
    feet: Math.round(dist * 5),
  };
}

/**
 * Generates curated Foundry-grade battlemap objects & props (trees, branches, furniture,
 * flickering light fixtures, camp gear, bones/skeletons) across a map's zones.
 */
export function createDefaultMapPropsForTheme(
  theme: "BAKERY" | "FOREST_TREEHOUSE" | "STARLIGHT_SHIP",
  zones: MapRoomZone[]
): MapPropPlacement[] {
  const z0 = zones[0] || { gridX: 0, gridY: 0, width: 4, height: 6 };
  const z1 = zones[1] || { gridX: 4, gridY: 0, width: 3, height: 6 };
  const z2 = zones[2] || { gridX: 7, gridY: 0, width: 3, height: 6 };
  const props = HEARTHQUEST_ASSETS.mapProps;
  const uid = (tag: string, idx: number) => `mprop-${theme.toLowerCase()}-${tag}-${idx}`;

  if (theme === "FOREST_TREEHOUSE") {
    return [
      { id: uid("oak", 1), propKey: "treeOakCanopy", label: props.treeOakCanopy.name, category: "TREE", assetPath: props.treeOakCanopy.path, gridX: z0.gridX + 0.15, gridY: 0.1, widthSq: 1.7, heightSq: 1.7, zLayer: "CANOPY" },
      { id: uid("pine", 2), propKey: "treePineCluster", label: props.treePineCluster.name, category: "TREE", assetPath: props.treePineCluster.path, gridX: z0.gridX + 0.1, gridY: 4.1, widthSq: 1.7, heightSq: 1.7, zLayer: "CANOPY" },
      { id: uid("bush", 3), propKey: "bushBerryThicket", label: props.bushBerryThicket.name, category: "TREE", assetPath: props.bushBerryThicket.path, gridX: z0.gridX + Math.max(1.2, z0.width - 1.3), gridY: 0.25, widthSq: 1.1, heightSq: 1.1, zLayer: "OBJECT" },
      { id: uid("log", 4), propKey: "branchFallenLog", label: props.branchFallenLog.name, category: "BRANCH", assetPath: props.branchFallenLog.path, gridX: z0.gridX + Math.max(1.0, z0.width - 1.6), gridY: 4.5, widthSq: 1.4, heightSq: 0.9, rotationDeg: -14, zLayer: "OBJECT" },
      { id: uid("tent", 5), propKey: "campTent", label: props.campTent.name, category: "CAMP", assetPath: props.campTent.path, gridX: z0.gridX + 1.1, gridY: 1.1, widthSq: 1.5, heightSq: 1.4, zLayer: "OBJECT" },
      { id: uid("fire", 6), propKey: "campCampfireStones", label: props.campCampfireStones.name, category: "CAMP", assetPath: props.campCampfireStones.path, gridX: z0.gridX + 1.4, gridY: 3.1, widthSq: 1.0, heightSq: 1.0, zLayer: "OBJECT", lightRadius: 3.5, lightColor: "#fb923c" },
      { id: uid("pack", 7), propKey: "campBackpackSupplies", label: props.campBackpackSupplies.name, category: "CAMP", assetPath: props.campBackpackSupplies.path, gridX: z0.gridX + 2.5, gridY: 2.0, widthSq: 0.85, heightSq: 0.85, zLayer: "FLOOR" },
      { id: uid("boulder", 8), propKey: "boulderMossy", label: props.boulderMossy.name, category: "BRANCH", assetPath: props.boulderMossy.path, gridX: z1.gridX + 0.15, gridY: 0.2, widthSq: 1.1, heightSq: 1.1, zLayer: "OBJECT" },
      { id: uid("cot", 9), propKey: "furnitureBedrollCot", label: props.furnitureBedrollCot.name, category: "FURNITURE", assetPath: props.furnitureBedrollCot.path, gridX: z1.gridX + Math.max(0.8, z1.width - 1.45), gridY: 0.3, widthSq: 1.35, heightSq: 0.9, zLayer: "OBJECT" },
      { id: uid("shelf", 10), propKey: "furnitureBookshelf", label: props.furnitureBookshelf.name, category: "FURNITURE", assetPath: props.furnitureBookshelf.path, gridX: z1.gridX + 0.3, gridY: 4.85, widthSq: 1.35, heightSq: 0.9, zLayer: "OBJECT" },
      { id: uid("lantern", 11), propKey: "lightLanternPost", label: props.lightLanternPost.name, category: "LIGHT_FIXTURE", assetPath: props.lightLanternPost.path, gridX: z1.gridX + 1.2, gridY: 2.3, widthSq: 0.85, heightSq: 0.85, zLayer: "OBJECT", lightRadius: 3.1, lightColor: "#fcd34d" },
      { id: uid("stump", 12), propKey: "treeStumpMossy", label: props.treeStumpMossy.name, category: "TREE", assetPath: props.treeStumpMossy.path, gridX: z2.gridX + 0.3, gridY: 0.3, widthSq: 1.0, heightSq: 1.0, zLayer: "OBJECT" },
      { id: uid("cauldron", 13), propKey: "campCauldronPot", label: props.campCauldronPot.name, category: "CAMP", assetPath: props.campCauldronPot.path, gridX: z2.gridX + 1.1, gridY: 3.9, widthSq: 1.0, heightSq: 1.0, zLayer: "OBJECT", lightRadius: 2.6, lightColor: "#fb923c" },
      { id: uid("skel", 14), propKey: "bonesSkeletonRemains", label: props.bonesSkeletonRemains.name, category: "BONES", assetPath: props.bonesSkeletonRemains.path, gridX: z2.gridX + Math.max(0.8, z2.width - 1.35), gridY: 4.75, widthSq: 1.2, heightSq: 0.95, rotationDeg: 18, zLayer: "FLOOR" },
      { id: uid("sconce", 15), propKey: "lightWallSconce", label: props.lightWallSconce.name, category: "LIGHT_FIXTURE", assetPath: props.lightWallSconce.path, gridX: z2.gridX + Math.max(0.4, z2.width - 0.95), gridY: 0.2, widthSq: 0.85, heightSq: 0.85, zLayer: "OBJECT", lightRadius: 2.9, lightColor: "#fbbf24" },
    ];
  }

  if (theme === "STARLIGHT_SHIP") {
    return [
      { id: uid("crates", 1), propKey: "furnitureBarrelCrates", label: props.furnitureBarrelCrates.name, category: "FURNITURE", assetPath: props.furnitureBarrelCrates.path, gridX: z0.gridX + 0.15, gridY: 0.2, widthSq: 1.05, heightSq: 1.05, zLayer: "OBJECT" },
      { id: uid("table", 2), propKey: "furnitureOakTable", label: props.furnitureOakTable.name, category: "FURNITURE", assetPath: props.furnitureOakTable.path, gridX: z0.gridX + 1.2, gridY: 0.35, widthSq: 1.5, heightSq: 1.05, zLayer: "OBJECT" },
      { id: uid("chair", 3), propKey: "furnitureChair", label: props.furnitureChair.name, category: "FURNITURE", assetPath: props.furnitureChair.path, gridX: z0.gridX + 1.55, gridY: 1.4, widthSq: 0.75, heightSq: 0.75, rotationDeg: 180, zLayer: "OBJECT" },
      { id: uid("lantern", 4), propKey: "lightLanternPost", label: props.lightLanternPost.name, category: "LIGHT_FIXTURE", assetPath: props.lightLanternPost.path, gridX: z0.gridX + 0.25, gridY: 4.75, widthSq: 0.85, heightSq: 0.85, zLayer: "OBJECT", lightRadius: 3.1, lightColor: "#38bdf8" },
      { id: uid("cot", 5), propKey: "furnitureBedrollCot", label: props.furnitureBedrollCot.name, category: "FURNITURE", assetPath: props.furnitureBedrollCot.path, gridX: z0.gridX + 1.8, gridY: 4.8, widthSq: 1.35, heightSq: 0.9, zLayer: "OBJECT" },
      { id: uid("chand", 6), propKey: "lightChandelier", label: props.lightChandelier.name, category: "LIGHT_FIXTURE", assetPath: props.lightChandelier.path, gridX: z1.gridX + Math.max(0.5, z1.width * 0.5 - 0.7), gridY: 2.2, widthSq: 1.4, heightSq: 1.4, zLayer: "CANOPY", lightRadius: 4.0, lightColor: "#fde68a" },
      { id: uid("shelf", 7), propKey: "furnitureBookshelf", label: props.furnitureBookshelf.name, category: "FURNITURE", assetPath: props.furnitureBookshelf.path, gridX: z1.gridX + 0.25, gridY: 0.15, widthSq: 1.35, heightSq: 0.88, zLayer: "OBJECT" },
      { id: uid("braz", 8), propKey: "lightStandingBrazier", label: props.lightStandingBrazier.name, category: "LIGHT_FIXTURE", assetPath: props.lightStandingBrazier.path, gridX: z1.gridX + Math.max(0.6, z1.width - 1.1), gridY: 4.75, widthSq: 0.95, heightSq: 0.95, zLayer: "OBJECT", lightRadius: 3.4, lightColor: "#a855f7" },
      { id: uid("rock", 9), propKey: "boulderMossy", label: props.boulderMossy.name, category: "BRANCH", assetPath: props.boulderMossy.path, gridX: z2.gridX + 0.2, gridY: 0.25, widthSq: 1.05, heightSq: 1.05, zLayer: "OBJECT" },
      { id: uid("braz2", 10), propKey: "lightStandingBrazier", label: props.lightStandingBrazier.name, category: "LIGHT_FIXTURE", assetPath: props.lightStandingBrazier.path, gridX: z2.gridX + Math.max(0.7, z2.width - 1.15), gridY: 0.25, widthSq: 0.95, heightSq: 0.95, zLayer: "OBJECT", lightRadius: 3.2, lightColor: "#f59e0b" },
      { id: uid("bones", 11), propKey: "bonesPileSkulls", label: props.bonesPileSkulls.name, category: "BONES", assetPath: props.bonesPileSkulls.path, gridX: z2.gridX + 0.35, gridY: 4.75, widthSq: 0.95, heightSq: 0.95, zLayer: "FLOOR" },
      { id: uid("pack", 12), propKey: "campBackpackSupplies", label: props.campBackpackSupplies.name, category: "CAMP", assetPath: props.campBackpackSupplies.path, gridX: z2.gridX + Math.max(0.6, z2.width - 1.05), gridY: 4.7, widthSq: 0.85, heightSq: 0.85, zLayer: "FLOOR" },
    ];
  }

  // Default BAKERY / Tavern & Pantry Dungeon theme
  return [
    { id: uid("oak", 1), propKey: "treeOakCanopy", label: props.treeOakCanopy.name, category: "TREE", assetPath: props.treeOakCanopy.path, gridX: z0.gridX + 0.05, gridY: 0.05, widthSq: 1.55, heightSq: 1.55, zLayer: "CANOPY" },
    { id: uid("bush", 2), propKey: "bushBerryThicket", label: props.bushBerryThicket.name, category: "TREE", assetPath: props.bushBerryThicket.path, gridX: z0.gridX + 0.15, gridY: 4.75, widthSq: 1.1, heightSq: 1.1, zLayer: "OBJECT" },
    { id: uid("table", 3), propKey: "furnitureOakTable", label: props.furnitureOakTable.name, category: "FURNITURE", assetPath: props.furnitureOakTable.path, gridX: z0.gridX + 1.4, gridY: 0.35, widthSq: 1.55, heightSq: 1.05, zLayer: "OBJECT" },
    { id: uid("chair", 4), propKey: "furnitureChair", label: props.furnitureChair.name, category: "FURNITURE", assetPath: props.furnitureChair.path, gridX: z0.gridX + 1.85, gridY: 1.38, widthSq: 0.78, heightSq: 0.78, rotationDeg: 180, zLayer: "OBJECT" },
    { id: uid("lantern", 5), propKey: "lightLanternPost", label: props.lightLanternPost.name, category: "LIGHT_FIXTURE", assetPath: props.lightLanternPost.path, gridX: z0.gridX + Math.max(1.2, z0.width - 1.05), gridY: 4.85, widthSq: 0.85, heightSq: 0.85, zLayer: "OBJECT", lightRadius: 3.1, lightColor: "#fcd34d" },
    { id: uid("pack", 6), propKey: "campBackpackSupplies", label: props.campBackpackSupplies.name, category: "CAMP", assetPath: props.campBackpackSupplies.path, gridX: z0.gridX + 1.25, gridY: 4.85, widthSq: 0.85, heightSq: 0.85, zLayer: "FLOOR" },
    { id: uid("oven", 7), propKey: "furnitureBakerOven", label: props.furnitureBakerOven.name, category: "FURNITURE", assetPath: props.furnitureBakerOven.path, gridX: z1.gridX + 0.25, gridY: 0.15, widthSq: 1.45, heightSq: 1.2, zLayer: "OBJECT", lightRadius: 3.2, lightColor: "#fb923c" },
    { id: uid("crates", 8), propKey: "furnitureBarrelCrates", label: props.furnitureBarrelCrates.name, category: "FURNITURE", assetPath: props.furnitureBarrelCrates.path, gridX: z1.gridX + Math.max(0.8, z1.width - 1.2), gridY: 4.7, widthSq: 1.1, heightSq: 1.1, zLayer: "OBJECT" },
    { id: uid("chand", 9), propKey: "lightChandelier", label: props.lightChandelier.name, category: "LIGHT_FIXTURE", assetPath: props.lightChandelier.path, gridX: z1.gridX + Math.max(0.5, z1.width * 0.5 - 0.65), gridY: 2.25, widthSq: 1.35, heightSq: 1.35, zLayer: "CANOPY", lightRadius: 3.8, lightColor: "#fde68a" },
    { id: uid("sconce", 10), propKey: "lightWallSconce", label: props.lightWallSconce.name, category: "LIGHT_FIXTURE", assetPath: props.lightWallSconce.path, gridX: z1.gridX + 0.15, gridY: 4.9, widthSq: 0.85, heightSq: 0.85, zLayer: "OBJECT", lightRadius: 2.8, lightColor: "#fbbf24" },
    { id: uid("shelf", 11), propKey: "furnitureBookshelf", label: props.furnitureBookshelf.name, category: "FURNITURE", assetPath: props.furnitureBookshelf.path, gridX: z2.gridX + 0.25, gridY: 0.15, widthSq: 1.35, heightSq: 0.9, zLayer: "OBJECT" },
    { id: uid("braz", 12), propKey: "lightStandingBrazier", label: props.lightStandingBrazier.name, category: "LIGHT_FIXTURE", assetPath: props.lightStandingBrazier.path, gridX: z2.gridX + Math.max(0.8, z2.width - 1.1), gridY: 0.25, widthSq: 0.95, heightSq: 0.95, zLayer: "OBJECT", lightRadius: 3.4, lightColor: "#f59e0b" },
    { id: uid("bones", 13), propKey: "bonesPileSkulls", label: props.bonesPileSkulls.name, category: "BONES", assetPath: props.bonesPileSkulls.path, gridX: z2.gridX + 0.25, gridY: 4.8, widthSq: 0.95, heightSq: 0.95, zLayer: "FLOOR" },
    { id: uid("skel", 14), propKey: "bonesSkeletonRemains", label: props.bonesSkeletonRemains.name, category: "BONES", assetPath: props.bonesSkeletonRemains.path, gridX: z2.gridX + Math.max(0.9, z2.width - 1.3), gridY: 4.75, widthSq: 1.2, heightSq: 0.95, rotationDeg: -12, zLayer: "FLOOR" },
  ];
}

/**
 * Creates a room session loaded with the requested campaign (defaulting to camp-goblin-bakery).
 */
export function createCampaignSession(
  roomCode = "DRGN",
  campaignId: string = "camp-goblin-bakery"
): RoomSessionState {
  const campaign =
    FAMILY_CAMPAIGNS.find((c) => c.id === campaignId) ?? FAMILY_CAMPAIGNS[0];
  const heroes = createDefaultStarterHeroes();
  const zones: MapRoomZone[] = (JSON.parse(JSON.stringify(campaign.zones)) as MapRoomZone[]);
  const zoneThemes =
    campaign.theme === "FOREST_TREEHOUSE"
      ? (["FOREST_GRASS", "TREEHOUSE_WOOD", "CAVERN_DIRT"] as GroundTileTheme[])
      : campaign.theme === "STARLIGHT_SHIP"
      ? (["STARLIGHT_DECK", "STARLIGHT_DECK", "DUNGEON_STONE"] as GroundTileTheme[])
      : (["BAKERY_FLOOR", "BAKERY_FLOOR", "DUNGEON_STONE"] as GroundTileTheme[]);
  const clonedZones: MapRoomZone[] = zones.map((z, idx) => ({
    ...z,
    groundTileTheme: z.groundTileTheme || zoneThemes[idx % zoneThemes.length],
  }));
  const defaultGroundTileTheme: GroundTileTheme =
    campaign.theme === "FOREST_TREEHOUSE"
      ? "TREEHOUSE_WOOD"
      : campaign.theme === "STARLIGHT_SHIP"
      ? "STARLIGHT_DECK"
      : "BAKERY_FLOOR";
  const mapProps = createDefaultMapPropsForTheme(campaign.theme, clonedZones);
  const clonedTokens: MapToken[] = enrichTokensWithLighting(
    JSON.parse(JSON.stringify(campaign.tokens))
  );
  const defaultWeather: AmbientWeatherType =
    campaign.theme === "FOREST_TREEHOUSE"
      ? "FOREST_FIREFLIES"
      : campaign.theme === "STARLIGHT_SHIP"
      ? "STARLIGHT_DUST"
      : "HEARTH_EMBERS";

  const defaultSoundscape: AmbientSoundscapeType =
    campaign.zones[0]?.ambientSoundscape ?? "COZY_TAVERN";
  const defaultBackdrop: SceneBackdropType =
    campaign.theme === "FOREST_TREEHOUSE"
      ? "ENCHANTED_WOODS"
      : campaign.theme === "STARLIGHT_SHIP"
      ? "STARLIGHT_OBSERVATORY"
      : "HEARTH_TAVERN";

  const tokens = enrichTokensWithLighting(clonedTokens).map((tok) =>
    tok.type === "MONSTER"
      ? {
          ...tok,
          statBlock5e: tok.statBlock5e || findSrdMonsterStatBlock(tok.name),
          baseMaxHp: tok.baseMaxHp ?? tok.maxHp,
          baseArmorClass: tok.baseArmorClass ?? (tok.statBlock5e || findSrdMonsterStatBlock(tok.name)).armorClass,
        }
      : tok
  );
  const walls = (campaign.walls ? JSON.parse(JSON.stringify(campaign.walls)) : createDefaultZoneWalls(clonedZones)).map(
    (w: WallSegment) =>
      w.isDoor && typeof w.lockDc === "number" ? { ...w, baseLockDc: w.baseLockDc ?? w.lockDc } : w
  );
  const stageAreaMapUrl = resolveAreaMapAsset(campaign.id);
  const stageMoodArtUrl = resolveSceneBackdropAsset(defaultBackdrop);
  const storyNodes: StoryBranchNode[] = (JSON.parse(JSON.stringify(campaign.storyNodes)) as StoryBranchNode[]).map(
    (node) => ({
      ...node,
      stageAreaMapUrl: node.stageAreaMapUrl || stageAreaMapUrl,
      stageMoodArtUrl: node.stageMoodArtUrl || stageMoodArtUrl,
    })
  );

  const session: RoomSessionState = {
    roomCode,
    householdId: "household-demo-family",
    campaignId: campaign.id,
    campaignTitle: campaign.title,
    rulesTier: campaign.defaultRulesTier,
    contentRating: campaign.defaultContentRating,
    difficulty: "BALANCED_NORMAL",
    stageAreaMapUrl,
    stageMoodArtUrl,
    diceInputMode: "HYBRID_PHYSICAL_PROMPT",
    isPausedForBedtime: false,
    activeNodeId: campaign.initialActiveNodeId,
    gridCols: 10,
    gridRows: 6,
    zones: clonedZones,
    tokens,
    heroes,
    storyNodes,
    storyFlags: [],
    rollHistory: [],
    spotlightRecords: computeSiblingSpotlightFairness(heroes, []),
    ambientLightMode: campaign.ambientLightMode ?? "COZY_TWILIGHT",
    walls,
    ambientWeather: defaultWeather,
    spellTemplates: [],
    ambientSoundscape: defaultSoundscape,
    sceneBackdrop: defaultBackdrop,
    groundTileTheme: defaultGroundTileTheme,
    mapProps,
    combat: {
      isActive: false,
      round: 1,
      activeTurnIndex: 0,
      entries: [],
    },
  };
  return applyRoomDifficulty(session, "BALANCED_NORMAL");
}

/**
 * Creates a complete, ready-to-play starter family session:
 * "The Great Goblin Bakery Heist"
 */
export function createStarterFamilySession(roomCode = "DRGN"): RoomSessionState {
  return createCampaignSession(roomCode, "camp-goblin-bakery");
}

/**
 * Procedural Map Generator:
 * Generates a fresh randomized 10x6 map layout with fog-of-war zones
 * and interactive tokens so families can replay with new maps.
 */
export function generateProceduralMapLayout(
  theme: "BAKERY" | "FOREST_TREEHOUSE" | "STARLIGHT_SHIP"
): { zones: MapRoomZone[]; tokens: MapToken[]; mapProps: MapPropPlacement[]; groundTileTheme: GroundTileTheme } {
  // Randomize zone widths across 10 columns (0 to 9)
  const width1 = Math.random() < 0.5 ? 3 : 4;
  const width2 = Math.random() < 0.5 ? 3 : 4;
  const width3 = 10 - width1 - width2;

  const runId = Math.random().toString(36).slice(2, 7);

  type ThemeConfig = {
    soundscapes: Array<"COZY_TAVERN" | "WHISPERING_WOODS" | "GOBLIN_KITCHEN" | "CRYSTAL_CAVERN">;
    zoneNames: [string[], string[], string[]];
    traps: string[];
    npcs: Array<{ name: string; avatarEmoji: string; color: string; hp: number }>;
    props: Array<{ name: string; avatarEmoji: string; color: string }>;
    minions: Array<{ name: string; avatarEmoji: string; color: string; hp: number }>;
    bosses: Array<{ name: string; avatarEmoji: string; color: string; hp: number }>;
  };

  const THEMES: Record<"BAKERY" | "FOREST_TREEHOUSE" | "STARLIGHT_SHIP", ThemeConfig> = {
    BAKERY: {
      soundscapes: ["COZY_TAVERN", "GOBLIN_KITCHEN", "CRYSTAL_CAVERN"],
      zoneNames: [
        ["Cinnamon Courtyard", "Frosted Entry Hall", "Warm Gingerbread Porch", "Powdered Sugar Patio"],
        ["The Flour-Cloud Pantry", "Molasses Mixing Chamber", "Whistling Kettle Corridor", "Butterscotch Cellar"],
        ["Chef Snickerdoodle's Vault", "The Royal Grand Oven", "Crystal Candy Cavern", "Strawberry Tart Sanctuary"],
      ],
      traps: [
        "Tickle-Pepper Floor Tile (DC 10 or sneeze loudly!)",
        "Slippery Honey Floor (DC 11 Dex or slide into empty baking pans!)",
        "Gooey Marshmallow Trap (DC 10 Str to unstick your boots!)",
        "Puff-Pastry Steam Geyser (DC 10 Dex to duck the warm butter puff!)",
      ],
      npcs: [
        { name: "Sprinkles the Goblin Guard", avatarEmoji: "🧁", color: "#10b981", hp: 2 },
        { name: "Baron von Bagel", avatarEmoji: "🥯", color: "#f59e0b", hp: 3 },
        { name: "Pastry Scout Crumbs", avatarEmoji: "🍪", color: "#3b82f6", hp: 2 },
      ],
      props: [
        { name: "Enchanted Rolling Pin", avatarEmoji: "🥖", color: "#d97706" },
        { name: "Whirling Frosting Dispenser", avatarEmoji: "🎂", color: "#ec4899" },
        { name: "Golden Royal Cake Pan", avatarEmoji: "👑", color: "#eab308" },
      ],
      minions: [
        { name: "Frosted Dough Imp", avatarEmoji: "🧁", color: "#a855f7", hp: 2 },
        { name: "Rambunctious Yeast Swarm", avatarEmoji: "🥐", color: "#f97316", hp: 3 },
        { name: "Molasses Sprite", avatarEmoji: "🍯", color: "#ca8a04", hp: 2 },
      ],
      bosses: [
        { name: "Chef Snickerdoodle", avatarEmoji: "👨‍🍳", color: "#ef4444", hp: 4 },
        { name: "Grand Duchess Danish", avatarEmoji: "🥧", color: "#dc2626", hp: 5 },
        { name: "The Sourdough Colossus", avatarEmoji: "🥖", color: "#b91c1c", hp: 6 },
      ],
    },
    FOREST_TREEHOUSE: {
      soundscapes: ["WHISPERING_WOODS", "COZY_TAVERN", "CRYSTAL_CAVERN"],
      zoneNames: [
        ["Mossy Canopy Landing", "Dewdrop Welcome Perch", "Fern-Gilded Bridge", "Great Oak Ropeway"],
        ["Whispering Gear Loft", "Acorn Mechanism Chute", "Clockwork Twig Workshop", "Brass Bramble Loft"],
        ["The Grand Heart-Spring Aviary", "Elder Clockwork Roost", "Golden Blossom Engine", "Starlit Nest Sanctum"],
      ],
      traps: [
        "Swinging Pendulum Bridge (DC 11 Dex or swing into a comfy leaf hammock!)",
        "Sleeping Spore Pod (DC 10 Con or take a 1-turn cozy nap!)",
        "Loose Gear Floorboard (DC 10 Dex to avoid clattering like chimes!)",
        "Acorn Catapult Snare (DC 10 Dex or get hoisted in a rope basket!)",
      ],
      npcs: [
        { name: "Cogsworth the Brass Squirrel", avatarEmoji: "🐿️", color: "#f59e0b", hp: 2 },
        { name: "Elder Oakwhisper the Woodpecker", avatarEmoji: "🪵", color: "#10b981", hp: 3 },
        { name: "Sprout the Forest Sprite", avatarEmoji: "🧚", color: "#06b6d4", hp: 2 },
      ],
      props: [
        { name: "Singing Clockwork Nest", avatarEmoji: "🪺", color: "#10b981" },
        { name: "Steam Pressure Lever", avatarEmoji: "⚙️", color: "#64748b" },
        { name: "Luminescent Sap Lantern", avatarEmoji: "🏮", color: "#f59e0b" },
      ],
      minions: [
        { name: "Overwound Twig Golem", avatarEmoji: "🤖", color: "#f97316", hp: 3 },
        { name: "Bramble Beetle", avatarEmoji: "🪲", color: "#15803d", hp: 2 },
        { name: "Playful Acorn Sprite", avatarEmoji: "🌰", color: "#b45309", hp: 2 },
      ],
      bosses: [
        { name: "Rustwing the Overwound Golem", avatarEmoji: "🤖", color: "#ef4444", hp: 5 },
        { name: "Clockwork Falcon King", avatarEmoji: "🦅", color: "#dc2626", hp: 5 },
        { name: "The Steam-Chamber Boar", avatarEmoji: "🐗", color: "#b91c1c", hp: 6 },
      ],
    },
    STARLIGHT_SHIP: {
      soundscapes: ["COZY_TAVERN", "CRYSTAL_CAVERN", "CRYSTAL_CAVERN"],
      zoneNames: [
        ["The Starlight Quarterdeck", "Astral Gangplank", "Nebula Harbor Perch", "Moondust Promenade"],
        ["The Comet-Core Engine Room", "Starlight Mess Hall", "Constellation Navigation Bay", "Gravity Bubble Hold"],
        ["The Grand Astrolabe Observatory", "Captain's Cosmic Sanctum", "Supernova Hearth Vault", "Prismatic Star-Bridge"],
      ],
      traps: [
        "Zero-G Floating Bubble (DC 11 Dex or float harmlessly toward the ceiling like a balloon!)",
        "Static Starlight Web (DC 10 Dex or hair crackles with harmless purple sparks!)",
        "Cosmic Gravity Reversal (DC 11 Wis or walk upside down for a turn!)",
        "Singing Comet Echo (DC 10 Wis or dance a cosmic waltz!)",
      ],
      npcs: [
        { name: "Captain Barnacle", avatarEmoji: "🦦", color: "#3b82f6", hp: 3 },
        { name: "Stella the Star-Rabbit", avatarEmoji: "🐇", color: "#e0e7ff", hp: 2 },
        { name: "Quark the Cosmic Parrot", avatarEmoji: "🦜", color: "#06b6d4", hp: 2 },
      ],
      props: [
        { name: "The Starlight Astrolabe", avatarEmoji: "🔮", color: "#06b6d4" },
        { name: "Astral Warp Compass", avatarEmoji: "🧭", color: "#3b82f6" },
        { name: "Glowing Star-Fuel Battery", avatarEmoji: "⭐", color: "#facc15" },
      ],
      minions: [
        { name: "Playful Nebula Jelly", avatarEmoji: "🪼", color: "#a855f7", hp: 2 },
        { name: "Starlight Comet Moth", avatarEmoji: "🦋", color: "#38bdf8", hp: 2 },
        { name: "Zero-G Astro-Pug", avatarEmoji: "🐶", color: "#f59e0b", hp: 3 },
      ],
      bosses: [
        { name: "Queen Lumina the Nebula Jelly", avatarEmoji: "🪼", color: "#ef4444", hp: 4 },
        { name: "Cosmic Void Whale", avatarEmoji: "🐋", color: "#4338ca", hp: 6 },
        { name: "Supernova Solar Dragon", avatarEmoji: "🐉", color: "#dc2626", hp: 6 },
      ],
    },
  };

  const config = THEMES[theme] ?? THEMES.BAKERY;
  const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  const zones: MapRoomZone[] = [
    {
      id: `proc-zone-${runId}-1`,
      name: `1. ${pickRandom(config.zoneNames[0])}`,
      gridX: 0,
      gridY: 0,
      width: width1,
      height: 6,
      isRevealed: true,
      ambientSoundscape: config.soundscapes[0],
    },
    {
      id: `proc-zone-${runId}-2`,
      name: `2. ${pickRandom(config.zoneNames[1])}`,
      gridX: width1,
      gridY: 0,
      width: width2,
      height: 6,
      isRevealed: false,
      hasSecretTrap: true,
      trapDescription: pickRandom(config.traps),
      ambientSoundscape: config.soundscapes[1],
    },
    {
      id: `proc-zone-${runId}-3`,
      name: `3. ${pickRandom(config.zoneNames[2])}`,
      gridX: width1 + width2,
      gridY: 0,
      width: width3,
      height: 6,
      isRevealed: false,
      ambientSoundscape: config.soundscapes[2],
    },
  ];

  const occupied = new Set<string>();

  const getUnoccupiedCoord = (zone: { gridX: number; width: number; height: number }): { x: number; y: number } => {
    for (let i = 0; i < 50; i++) {
      const x = zone.gridX + Math.floor(Math.random() * zone.width);
      const y = Math.floor(Math.random() * zone.height);
      const key = `${x},${y}`;
      if (!occupied.has(key)) {
        occupied.add(key);
        return { x, y };
      }
    }
    for (let x = zone.gridX; x < zone.gridX + zone.width; x++) {
      for (let y = 0; y < zone.height; y++) {
        const key = `${x},${y}`;
        if (!occupied.has(key)) {
          occupied.add(key);
          return { x, y };
        }
      }
    }
    return { x: zone.gridX, y: 0 };
  };

  const heroPos1 = getUnoccupiedCoord(zones[0]);
  const heroPos2 = getUnoccupiedCoord(zones[0]);
  const npc = pickRandom(config.npcs);
  const npcPos = getUnoccupiedCoord(zones[0]);
  const prop1 = pickRandom(config.props);
  const propPos1 = getUnoccupiedCoord(zones[1]);
  const minion = pickRandom(config.minions);
  const minionPos = getUnoccupiedCoord(zones[1]);
  const boss = pickRandom(config.bosses);
  const bossPos = getUnoccupiedCoord(zones[2]);
  const otherProps = config.props.filter((p) => p.name !== prop1.name);
  const prop2 = pickRandom(otherProps.length > 0 ? otherProps : config.props);
  const propPos2 = getUnoccupiedCoord(zones[2]);

  const tokens: MapToken[] = [
    {
      id: `tok-proc-barnaby-${runId}`,
      characterId: "hero-barnaby",
      name: "Sir Barnaby",
      type: "HERO",
      avatarEmoji: "🛡️",
      color: "#f59e0b",
      gridX: heroPos1.x,
      gridY: heroPos1.y,
      hp: 3,
      maxHp: 3,
      isHiddenFromPlayers: false,
    },
    {
      id: `tok-proc-lyra-${runId}`,
      characterId: "hero-lyra",
      name: "Lyra",
      type: "HERO",
      avatarEmoji: "🪄",
      color: "#8b5cf6",
      gridX: heroPos2.x,
      gridY: heroPos2.y,
      hp: 3,
      maxHp: 3,
      isHiddenFromPlayers: false,
    },
    {
      id: `tok-proc-npc-${runId}`,
      name: npc.name,
      type: "NPC",
      avatarEmoji: npc.avatarEmoji,
      color: npc.color,
      gridX: npcPos.x,
      gridY: npcPos.y,
      hp: npc.hp,
      maxHp: npc.hp,
      isHiddenFromPlayers: false,
    },
    {
      id: `tok-proc-prop1-${runId}`,
      name: prop1.name,
      type: "PROP",
      avatarEmoji: prop1.avatarEmoji,
      color: prop1.color,
      gridX: propPos1.x,
      gridY: propPos1.y,
      hp: 1,
      maxHp: 1,
      isHiddenFromPlayers: false,
    },
    {
      id: `tok-proc-minion-${runId}`,
      name: minion.name,
      type: "MONSTER",
      avatarEmoji: minion.avatarEmoji,
      color: minion.color,
      gridX: minionPos.x,
      gridY: minionPos.y,
      hp: minion.hp,
      maxHp: minion.hp,
      isHiddenFromPlayers: true,
    },
    {
      id: `tok-proc-boss-${runId}`,
      name: boss.name,
      type: "MONSTER",
      avatarEmoji: boss.avatarEmoji,
      color: boss.color,
      gridX: bossPos.x,
      gridY: bossPos.y,
      hp: boss.hp,
      maxHp: boss.hp,
      isHiddenFromPlayers: true,
    },
    {
      id: `tok-proc-prop2-${runId}`,
      name: prop2.name,
      type: "PROP",
      avatarEmoji: prop2.avatarEmoji,
      color: prop2.color,
      gridX: propPos2.x,
      gridY: propPos2.y,
      hp: 1,
      maxHp: 1,
      isHiddenFromPlayers: true,
    },
  ];

  tokens.forEach((t) => {
    t.assetPath = resolveTokenAsset({ name: t.name, type: t.type });
  });

  const groundTileTheme: GroundTileTheme =
    theme === "FOREST_TREEHOUSE"
      ? "TREEHOUSE_WOOD"
      : theme === "STARLIGHT_SHIP"
      ? "STARLIGHT_DECK"
      : "BAKERY_FLOOR";
  const zoneTileThemes: GroundTileTheme[] =
    theme === "FOREST_TREEHOUSE"
      ? ["FOREST_GRASS", "TREEHOUSE_WOOD", "CAVERN_DIRT"]
      : theme === "STARLIGHT_SHIP"
      ? ["STARLIGHT_DECK", "STARLIGHT_DECK", "DUNGEON_STONE"]
      : ["BAKERY_FLOOR", "BAKERY_FLOOR", "DUNGEON_STONE"];
  zones.forEach((z, idx) => {
    z.groundTileTheme = zoneTileThemes[idx % zoneTileThemes.length];
  });
  const mapProps = createDefaultMapPropsForTheme(theme, zones);

  return { zones, tokens: enrichTokensWithLighting(tokens), mapProps, groundTileTheme };
}

/**
 * Core HearthQuest 5e & Storybook Skills catalog with theme-aware Light/Dark styling badges.
 */
export const HEARTHQUEST_SKILLS: SkillDefinition[] = [
  {
    id: "athletics",
    name: "Athletics",
    ability5e: "str",
    storybookStat: "brawn",
    icon: "💪",
    accentLightClass: "bg-amber-100 text-amber-900 border-amber-300",
    accentDarkClass: "bg-amber-950/70 text-amber-300 border-amber-700/60",
  },
  {
    id: "acrobatics",
    name: "Acrobatics",
    ability5e: "dex",
    storybookStat: "brawn",
    icon: "🤸",
    accentLightClass: "bg-orange-100 text-orange-900 border-orange-300",
    accentDarkClass: "bg-orange-950/70 text-orange-300 border-orange-700/60",
  },
  {
    id: "sleight_of_hand",
    name: "Sleight of Hand / Lockpicking",
    ability5e: "dex",
    storybookStat: "brains",
    icon: "🗝️",
    accentLightClass: "bg-amber-100 text-amber-900 border-amber-300",
    accentDarkClass: "bg-amber-950/70 text-amber-300 border-amber-700/60",
  },
  {
    id: "stealth",
    name: "Stealth",
    ability5e: "dex",
    storybookStat: "brawn",
    icon: "🥷",
    accentLightClass: "bg-slate-200 text-slate-900 border-slate-400",
    accentDarkClass: "bg-slate-800/80 text-slate-200 border-slate-600",
  },
  {
    id: "arcana",
    name: "Arcana",
    ability5e: "int",
    storybookStat: "brains",
    icon: "✨",
    accentLightClass: "bg-purple-100 text-purple-900 border-purple-300",
    accentDarkClass: "bg-purple-950/70 text-purple-300 border-purple-700/60",
  },
  {
    id: "investigation",
    name: "Investigation",
    ability5e: "int",
    storybookStat: "brains",
    icon: "🔍",
    accentLightClass: "bg-indigo-100 text-indigo-900 border-indigo-300",
    accentDarkClass: "bg-indigo-950/70 text-indigo-300 border-indigo-700/60",
  },
  {
    id: "nature",
    name: "Nature",
    ability5e: "int",
    storybookStat: "brains",
    icon: "🌿",
    accentLightClass: "bg-emerald-100 text-emerald-900 border-emerald-300",
    accentDarkClass: "bg-emerald-950/70 text-emerald-300 border-emerald-700/60",
  },
  {
    id: "perception",
    name: "Perception",
    ability5e: "wis",
    storybookStat: "brains",
    icon: "👀",
    accentLightClass: "bg-teal-100 text-teal-900 border-teal-300",
    accentDarkClass: "bg-teal-950/70 text-teal-300 border-teal-700/60",
  },
  {
    id: "survival",
    name: "Survival",
    ability5e: "wis",
    storybookStat: "brains",
    icon: "🧭",
    accentLightClass: "bg-lime-100 text-lime-900 border-lime-300",
    accentDarkClass: "bg-lime-950/70 text-lime-300 border-lime-700/60",
  },
  {
    id: "persuasion",
    name: "Persuasion",
    ability5e: "cha",
    storybookStat: "charm",
    icon: "💬",
    accentLightClass: "bg-rose-100 text-rose-900 border-rose-300",
    accentDarkClass: "bg-rose-950/70 text-rose-300 border-rose-700/60",
  },
  {
    id: "performance",
    name: "Performance",
    ability5e: "cha",
    storybookStat: "charm",
    icon: "🎵",
    accentLightClass: "bg-sky-100 text-sky-900 border-sky-300",
    accentDarkClass: "bg-sky-950/70 text-sky-300 border-sky-700/60",
  },
];

export function computeAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function getHeroSkillModifiers(
  hero: CharacterSheet,
  rulesTier: RulesTier = hero.rulesTier
): Array<SkillDefinition & { modifier: number; proficient: boolean }> {
  const profs = new Set<SkillId>(hero.proficientSkills || []);
  const profBonus = rulesTier === "STORYBOOK_D6" ? 1 : 2;
  return HEARTHQUEST_SKILLS.map((skill) => {
    const base =
      rulesTier === "STORYBOOK_D6"
        ? hero.storybookStats[skill.storybookStat]
        : computeAbilityModifier(hero.attributes5e[skill.ability5e]);
    const proficient = profs.has(skill.id);
    return {
      ...skill,
      proficient,
      modifier: base + (proficient ? profBonus : 0),
    };
  });
}

export function rollHeroSkillCheck(params: {
  hero: CharacterSheet;
  skillId: SkillId;
  rulesTier: RulesTier;
  targetDcOverride?: number;
  actionLabelOverride?: string;
  rawRollOverride?: number;
  difficulty?: DifficultyPreset;
}): DiceRollResult {
  const tuning = getDifficultyTuning(params.difficulty);
  const skills = getHeroSkillModifiers(params.hero, params.rulesTier);
  const skill = skills.find((s) => s.id === params.skillId) ?? skills[0];
  const dieType: DieType = params.rulesTier === "STORYBOOK_D6" ? "d6" : "d20";
  const maxFace = dieType === "d6" ? 6 : 20;
  const rawRoll =
    typeof params.rawRollOverride === "number" && Number.isFinite(params.rawRollOverride)
      ? Math.max(1, Math.min(maxFace, Math.round(params.rawRollOverride)))
      : Math.floor(Math.random() * maxFace) + 1;
  const modifier = skill.modifier + tuning.playerRollBonus;
  const total = rawRoll + modifier;
  const rawBaseDc =
    typeof params.targetDcOverride === "number" && Number.isFinite(params.targetDcOverride)
      ? params.rulesTier === "STORYBOOK_D6" && params.targetDcOverride > 6
        ? Math.max(3, Math.min(6, Math.round(params.targetDcOverride / 3)))
        : Math.max(2, Math.round(params.targetDcOverride))
      : params.rulesTier === "STORYBOOK_D6"
      ? 4
      : 12;
  const dcShift = params.rulesTier === "STORYBOOK_D6" ? Math.sign(tuning.dcDelta) : tuning.dcDelta;
  const minDc = params.rulesTier === "STORYBOOK_D6" ? 2 : 5;
  // Note: when caller already passes a room's difficulty-scaled door.lockDc, room-store should avoid double-subtracting,
  // or pass difficulty tuning cleanly. Here we apply dcDelta only when targetDcOverride isn't pre-scaled.
  const targetDC =
    typeof params.targetDcOverride === "number"
      ? Math.max(minDc, rawBaseDc)
      : Math.max(minDc, rawBaseDc + dcShift);
  const succeeded = total >= targetDC;
  const isCrit = rawRoll === maxFace;
  const checkTitle = params.actionLabelOverride || `${skill.icon} ${skill.name} Check`;

  return {
    id: `sroll_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    characterId: params.hero.id,
    playerName: params.hero.playerName,
    characterName: params.hero.name,
    actionTitle: checkTitle,
    dieType,
    source: typeof params.rawRollOverride === "number" ? "PHYSICAL_DICE_TABLE" : "DIGITAL_3D_ROLLER",
    rawRoll,
    modifier,
    total,
    targetDC,
    succeeded,
    isCriticalSuccess: isCrit,
    narrativeOutcome: isCrit
      ? `🌟 Natural ${maxFace}! ${params.hero.name} aces ${checkTitle} with effortless flair!`
      : succeeded
      ? `✅ ${params.hero.name} succeeds at ${checkTitle} (Total ${total} vs DC ${targetDC}).`
      : `💫 ${params.hero.name} misses DC ${targetDC} on ${checkTitle} (${total}), noticing a helpful clue instead!`,
    timestamp: new Date().toISOString(),
  };
}

export function parseTokenSpeedFt(speedText?: string): number {
  if (!speedText) return 30;
  const match = String(speedText).match(/(\d+)\s*ft/i);
  if (!match) return 30;
  const parsed = parseInt(match[1], 10);
  return Number.isFinite(parsed) && parsed >= 5 ? parsed : 30;
}

export function rollRoomCombatInitiative(
  tokens: MapToken[],
  heroes: CharacterSheet[],
  options?: { enforceTurnMovement?: boolean; rulesTier?: RulesTier }
): CombatState {
  const combatants = tokens.filter((t) => t.type !== "PROP" && t.hp > 0);
  const entries: InitiativeEntry[] = combatants.map((t) => {
    const hero = heroes.find((h) => h.id === t.characterId);
    const dexScore =
      hero?.attributes5e?.dex ?? t.statBlock5e?.abilities?.dex ?? 12;
    const dexMod = computeAbilityModifier(dexScore);
    const archLower = (hero?.archetype || t.name || "").toLowerCase();
    const defaultHeroSpeed =
      archLower.includes("rogue") || archLower.includes("ranger") || archLower.includes("scout")
        ? 35
        : archLower.includes("knight") || archLower.includes("paladin") || archLower.includes("dwarf")
        ? 25
        : 30;
    const speedFt =
      hero?.attributes5e?.speedFt ||
      t.speedFt ||
      (t.statBlock5e?.speed ? parseTokenSpeedFt(t.statBlock5e.speed) : undefined) ||
      defaultHeroSpeed;
    const dieMax = options?.rulesTier === "STORYBOOK_D6" ? 6 : 20;
    const roll = Math.floor(Math.random() * dieMax) + 1 + dexMod;
    return {
      id: `init_${t.id}`,
      tokenId: t.id,
      characterId: t.characterId,
      name: t.name,
      type: t.type,
      initiative: roll,
      dexModifier: dexMod,
      speedFt,
      movementRemainingFt: speedFt,
      hasActedThisRound: false,
      hp: t.hp,
      maxHp: t.maxHp,
      avatarEmoji: t.avatarEmoji,
      assetPath: t.assetPath,
    };
  });

  entries.sort((a, b) => {
    if (b.initiative !== a.initiative) return b.initiative - a.initiative;
    const dexDiff = (b.dexModifier ?? 0) - (a.dexModifier ?? 0);
    if (dexDiff !== 0) return dexDiff;
    if (a.type === "HERO" && b.type !== "HERO") return -1;
    if (b.type === "HERO" && a.type !== "HERO") return 1;
    return 0;
  });

  return {
    isActive: entries.length > 0,
    phase: "ACTIVE",
    round: 1,
    activeTurnIndex: 0,
    enforceTurnMovement: options?.enforceTurnMovement ?? true,
    entries,
  };
}

/**
 * Authoritative Lore & Map Continuity Seed Registry for Flagship Campaigns.
 * Prevents procedural one-shots or new chapters from duplicating main plots, bosses, or zones.
 */
export function buildCoreCampaignLoreSeeds(): LoreRegistryEntry[] {
  const now = new Date().toISOString();
  return [
    {
      id: "lore-camp-goblin-bakery",
      entryType: "CAMPAIGN_ARC",
      title: "The Great Goblin Bakery Heist",
      slug: "camp-goblin-bakery",
      biome: "BAKERY",
      plotPremise: "Recover the stolen Royal Birthday Cake from a whimsical goblin patisserie.",
      mainAntagonist: "Chef Snickerdoodle",
      keyLocations: ["Cinnamon Courtyard", "Flour-Cloud Pantry", "Chef Snickerdoodle's Vault"],
      levelRange: "1-2",
      createdAt: now,
    },
    {
      id: "lore-camp-clockwork-treehouse",
      entryType: "CAMPAIGN_ARC",
      title: "The Clockwork Treehouse Mystery",
      slug: "camp-clockwork-treehouse",
      biome: "FOREST_TREEHOUSE",
      plotPremise: "Repair the jammed Giant Acorn Windmill Gear inside an enchanted redwood canopy.",
      mainAntagonist: "Cogsworth Clockwork Squirrel",
      keyLocations: ["Mossy Rope Bridge", "Tinkerer's Branch Lab", "Belfry of Golden Bells"],
      levelRange: "2-3",
      createdAt: now,
    },
    {
      id: "lore-camp-starlight-otter",
      entryType: "CAMPAIGN_ARC",
      title: "Voyage of the Starlight Otter",
      slug: "camp-starlight-otter",
      biome: "STARLIGHT_SHIP",
      plotPremise: "Navigate astral currents aboard a flying sky-galleon to recover lost constellation lanterns.",
      mainAntagonist: "Queen Lumina Starlight Jelly",
      keyLocations: ["Comet Foredeck", "Astrolabe Wheelhouse", "Nebula Crown Dock"],
      levelRange: "3-5",
      createdAt: now,
    },
  ];
}

export interface OneShotBlueprint {
  slug: string;
  title: string;
  biome: "BAKERY" | "FOREST_TREEHOUSE" | "STARLIGHT_SHIP";
  backdrop: SceneBackdropType;
  weather: AmbientWeatherType;
  soundscape: "COZY_TAVERN" | "WHISPERING_WOODS" | "GOBLIN_KITCHEN" | "CRYSTAL_CAVERN";
  premise: string;
  antagonist: string;
  antagonistEmoji: string;
  minionName: string;
  zones: [string, string, string];
  lootName: string;
}

export const ONE_SHOT_SIDEQUEST_CATALOG: OneShotBlueprint[] = [
  {
    slug: "oneshot-waffle-golem",
    title: "Rise of the Runaway Waffle Golem",
    biome: "BAKERY",
    backdrop: "HEARTH_TAVERN",
    weather: "HEARTH_EMBERS",
    soundscape: "GOBLIN_KITCHEN",
    premise: "An enchanted maple-syrup construct is bolting through the guild kitchen ovens!",
    antagonist: "Sir Batterhorn the Waffle Golem",
    antagonistEmoji: "🧇",
    minionName: "Gingerbread Scout",
    zones: ["Warm Maple Foyer", "Bubble-Butter Distillery", "Golden Iron Hearth"],
    lootName: "Spool of Ever-Crisp Cinnamon",
  },
  {
    slug: "oneshot-mushroom-relay",
    title: "The Moonlit Mushroom Relay",
    biome: "FOREST_TREEHOUSE",
    backdrop: "ENCHANTED_WOODS",
    weather: "FOREST_FIREFLIES",
    soundscape: "WHISPERING_WOODS",
    premise: "Help the woodland firefly couriers rescue the Dawn Dewdrop before moonrise ends.",
    antagonist: "Grumblecap the Sleepy Badger Knight",
    antagonistEmoji: "🦡",
    minionName: "Polka-Dot Toadstool Sprite",
    zones: ["Dewdrop Trailhead", "Hollow Log Bridge", "Emerald Lantern Glade"],
    lootName: "Lantern of Unfading Glowmoss",
  },
  {
    slug: "oneshot-crystal-echoes",
    title: "The Singing Crystal Library",
    biome: "STARLIGHT_SHIP",
    backdrop: "STARLIGHT_OBSERVATORY",
    weather: "STARLIGHT_DUST",
    soundscape: "CRYSTAL_CAVERN",
    premise: "Musical prism-owls mixed up the spellbooks and locked the astral observatory dome!",
    antagonist: "Archivist Echo-Wing",
    antagonistEmoji: "🦉",
    minionName: "Prism Page Golem",
    zones: ["Chime Mezzanine", "Floating Quill Vault", "Moon-Lens Rotunda"],
    lootName: "Compass of Harmonious Chimes",
  },
  {
    slug: "oneshot-cloudberry-regatta",
    title: "Cloudberry Sky-Skiff Regatta",
    biome: "STARLIGHT_SHIP",
    backdrop: "STARLIGHT_OBSERVATORY",
    weather: "STARLIGHT_DUST",
    soundscape: "CRYSTAL_CAVERN",
    premise: "Outsail playful nimbus sprites in a friendly sky-boat race through rainbow thunderheads.",
    antagonist: "Captain Zephyr Fluffbeard",
    antagonistEmoji: "⛵",
    minionName: "Breeze Imp",
    zones: ["Cloud Pier Alpha", "Tailwind Canyon", "Trophy Nimbus Arch"],
    lootName: "Bottled Zephyr Gust",
  },
];

export function computePartyAverageLevel(heroes: CharacterSheet[]): number {
  if (!heroes || heroes.length === 0) return 1;
  const total = heroes.reduce((sum, h) => sum + Math.max(1, h.levelStars || 1), 0);
  return Math.max(1, Math.min(5, Math.round(total / heroes.length)));
}

/**
 * Checks whether a candidate plot/villain/location overlaps existing Lore Registry entries.
 */
export function detectLoreOrMapOverlap(params: {
  existingLore: LoreRegistryEntry[];
  title: string;
  mainAntagonist: string;
  keyLocations: string[];
}): { hasOverlap: boolean; reason?: string } {
  const normTitle = params.title.trim().toLowerCase();
  const normBoss = params.mainAntagonist.trim().toLowerCase();
  const normLocs = new Set(params.keyLocations.map((l) => l.trim().toLowerCase()));

  for (const entry of params.existingLore) {
    if (entry.title.trim().toLowerCase() === normTitle) {
      return { hasOverlap: true, reason: `Plot title already used: ${entry.title}` };
    }
    if (normBoss && entry.mainAntagonist.trim().toLowerCase() === normBoss) {
      return {
        hasOverlap: true,
        reason: `Antagonist already exists in registry: ${entry.mainAntagonist}`,
      };
    }
    for (const loc of entry.keyLocations || []) {
      if (normLocs.has(loc.trim().toLowerCase())) {
        return { hasOverlap: true, reason: `Map location overlaps existing zone: ${loc}` };
      }
    }
  }
  return { hasOverlap: false };
}

/**
 * Generates a unique, non-overlapping Level-Scaled Procedural One-Shot session
 * tuned specifically to the party's current average hero level and size.
 */
export function generateLevelScaledOneShot(params: {
  roomCode: string;
  heroes: CharacterSheet[];
  existingLore: LoreRegistryEntry[];
}): {
  partyLevel: number;
  blueprint: OneShotBlueprint;
  loreEntry: LoreRegistryEntry;
  zones: MapRoomZone[];
  tokens: MapToken[];
  walls: WallSegment[];
  mapProps: MapPropPlacement[];
  groundTileTheme: GroundTileTheme;
  storyNodes: StoryBranchNode[];
  campaignTitle: string;
  campaignId: string;
} {
  const partyLevel = computePartyAverageLevel(params.heroes);
  const partySize = Math.max(1, params.heroes.length);

  // Choose the first catalog one-shot with ZERO plot/boss/zone overlap; fallback to numbered remix if all used
  let chosen = ONE_SHOT_SIDEQUEST_CATALOG.find(
    (bp) =>
      !detectLoreOrMapOverlap({
        existingLore: params.existingLore,
        title: bp.title,
        mainAntagonist: bp.antagonist,
        keyLocations: bp.zones,
      }).hasOverlap
  );

  let suffixIdx = 0;
  if (!chosen) {
    suffixIdx =
      params.existingLore.filter((l) => l.entryType === "ONE_SHOT").length + 1;
    const base =
      ONE_SHOT_SIDEQUEST_CATALOG[suffixIdx % ONE_SHOT_SIDEQUEST_CATALOG.length];
    chosen = {
      ...base,
      slug: `${base.slug}-remix-${suffixIdx}`,
      title: `${base.title} (Chapter Remix #${suffixIdx})`,
      antagonist: `${base.antagonist} Mk.${suffixIdx}`,
      zones: [
        `${base.zones[0]} Wing ${suffixIdx}`,
        `${base.zones[1]} Wing ${suffixIdx}`,
        `${base.zones[2]} Wing ${suffixIdx}`,
      ],
    };
  }

  const zones: MapRoomZone[] = [
    {
      id: `os-zone-1-${chosen.slug}`,
      name: `1. ${chosen.zones[0]}`,
      gridX: 0,
      gridY: 0,
      width: 4,
      height: 6,
      isRevealed: true,
      ambientSoundscape: chosen.soundscape,
    },
    {
      id: `os-zone-2-${chosen.slug}`,
      name: `2. ${chosen.zones[1]}`,
      gridX: 4,
      gridY: 0,
      width: 3,
      height: 6,
      isRevealed: false,
      hasSecretTrap: true,
      trapDescription: `Level ${partyLevel} Surprise Hazard (DC ${9 + partyLevel})`,
      ambientSoundscape: chosen.soundscape,
    },
    {
      id: `os-zone-3-${chosen.slug}`,
      name: `3. ${chosen.zones[2]}`,
      gridX: 7,
      gridY: 0,
      width: 3,
      height: 6,
      isRevealed: false,
      ambientSoundscape: chosen.soundscape,
    },
  ];

  // Level & party size scaled monster stats
  const bossHp = Math.max(4, partyLevel * 4 + partySize * 2);
  const minionHp = Math.max(2, partyLevel * 2 + 1);
  const checkDcStory = Math.min(6, 3 + Math.floor(partyLevel / 2));
  const checkDc5e = 10 + partyLevel;

  const tokens: MapToken[] = [];
  params.heroes.forEach((h, idx) => {
    tokens.push({
      id: `tok-${h.id}-os`,
      characterId: h.id,
      name: h.name,
      type: "HERO",
      avatarEmoji: h.avatarEmoji,
      assetPath: h.assetPath || resolveTokenAsset({ name: h.archetype, type: "HERO" }),
      color: h.tokenColor,
      gridX: 1,
      gridY: Math.min(5, 1 + idx * 2),
      hp: h.attributes5e.hp,
      maxHp: h.attributes5e.maxHp,
      isHiddenFromPlayers: false,
      lightRadius: 3.5,
      lightColor: "#fbbf24",
    });
  });

  tokens.push(
    {
      id: `tok-os-minion-${Date.now()}`,
      name: `${chosen.minionName} (Lvl ${partyLevel})`,
      type: "MONSTER",
      avatarEmoji: "👾",
      assetPath: HEARTHQUEST_ASSETS.monsters.brassSquirrel.path,
      color: "#10b981",
      gridX: 5,
      gridY: 2,
      hp: minionHp,
      maxHp: minionHp,
      isHiddenFromPlayers: true,
    },
    {
      id: `tok-os-boss-${Date.now()}`,
      name: `${chosen.antagonist} (Lvl ${partyLevel} Boss)`,
      type: "MONSTER",
      avatarEmoji: chosen.antagonistEmoji,
      assetPath: HEARTHQUEST_ASSETS.monsters.dragonPuppy.path,
      color: "#ef4444",
      gridX: 8,
      gridY: 3,
      hp: bossHp,
      maxHp: bossHp,
      isHiddenFromPlayers: true,
      lightRadius: 2.5,
      lightColor: "#f97316",
    },
    {
      id: `tok-os-chest-${Date.now()}`,
      name: "One-Shot Victory Chest",
      type: "PROP",
      avatarEmoji: "🧰",
      assetPath: HEARTHQUEST_ASSETS.props.chestClosed.path,
      color: "#f59e0b",
      gridX: 8,
      gridY: 1,
      hp: 1,
      maxHp: 1,
      isHiddenFromPlayers: true,
      isLootChest: true,
      isChestOpened: false,
      lootRewardName: `${chosen.lootName} (+${partyLevel} Spark)`,
    }
  );

  const node1Id = `node-os-1-${chosen.slug}`;
  const node2Id = `node-os-2-${chosen.slug}`;
  const node3Id = `node-os-3-${chosen.slug}`;

  const storyNodes: StoryBranchNode[] = [
    {
      id: node1Id,
      title: `Lv.${partyLevel} Intro: ${chosen.zones[0]}`,
      sceneZoneId: zones[0].id,
      readAloudByTone: {
        COZY_SILLY: `Welcome to ${chosen.zones[0]}! ${chosen.premise} This Level ${partyLevel} side-quest is tuned right for your ${partySize}-hero team!`,
        ACTION_HEROIC: `Heroes! ${chosen.zones[0]} needs aid! ${chosen.antagonist} is stirring up Level ${partyLevel} mischief just beyond the first archway!`,
        MYSTERY_ATMOSPHERIC: `Strange echoes ripple out of ${chosen.zones[0]}. Footprints lead toward ${chosen.zones[1]}...`,
      },
      gmWhisperTips: [
        `Scaled for Party Level ${partyLevel}: Storybook DC ${checkDcStory}+ / 5e DC ${checkDc5e}.`,
        `This One-Shot is tracked in SQLite Lore Registry so it won't overlap your main campaign plots!`,
      ],
      choices: [
        {
          id: "ch-os-1",
          label: `🚪 Advance into ${chosen.zones[1]}`,
          targetNodeId: node2Id,
          requiredCheck: `Perception or Investigation (DC ${checkDc5e})`,
          consequenceTag: `OS_ENTERED_${chosen.slug.toUpperCase()}`,
        },
      ],
    },
    {
      id: node2Id,
      title: `Encounter: ${chosen.zones[1]}`,
      sceneZoneId: zones[1].id,
      readAloudByTone: {
        COZY_SILLY: `A bouncy ${chosen.minionName} (${minionHp} HP) blocks the path across ${chosen.zones[1]}! Can you outwit or out-dance it?`,
        ACTION_HEROIC: `Stepping into ${chosen.zones[1]}, a Level ${partyLevel} ${chosen.minionName} (${minionHp} HP) springs forward to test your mettle!`,
        MYSTERY_ATMOSPHERIC: `Lanterns flicker across ${chosen.zones[1]} as a ${chosen.minionName} guards the inner chamber...`,
      },
      gmWhisperTips: [
        `Roll Initiative or let kids try a creative Stealth / Persuasion skill check (DC ${checkDc5e}).`,
      ],
      choices: [
        {
          id: "ch-os-2",
          label: `⚔️ Confront ${chosen.antagonist} in ${chosen.zones[2]}`,
          targetNodeId: node3Id,
          requiredCheck: `Athletics or Arcana (DC ${checkDc5e})`,
          consequenceTag: `OS_BOSS_${chosen.slug.toUpperCase()}`,
        },
      ],
    },
    {
      id: node3Id,
      title: `Finale: ${chosen.zones[2]}`,
      sceneZoneId: zones[2].id,
      readAloudByTone: {
        COZY_SILLY: `You reached ${chosen.zones[2]}! ${chosen.antagonist} (${bossHp} HP) awaits for a grand Level ${partyLevel} showdown—and don't miss the Victory Chest!`,
        ACTION_HEROIC: `Victory awaits in ${chosen.zones[2]}! Face ${chosen.antagonist} (${bossHp} HP) and claim ${chosen.lootName}!`,
        MYSTERY_ATMOSPHERIC: `At the heart of ${chosen.zones[2]}, ${chosen.antagonist} unveils the final riddle beside a shimmering chest.`,
      },
      gmWhisperTips: [
        `Reward each hero +1 Level Star upon finishing this Level ${partyLevel} One-Shot!`,
      ],
      choices: [],
    },
  ];

  const loreEntry: LoreRegistryEntry = {
    id: `lore-${chosen.slug}-${Date.now().toString(36)}`,
    entryType: "ONE_SHOT",
    title: chosen.title,
    slug: chosen.slug,
    biome: chosen.biome,
    plotPremise: chosen.premise,
    mainAntagonist: chosen.antagonist,
    keyLocations: chosen.zones,
    levelRange: `${partyLevel}-${partyLevel}`,
    roomCode: params.roomCode,
    createdAt: new Date().toISOString(),
  };

  const osTheme: "BAKERY" | "FOREST_TREEHOUSE" | "STARLIGHT_SHIP" =
    chosen.soundscape === "WHISPERING_WOODS"
      ? "FOREST_TREEHOUSE"
      : chosen.soundscape === "CRYSTAL_CAVERN"
      ? "STARLIGHT_SHIP"
      : "BAKERY";
  const osGroundTheme: GroundTileTheme =
    osTheme === "FOREST_TREEHOUSE"
      ? "FOREST_GRASS"
      : osTheme === "STARLIGHT_SHIP"
      ? "DUNGEON_STONE"
      : "BAKERY_FLOOR";
  const osZoneThemes: GroundTileTheme[] =
    osTheme === "FOREST_TREEHOUSE"
      ? ["FOREST_GRASS", "TREEHOUSE_WOOD", "CAVERN_DIRT"]
      : osTheme === "STARLIGHT_SHIP"
      ? ["STARLIGHT_DECK", "DUNGEON_STONE", "DUNGEON_STONE"]
      : ["BAKERY_FLOOR", "CAVERN_DIRT", "DUNGEON_STONE"];
  zones.forEach((z, idx) => {
    z.groundTileTheme = osZoneThemes[idx % osZoneThemes.length];
  });

  return {
    partyLevel,
    blueprint: chosen,
    loreEntry,
    zones,
    tokens: enrichTokensWithLighting(tokens),
    walls: createDefaultZoneWalls(zones),
    mapProps: createDefaultMapPropsForTheme(osTheme, zones),
    groundTileTheme: osGroundTheme,
    storyNodes,
    campaignTitle: `⚡ Lv.${partyLevel} One-Shot: ${chosen.title}`,
    campaignId: chosen.slug,
  };
}

interface TailoredScenarioSeed {
  contentRating: ContentRating;
  ageLabel: string;
  campaignId: string;
  titlePrefix: string;
  biome: "BAKERY" | "FOREST_TREEHOUSE" | "STARLIGHT_SHIP";
  backdrop: SceneBackdropType;
  weather: AmbientWeatherType;
  soundscape: NonNullable<MapRoomZone["ambientSoundscape"]>;
  npcName: string;
  npcEmoji: string;
  npcAsset: string;
  npcLineByTier: Record<RulesTier, string>;
  enemyName: string;
  enemyEmoji: string;
  enemyAsset: string;
  bossName: string;
  bossEmoji: string;
  bossAsset: string;
  bossLineByTier: Record<RulesTier, string>;
  zoneNames: [string, string, string];
  trapName: string;
  lockName: string;
  lootName: string;
}

const TAILORED_SCENARIO_BY_AGE: Record<AgeGroupPreset, TailoredScenarioSeed> = {
  AGES_5_7: {
    contentRating: "COZY_G",
    ageLabel: "Ages 5–7 (Cozy Early Readers)",
    campaignId: "camp-goblin-bakery",
    titlePrefix: "Oakhaven Hearth Vault",
    biome: "BAKERY",
    backdrop: "HEARTH_TAVERN",
    weather: "HEARTH_EMBERS",
    soundscape: "COZY_TAVERN",
    npcName: "Milo Hearthbaker",
    npcEmoji: "🍞",
    npcAsset: HEARTHQUEST_ASSETS.heroes.melodyBard.path,
    npcLineByTier: {
      STORYBOOK_D6:
        "Oh thank goodness you're here, heroes! A sneaky Goblin Scout carried the Golden Hearth-Key into the Mill Cellar—will you help me get it back?",
      APPRENTICE_5E_LITE:
        "Brave adventurers! A Goblin snuck past Oakhaven Square into the Mill Hall. Check the middle door—it's unlocked, though the cellar vault ahead is padlocked!",
      STANDARD_5E:
        "Keep low by the hearth ovens. A Goblin patrols the cellar corridor, and a Goblin Boss locked Oakhaven's vault behind an iron tumbler.",
    },
    enemyName: "Goblin",
    enemyEmoji: "👺",
    enemyAsset: HEARTHQUEST_ASSETS.monsters.goblinSprinkles.path,
    bossName: "Goblin Boss",
    bossEmoji: "⚔️",
    bossAsset: HEARTHQUEST_ASSETS.monsters.chefSnickerdoodle.path,
    bossLineByTier: {
      STORYBOOK_D6:
        "Halt, heroes! Nobody enters the Oakhaven Vault unless you can roll high or make a fair trade with me!",
      APPRENTICE_5E_LITE:
        "So you picked my cellar lock! Let's see if your party can outsmart my Goblin ambush or talk me into standing down!",
      STANDARD_5E:
        "Clever thieves to pick my tumbler! Steel up or parley fast—no villager takes back Oakhaven's treasure while I command this hall!",
    },
    zoneNames: ["1. Oakhaven Village Square", "2. Hearthside Mill Cellar", "3. Locked Oakhaven Vault"],
    trapName: "Concealed Tripwire Snare",
    lockName: "Iron Tumbler Padlock",
    lootName: "Sunlight Charm of Oakhaven",
  },
  AGES_8_10: {
    contentRating: "ADVENTURE_PG",
    ageLabel: "Ages 8–10 (Adventure Explorers)",
    campaignId: "camp-clockwork-treehouse",
    titlePrefix: "Silverleaf Canopy",
    biome: "FOREST_TREEHOUSE",
    backdrop: "ENCHANTED_WOODS",
    weather: "FOREST_FIREFLIES",
    soundscape: "WHISPERING_WOODS",
    npcName: "Rowan Swiftbow",
    npcEmoji: "🏹",
    npcAsset: HEARTHQUEST_ASSETS.heroes.forestRanger.path,
    npcLineByTier: {
      STORYBOOK_D6:
        "Whoa, heroes! A stray Wolf followed scent trails onto the canopy bridge, and a Bugbear locked the Elder Watchpost!",
      APPRENTICE_5E_LITE:
        "Welcome to Silverleaf Canopy! A prowling Wolf guards the Rope Bridge ahead, and a Bugbear raider locked the Canopy Spire Vault!",
      STANDARD_5E:
        "Watch the snare plates along the timber deck. A Wolf stalks the bridge crossing, and the Canopy Spire is sealed by a Bugbear chieftain.",
    },
    enemyName: "Wolf",
    enemyEmoji: "🐺",
    enemyAsset: HEARTHQUEST_ASSETS.monsters.dragonPuppy.path,
    bossName: "Bugbear",
    bossEmoji: "🪓",
    bossAsset: HEARTHQUEST_ASSETS.monsters.chefSnickerdoodle.path,
    bossLineByTier: {
      STORYBOOK_D6:
        "Grrr! Who climbs into my treehouse hideout? Best my roll or offer a clever bargain!",
      APPRENTICE_5E_LITE:
        "You crossed the rope bridge and picked my lock! Now face the might of a Bugbear ambush!",
      STANDARD_5E:
        "Intruders in the Canopy Spire! Prepare for Surprise Attack—roll initiative!",
    },
    zoneNames: ["1. Silverleaf Watchpost", "2. Suspension Rope Bridge", "3. Locked Canopy Spire"],
    trapName: "Camouflaged Snare Plate",
    lockName: "Forged Brass Bridge Lock",
    lootName: "Emerald Compass of Silverleaf",
  },
  AGES_11_13: {
    contentRating: "ADVENTURE_PG",
    ageLabel: "Ages 11–13 (Quest Champions)",
    campaignId: "camp-starlight-otter",
    titlePrefix: "Starwatch Citadel",
    biome: "STARLIGHT_SHIP",
    backdrop: "STARLIGHT_OBSERVATORY",
    weather: "STARLIGHT_DUST",
    soundscape: "CRYSTAL_CAVERN",
    npcName: "Magister Corwin Hale",
    npcEmoji: "🔭",
    npcAsset: HEARTHQUEST_ASSETS.heroes.starlightWizard.path,
    npcLineByTier: {
      STORYBOOK_D6:
        "Steady now, crew! Animated Armor awoke in the observatory corridor, and a Bandit Captain locked our star-compass behind the vault door!",
      APPRENTICE_5E_LITE:
        "Our astral compass was seized! Bypass the Animated Armor in Zone 2, then pick the Astrolabe Lock to face the Bandit Captain!",
      STANDARD_5E:
        "Stay sharp—an Animated Armor construct guards the Engine Deck, and a DC 14 tumbler seals a Bandit Captain inside the Astrolabe Sanctum.",
    },
    enemyName: "Animated Armor",
    enemyEmoji: "🛡️",
    enemyAsset: HEARTHQUEST_ASSETS.monsters.brassSquirrel.path,
    bossName: "Bandit Captain",
    bossEmoji: "🏴‍☠️",
    bossAsset: HEARTHQUEST_ASSETS.monsters.chefSnickerdoodle.path,
    bossLineByTier: {
      STORYBOOK_D6:
        "Ha! You slipped past my sentinel! Let's see your best roll for the Prism Key!",
      APPRENTICE_5E_LITE:
        "So you picked the Starwatch lock! Show me whether your party can match blades and wits with a Bandit Captain!",
      STANDARD_5E:
        "Intruders on my quarterdeck? Steel yourselves—Multiattack three strikes, ready!",
    },
    zoneNames: ["1. Starwatch Landing", "2. Observatory Corridor", "3. Locked Astrolabe Sanctum"],
    trapName: "Glowing Arcane Glyph Trap",
    lockName: "Starforged Astrolabe Lock",
    lootName: "Prism Astrolabe of Starwatch",
  },
  TEENS_13_PLUS: {
    contentRating: "CLASSIC_PG13",
    ageLabel: "Teens 13+ (Classic Tactical Fantasy)",
    campaignId: "camp-starlight-otter",
    titlePrefix: "Eclipse Citadel",
    biome: "STARLIGHT_SHIP",
    backdrop: "STARLIGHT_OBSERVATORY",
    weather: "STARLIGHT_DUST",
    soundscape: "CRYSTAL_CAVERN",
    npcName: "Captain Vespera Thorne",
    npcEmoji: "⚔️",
    npcAsset: HEARTHQUEST_ASSETS.heroes.shieldKnight.path,
    npcLineByTier: {
      STORYBOOK_D6:
        "Quickly now—ancient Skeletons guard the gallery, and a Specter sealed the inner spire before midnight!",
      APPRENTICE_5E_LITE:
        "Skeleton sentries patrol the outer breach. Bypass the arcane glyph, pick the Sanctum Lock, and banish the Specter!",
      STANDARD_5E:
        "Check every shadow corner. A Skeleton sentry holds the gallery, a rune ward arms the floor, and a Specter haunts the DC 14 vault.",
    },
    enemyName: "Skeleton",
    enemyEmoji: "💀",
    enemyAsset: HEARTHQUEST_ASSETS.monsters.brassSquirrel.path,
    bossName: "Specter",
    bossEmoji: "👻",
    bossAsset: HEARTHQUEST_ASSETS.monsters.nebulaJelly.path,
    bossLineByTier: {
      STORYBOOK_D6:
        "You broke the eclipse seal! State your vow and roll against the chill of the spire!",
      APPRENTICE_5E_LITE:
        "Few mortals pick my Sanctum Seal intact. Brace against Life Drain and prove your resolve!",
      STANDARD_5E:
        "Lightbearers cross my threshold? Roll Initiative—let us test your spirit against Life Drain!",
    },
    zoneNames: ["1. Outer Bastion", "2. Runic Gallery", "3. Locked Eclipse Vault"],
    trapName: "Chrono-Lock Arcane Rune",
    lockName: "Ironbound Eclipse Deadbolt",
    lootName: "Signet of the Dawnstar",
  },
};

/**
 * Generates a full playable Session 1 room customized to a user's chosen
 * Game System (`STORYBOOK_D6` | `APPRENTICE_5E_LITE` | `STANDARD_5E`) and Age Group:
 * creates the Hook, Starting Readouts, Scenario Cast (NPC, Minion Enemy, Boss),
 * Doors/Locks, Traps, and interactive Group Read-Aloud / RP Prompts.
 */
export function generateTailoredAccountSession(params: {
  roomCode: string;
  rulesTier: RulesTier;
  ageGroup: AgeGroupPreset;
  familyName?: string;
  householdId?: string;
  difficulty?: DifficultyPreset;
}): RoomSessionState {
  const seed = TAILORED_SCENARIO_BY_AGE[params.ageGroup] || TAILORED_SCENARIO_BY_AGE.AGES_8_10;
  const partyName = (params.familyName || "Adventuring Party").trim();
  const baseHeroes = createDefaultStarterHeroes().map((h) => ({
    ...h,
    rulesTier: params.rulesTier,
  }));

  const isStorybook = params.rulesTier === "STORYBOOK_D6";
  const isStandard5e = params.rulesTier === "STANDARD_5E";
  const minionStat = findSrdMonsterStatBlock(seed.enemyName);
  const bossStat = findSrdMonsterStatBlock(seed.bossName);
  const minionHp = isStorybook ? 4 : isStandard5e ? minionStat.maxHp : Math.max(6, Math.round(minionStat.maxHp * 0.75));
  const bossHp = isStorybook ? 6 : isStandard5e ? bossStat.maxHp : Math.max(12, Math.round(bossStat.maxHp * 0.75));
  const lockDc = isStorybook ? 9 : isStandard5e ? 14 : 12;
  const initialDifficulty: DifficultyPreset =
    params.difficulty || (isStorybook || params.ageGroup === "AGES_5_7" ? "STORY_EASY" : "BALANCED_NORMAL");
  const stageAreaMapUrl = resolveAreaMapAsset(seed.campaignId);
  const stageMoodArtUrl = resolveSceneBackdropAsset(seed.backdrop);
  const rulesLabel = isStorybook
    ? "Storybook D6 (Easy Hearts & d6)"
    : isStandard5e
    ? "Standard 5e SRD (Tactical d20)"
    : "Apprentice 5e Lite (Guided d20)";

  const zones: MapRoomZone[] = [
    {
      id: "zone-tailored-1",
      name: seed.zoneNames[0],
      gridX: 0,
      gridY: 0,
      width: 4,
      height: 6,
      isRevealed: true,
      ambientSoundscape: seed.soundscape,
    },
    {
      id: "zone-tailored-2",
      name: seed.zoneNames[1],
      gridX: 4,
      gridY: 0,
      width: 3,
      height: 6,
      isRevealed: false,
      hasSecretTrap: true,
      trapDescription: `${seed.trapName} (DC ${isStorybook ? 4 : isStandard5e ? 14 : 11})`,
      ambientSoundscape: seed.soundscape,
    },
    {
      id: "zone-tailored-3",
      name: seed.zoneNames[2],
      gridX: 7,
      gridY: 0,
      width: 3,
      height: 6,
      isRevealed: false,
      ambientSoundscape: seed.soundscape,
    },
  ];

  const walls = createDefaultZoneWalls(zones).map((w) =>
    w.id === "door-zone-3"
      ? {
          ...w,
          isLocked: true,
          lockDc,
          baseLockDc: lockDc,
          lockLabel: seed.lockName,
        }
      : w
  );

  const tokens: MapToken[] = [
    ...baseHeroes.map((h, idx) => ({
      id: `tok-${h.id}`,
      characterId: h.id,
      name: h.name,
      type: "HERO" as const,
      avatarEmoji: h.avatarEmoji,
      assetPath: h.assetPath,
      color: h.tokenColor,
      gridX: 1,
      gridY: 2 + idx * 2,
      hp: isStorybook ? h.storybookStats.hearts : h.attributes5e.hp,
      maxHp: isStorybook ? h.storybookStats.maxHearts : h.attributes5e.maxHp,
      isHiddenFromPlayers: false,
      lightRadius: isStandard5e ? 3.2 : 4.2,
      lightColor: h.tokenColor,
    })),
    {
      id: "tok-tailored-npc",
      name: `${seed.npcName} (Ally NPC)`,
      type: "NPC",
      avatarEmoji: seed.npcEmoji,
      assetPath: seed.npcAsset,
      color: "#38bdf8",
      gridX: 2,
      gridY: 1,
      hp: isStorybook ? 3 : 10,
      maxHp: isStorybook ? 3 : 10,
      isHiddenFromPlayers: false,
      lightRadius: 2.5,
      lightColor: "#bae6fd",
    },
    {
      id: "tok-tailored-minion",
      name: seed.enemyName,
      type: "MONSTER",
      avatarEmoji: seed.enemyEmoji,
      assetPath: seed.enemyAsset,
      color: "#10b981",
      gridX: 5,
      gridY: 3,
      hp: minionHp,
      maxHp: minionHp,
      baseMaxHp: minionHp,
      baseArmorClass: minionStat.armorClass,
      statBlock5e: minionStat,
      isHiddenFromPlayers: false,
    },
    {
      id: "tok-tailored-boss",
      name: `${seed.bossName} (Boss)`,
      type: "MONSTER",
      avatarEmoji: seed.bossEmoji,
      assetPath: seed.bossAsset,
      color: "#ef4444",
      gridX: 8,
      gridY: 3,
      hp: bossHp,
      maxHp: bossHp,
      baseMaxHp: bossHp,
      baseArmorClass: bossStat.armorClass,
      statBlock5e: bossStat,
      isHiddenFromPlayers: true,
      lightRadius: 2.6,
      lightColor: "#f97316",
    },
    {
      id: "tok-tailored-chest",
      name: `${seed.lootName} Chest`,
      type: "PROP",
      avatarEmoji: "🧰",
      assetPath: HEARTHQUEST_ASSETS.props.chestClosed.path,
      color: "#f59e0b",
      gridX: 8,
      gridY: 1,
      hp: 1,
      maxHp: 1,
      isHiddenFromPlayers: true,
      isLootChest: true,
      isChestOpened: false,
      lootRewardName: seed.lootName,
    },
  ];

  const openingHook = `Welcome, ${partyName}! Playing ${rulesLabel} for ${seed.ageLabel}. ${seed.npcName} waves you inside ${seed.zoneNames[0]}: ${seed.bossName} has locked the ${seed.lootName} behind the ${seed.lockName}!`;

  const rpStart: StoryRpPrompt = {
    id: `rp-start-${params.rulesTier}-${params.ageGroup}`,
    trigger: "SESSION_START",
    speakerName: "Adventure Narrator",
    speakerEmoji: "📖",
    speakerRole: "NARRATOR",
    title: `Session 1 Hook: ${seed.titlePrefix}`,
    spokenText: `${openingHook} Talk with ${seed.npcName}, step through the unlocked middle doorway into ${seed.zoneNames[1]}, and get ready to pick the ${seed.lockName}!`,
    playerPromptQuestion:
      "Ask the table before you move: How does your hero introduce themselves to the group tonight?",
    suggestedReplyOptions: [
      `"Follow my shield — let's talk to ${seed.npcName} first!"`,
      `"I check my lockpicks and peek through the unlocked door!"`,
      `"Hello ${seed.npcName}! Tell us what we're facing inside!"`,
    ],
  };

  const rpNpc: StoryRpPrompt = {
    id: `rp-npc-${params.rulesTier}-${params.ageGroup}`,
    trigger: "NPC_DIALOG",
    speakerName: seed.npcName,
    speakerEmoji: seed.npcEmoji,
    speakerRole: "NPC",
    title: `${seed.npcName} Whispers a Clue`,
    spokenText: seed.npcLineByTier[params.rulesTier],
    playerPromptQuestion: `How will your party respond to ${seed.npcName}?`,
    suggestedReplyOptions: [
      `"Don't worry ${seed.npcName}, we'll rescue the ${seed.lootName}!"`,
      `"Any tips for dealing with the ${seed.enemyName} in the next room?"`,
    ],
  };

  const rpMid: StoryRpPrompt = {
    id: `rp-mid-${params.rulesTier}-${params.ageGroup}`,
    trigger: "SCENE_ENTER",
    speakerName: seed.enemyName,
    speakerEmoji: seed.enemyEmoji,
    speakerRole: "NPC",
    title: `Encounter in ${seed.zoneNames[1]}`,
    spokenText: `A ${seed.enemyName} (${minionHp} HP) spots your torchlight near the ${seed.trapName}! Look ahead—the heavy ${seed.lockName} bars the vault!`,
    playerPromptQuestion: "Tell the group: will you roll to distract, sneak past, or challenge the guard?",
    suggestedReplyOptions: [
      `"Try persuading or trading with the ${seed.enemyName}!"`,
      `"Roll Stealth or Lockpicking on the vault door!"`,
    ],
  };

  const rpBoss: StoryRpPrompt = {
    id: `rp-boss-${params.rulesTier}-${params.ageGroup}`,
    trigger: "BOSS_ENCOUNTER",
    speakerName: seed.bossName,
    speakerEmoji: seed.bossEmoji,
    speakerRole: "BOSS",
    title: `Boss Showdown: ${seed.bossName}`,
    spokenText: seed.bossLineByTier[params.rulesTier],
    playerPromptQuestion: `Say your hero's boldest one-liner to ${seed.bossName}!`,
    suggestedReplyOptions: [
      `"Time to hand back the ${seed.lootName}, ${seed.bossName}!"`,
      `"We came to share adventure—let's make a fair deal or duel!"`,
    ],
  };

  const storyNodes: StoryBranchNode[] = [
    {
      id: `node-tailored-1-${params.rulesTier}`,
      title: `Session 1 Start: ${seed.zoneNames[0]}`,
      sceneZoneId: zones[0].id,
      openingHook,
      stageAreaMapUrl,
      stageMoodArtUrl,
      readAloudByTone: {
        COZY_SILLY: `${openingHook} Everyone takes a deep cozy breath as ${seed.npcName} hands out warm snacks!`,
        ACTION_HEROIC: `Torches flare across ${seed.zoneNames[0]}! ${seed.bossName} has seized the ${seed.lootName}—step up and rally with ${seed.npcName}!`,
        MYSTERY_ATMOSPHERIC: `Shadows stretch along ${seed.zoneNames[0]}. ${seed.npcName} leans close, pointing toward the distant locked sanctum...`,
      },
      readAloudByRating: {
        COZY_G: `${openingHook} Everything here can be solved with kindness, clever clues, and teamwork!`,
        ADVENTURE_PG: `${openingHook} Expect clever puzzles, heroic dice checks, and a locked vault door!`,
        CLASSIC_PG13: `${openingHook} Watch for hazards, pick the DC ${lockDc} deadbolt, and prepare for tactical combat!`,
      },
      rpPrompts: [rpStart, rpNpc],
      gmWhisperTips: [
        `Tuned for ${rulesLabel} • ${seed.ageLabel}.`,
        `Middle door is unlocked; Vault door (${seed.lockName}) requires a Sleight of Hand Lockpick Check!`,
      ],
      choices: [
        {
          id: "ch-tailored-enter-z2",
          label: `🚪 Enter ${seed.zoneNames[1]} & Confront ${seed.enemyName}`,
          targetNodeId: `node-tailored-2-${params.rulesTier}`,
          requiredCheck: isStorybook ? "Storybook d6 Check (DC 4)" : `Stealth or Persuasion (DC ${isStandard5e ? 13 : 11})`,
          consequenceTag: "TAILORED_SCENE_2_ENTERED",
        },
      ],
    },
    {
      id: `node-tailored-2-${params.rulesTier}`,
      title: `Chapter 2: ${seed.zoneNames[1]}`,
      sceneZoneId: zones[1].id,
      stageAreaMapUrl,
      stageMoodArtUrl,
      readAloudByTone: {
        COZY_SILLY: `${seed.enemyName} (${minionHp} HP) is doing silly cartwheels near the ${seed.trapName}! Beyond them glows the ${seed.lockName}!`,
        ACTION_HEROIC: `You cross the threshold into ${seed.zoneNames[1]}! ${seed.enemyName} guards the corridor leading to the locked vault!`,
        MYSTERY_ATMOSPHERIC: `Creaking floorboards reveal ${seed.enemyName} patrolling beside an arcane ward and a heavy locked doorway...`,
      },
      rpPrompts: [rpMid],
      gmWhisperTips: [
        `GM Tip: Players can click the unlocked door freely, then click the locked vault door to roll a Lockpick check!`,
      ],
      choices: [
        {
          id: "ch-tailored-boss",
          label: `🗝️ Unlock Vault & Confront ${seed.bossName}`,
          targetNodeId: `node-tailored-3-${params.rulesTier}`,
          requiredCheck: `Lockpick Sleight of Hand (DC ${isStorybook ? 3 : lockDc})`,
          consequenceTag: "TAILORED_VAULT_BREACHED",
        },
      ],
    },
    {
      id: `node-tailored-3-${params.rulesTier}`,
      title: `Finale: ${seed.zoneNames[2]}`,
      sceneZoneId: zones[2].id,
      stageAreaMapUrl,
      stageMoodArtUrl,
      readAloudByTone: {
        COZY_SILLY: `Hooray! Inside ${seed.zoneNames[2]}, ${seed.bossName} (${bossHp} HP) drops a jaw in surprise next to the glowing ${seed.lootName} Chest!`,
        ACTION_HEROIC: `The vault swings wide! ${seed.bossName} (${bossHp} HP) stands before the ${seed.lootName}—roll for the final showdown!`,
        MYSTERY_ATMOSPHERIC: `Moonlight illuminates ${seed.bossName} (${bossHp} HP) atop the inner dais, guarding the ancient ${seed.lootName}.`,
      },
      rpPrompts: [rpBoss],
      gmWhisperTips: [
        `Finale! Unseal the ${seed.lootName} Chest on the map to celebrate Session victory!`,
      ],
      choices: [],
    },
  ];

  const session: RoomSessionState = {
    roomCode: params.roomCode,
    householdId: params.householdId || "household-demo-family",
    campaignId: seed.campaignId,
    campaignTitle: `${seed.titlePrefix} (${isStorybook ? "Storybook" : isStandard5e ? "5e" : "Apprentice"})`,
    rulesTier: params.rulesTier,
    contentRating: seed.contentRating,
    ageGroup: params.ageGroup,
    difficulty: initialDifficulty,
    stageAreaMapUrl,
    stageMoodArtUrl,
    diceInputMode: "HYBRID_PHYSICAL_PROMPT",
    isPausedForBedtime: false,
    sessionOpeningHook: openingHook,
    activeRpPrompt: rpStart,
    activeNodeId: storyNodes[0].id,
    gridCols: 10,
    gridRows: 6,
    zones,
    tokens: enrichTokensWithLighting(tokens),
    heroes: baseHeroes,
    storyNodes,
    storyFlags: [],
    rollHistory: [],
    spotlightRecords: computeSiblingSpotlightFairness(baseHeroes, []),
    ambientLightMode: isStandard5e ? "TORCHLIT_DUNGEON" : "COZY_TWILIGHT",
    walls,
    ambientWeather: seed.weather,
    spellTemplates: [],
    ambientSoundscape: seed.soundscape,
    sceneBackdrop: seed.backdrop,
    combat: {
      isActive: false,
      round: 1,
      activeTurnIndex: 0,
      entries: [],
    },
  };
  return applyRoomDifficulty(session, initialDifficulty);
}

import {
  ActionCard,
  BedtimeFreezeSnapshot,
  CharacterSheet,
  ContentRating,
  DiceRollResult,
  DieType,
  FamilyCampaignTemplate,
  MapRoomZone,
  MapToken,
  PlayerSpotlightRecord,
  RoomSessionState,
  RulesTier,
  StoryBranchChoice,
  StoryBranchNode,
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
 * Evaluates either a physical die roll entered by a kid on their tablet
 * OR generates a cryptographic/random digital roll, applying the active RulesTier math.
 */
export function evaluateActionCardRoll(params: {
  character: CharacterSheet;
  card: ActionCard;
  rulesTier: RulesTier;
  source: "PHYSICAL_DICE_TABLE" | "DIGITAL_3D_ROLLER";
  physicalRollValue?: number;
}): DiceRollResult {
  const { character, card, rulesTier, source, physicalRollValue } = params;

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

  const modifier = card.bonusByTier[rulesTier] ?? 0;
  const targetDC = card.targetDifficultyByTier[rulesTier] ?? (rulesTier === "STORYBOOK_D6" ? 4 : 10);
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
 * Default starter hero sheets: Sir Barnaby Paws & Lyra Starwhisper
 */
export const DEFAULT_STARTER_HEROES: CharacterSheet[] = [
  {
    id: "hero-barnaby",
    name: "Sir Barnaby Paws",
    playerName: "Leo (Age 7)",
    playerAge: 7,
    archetype: "Shield Knight",
    companionPet: "Pip the Golden Puppy",
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
        title: " Mighty Shield Boop",
        subtitle: "Brawn / Melee Attack",
        icon: "🛡️",
        colorTheme: "amber",
        dieToRoll: "d20",
        bonusByTier: { STORYBOOK_D6: 1, APPRENTICE_5E_LITE: 4, STANDARD_5E: 5 },
        targetDifficultyByTier: { STORYBOOK_D6: 4, APPRENTICE_5E_LITE: 11, STANDARD_5E: 13 },
        description: "Bounce your shiny shield off a sneaky rascal or heavy door!",
        cozySuccessFlavor:
          "CLANG! Your shield rings like a dinner bell and sends the obstacle spinning!",
        cozyFailForwardFlavor:
          "Your shield slips on a dollop of blueberry frosting, making a loud slide-whistle sound!",
      },
      {
        id: "card-puppy-sniff",
        title: "Pip's Super Sniff",
        subtitle: "Brains / Clues & Secrets",
        icon: "🐶",
        colorTheme: "emerald",
        dieToRoll: "d20",
        bonusByTier: { STORYBOOK_D6: 1, APPRENTICE_5E_LITE: 3, STANDARD_5E: 4 },
        targetDifficultyByTier: { STORYBOOK_D6: 4, APPRENTICE_5E_LITE: 10, STANDARD_5E: 12 },
        description: "Have Pip the puppy sniff out secret passages or hidden treats!",
        cozySuccessFlavor: "Pip wags his tail furiously and points his nose right at the secret!",
        cozyFailForwardFlavor:
          "Pip gets distracted chasing a glowing butterfly straight toward the next clue!",
      },
    ],
    inventory: [
      {
        id: "item-sun-shield",
        name: "Sunbeam Buckler",
        icon: "☀️",
        description: "Glows like a warm nightlight in dark caves.",
      },
      {
        id: "item-honey-biscuit",
        name: " Emergency Honey Biscuit",
        icon: "🍪",
        description: "Restores 1 Heart or calms down one grumpy creature.",
      },
    ],
  },
  {
    id: "hero-lyra",
    name: "Lyra Starwhisper",
    playerName: "Maya (Age 10)",
    playerAge: 10,
    archetype: "Starlight Wizard",
    companionPet: "Hootie the Clockwork Owl",
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
        title: "Starlight Sparkle Bolt",
        subtitle: "Brains / Arcane Spell",
        icon: "✨",
        colorTheme: "purple",
        dieToRoll: "d20",
        bonusByTier: { STORYBOOK_D6: 1, APPRENTICE_5E_LITE: 5, STANDARD_5E: 6 },
        targetDifficultyByTier: { STORYBOOK_D6: 4, APPRENTICE_5E_LITE: 11, STANDARD_5E: 13 },
        description: "Launch a dazzling beam of comet-fizz that zaps foes or lights crystals!",
        cozySuccessFlavor:
          "FWOOSH! A swirl of violet starlight dazzles the room and zaps the target!",
        cozyFailForwardFlavor:
          "Sparks pop out of your wand like harmless fireworks, turning the target's hair bright purple!",
      },
      {
        id: "card-owl-scout",
        title: "Clockwork Owl Scout",
        subtitle: "Charm / Talk & Trick",
        icon: "🦉",
        colorTheme: "sky",
        dieToRoll: "d20",
        bonusByTier: { STORYBOOK_D6: 1, APPRENTICE_5E_LITE: 4, STANDARD_5E: 4 },
        targetDifficultyByTier: { STORYBOOK_D6: 4, APPRENTICE_5E_LITE: 10, STANDARD_5E: 12 },
        description: "Send Hootie ahead or mimic a funny voice to distract guards!",
        cozySuccessFlavor: "Hootie hoots a royal fanfare that completely fools everyone nearby!",
        cozyFailForwardFlavor:
          "Hootie's gears hiccup with a loud CUCKOO sound, making the guards giggle!",
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
  },
];

/**
 * Creates fresh, deep-cloned copies of the default starter heroes.
 */
export function createDefaultStarterHeroes(): CharacterSheet[] {
  return JSON.parse(JSON.stringify(DEFAULT_STARTER_HEROES));
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
        color: "#ef4444",
        gridX: 8,
        gridY: 3,
        hp: 4,
        maxHp: 4,
        isHiddenFromPlayers: true,
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
 * Creates a room session loaded with the requested campaign (defaulting to camp-goblin-bakery).
 */
export function createCampaignSession(
  roomCode = "DRGN",
  campaignId: string = "camp-goblin-bakery"
): RoomSessionState {
  const campaign =
    FAMILY_CAMPAIGNS.find((c) => c.id === campaignId) ?? FAMILY_CAMPAIGNS[0];
  const heroes = createDefaultStarterHeroes();

  return {
    roomCode,
    householdId: "household-demo-family",
    campaignId: campaign.id,
    campaignTitle: campaign.title,
    rulesTier: campaign.defaultRulesTier,
    contentRating: campaign.defaultContentRating,
    diceInputMode: "HYBRID_PHYSICAL_PROMPT",
    isPausedForBedtime: false,
    activeNodeId: campaign.initialActiveNodeId,
    gridCols: 10,
    gridRows: 6,
    zones: JSON.parse(JSON.stringify(campaign.zones)),
    tokens: JSON.parse(JSON.stringify(campaign.tokens)),
    heroes,
    storyNodes: JSON.parse(JSON.stringify(campaign.storyNodes)),
    storyFlags: [],
    rollHistory: [],
    spotlightRecords: computeSiblingSpotlightFairness(heroes, []),
  };
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
): { zones: MapRoomZone[]; tokens: MapToken[] } {
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

  return { zones, tokens };
}

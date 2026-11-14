import {
  ActionCard,
  BedtimeFreezeSnapshot,
  CharacterSheet,
  ContentRating,
  DiceRollResult,
  DieType,
  PlayerSpotlightRecord,
  RoomSessionState,
  RulesTier,
} from "@hearthquest/shared-types";

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
 * Creates a complete, ready-to-play starter family session:
 * "The Goblin Bakery Heist"
 */
export function createStarterFamilySession(roomCode = "DRGN"): RoomSessionState {
  const heroes: CharacterSheet[] = [
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
          description: "Launch a dazzling beam ofcomet-fizz that zaps foes or lights crystals!",
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

  return {
    roomCode,
    householdId: "household-demo-family",
    campaignId: "camp-goblin-bakery",
    campaignTitle: "The Great Goblin Bakery Heist",
    rulesTier: "STORYBOOK_D6",
    contentRating: "COZY_G",
    diceInputMode: "HYBRID_PHYSICAL_PROMPT",
    isPausedForBedtime: false,
    activeNodeId: "node-bakery-courtyard",
    gridCols: 10,
    gridRows: 6,
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
    heroes,
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
    storyFlags: [],
    rollHistory: [],
    spotlightRecords: computeSiblingSpotlightFairness(heroes, []),
  };
}
